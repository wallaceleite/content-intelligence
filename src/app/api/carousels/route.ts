import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Table creation SQL - run this in Supabase SQL editor if table doesn't exist:
// CREATE TABLE IF NOT EXISTS carousels (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   template_id TEXT NOT NULL,
//   template_name TEXT NOT NULL,
//   category TEXT NOT NULL,
//   category_icon TEXT DEFAULT '',
//   funnel_stage TEXT NOT NULL,
//   topic TEXT NOT NULL,
//   angle TEXT,
//   custom_context TEXT,
//   cards JSONB NOT NULL DEFAULT '[]',
//   caption TEXT,
//   cta_word TEXT,
//   suggested_hook TEXT,
//   status TEXT NOT NULL DEFAULT 'revisao',
//   rejection_note TEXT,
//   cost TEXT,
//   input_tokens INTEGER DEFAULT 0,
//   output_tokens INTEGER DEFAULT 0,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );

// GET - List all carousels
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  let query = supabaseAdmin
    .from("carousels")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error?.code === "42P01") {
    return NextResponse.json({ data: [], needsSetup: true });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST - Create new carousel
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const row = {
      template_id: body.templateId,
      template_name: body.templateName,
      category: body.category,
      category_icon: body.categoryIcon || "",
      funnel_stage: body.funnelStage,
      topic: body.topic,
      angle: body.angle || null,
      custom_context: body.customContext || null,
      cards: body.cards,
      caption: body.caption || null,
      cta_word: body.ctaWord || null,
      suggested_hook: body.suggestedHook || null,
      status: "revisao",
      cost: body.cost || null,
      input_tokens: body.inputTokens || 0,
      output_tokens: body.outputTokens || 0,
    };

    const { data, error } = await supabaseAdmin
      .from("carousels")
      .insert(row)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
