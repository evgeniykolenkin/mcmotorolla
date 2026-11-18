-- Тексты сайта и картинки: аватарка в шапке и фон главной секции.
-- Выполнить в Supabase → SQL Editor → Run ДО деплоя кода, который это использует.
-- Скрипт идемпотентен — можно запускать повторно.

-- ---------------------------------------------------------------------------
-- Таблица текстов: одна строка = одно поле (ключ → значение)
-- Ключи плоские: brand.nickname, hero.title, hero.bgUrl и т.п.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'Редактируемые из админки тексты и ссылки на картинки: brand.nickname, hero.title, hero.bgUrl и т.п.';

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "site_settings_owner_insert" on public.site_settings;
create policy "site_settings_owner_insert"
  on public.site_settings
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "site_settings_owner_update" on public.site_settings;
create policy "site_settings_owner_update"
  on public.site_settings
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "site_settings_owner_delete" on public.site_settings;
create policy "site_settings_owner_delete"
  on public.site_settings
  for delete
  to authenticated
  using (owner_id = auth.uid());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

-- updated_at обновляется тем же триггером, что и у games
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: публичный бакет media для аватарки (avatar/) и фона главной (hero/)
-- Читают все, пишет только вошедший владелец.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "media_owner_insert" on storage.objects;
create policy "media_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] in ('avatar', 'hero'));

drop policy if exists "media_owner_update" on storage.objects;
create policy "media_owner_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] in ('avatar', 'hero'));

drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] in ('avatar', 'hero'));

-- Проверка после запуска:
-- select key, value from public.site_settings order by key;
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'media';
