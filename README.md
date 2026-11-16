# mcmotorolla — дневник пройденных игр

Публичный сайт-дневник стримера [mcmotorolla](https://www.twitch.tv/mcmotorolla): список пройденных игр
с оценкой от 1 до 10 и заметками о прохождении. Читать может любой, редактировать — только владелец
через скрытую страницу `/admin`.

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

## Деплой на Vercel

1. Импортировать репозиторий в Vercel (framework определится как Vite).
2. Добавить переменные окружения (`VITE_OWNER_PASSWORD`, позже `VITE_SUPABASE_URL` и
   `VITE_SUPABASE_ANON_KEY`) в Project Settings → Environment Variables.
3. `vercel.json` уже содержит rewrite на `index.html`, чтобы прямые ссылки на `/game/...`
   и `/admin` не отдавали 404.

После перехода на Supabase free-проект может засыпать после ~7 дней без запросов — нужен
keep-alive пинг (этап 3).

## Дальше по плану

1. Supabase: таблица `games`, RLS (`select` — всем, `insert/update/delete` — только админу),
   seed демо-данных, `supabaseGamesRepo.js`.
2. Настоящая авторизация владельца (Supabase Auth), регистрация закрыта.
3. Деплой и смоук-тест на проде.
4. Бонусы: загрузка обложек в Storage, автозаполнение из IGDB, markdown в отзывах.

## Лицензия

[MIT](./LICENSE)

