import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Callback OAuth do TikTok — registrado no portal dev (sandbox e produção).
// Reconectar: https://www.tiktok.com/v2/auth/authorize/?client_key=...&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=<esta rota>&state=ci
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code) return NextResponse.json({ error: "code ausente" }, { status: 400 });

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${req.nextUrl.origin}/api/tiktok/callback`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    return NextResponse.json({ error: json.error_description || json.error || "troca de code falhou" }, { status: 400 });
  }

  await supabaseAdmin.from("oauth_tokens").upsert(
    {
      provider: "tiktok",
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: new Date(Date.now() + (json.expires_in || 86400) * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + (json.refresh_expires_in || 31536000) * 1000).toISOString(),
      open_id: json.open_id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" }
  );

  return NextResponse.redirect(`${req.nextUrl.origin}/publicar?tiktok=conectado`);
}
