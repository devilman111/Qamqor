// /api/user/history?agent=lawyer
// GET — получить историю чатов с агентом
// DELETE — очистить историю с агентом
//
// Авторизация: через Telegram initData (HMAC). Пользователь видит ТОЛЬКО свои данные.
import { NextResponse } from 'next/server';
import { verifyTelegramInitData, getChatHistory, clearChatHistory } from '../../../../lib/user-data';

export async function POST(request) {
  // POST = GET history (т.к. в GET сложно передать большой initData)
  try {
    const { initData, agentId } = await request.json();
    const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['doctor', 'lawyer', 'financier'].includes(agentId)) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
    }

    const history = await getChatHistory(user.id, agentId);
    return NextResponse.json({ history });
  } catch (e) {
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { initData, agentId } = await request.json();
    const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['doctor', 'lawyer', 'financier'].includes(agentId)) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
    }

    await clearChatHistory(user.id, agentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
