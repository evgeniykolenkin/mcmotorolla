-- Удаление стартового демо-набора (10 игр), который раньше добавлялся кнопкой «Демо-данные».
-- Выполнить ОДИН РАЗ в Supabase → SQL Editor → Run.
--
-- Удаляются только записи, у которых одновременно совпадают slug и title,
-- поэтому игры, созданные вручную, не затрагиваются.

delete from public.games
where (slug, title) in (
  ('elden-ring', 'Elden Ring'),
  ('baldurs-gate-3', 'Baldur''s Gate 3'),
  ('disco-elysium', 'Disco Elysium'),
  ('the-witcher-3-wild-hunt', 'The Witcher 3: Wild Hunt'),
  ('sekiro-shadows-die-twice', 'Sekiro: Shadows Die Twice'),
  ('hades', 'Hades'),
  ('hollow-knight', 'Hollow Knight'),
  ('god-of-war-ragnarok', 'God of War Ragnarök'),
  ('cyberpunk-2077', 'Cyberpunk 2077'),
  ('stardew-valley', 'Stardew Valley')
);

-- Что осталось в таблице (для проверки):
-- select id, slug, title, rating, completed_at from public.games order by completed_at desc;
