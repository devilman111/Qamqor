// Telegram присылает сюда все сообщения и события
// Здесь обрабатываем /start, /help, /app
import { NextResponse } from 'next/server';
import { sendMessage, sendWithAppButton } from '../../../../lib/bot';
import { saveUser, touchUser } from '../../../../lib/db';

const WELCOME = `Привет! 👋

Я Qamqor — три AI-помощника в одном:
🩺 <b>Аружан</b> — медицинские вопросы и анализы
⚖️ <b>Дамир</b> — законы Казахстана
💰 <b>Ержан</b> — финансы и бюджет

Нажми кнопку ниже, чтобы открыть приложение.`;

const HELP = `<b>Команды:</b>
/start — главное меню
/app — открыть приложение
/help — это сообщение

<b>Вопросы?</b> Напиши нам в чат.

<i>Qamqor не заменяет профессионалов. AI-агенты дают информационные справки, для серьёзных решений обращайтесь к специалистам.</i>`;

export async function POST(request) {
  try {
    const update = await request.json();

    // Игнорируем callback_query и прочее, нас интересуют только message
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const from = message.from || {};
    const text = message.text.trim();

    // Сохраняем/обновляем пользователя при любом сообщении
    await saveUser(chatId, {
      firstName: from.first_name || '',
      lastName: from.last_name || '',
      username: from.username || '',
      languageCode: from.language_code || 'ru',
      lastCommand: text,
    });

    // Обработка команд
    if (text === '/start' || text.startsWith('/start ')) {
      await sendWithAppButton(chatId, WELCOME);
    } else if (text === '/app' || text === '/open') {
      await sendWithAppButton(chatId, 'Открой приложение, чтобы продолжить:');
    } else if (text === '/help') {
      await sendMessage(chatId, HELP);
    } else {
      // Любое другое сообщение — мягко напоминаем про Mini App
      await sendWithAppButton(
        chatId,
        'Чтобы пообщаться с AI-помощниками, открой приложение ⬇️'
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Возвращаем 200 чтобы Telegram не пытался переотправлять
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

// Telegram также может вызвать GET для проверки
export async function GET() {
  return NextResponse.json({ status: 'webhook active' });
}
