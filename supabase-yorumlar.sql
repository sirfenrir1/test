-- The Last Frame — Film yorumları
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
-- (supabase-kurulum.sql daha önce çalıştırılmış olmalı; birden fazla kez çalıştırmak güvenlidir.)

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  film_id    text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists comments_film_idx on public.comments (film_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "comments: herkes okur"     on public.comments;
drop policy if exists "comments: üye ekler"       on public.comments;
drop policy if exists "comments: sahibi siler"    on public.comments;

-- Herkes yorumları okuyabilir
create policy "comments: herkes okur" on public.comments
  for select using (true);

-- Giriş yapan üye yalnızca kendi adına yorum ekleyebilir
create policy "comments: üye ekler" on public.comments
  for insert to authenticated
  with check (user_id = auth.uid());

-- Üye yalnızca kendi yorumunu silebilir
create policy "comments: sahibi siler" on public.comments
  for delete to authenticated
  using (user_id = auth.uid());
