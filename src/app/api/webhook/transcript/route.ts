import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Receives transcription webhook from AssemblyAI (via n8n)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, batchId, transcript } = body;

    if (!postId || !transcript) {
      return NextResponse.json(
        { error: "Missing postId or transcript" },
        { status: 400 }
      );
    }

    // Update post with transcript
    const { error: updateError } = await supabaseAdmin
      .from("posts")
      .update({
        transcript,
        transcription_status: "completed",
      })
      .eq("shortcode", postId);

    if (updateError) throw updateError;

    // Check if all posts in batch are transcribed
    if (batchId) {
      const { data: batch } = await supabaseAdmin
        .from("batches")
        .select("id")
        .eq("batch_id", batchId)
        .single();

      if (batch) {
        const { count: pending } = await supabaseAdmin
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", batch.id)
          .eq("transcription_status", "pending")
          .eq("post_type", "video");

        const allDone = (pending || 0) === 0;

        if (allDone) {
          // Update batch status
          await supabaseAdmin
            .from("batches")
            .update({ status: "classifying" })
            .eq("id", batch.id);

          // Trigger classification + analysis pipeline
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
          fetch(`${baseUrl}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batchId: batch.id }),
          }).catch(console.error);
        }

        return NextResponse.json({
          success: true,
          allTranscribed: allDone,
          pending: pending || 0,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Transcript webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
