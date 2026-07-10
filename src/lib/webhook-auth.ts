import { NextRequest } from "next/server";

// Autenticação de webhook por segredo compartilhado.
// Gate por env: só é exigido quando WEBHOOK_SECRET está definido —
// permite ativar sem quebrar o n8n (1. define env aqui; 2. adiciona o
// header "x-webhook-secret" nos nós HTTP do n8n; ambos ativos = protegido).
export function isWebhookAuthorized(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // gate desligado
  return req.headers.get("x-webhook-secret") === secret;
}
