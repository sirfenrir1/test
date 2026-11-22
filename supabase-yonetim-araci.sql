-- The Last Frame — Film ekleme aracı için veritabanı ve depolama ayarları
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
-- (supabase-kurulum.sql daha önce çalıştırılmış olmalı; birden fazla kez çalıştırmak güvenlidir.)

-- 1) Filmlere altyazı alanı
alter table public.films
  add column if not exists subtitles jsonb not null default '[]'::jsonb;

-- 2) Depolama (Storage): yalnızca yönetici (profiles.role = 'admin') dosya yükleyebilir,
--    güncelleyebilir ve silebilir. Okuma, bucket "Public" olduğu için herkese açıktır.
--    Bucket adı: filimler ve filmler

drop policy if exists "filmler: yönetici yükler"    on storage.objects;
drop policy if exists "filmler: yönetici günceller" on storage.objects;
drop policy if exists "filmler: yönetici siler"     on storage.objects;

create policy "filmler: yönetici yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'filimler ve filmler' and public.is_admin());

create policy "filmler: yönetici günceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'filimler ve filmler' and public.is_admin())
  with check (bucket_id = 'filimler ve filmler' and public.is_admin());

create policy "filmler: yönetici siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'filimler ve filmler' and public.is_admin());

-- 3) Kendini yönetici yapmak (SADECE BİR KEZ; önce siteden normal üye ol).
--    Başındaki -- işaretlerini silip e-postanı yaz, sonra bu satırı çalıştır.

-- update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'SENIN_EPOSTAN@ornek.com');
