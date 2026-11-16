-- Таблица игр для дневника mcmotorolla.
-- Выполнить целиком в Supabase → SQL Editor → Run. Скрипт идемпотентен.

-- ---------------------------------------------------------------------------
-- Таблица
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  cover_url text,
  platform text not null default 'ПК',
  genre text not null default '',
  rating smallint not null check (rating between 1 and 10),
  hours numeric(6, 1),
  completed_at date not null default current_date,
  verdict text not null default '',
  review text not null default '',
  status text not null default 'completed',
  published boolean not null default true,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.games is 'Пройденные игры: оценка 1–10, часы, вердикт и отзыв';

create index if not exists games_completed_at_idx on public.games (completed_at desc);
create index if not exists games_published_idx on public.games (published);
create index if not exists games_owner_id_idx on public.games (owner_id);

-- ---------------------------------------------------------------------------
-- updated_at обновляется триггером
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
  before update on public.games
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: читают все (черновики — только владелец), пишет только владелец
-- ---------------------------------------------------------------------------
alter table public.games enable row level security;

drop policy if exists "games_public_read" on public.games;
create policy "games_public_read"
  on public.games
  for select
  to anon, authenticated
  using (published or owner_id = auth.uid());

drop policy if exists "games_owner_insert" on public.games;
create policy "games_owner_insert"
  on public.games
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "games_owner_update" on public.games;
create policy "games_owner_update"
  on public.games
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "games_owner_delete" on public.games;
create policy "games_owner_delete"
  on public.games
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Гранты (в проекте отключено «Automatically expose new tables»)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.games to anon, authenticated;
grant insert, update, delete on public.games to authenticated;
