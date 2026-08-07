import { NextRequest, NextResponse } from "next/server";
import { suggestCaptions } from "@/lib/suggest-captions";

export const maxDuration = 120;

// POST - (Re)gera legendas/título/# a partir da transcrição já salva
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await suggestCaptions(id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, suggestions: result.suggestions });
}
