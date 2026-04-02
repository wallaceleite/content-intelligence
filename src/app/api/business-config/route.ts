import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("business_config")
    .select("section, data, updated_at")
    .order("section");

  const config: Record<string, any> = {};
  for (const row of data || []) {
    config[row.section] = row.data;
  }
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { section, data } = body;

  if (!section || !data) {
    return NextResponse.json({ error: "Missing section or data" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("business_config")
    .upsert(
      { section, data, updated_at: new Date().toISOString() },
      { onConflict: "section" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, section });
}
