import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyPost, classifyComments } from "@/lib/classifier";
import { analyzeWithSonnet } from "@/lib/anthropic";
import { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 300; // 5 min timeout for long analysis

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

    // 3. PHASE: Classify posts with Haiku
    await supabaseAdmin
      .from("batches")
      .update({ status: "classifying" })
      .eq("id", batchId);

    for (const post of posts) {
      if (post.classification_status === "completed") continue;

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

        // Also save to hooks bank
        if (classification.hookText) {
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

    // 4. PHASE: Classify comments with Haiku
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

    // 5. PHASE: Build analysis with Sonnet
    await supabaseAdmin
      .from("batches")
      .update({ status: "analyzing" })
      .eq("id", batchId);

    // Re-fetch posts with updated classifications
    const { data: classifiedPosts } = await supabaseAdmin
      .from("posts")
      .select("*")
      .eq("batch_id", batchId)
      .order("engagement_rate", { ascending: false });

    // Get comment summaries per post
    const postDataForPrompt = [];
    for (const post of classifiedPosts || []) {
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
              .filter((c) => ["purchase_intent", "objection", "audience_voice"].includes(c.intent_type || ""))
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
      tofu: classifiedPosts?.filter((p) => p.funnel_stage === "tofu").length || 0,
      mofu: classifiedPosts?.filter((p) => p.funnel_stage === "mofu").length || 0,
      bofu: classifiedPosts?.filter((p) => p.funnel_stage === "bofu").length || 0,
    };

    const profile = batch.profiles;
    const avgViews = Math.round(
      (classifiedPosts || []).reduce((s, p) => s + p.views_count, 0) / (classifiedPosts?.length || 1)
    );
    const avgLikes = Math.round(
      (classifiedPosts || []).reduce((s, p) => s + p.likes_count, 0) / (classifiedPosts?.length || 1)
    );
    const avgComments = Math.round(
      (classifiedPosts || []).reduce((s, p) => s + p.comments_count, 0) / (classifiedPosts?.length || 1)
    );
    const avgEng =
      Math.round(
        ((classifiedPosts || []).reduce((s, p) => s + (p.engagement_rate || 0), 0) /
          (classifiedPosts?.length || 1)) *
          100
      ) / 100;

    const prompt = buildAnalysisPrompt(
      {
        username: profile.username,
        fullName: profile.full_name || "",
        bio: profile.bio,
        bioLink: profile.bio_link,
        followers: profile.followers_count,
        totalPosts: classifiedPosts?.length || 0,
        avgViews,
        avgLikes,
        avgComments,
        avgEngagementRate: avgEng,
        funnelDistribution: funnelDist,
      },
      postDataForPrompt
    );

    const result = await analyzeWithSonnet(ANALYSIS_SYSTEM_PROMPT, prompt);

    // 6. Save analysis
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
          totalPosts: classifiedPosts?.length,
        },
        funnel_distribution: funnelDist,
        top_hooks: (classifiedPosts || [])
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
        model_used: "claude-sonnet-4-20250514",
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_estimate: Math.round(costEstimate * 10000) / 10000,
      })
      .select()
      .single();

    // 7. Mark batch complete
    await supabaseAdmin
      .from("batches")
      .update({
        status: "completed",
        transcribed_posts: classifiedPosts?.length || 0,
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
