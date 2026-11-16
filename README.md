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
| Supabase JS | этап 1 |

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

## Этап 0 (сейчас): локальный режим

Данные лежат в `localStorage` браузера (`mcmotorolla.games.v1`), стартовый набор — 10 демо-игр
из `src/data/demoGames.js`. Вход владельца — заглушка с паролем из `VITE_OWNER_PASSWORD`
(по умолчанию `admin`). Это **не безопасность**: пароль попадает в бандл. Нужно только чтобы
случайный посетитель не видел кнопки редактирования.

```bash
cp .env.example .env.local   # Windows: Copy-Item .env.example .env.local
```

Приложение общается с данными только через фасад `src/services/gamesRepository.js`
(`list / getBySlug / create / update / remove`), поэтому подмена локального репозитория на
Supabase не затрагивает компоненты.

## Структура

```
src/
  components/     AppHeader, StatsBar, GamesToolbar, GameCard, RatingBadge,
                  RatingInput, GameFormDialog, GameDetail, LoginPanel, EmptyState
  composables/    useGames (состояние + фильтры), useAuth, useTheme
  config/         site.js — ник, ссылки, тексты
  data/           demoGames.js — стартовый набор
  router/         маршруты и заголовки страниц
  services/       gamesRepository.js (фасад), localGamesRepo.js (localStorage)
  styles/         base.css — токены, тёмная/светлая тема
  utils/          slugify, format (даты, оценки, цвета)
  views/          HomeView, GameView, AdminView, NotFoundView
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
   - `VITE_OWNER_PASSWORD` — пароль владельца этапа 0;
   - позже `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Прод-ссылку вида `https://<project>.vercel.app` добавить в этот README.
5. Смоук-тест прода:
   - `/` — 10 карточек, статистика, поиск и фильтры;
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
- Всё с префиксом `VITE_` попадает в клиентский бандл, поэтому пароль этапа 0 — заглушка,
  а не защита. Настоящая авторизация — Supabase Auth (этап 2).
- После перехода на Supabase free-проект может засыпать после ~7 дней без запросов — нужен
  keep-alive пинг (этап 3).

## Дальше по плану

0. Git-репозиторий — готово: `main` → `origin/main`, 38 файлов на GitHub.
1. Vercel: импорт проекта, переменные окружения, первый деплой и смоук-тест прода.
2. Supabase: таблица `games`, RLS (`select` — всем, `insert/update/delete` — только админу),
   seed демо-данных, `supabaseGamesRepo.js`.
3. Настоящая авторизация владельца (Supabase Auth), регистрация закрыта.
4. Бонусы: загрузка обложек в Storage, автозаполнение из IGDB, markdown в отзывах.


## Лицензия

[MIT](./LICENSE)

