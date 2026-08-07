-- Publicador multi-rede (BRD Central de Conteúdo → módulo do Content Intelligence)
-- Fluxo: vídeo → publicações por rede → métricas por publicação.
-- Amarração videos ⇄ transcript ⇄ publication_metrics é a base do agente da Fase 2.

-- 1. Vídeos enviados pelo Wallace (conteúdo próprio, não scrape)
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text not null,          -- caminho no bucket 'videos'
  public_url text not null,         -- URL pública (exigida pelas APIs de publicação)
  duration_seconds numeric,
  theme text,                       -- tema editável (sugerido pelo Haiku a partir da transcrição)
  transcript text,
  transcript_status text not null default 'pendente'
    check (transcript_status in ('pendente','processando','concluida','erro')),
  transcript_error text,
  direction_post_id uuid references direction_posts(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. Uma publicação por rede por vídeo
create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  network text not null check (network in ('youtube','instagram','tiktok')),
  title text,                       -- YouTube usa; IG/TikTok ignoram
  caption text,
  hashtags text,
  status text not null default 'rascunho'
    check (status in ('rascunho','agendado','publicando','publicado','falhou','cancelado')),
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id text,                 -- id do post na rede
  external_url text,
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists publications_queue_idx on publications (status, scheduled_at);
create index if not exists publications_video_idx on publications (video_id);

-- 3. Série temporal de métricas por publicação
create table if not exists publication_metrics (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references publications(id) on delete cascade,
  collected_at timestamptz not null default now(),
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  saves integer default 0
);
create index if not exists publication_metrics_pub_idx on publication_metrics (publication_id, collected_at desc);

-- 4. Bucket público de vídeos (URL pública é pré-requisito do publish da Graph API)
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- RLS: mesmas regras das demais tabelas do app (single-user, acesso via service role + usuário autenticado)
alter table videos enable row level security;
alter table publications enable row level security;
alter table publication_metrics enable row level security;

create policy "authenticated read videos" on videos for select to authenticated using (true);
create policy "authenticated read publications" on publications for select to authenticated using (true);
create policy "authenticated read publication_metrics" on publication_metrics for select to authenticated using (true);
