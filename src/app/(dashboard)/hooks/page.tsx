import { supabaseAdmin } from "@/lib/supabase";
import { Zap } from "lucide-react";

export const revalidate = 60;

export default async function HooksPage() {
  const { data: hooks } = await supabaseAdmin
    .from("hooks")
    .select("*, profiles(username)")
    .order("engagement_rate", { ascending: false })
    .limit(100);

  const hookTypes = [
    { type: "pergunta", label: "Pergunta", color: "bg-blue-500/10 text-blue-400" },
    { type: "afirmacao_chocante", label: "Afirmação Chocante", color: "bg-red-500/10 text-red-400" },
    { type: "curiosidade", label: "Curiosidade", color: "bg-yellow-500/10 text-yellow-400" },
    { type: "controversia", label: "Controvérsia", color: "bg-orange-500/10 text-orange-400" },
    { type: "promessa", label: "Promessa", color: "bg-green-500/10 text-green-400" },
    { type: "historia", label: "História", color: "bg-purple-500/10 text-purple-400" },
    { type: "pattern_interrupt", label: "Pattern Interrupt", color: "bg-pink-500/10 text-pink-400" },
    { type: "dado_estatistico", label: "Dado/Estatística", color: "bg-cyan-500/10 text-cyan-400" },
  ];

  const getHookColor = (type: string) =>
    hookTypes.find((h) => h.type === type)?.color || "bg-gray-500/10 text-gray-400";

  const getHookLabel = (type: string) =>
    hookTypes.find((h) => h.type === type)?.label || type;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Banco de Hooks</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Hooks extraídos e classificados por tipo e performance
        </p>
      </div>

      {/* Hook type summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {hookTypes.map((ht) => {
          const count = hooks?.filter((h) => h.hook_type === ht.type).length || 0;
          if (!count) return null;
          return (
            <span key={ht.type} className={`px-3 py-1 rounded-full text-xs font-medium ${ht.color}`}>
              {ht.label}: {count}
            </span>
          );
        })}
      </div>

      {!hooks?.length ? (
        <div className="glass-card p-12 text-center">
          <Zap className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum hook ainda</h3>
          <p className="text-[var(--muted-foreground)] text-sm">
            Hooks são extraídos automaticamente durante a análise de perfis.
          </p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-[var(--border)]">
          {hooks.map((hook, i) => (
            <div key={hook.id} className="p-4 flex items-start gap-4">
              <span className="text-sm font-mono text-[var(--muted-foreground)] w-6 pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">
                  &ldquo;{hook.hook_text}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getHookColor(hook.hook_type)}`}>
                    {getHookLabel(hook.hook_type)}
                  </span>
                  {hook.funnel_stage && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {hook.funnel_stage.toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    @{hook.profiles?.username}
                  </span>
                </div>
              </div>
              <div className="text-right text-xs shrink-0">
                <div>{hook.views_count?.toLocaleString("pt-BR")} views</div>
                <div className="text-[var(--muted-foreground)]">
                  {hook.engagement_rate}% eng
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
