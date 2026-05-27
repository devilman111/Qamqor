// Запускается Vercel Cron раз в день в 04:00 UTC (10:00 Астана)
// Шлёт всем пользователям персонализированный пуш
import { NextResponse } from 'next/server';
import { getAllUsers, didCheckInToday } from '../../../../lib/db';
import { sendWithAppButton } from '../../../../lib/bot';

// Варианты сообщений (каждый день — что-то новое)
const DAILY_MESSAGES = [
  {
    title: '🌅 Доброе утро',
    body: 'Время сделать чек-ин — сон, вода, настроение. 30 секунд, а streak растёт.'
  },
  {
    title: '💡 Совет дня от Ержана',
    body: 'Правило 50/30/20: 50% — на нужды, 30% — на желания, 20% — в накопления. Посчитай свой бюджет.'
  },
  {
    title: '⚖️ Знаешь ли ты',
    body: 'По Трудовому кодексу РК работодатель не может уволить за одно опоздание. Спроси Дамира.'
  },
  {
    title: '🩺 Чек здоровья',
    body: 'Когда последний раз сдавал ОАК? Аружан поможет расшифровать твои анализы.'
  },
  {
    title: '🔥 Сохраняй streak!',
    body: 'Зайди на минуту, отметь чек-ин — не теряй прогресс.'
  },
  {
    title: '💸 Налоги для ИП',
    body: 'ИП по упрощёнке платит 3% от оборота. Спроси Ержана как посчитать.'
  },
  {
    title: '😴 Качество сна',
    body: 'Норма для взрослого — 7-9 часов. Аружан расскажет как улучшить сон.'
  }
];

function pickMessage() {
  // Выбираем сообщение по дню месяца, чтобы оно было одинаковым в течение дня но менялось каждый день
  const day = new Date().getDate();
  return DAILY_MESSAGES[day % DAILY_MESSAGES.length];
}

export async function GET(request) {
  // Проверка авторизации — Vercel Cron присылает специальный header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Если CRON_SECRET установлен, проверяем
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getAllUsers();
  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users yet' });
  }

  const msg = pickMessage();
  const text = `<b>${msg.title}</b>\n\n${msg.body}`;

  const results = { sent: 0, failed: 0, total: users.length };

  // Шлём по очереди с маленькой задержкой (Telegram лимит ~30 сообщений/сек)
  for (const user of users) {
    try {
      // Опциональная персонализация — обращаемся по имени
      const personalText = user.firstName
        ? text.replace(msg.title, `${msg.title}, ${user.firstName}`)
        : text;

      const res = await sendWithAppButton(user.chatId, personalText, '⚡ Открыть');
      if (res?.ok) results.sent++;
      else results.failed++;

      // Маленькая задержка чтобы не упереться в лимит Telegram
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      results.failed++;
    }
  }

  return NextResponse.json({
    ...results,
    timestamp: new Date().toISOString(),
    message: msg
  });
}
