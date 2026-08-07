import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH - Editar/reagendar/cancelar antes da publicação
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.caption !== undefined) updates.caption = body.caption;
    if (body.hashtags !== undefined) updates.hashtags = body.hashtags;
    if (body.scheduledAt !== undefined) {
      updates.scheduled_at = body.scheduledAt;
      updates.status = "agendado"; // reagendar reativa uma falha/cancelada
      updates.attempts = 0;
      updates.error_message = null;
    }
    if (body.status === "cancelado") updates.status = "cancelado";

    const { data, error } = await supabaseAdmin
      .from("publications")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ publication: data });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("publications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
