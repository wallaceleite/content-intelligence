import { supabaseAdmin } from "@/lib/supabase-admin";
import { Calendar } from "lucide-react";

export const revalidate = 60;

export default async function CalendarPage() {
  const { data: items } = await supabaseAdmin
    .from("calendar_items")
    .select("*, profiles(username)")
    .order("day_number", { ascending: true })
    .limit(30);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Calendário de Conteúdo</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Sugestões de conteúdo geradas pela análise
        </p>
      </div>

      {!items?.length ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum calendário ainda</h3>
          <p className="text-[var(--muted-foreground)] text-sm">
            O calendário é gerado automaticamente nas próximas versões.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">Dia {item.day_number}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${
                    item.funnel_stage === "tofu"
                      ? "bg-blue-500/10 text-blue-400"
                      : item.funnel_stage === "mofu"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {item.funnel_stage}
                </span>
              </div>
              <h3 className="text-sm font-medium mb-1">{item.topic}</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">
                Hook: {item.hook_angle}
              </p>
              {item.cta_type && (
                <span className="text-[10px] text-purple-400">CTA: {item.cta_type}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
