-- The Last Frame — Supabase kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
-- Birden fazla kez çalıştırmak güvenlidir (idempotent).

-- =====================================================================
-- 1) TABLOLAR
-- =====================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (char_length(username) between 3 and 20),
  bio        text not null default '' check (char_length(bio) <= 240),
  color      text not null default '#c5a46a',
  role       text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text not null,
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 5000),
  pinned     boolean not null default false,
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.replies (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.topics(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  film_id text not null,
  primary key (user_id, film_id)
);

create table if not exists public.films (
  id          text primary key,
  title       text not null,
  year        text,
  director    text,
  category    text not null,
  duration    text,
  country     text,
  language    text,
  description text,
  poster      text,
  video       text,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 2) YARDIMCI FONKSİYONLAR
-- =====================================================================

-- Giriş yapan kullanıcı yönetici mi? (RLS kurallarında kullanılır)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Yeni üye kaydolunca otomatik profil oluştur (rol her zaman 'member')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 'uye_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 3) SÜTUN YETKİLERİ
--    Üyeler profilde yalnızca bio ve color değiştirebilir; 'role' değiştirilemez.
-- =====================================================================

revoke update on public.profiles from anon, authenticated;
grant  update (bio, color) on public.profiles to authenticated;

-- =====================================================================
-- 4) ROW LEVEL SECURITY (kim neyi yapabilir)
-- =====================================================================

alter table public.profiles  enable row level security;
alter table public.topics    enable row level security;
alter table public.replies   enable row level security;
alter table public.favorites enable row level security;
alter table public.films     enable row level security;

-- profiles
drop policy if exists "profiles: herkes okur"      on public.profiles;
drop policy if exists "profiles: kendini günceller" on public.profiles;
create policy "profiles: herkes okur" on public.profiles
  for select using (true);
create policy "profiles: kendini günceller" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- topics
drop policy if exists "topics: herkes okur"         on public.topics;
drop policy if exists "topics: üye ekler"           on public.topics;
drop policy if exists "topics: yönetici günceller"  on public.topics;
drop policy if exists "topics: sahibi veya yönetici siler" on public.topics;
create policy "topics: herkes okur" on public.topics
  for select using (true);
create policy "topics: üye ekler" on public.topics
  for insert to authenticated
  with check (user_id = auth.uid() and pinned = false and locked = false);
create policy "topics: yönetici günceller" on public.topics
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "topics: sahibi veya yönetici siler" on public.topics
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- replies (kilitli konuya yanıt yazılamaz)
drop policy if exists "replies: herkes okur"          on public.replies;
drop policy if exists "replies: üye ekler"            on public.replies;
drop policy if exists "replies: sahibi veya yönetici siler" on public.replies;
create policy "replies: herkes okur" on public.replies
  for select using (true);
create policy "replies: üye ekler" on public.replies
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.topics t where t.id = topic_id and t.locked)
  );
create policy "replies: sahibi veya yönetici siler" on public.replies
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- favorites (herkes yalnızca kendi listesini görür/değiştirir)
drop policy if exists "favorites: kendi listesi" on public.favorites;
create policy "favorites: kendi listesi" on public.favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- films (herkes okur, yalnızca yönetici ekler/değiştirir/siler)
drop policy if exists "films: herkes okur"       on public.films;
drop policy if exists "films: yönetici yönetir"  on public.films;
create policy "films: herkes okur" on public.films
  for select using (true);
create policy "films: yönetici yönetir" on public.films
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 5) İLK YÖNETİCİ
--    Önce siteden normal üye ol, sonra aşağıdaki satırı (e-postanı yazarak)
--    SADECE BİR KEZ, SQL Editor'dan çalıştır. Başka kimse kendini yönetici yapamaz.
-- =====================================================================

-- update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'SENIN_EPOSTAN@ornek.com');
