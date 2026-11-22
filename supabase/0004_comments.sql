-- Гостевые комментарии к играм.
-- Выполнить в Supabase → SQL Editor → Run ДО деплоя кода, который их использует.
-- Скрипт идемпотентен — можно запускать повторно.
--
-- Правила:
--   * читать может любой — только комментарии к опубликованным играм;
--   * писать может гость без регистрации — только к опубликованной игре;
--   * ответы одноуровневые: ответ на ответ запрещён;
--   * текст — до 500 символов, ник — до 40, ник необязателен;
--   * удалять может только владелец игры, ответы удаляются каскадно;
--   * простой лимит частоты и защита от точных дублей — в триггере.

-- ---------------------------------------------------------------------------
-- Таблица
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  author_name text not null default '',
  body        text not null,
  guest_id    uuid not null default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 500),
  constraint comments_author_length check (char_length(btrim(author_name)) <= 40),
  constraint comments_parent_not_self check (parent_id is null or parent_id <> id)
);

comment on table public.comments is
  'Гостевые комментарии к играм: один уровень ответов, без регистрации';
comment on column public.comments.guest_id is
  'Случайный id браузера: для анонимной подписи и простого лимита частоты, не для безопасности';
comment on column public.comments.parent_id is
  'Верхнеуровневый комментарий для ответа; ответ на ответ запрещён';

-- Ограничения длины пересоздаём: так 500 символов гарантированы и при повторном
-- запуске поверх уже созданной таблицы.
alter table public.comments drop constraint if exists comments_body_length;
alter table public.comments add constraint comments_body_length
  check (char_length(btrim(body)) between 1 and 500);

alter table public.comments drop constraint if exists comments_author_length;
alter table public.comments add constraint comments_author_length
  check (char_length(btrim(author_name)) <= 40);

alter table public.comments drop constraint if exists comments_parent_not_self;
alter table public.comments add constraint comments_parent_not_self
  check (parent_id is null or parent_id <> id);

create index if not exists comments_game_id_created_at_idx
  on public.comments (game_id, created_at desc);
create index if not exists comments_game_top_level_idx
  on public.comments (game_id, created_at desc)
  where parent_id is null;
create index if not exists comments_parent_id_created_at_idx
  on public.comments (parent_id, created_at);
create index if not exists comments_guest_id_created_at_idx
  on public.comments (guest_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Подготовка комментария: нормализация, проверки, лимит частоты
-- ---------------------------------------------------------------------------
-- security definer нужен, чтобы триггер мог проверить родителя и посчитать
-- частоту даже при колоночных грантах и RLS. Динамического SQL здесь нет,
-- search_path зафиксирован.
create or replace function public.prepare_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_game_id uuid;
  parent_parent_id uuid;
  recent_count integer;
  hour_count integer;
begin
  new.body := btrim(coalesce(new.body, ''));
  new.author_name := regexp_replace(
    btrim(coalesce(new.author_name, '')),
    '[[:cntrl:]]',
    '',
    'g'
  );
  new.guest_id := coalesce(new.guest_id, gen_random_uuid());
  new.created_at := now();
  new.updated_at := now();

  if char_length(new.body) = 0 then
    raise exception 'Введите комментарий' using errcode = '22023';
  end if;

  if char_length(new.body) > 500 then
    raise exception 'Комментарий не длиннее 500 символов' using errcode = '22023';
  end if;

  if char_length(new.author_name) > 40 then
    raise exception 'Ник не длиннее 40 символов' using errcode = '22023';
  end if;

  if new.author_name = '' then
    new.author_name := 'Аноним #' || upper(substr(replace(new.guest_id::text, '-', ''), 1, 4));
  end if;

  if new.parent_id is not null then
    select c.game_id, c.parent_id
      into parent_game_id, parent_parent_id
      from public.comments c
     where c.id = new.parent_id;

    if parent_game_id is null then
      raise exception 'Родительский комментарий не найден' using errcode = '23503';
    end if;

    if parent_game_id <> new.game_id then
      raise exception 'Ответ должен быть к комментарию этой же игры' using errcode = '22023';
    end if;

    if parent_parent_id is not null then
      raise exception 'Ответы на ответы пока недоступны' using errcode = '22023';
    end if;
  end if;

  -- Владелец может отвечать без ограничений; для гостя — простой тормоз от
  -- случайных двойных отправок и мелкого флуда. guest_id можно подменить,
  -- поэтому это не защита от целенаправленного бота.
  if auth.uid() is null then
    select count(*)
      into recent_count
      from public.comments c
     where c.guest_id = new.guest_id
       and c.created_at > now() - interval '15 seconds';

    if recent_count >= 1 then
      raise exception 'Слишком часто: подождите 15 секунд' using errcode = 'P0001';
    end if;

    select count(*)
      into hour_count
      from public.comments c
     where c.guest_id = new.guest_id
       and c.created_at > now() - interval '1 hour';

    if hour_count >= 10 then
      raise exception 'Слишком много комментариев: попробуйте позже' using errcode = 'P0001';
    end if;

    if exists (
      select 1
        from public.comments c
       where c.guest_id = new.guest_id
         and c.body = new.body
         and c.created_at > now() - interval '10 minutes'
    ) then
      raise exception 'Такой комментарий уже отправлен' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_prepare on public.comments;
create trigger comments_prepare
  before insert on public.comments
  for each row
  execute function public.prepare_comment();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read"
  on public.comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.games g
       where g.id = comments.game_id
         and (g.published or g.owner_id = auth.uid())
    )
  );

drop policy if exists "comments_guest_insert" on public.comments;
create policy "comments_guest_insert"
  on public.comments
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
        from public.games g
       where g.id = comments.game_id
         and g.published
    )
    and char_length(btrim(body)) between 1 and 500
    and char_length(btrim(author_name)) <= 40
  );

drop policy if exists "comments_owner_delete" on public.comments;
create policy "comments_owner_delete"
  on public.comments
  for delete
  to authenticated
  using (
    exists (
      select 1
        from public.games g
       where g.id = comments.game_id
         and g.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Гранты
-- ---------------------------------------------------------------------------
-- Читают все, вставляют все, удаляет только вошедший владелец.
-- Update намеренно не разрешён: гости не редактируют комментарии.
grant usage on schema public to anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (game_id, parent_id, author_name, body, guest_id)
  on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;

-- PostgREST кэширует схему — после новой таблицы сообщаем ему перечитать её.
notify pgrst, 'reload schema';

-- Проверка после запуска:
-- select id, game_id, parent_id, author_name, char_length(body) as len
--   from public.comments order by created_at desc limit 20;
