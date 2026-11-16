# mcmotorolla — дневник пройденных игр

Публичный сайт-дневник стримера [mcmotorolla](https://www.twitch.tv/mcmotorolla): список пройденных игр
с оценкой от 1 до 10 и заметками о прохождении. Читать может любой, редактировать — только владелец
через скрытую страницу `/admin`.

Код: [github.com/evgeniykolenkin/mcmotorolla](https://github.com/evgeniykolenkin/mcmotorolla) (MIT).

## Стек

| Что | Версия |
| --- | --- |
| Vue | 3.5 |
| Vite | 7.3 |
| PrimeVue (MIT) + `@primevue/themes` Aura | 4.5.5 / 4.5.4 |
| primeicons / primelocale (ru) | 8.0.2 / 2.7.0 |
| vue-router | 4.6 |
| @supabase/supabase-js | 2.119 |
| Postgres (Supabase) | — |

PrimeVue зафиксирован на 4.x намеренно: в 5.x сменилась лицензионная модель.

## Скрипты

```bash
npm install       # установка зависимостей
npm run dev       # http://localhost:5173
npm run build     # прод-сборка в dist/
npm run preview   # локальный просмотр сборки
```

## Страницы

| Путь | Что это |
| --- | --- |
| `/` | главная: статистика, поиск, фильтры, сетка игр |
| `/game/:slug` | страница игры: оценка, вывод, заметки о прохождении |
| `/admin` | вход владельца и CRUD-панель (для остальных — просто форма входа) |
| `*` | страница 404 |

## Данные и авторизация (этап 1: Supabase)

Игры хранятся в Postgres (Supabase), вход владельца — Supabase Auth (email + пароль).
Режим выбирается автоматически: если в `.env.local` заполнены `VITE_SUPABASE_URL` и
`VITE_SUPABASE_ANON_KEY` — работает Supabase, иначе приложение откатывается в локальный
режим (localStorage), чтобы интерфейс можно было смотреть без бэкенда.

```bash
cp .env.example .env.local   # Windows: Copy-Item .env.example .env.local
```

| Переменная | Что это |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL вида `https://<ref>.supabase.co` (без `/rest/v1/`) |
| `VITE_SUPABASE_ANON_KEY` | publishable key `sb_publishable_...` (не `sb_secret_...`!) |
| `VITE_OWNER_EMAIL` | email владельца; если пусто — поле email показывается в форме входа |
| `VITE_OWNER_PASSWORD` | только для локального режима (заглушка этапа 0) |

Компоненты общаются с данными только через фасад `src/services/gamesRepository.js`
(`list / getBySlug / create / update / remove / resetToDemo`), поэтому не знают, откуда
приходят записи.

### Настройка Supabase (один раз)

1. Проект Supabase → **Project Settings → API**: скопировать Project URL и publishable key
   в `.env.local` и в Vercel.
2. **SQL Editor** → выполнить `supabase/0001_games.sql`: таблица `games`, индексы, триггер
   `updated_at`, RLS-политики и гранты. Скрипт идемпотентен, его можно запускать повторно.
3. **Authentication → Users → Add user**: email владельца + пароль, включить
   **Auto Confirm User**.
4. **Authentication → Sign In / Providers → Email**: выключить **Allow new users to sign up** —
   регистрация закрыта, пользователь только один.
5. Проверка: `/admin` → вход по email и паролю → кнопка «Демо-данные» наполняет базу.

### Что защищено и как

| Операция | Кто | Условие |
| --- | --- | --- |
| `select` | все | только `published = true` |
| `select` | владелец | все свои записи, включая черновики |
| `insert / update / delete` | вошедший владелец | `owner_id = auth.uid()` |

Publishable key публичный — доступ к строкам ограничивает база через RLS. Secret key
(`sb_secret_...` / `service_role`) в браузерном коде не используется никогда.

## Локальный режим (этап 0)

Если переменные Supabase пустые, данные лежат в `localStorage` браузера
(`mcmotorolla.games.v1`), стартовый набор — 10 демо-игр из `src/data/demoGames.js`, вход —
пароль из `VITE_OWNER_PASSWORD` (по умолчанию `admin`). Это **не безопасность**: пароль
попадает в бандл. Режим нужен только для разработки интерфейса без бэкенда.

## Структура

```
src/
  components/     AppHeader, StatsBar, GamesToolbar, GameCard, RatingBadge,
                  RatingInput, GameFormDialog, GameDetail, LoginPanel, EmptyState
  composables/    useGames (состояние + фильтры), useAuth, useTheme
  config/         site.js — ник, ссылки, тексты
  data/           demoGames.js — стартовый набор
  router/         маршруты и заголовки страниц
  services/       gamesRepository.js (фасад), supabaseGamesRepo.js, supabaseClient.js,
                  localGamesRepo.js (localStorage)
  styles/         base.css — токены, тёмная/светлая тема
  utils/          slugify, format (даты, оценки, цвета)
  views/          HomeView, GameView, AdminView, NotFoundView
supabase/         0001_games.sql — таблица games, RLS-политики, триггер updated_at
```

## Оценки

Оценка — целое число 1–10, отображается цветным бейджем:

- 9–10 — зелёный («великолепно»)
- 7–8 — салатовый («хорошо»)
- 5–6 — оранжевый («средне»)
- 1–4 — красный («слабо»)

## Репозиторий и автодеплой

Репозиторий: <https://github.com/evgeniykolenkin/mcmotorolla> (public). Прод-ветка — `main`.

| Событие | Что происходит |
| --- | --- |
| push в `main` | Vercel пересобирает проект и обновляет прод |
| push в другую ветку / PR | Vercel делает preview-деплой и присылает ссылку |
| изменение env-переменных | применяется при следующем деплое |

### Первый деплой на Vercel (один раз)

1. [vercel.com](https://vercel.com) → **Add New → Project → Import Git Repository** →
   `evgeniykolenkin/mcmotorolla`.
2. Framework Preset: **Vite**. Build Command `npm run build`, Output Directory `dist` —
   уже зафиксированы в `vercel.json`, менять не нужно.
3. **Project Settings → Environment Variables** (добавить для Production и Preview):
   - `VITE_SUPABASE_URL` — Project URL Supabase;
   - `VITE_SUPABASE_ANON_KEY` — publishable key (`sb_publishable_...`);
   - `VITE_OWNER_EMAIL` — email владельца (необязательно);
   - `VITE_OWNER_PASSWORD` — только если нужен локальный режим.
4. Deploy. Прод: <https://mcmotorolla.vercel.app> (в РФ `*.vercel.app` может требовать VPN).
5. Смоук-тест прода:
   - `/` — карточки, статистика, поиск и фильтры;
   - прямой заход на `/game/elden-ring` — не 404 (работает SPA-rewrite);
   - `/admin` — вход владельца, создание и удаление записи, перезагрузка страницы.

### Рабочий цикл

```bash
git switch -c feat/название
# правки
git commit -am "feat: что сделано"
git push -u origin feat/название
# PR на GitHub → preview-ссылка от Vercel → merge в main → прод
```

- Откат: Vercel → **Deployments** → нужный деплой → ⋯ → **Promote to Production**
  (или Instant Rollback).
- Секреты живут только в Vercel (Project Settings → Environment Variables) и в локальном
  `.env.local`; `.env*` в git не попадает, шаблон — `.env.example`.
- Всё с префиксом `VITE_` попадает в клиентский бандл. Publishable key Supabase к этому
  готов по дизайну (доступ ограничивает RLS), а вот `VITE_OWNER_PASSWORD` — заглушка
  локального режима, а не защита.
- После перехода на Supabase free-проект может засыпать после ~7 дней без запросов — нужен
  keep-alive пинг (этап 3).

## Дальше по плану

0. Git-репозиторий — готово: `main` → `origin/main`.
1. Vercel — готово: <https://mcmotorolla.vercel.app> (автодеплой из `main`).
2. Supabase (этап 1) — код готов: таблица + RLS в `supabase/0001_games.sql`,
   `supabaseGamesRepo.js`, вход через Supabase Auth, регистрация закрыта.
   Осталось применить SQL в проекте и добавить переменные в Vercel.
3. Keep-alive для Supabase free-tier: GitHub Actions-пинг раз в пару дней, чтобы проект
   не засыпал после ~7 дней простоя.
4. Бонусы: загрузка обложек в Storage, автозаполнение из IGDB, markdown в отзывах.


## Лицензия

[MIT](./LICENSE)

