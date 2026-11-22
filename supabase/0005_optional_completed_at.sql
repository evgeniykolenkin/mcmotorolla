-- Дата прохождения может быть неизвестна.
-- Выполнить в Supabase → SQL Editor → Run ДО деплоя кода, который сохраняет «Не помню».
-- Скрипт идемпотентен — можно запускать повторно.

alter table public.games
  alter column completed_at drop not null;

comment on column public.games.completed_at is
  'Дата прохождения; null — дата неизвестна (в интерфейсе «Не помню»)';

-- Проверка:
-- select slug, title, completed_at from public.games order by completed_at desc nulls last;
