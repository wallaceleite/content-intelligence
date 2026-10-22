-- Capa do Reels anexada no /publicar: JPEG público no bucket 'videos' (pasta capas/).
-- O Instagram recebe como cover_url na criação do container. YouTube Shorts e
-- TikTok (modo inbox) não aceitam capa pela API, então a coluna é usada só no IG.
alter table videos add column if not exists cover_url text;
