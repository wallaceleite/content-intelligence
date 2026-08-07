import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Páginas/arquivos públicos: legal (revisores TikTok/Google acessam deslogados)
  // e arquivos estáticos de verificação de domínio na raiz
  if (
    request.nextUrl.pathname === "/termos" ||
    request.nextUrl.pathname === "/privacidade" ||
    /\.(txt|xml|ico|png|svg|webmanifest)$/.test(request.nextUrl.pathname)
  ) {
    return supabaseResponse;
  }

  // Allow access to login page and auth callback
  if (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/auth")
  ) {
    // If logged in and trying to access login, redirect to dashboard
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/meu-perfil";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Allow all API routes (webhooks, analyze, generate, etc)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Protect everything else
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
