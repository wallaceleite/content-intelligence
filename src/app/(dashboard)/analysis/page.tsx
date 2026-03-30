import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { FileText, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const { data: analyses } = await supabaseAdmin
    .from("analyses")
    .select("*, profiles(username, full_name), batches(filtered_posts)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Histórico de Análises</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Todas as engenharias reversas realizadas
        </p>
      </div>

      {!analyses?.length ? (
        <div className="border border-[var(--border)] rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma análise ainda</h3>
          <p className="text-[var(--muted-foreground)] text-sm">
            As análises são geradas automaticamente após o scraping e transcrição.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/profiles/${analysis.profile_id}`}
              className="block border border-[var(--border)] rounded-xl p-6 bg-[var(--card)] hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">
                    {analysis.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      @{analysis.profiles?.username}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {analysis.profiles?.full_name}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-[var(--accent)]/10 text-[var(--accent)]">
                  {analysis.analysis_type}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {analysis.batches?.filtered_posts || "?"} posts
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${analysis.cost_estimate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(analysis.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                <span>{analysis.model_used}</span>
              </div>

              {analysis.funnel_distribution && (
                <div className="flex gap-3 mt-3">
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                    TOFU: {(analysis.funnel_distribution as any).tofu}
                  </span>
                  <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded">
                    MOFU: {(analysis.funnel_distribution as any).mofu}
                  </span>
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                    BOFU: {(analysis.funnel_distribution as any).bofu}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
