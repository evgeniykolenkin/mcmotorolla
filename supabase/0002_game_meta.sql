-- Метаданные из Steam: год выхода и appid игры.
-- Выполнить в Supabase → SQL Editor → Run ДО деплоя кода, который эти поля использует.
-- Скрипт идемпотентен — можно запускать повторно.

alter table public.games add column if not exists release_year smallint;
alter table public.games add column if not exists steam_app_id integer;

comment on column public.games.release_year is
  'Год выхода игры — подставляется из Steam, можно поправить вручную';
comment on column public.games.steam_app_id is
  'Steam appid — для повторного автозаполнения карточки и ссылки на магазин';

create index if not exists games_steam_app_id_idx on public.games (steam_app_id);

-- ---------------------------------------------------------------------------
-- Чистка мусора: раньше пустая обложка могла сохраниться строкой 'null'
-- (String(null) в старом маппинге). Пустые строки безопаснее заменить на null/''.
-- ---------------------------------------------------------------------------
update public.games set cover_url = null where cover_url = 'null';
update public.games set genre = '' where genre = 'null';
update public.games set verdict = '' where verdict = 'null';
update public.games set review = '' where review = 'null';

-- Проверка:
-- select slug, release_year, steam_app_id, cover_url from public.games order by completed_at desc;
