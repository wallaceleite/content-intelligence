import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Users, TrendingUp, Eye, MessageSquare } from "lucide-react";

export const revalidate = 60;

export default async function ProfilesPage() {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("*, batches(id, status, created_at, filtered_posts)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Perfis Analisados</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Inteligência de conteúdo extraída de cada perfil
          </p>
        </div>
      </div>

      {!profiles?.length ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum perfil ainda</h3>
          <p className="text-[var(--muted-foreground)] text-sm max-w-md mx-auto">
            Execute o workflow no n8n para scraper um perfil do Instagram. Os dados aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const lastBatch = profile.batches?.sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            return (
              <Link
                key={profile.id}
                href={`/profiles/${profile.id}`}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                    {profile.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">@{profile.username}</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {profile.full_name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {profile.followers_count && (
                    <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Users className="w-3.5 h-3.5" />
                      {profile.followers_count.toLocaleString("pt-BR")}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <Eye className="w-3.5 h-3.5" />
                    {profile.batches?.length || 0} análises
                  </div>
                </div>

                {lastBatch && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-foreground)]">
                      {lastBatch.filtered_posts} posts
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        lastBatch.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : lastBatch.status === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {lastBatch.status}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
