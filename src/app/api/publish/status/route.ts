import { NextResponse } from "next/server";
import { networkStatuses } from "@/lib/publishers";

// GET - Status de conexão das 3 redes (RF-01: status visível)
export async function GET() {
  return NextResponse.json({ networks: networkStatuses() });
}
