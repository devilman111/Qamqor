// Хелперы для общения с Telegram Bot API
// Используется на сервере (в webhook и cron)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// URL приложения для WebApp кнопок
function getAppUrl() {
  // Приоритет: явно заданный URL > production URL (стабильный) > deployment URL (меняется)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return '';
}

// Отправить сообщение пользователю
export async function sendMessage(chatId, text, options = {}) {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      })
    });
    return await res.json();
  } catch (e) {
    console.error('sendMessage error:', e);
    return null;
  }
}

// Отправить сообщение с кнопкой "Открыть Mini App"
export async function sendWithAppButton(chatId, text, buttonText = '🚀 Открыть Qamqor') {
  const appUrl = getAppUrl();
  return sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: buttonText, web_app: { url: appUrl } }
      ]]
    }
  });
}

// Установить webhook (вызывается один раз при настройке)
export async function setWebhook(webhookUrl) {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TG_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true
      })
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Получить инфо о webhook (для проверки)
export async function getWebhookInfo() {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TG_API}/getWebhookInfo`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Установить список команд бота (видны в меню)
export async function setMyCommands() {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TG_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Запустить Qamqor' },
          { command: 'app', description: 'Открыть приложение' },
          { command: 'help', description: 'Помощь' }
        ]
      })
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Установить Menu Button (синяя кнопка снизу в чате)
export async function setMenuButton() {
  if (!BOT_TOKEN) return null;
  const appUrl = getAppUrl();
  try {
    const res = await fetch(`${TG_API}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Открыть Qamqor',
          web_app: { url: appUrl }
        }
      })
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}
