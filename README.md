# Qamqor — Telegram Mini App

AI-помощники по здоровью, праву и финансам для граждан Казахстана.

## Что в проекте

- **Frontend**: Next.js 14 + React + Tailwind, открывается внутри Telegram
- **Backend**: Vercel Serverless Functions (`/api/chat`, `/api/auth`)
- **AI**: Google Gemini 2.5 Flash (бесплатно, 1500 запросов/день)
- **Auth**: Telegram WebApp `initData` с HMAC-валидацией на сервере

## Структура

```
qamqor/
├── app/
│   ├── api/
│   │   ├── chat/route.js      # Прокси к Gemini API (системные промпты живут тут)
│   │   └── auth/route.js      # Валидация Telegram initData
│   ├── globals.css            # Tailwind + Telegram theme vars
│   ├── layout.jsx             # Telegram WebApp SDK подключается тут
│   └── page.jsx               # Главный UI (все экраны)
├── lib/
│   ├── agents.js              # Конфигурация трёх агентов (UI-часть)
│   └── telegram.js            # Хелперы для Telegram WebApp
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.example
```

---

## Запуск локально

### 1. Установка зависимостей

```bash
cd qamqor
npm install
```

### 2. Получение API-ключей

**Google AI Studio (для Gemini):**
1. Перейти на https://aistudio.google.com/app/apikey
2. Войти Google-аккаунтом
3. "Create API key" → скопировать
4. Бесплатный тариф: 1500 запросов/день, не нужна карта

**Telegram Bot Token:**
1. Открыть @BotFather в Telegram
2. `/newbot` → дать имя → дать username (должен заканчиваться на `bot`)
3. Скопировать токен из ответа BotFather

### 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

```env
GOOGLE_AI_API_KEY=ваш_ключ_от_google
TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather
```

### 4. Запуск dev-сервера

```bash
npm run dev
```

Приложение откроется на http://localhost:3000

**Важно**: при локальном запуске Telegram-авторизация не работает (нет initData). Чтобы протестировать UI без Telegram, временно закомментируйте проверку в `app/page.jsx` или используйте ngrok для тоннеля (см. ниже).

---

## Деплой на Vercel (бесплатно)

### 1. Загрузка кода в GitHub

```bash
git init
git add .
git commit -m "initial commit"
# Создайте репозиторий на github.com, потом:
git remote add origin https://github.com/ВАШ_ЮЗЕР/qamqor.git
git push -u origin main
```

### 2. Подключение Vercel

1. Зайти на https://vercel.com и войти через GitHub
2. "Add New" → "Project" → выбрать репозиторий qamqor
3. Framework Preset: **Next.js** (определится автоматически)
4. **Environment Variables** — добавить:
   - `GOOGLE_AI_API_KEY` = ваш ключ
   - `TELEGRAM_BOT_TOKEN` = ваш токен
5. "Deploy"

Через ~2 минуты получите URL вида `https://qamqor.vercel.app`.

### 3. Привязка Mini App в BotFather

В @BotFather:

```
/mybots → выбрать вашего бота → Bot Settings → Menu Button → Configure menu button
```

Введите:
- **Button text**: `Открыть Qamqor`
- **URL**: `https://qamqor.vercel.app` (ваш Vercel URL)

Также через `/newapp` можно создать Mini App с описанием для каталога Telegram.

### 4. Проверка

Откройте чат с вашим ботом → нажмите кнопку меню → Mini App откроется внутри Telegram → авторизация пройдёт автоматически.

---

## Тестирование с локальной разработкой (ngrok)

Чтобы протестировать Telegram-авторизацию локально без деплоя:

```bash
# Установить ngrok: https://ngrok.com/download
ngrok http 3000
```

Получите URL вида `https://abc123.ngrok.io` → подставьте в BotFather как Menu Button URL. Теперь ваш локальный сервер доступен через Telegram.

---

## Что работает в текущей версии

✅ Авторизация через Telegram (HMAC-валидация на сервере)
✅ Три AI-агента с разными системными промптами (Доктор, Юрист, Финансист)
✅ История чатов сохраняется в localStorage между сессиями
✅ Ежедневный чек-ин со streak-системой
✅ Health/Finance score, рассчитываются динамически
✅ Тактильная обратная связь (вибрация) на устройствах
✅ Адаптация к теме Telegram (светлая/тёмная)
✅ Экран подписки (UI без оплаты)

---

## Что НЕ работает (нужно доделать)

### Критично для запуска

❌ **Платежи** — кнопка подписки только меняет статус. Подключить:
- **Telegram Stars** (для виртуальных платежей, проще всего) — см. https://core.telegram.org/bots/payments-stars
- **Kaspi Pay** (для тенге) — нужна юр.лицо и эквайринг

❌ **База данных** — сейчас данные хранятся в localStorage браузера, при смене устройства теряются. Подключить:
- **Supabase** (бесплатный Postgres, легко) или
- **Vercel Postgres** (интеграция в Vercel из коробки)

❌ **RAG для агентов** — сейчас агенты отвечают "из головы". Для серьёзной работы нужно:
- Загрузить кодексы РК (Трудовой, Гражданский, Налоговый) с adilet.zan.kz
- Сделать чанкинг и эмбеддинги (sentence-transformers `multilingual-e5-large` или Gemini Embedding)
- Хранить в PostgreSQL с pgvector
- Перед каждым запросом искать релевантные статьи и подкладывать в промпт

### Важно для качества

❌ **Парсинг файлов** — кнопка скрепки только мокает имя файла. Подключить:
- Анализы и договоры: загрузка в Gemini Vision (нативно понимает PDF и изображения)
- Альтернатива: PyMuPDF для PDF + Tesseract для OCR

❌ **Push-уведомления** — для retention. Через Telegram Bot API делать рассылки:
  - Ежедневное напоминание о чек-ине
  - Окончание пробного периода
  - Дедлайны (декларация ИП, продление договоров)

❌ **Аналитика** — нет отслеживания DAU/retention. Добавить:
- **Posthog** (бесплатно до 1M событий)
- Или **Yandex Metrika** (бесплатно)

❌ **Rate limiting** — без него один пользователь может выжрать весь дневной лимит Gemini. Добавить:
- Vercel Edge Config или
- Upstash Redis (бесплатный тариф)

❌ **Логирование** — нет наблюдаемости. Добавить:
- **Langfuse** (бесплатно) для трассировки запросов к LLM
- Или **Axiom** для общих логов

---

## Стоимость в проде (оценка)

При 100 активных пользователях в день:
- Vercel Hobby: **$0** (хватает на 100K req/мес)
- Gemini 2.5 Flash: **$0** (1500 req/день бесплатно — впритык, если каждый пользователь 15 запросов)
- Supabase free: **$0** (500MB БД, 2GB трафика)
- Домен .kz: **~$15/год** (опционально, Vercel-домен бесплатный)

**Итого: ~$0/мес для MVP**

При 1000+ активных пользователях:
- Vercel Pro: $20/мес или остаться на free с риском throttling
- Gemini paid tier: ~$30–50/мес на 1000 активных
- Supabase Pro: $25/мес (или остаться на free)

---

## Безопасность

✅ API-ключи только в env vars на сервере, никогда в браузере
✅ Telegram initData проверяется HMAC-подписью на сервере
✅ Системные промпты живут в `/api/chat`, не доступны с клиента
✅ CORS закрыт по умолчанию у Vercel

⚠️ **TODO** перед публичным запуском:
- Rate limiting на `/api/chat` (защита от абуза)
- Логирование подозрительной активности
- Согласие на обработку перс.данных (закон РК 94-V)
- Хостинг чувствительных данных в РК (для медицинских данных это требование)

---

## Полезные ссылки

- Telegram Mini Apps docs: https://core.telegram.org/bots/webapps
- Telegram Stars: https://core.telegram.org/bots/payments-stars
- Google AI Studio: https://aistudio.google.com
- Vercel Next.js Guide: https://vercel.com/docs/frameworks/nextjs
- Adilet (законы РК): https://adilet.zan.kz

---

## Поддержка

Прототип. Используйте на свой риск. AI-агенты не заменяют профессионалов.
