import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyPost, classifyComments } from "@/lib/classifier";
import { analyzeWithSonnet } from "@/lib/anthropic";
import { extractCarouselText } from "@/lib/carousel-ocr";
import { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { batchId } = await req.json();

    if (!batchId) {
      return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
    }

    // 1. Get batch + profile info
    const { data: batch } = await supabaseAdmin
      .from("batches")
      .select("*, profiles(*)")
      .eq("id", batchId)
      .single();

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // 2. Get all posts for this batch
    const { data: posts } = await supabaseAdmin
      .from("posts")
      .select("*")
      .eq("batch_id", batchId)
      .order("engagement_rate", { ascending: false });

    if (!posts?.length) {
      return NextResponse.json({ error: "No posts found" }, { status: 404 });
    }

    // 3. PHASE: OCR for carousels/images without transcript
    await supabaseAdmin
      .from("batches")
      .update({ status: "classifying" })
      .eq("id", batchId);

    for (const post of posts) {
      if (
        (post.post_type === "carousel" || post.post_type === "image") &&
        (!post.transcript || post.transcript.trim().length < 10) &&
        post.thumbnail_url
      ) {
        try {
          // Use thumbnail or available image URLs for OCR
          const imageUrls = [post.thumbnail_url].filter(Boolean);
          const extractedText = await extractCarouselText(imageUrls);
          if (extractedText) {
            await supabaseAdmin
              .from("posts")
              .update({
                transcript: extractedText,
                transcription_status: "completed",
              })
              .eq("id", post.id);
            post.transcript = extractedText;
          }
        } catch (err) {
          console.error(`Carousel OCR failed for ${post.id}:`, err);
        }
      }
    }

    // 4. PHASE: Classify posts with Haiku (reset failed classifications)
    for (const post of posts) {
      const needsClassification =
        post.classification_status !== "completed" ||
        post.hook_type === "outro" ||
        post.content_theme === "não classificado" ||
        !post.hook_text;

      if (!needsClassification) continue;

      try {
        const classification = await classifyPost({
          caption: post.caption || "",
          transcript: post.transcript || "",
          hashtags: post.hashtags || [],
        });

        await supabaseAdmin
          .from("posts")
          .update({
            funnel_stage: classification.funnelStage,
            hook_type: classification.hookType,
            hook_text: classification.hookText,
            cta_type: classification.ctaType,
            cta_text: classification.ctaText,
            content_theme: classification.contentTheme,
            classification_status: "completed",
          })
          .eq("id", post.id);

        // Update local post object for prompt building
        post.funnel_stage = classification.funnelStage;
        post.hook_type = classification.hookType;
        post.hook_text = classification.hookText;
        post.cta_type = classification.ctaType;
        post.cta_text = classification.ctaText;
        post.content_theme = classification.contentTheme;

        // Save to hooks bank (delete old entry first to avoid duplicates)
        if (classification.hookText) {
          await supabaseAdmin
            .from("hooks")
            .delete()
            .eq("post_id", post.id);

          await supabaseAdmin.from("hooks").insert({
            profile_id: batch.profile_id,
            post_id: post.id,
            hook_text: classification.hookText,
            hook_type: classification.hookType,
            views_count: post.views_count,
            engagement_rate: post.engagement_rate,
            funnel_stage: classification.funnelStage,
          });
        }
      } catch (err) {
        console.error(`Classification failed for post ${post.id}:`, err);
      }
    }

    // 5. PHASE: Classify comments with Haiku
    for (const post of posts) {
      const { data: comments } = await supabaseAdmin
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .is("intent_type", null);

      if (comments?.length) {
        const classified = await classifyComments(
          comments.map((c) => ({ text: c.text, author: c.author_username }))
        );

        for (let i = 0; i < classified.length; i++) {
          if (comments[i]) {
            await supabaseAdmin
              .from("comments")
              .update({
                intent_type: classified[i].intentType,
                sentiment: classified[i].sentiment,
              })
              .eq("id", comments[i].id);
          }
        }
      }
    }

    // 6. PHASE: Build analysis with Sonnet 4.6
    await supabaseAdmin
      .from("batches")
      .update({ status: "analyzing" })
      .eq("id", batchId);

    // Build prompt data from updated posts
    const postDataForPrompt = [];
    for (const post of posts) {
      const { data: comments } = await supabaseAdmin
        .from("comments")
        .select("*")
        .eq("post_id", post.id);

      const commentsSummary = comments?.length
        ? {
            purchaseIntent: comments.filter((c) => c.intent_type === "purchase_intent").length,
            objections: comments.filter((c) => c.intent_type === "objection").length,
            audienceVoice: comments.filter((c) => c.intent_type === "audience_voice").length,
            praise: comments.filter((c) => c.intent_type === "praise").length,
            questions: comments.filter((c) => c.intent_type === "question").length,
            topComments: comments
              .filter((c) =>
                ["purchase_intent", "objection", "audience_voice", "praise"].includes(c.intent_type || "")
              )
              .slice(0, 10)
              .map((c) => `@${c.author_username}: ${c.text}`),
          }
        : undefined;

      postDataForPrompt.push({
        postId: post.shortcode || post.post_id,
        views: post.views_count,
        likes: post.likes_count,
        comments: post.comments_count,
        duration: post.video_duration,
        engagementRate: post.engagement_rate,
        commentToLikeRatio: post.comment_to_like_ratio,
        salesPotentialScore: post.sales_potential_score,
        outlierScore: post.outlier_score,
        funnelStage: post.funnel_stage,
        hookType: post.hook_type,
        hookText: post.hook_text,
        ctaType: post.cta_type,
        ctaText: post.cta_text,
        contentTheme: post.content_theme,
        caption: post.caption || "",
        transcript: post.transcript || "",
        hashtags: post.hashtags || [],
        postedAt: post.posted_at,
        url: post.url,
        commentsSummary,
      });
    }

    const funnelDist = {
      tofu: posts.filter((p) => p.funnel_stage === "tofu").length,
      mofu: posts.filter((p) => p.funnel_stage === "mofu").length,
      bofu: posts.filter((p) => p.funnel_stage === "bofu").length,
    };

    const profile = batch.profiles;
    const avgViews = Math.round(posts.reduce((s, p) => s + p.views_count, 0) / posts.length);
    const avgLikes = Math.round(posts.reduce((s, p) => s + p.likes_count, 0) / posts.length);
    const avgComments = Math.round(posts.reduce((s, p) => s + p.comments_count, 0) / posts.length);
    const avgEng =
      Math.round((posts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / posts.length) * 100) / 100;

    const prompt = buildAnalysisPrompt(
      {
        username: profile.username,
        fullName: profile.full_name || "",
        bio: profile.bio,
        bioLink: profile.bio_link,
        followers: profile.followers_count,
        totalPosts: posts.length,
        avgViews,
        avgLikes,
        avgComments,
        avgEngagementRate: avgEng,
        funnelDistribution: funnelDist,
        strategicNote: batch.strategic_note || undefined,
      },
      postDataForPrompt
    );

    const result = await analyzeWithSonnet(ANALYSIS_SYSTEM_PROMPT, prompt);

    // 7. Save analysis
    // Sonnet 4.6 pricing: $3/1M input, $15/1M output
    const costEstimate =
      (result.inputTokens / 1_000_000) * 3 +
      (result.outputTokens / 1_000_000) * 15;

    const { data: analysis } = await supabaseAdmin
      .from("analyses")
      .insert({
        batch_id: batchId,
        profile_id: batch.profile_id,
        analysis_type: "full",
        full_analysis: result.text,
        performance_summary: {
          avgViews,
          avgLikes,
          avgComments,
          avgEngagementRate: avgEng,
          totalPosts: posts.length,
        },
        funnel_distribution: funnelDist,
        top_hooks: posts
          .filter((p) => p.hook_text)
          .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
          .slice(0, 15)
          .map((p) => ({
            hookText: p.hook_text,
            hookType: p.hook_type,
            engagement: p.engagement_rate,
            views: p.views_count,
            funnelStage: p.funnel_stage,
          })),
        model_used: "claude-sonnet-4-6-20250610",
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_estimate: Math.round(costEstimate * 10000) / 10000,
      })
      .select()
      .single();

    // 8. Mark batch complete
    await supabaseAdmin
      .from("batches")
      .update({
        status: "completed",
        transcribed_posts: posts.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    return NextResponse.json({
      success: true,
      analysisId: analysis?.id,
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
        cost: `$${costEstimate.toFixed(4)}`,
      },
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
