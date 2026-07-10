-- Fase 0: conserta strategy_benchmarks (colunas que a UI usa + seed)
-- e formaliza a tabela carousels (antes só existia como SQL em comentário).

-- 1. Colunas usadas pela página /estrategia
alter table strategy_benchmarks add column if not exists category text;
alter table strategy_benchmarks add column if not exists description text;
create unique index if not exists strategy_benchmarks_key_idx on strategy_benchmarks (key);

-- 2. Seed de benchmarks (fonte: @rafaelkiso / mLabs / aula 22 Vinci)
insert into strategy_benchmarks (key, label, value, unit, category, description) values
  ('min_posts_week',   'Posts por semana (mínimo)', 7,  'posts', 'frequencia', 'Mínimo para crescimento consistente; perfis que postam 10+/semana crescem mais rápido'),
  ('ideal_tofu',       'Funil ideal — TOFU',        50, '%',     'funil',      'Conteúdo de atração/descoberta'),
  ('ideal_mofu',       'Funil ideal — MOFU',        35, '%',     'funil',      'Conteúdo de conexão/autoridade'),
  ('ideal_bofu',       'Funil ideal — BOFU',        15, '%',     'funil',      'Conteúdo de conversão/venda'),
  ('save_rate_good',   'Save rate saudável',        2,  '%',     'engajamento','Acima de 2% indica alta intenção de compra do público'),
  ('eng_small_profile','Engajamento perfil pequeno',6,  '%',     'engajamento','Referência para 10-20k seguidores (até 10% para perfis menores)'),
  ('howto_engagement', 'Engajamento vídeos how-to', 82, '%',     'formato',    'Vídeos "como fazer" têm o maior engajamento do formato vídeo (mLabs)')
on conflict (key) do update set
  label = excluded.label, value = excluded.value, unit = excluded.unit,
  category = excluded.category, description = excluded.description;

-- 3. Tabela carousels (usada pelo gerador/Kanban)
create table if not exists carousels (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  template_name text,
  category text,
  category_icon text,
  funnel_stage text,
  topic text not null,
  angle text,
  custom_context text,
  cards jsonb not null,
  caption text,
  cta_word text,
  suggested_hook text,
  status text not null default 'revisao'
    check (status in ('revisao','aprovado','produzindo','publicado','reprovado')),
  review_note text,
  cost text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
