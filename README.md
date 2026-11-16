# mcmotorolla — дневник пройденных игр

Публичный сайт-дневник стримера [mcmotorolla](https://www.twitch.tv/mcmotorolla) (Twitch ·
[Telegram](https://t.me/mcmotoroller)): список пройденных игр
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

## Данные и авторизация (Supabase)

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
| `VITE_OWNER_PASSWORD` | только для локального режима (когда Supabase не настроен) |

Компоненты общаются с данными только через фасад `src/services/gamesRepository.js`
(`list / getBySlug / create / update / remove`), поэтому не знают, откуда приходят записи.

### Настройка Supabase (один раз)

1. Проект Supabase → **Project Settings → API**: скопировать Project URL и publishable key
   в `.env.local` и в Vercel.
2. **SQL Editor** → выполнить `supabase/0001_games.sql`: таблица `games`, индексы, триггер
   `updated_at`, RLS-политики и гранты. Скрипт идемпотентен, его можно запускать повторно.
   Затем — `supabase/0002_game_meta.sql`: колонки `release_year` и `steam_app_id` под
   автозаполнение из Steam (плюс разовая чистка старых пустых значений). Пока этот скрипт
   не применён, приложение продолжает сохранять игры, но без года и appid.
3. **Authentication → Users → Add user**: email владельца + пароль, включить
   **Auto Confirm User**.
4. **Authentication → Sign In / Providers → Email**: выключить **Allow new users to sign up** —
   регистрация закрыта, пользователь только один.
5. Проверка: `/admin` → вход по email и паролю → «Добавить игру» → начать вводить название,
   выбрать подсказку Steam, сохранить. Запись появляется на главной.
6. Проверка защиты (по желанию, из терминала): анонимный `GET /rest/v1/games` возвращает
   только опубликованные строки, а `POST` с publishable key — `401 permission denied`.

### Что защищено и как

| Операция | Кто | Условие |
| --- | --- | --- |
| `select` | все | только `published = true` |
| `select` | владелец | все свои записи, включая черновики |
| `insert / update / delete` | вошедший владелец | `owner_id = auth.uid()` |

Publishable key публичный — доступ к строкам ограничивает база через RLS. Secret key
(`sb_secret_...` / `service_role`) в браузерном коде не используется никогда.

## Доступ владельца

Владелец в проекте один: каждая запись привязана к `owner_id`, поэтому второй аккаунт
не увидит и не сможет править игры первого. Регистрация закрыта (`disable_signup`),
пароль знает только владелец.

- Пароль не хранится в открытом виде: Supabase держит bcrypt-хэш
  (`auth.users.encrypted_password`). Посмотреть пароль нельзя ни в Dashboard, ни через API.
- Практика: пароль лежит в менеджере паролей (Bitwarden, 1Password, браузер), а другу
  передаётся личным каналом, не в общем чате.
- Смена пароля из интерфейса `/admin` намеренно не сделана — при необходимости добавляется
  через `supabase.auth.updateUser({ password })`.
- Если пароль забыт или скомпрометирован: **Authentication → Users → ⋯ → Reset password**
  (письмо со ссылкой; встроенный SMTP free-тарифа ограничен по частоте) либо сброс через
  Admin API с secret key — только с локальной машины, ключ не попадает ни в Vercel, ни в бандл.

## Локальный режим (без Supabase)

Если переменные Supabase пустые, данные лежат в `localStorage` браузера
(`mcmotorolla.games.v1`) и дневник стартует пустым — никаких демо-записей нет. Вход — пароль
из `VITE_OWNER_PASSWORD` (по умолчанию `admin`). Это **не безопасность**: пароль попадает
в бандл. Режим нужен только для разработки интерфейса без бэкенда.

## Структура

```
src/
  components/     AppHeader, StatsBar, GamesToolbar, GameCard, RatingBadge,
                  RatingInput, GameFormDialog, GameDetail, LoginPanel, EmptyState
  composables/    useGames (состояние + фильтры), useAuth, useTheme
  config/         site.js — ник, ссылки, тексты
  router/         маршруты и заголовки страниц
  services/       gamesRepository.js (фасад), supabaseGamesRepo.js, supabaseClient.js,
                  localGamesRepo.js (localStorage), steamClient.js (автозаполнение)
  styles/         base.css — токены, тёмная/светлая тема
  utils/          slugify, format (даты, оценки, цвета)
  views/          HomeView, GameView, AdminView, NotFoundView
api/               _steamClient.js — клиент Steam Store API, steam.js — функция /api/steam
.github/workflows/ supabase-keepalive.yml — ежедневный пинг, чтобы free-проект не засыпал
supabase/          0001_games.sql — таблица games, RLS-политики, триггер updated_at;
                   0002_game_meta.sql — колонки release_year и steam_app_id;
                   cleanup_demo_games.sql — разовое удаление старого демо-набора
```

## Оценки

Оценка — целое число 1–10, отображается цветным бейджем:

- 9–10 — зелёный («великолепно»)
- 7–8 — салатовый («хорошо»)
- 5–6 — оранжевый («средне»)
- 1–4 — красный («слабо»)

## Автозаполнение из Steam

Форма игры (`/admin` → «Добавить игру») ищет название в Steam и подставляет **только
метаданные**: название, обложку 600×900, жанры и год выхода. Оценку, часы, вердикт и
описание владелец пишет сам — тексты Steam в дневник не попадают.

- Публичный Steam Store API не отдаёт CORS-заголовки, поэтому браузер ходит в свой прокси
  `GET /api/steam?action=search|game` (`api/steam.js` + `api/_steamClient.js`), ключи не нужны.
- В `npm run dev` Vercel-функций нет: тот же `/api/steam` обслуживает middleware
  `steamDevApi` из `vite.config.js`, так что код Steam-клиента один.
- Ответы кешируются: на CDN Vercel — неделя, в браузере — 10 минут (частые запросы к Steam
  начинают отдавать пустые ответы).
- Регион магазина в запросах — `cc=US` (в RU-каталоге нет части игр, например The Witcher 3),
  язык — `l=russian`, поэтому названия и жанры русские.
- Если Steam недоступен, форма остаётся рабочей: любое поле можно заполнить вручную.
- Своя обложка заменяет steam-овскую, кнопка «Убрать» очищает ссылку.

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
   - `/admin` — вход владельца, создание и удаление записи, перезагрузка страницы;
   - `/api/steam?action=search&q=Hades` — JSON с подсказками Steam (прокси-функция жива).

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
- Free-проект Supabase засыпает после ~7 дней без запросов — его будит workflow
  `.github/workflows/supabase-keepalive.yml` (см. ниже).

## Keep-alive Supabase

Free-проект Supabase засыпает после ~7 дней без запросов, и первый визит пользователя
ждёт холодный старт. Workflow `.github/workflows/supabase-keepalive.yml` раз в сутки
(04:17 UTC) делает `GET /rest/v1/games?select=id&limit=1` и падает, если ответ не `200`, —
так сбой виден в GitHub Actions.

- Ручной запуск: **Actions → Supabase keep-alive → Run workflow**.
- URL и publishable key зашиты как значения по умолчанию (они публичны и всё равно попадают
  в бандл); при желании переопределяются repository variable `SUPABASE_URL` и
  secret `SUPABASE_ANON_KEY` без правки файла.
- Расписание GitHub может задерживать запуск на несколько минут — для keep-alive это не важно.

## Дальше по плану

0. Git-репозиторий — готово: `main` → `origin/main`.
1. Vercel — готово: <https://mcmotorolla.vercel.app> (автодеплой из `main`).
2. Supabase — готово: `supabase/0001_games.sql` применён, переменные заданы в Vercel,
   вход владельца и CRUD проверены на проде, запись анониму закрыта.
3. Keep-alive для Supabase free-tier — готово: GitHub Actions-пинг раз в сутки.
4. Автозаполнение из Steam — готово: прокси `/api/steam`, подсказки названий, обложка,
   жанр и год (`supabase/0002_game_meta.sql`).
5. Бонусы: загрузка обложек в Supabase Storage, markdown в отзывах, смена пароля из
   `/admin`, ссылка на страницу игры в Steam.


## Лицензия

[MIT](./LICENSE)

