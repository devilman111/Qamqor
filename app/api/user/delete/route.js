// /api/user/delete — удалить ВСЕ данные пользователя (право на забвение)
// POST { initData, confirmation: "DELETE_MY_DATA" }
import { NextResponse } from 'next/server';
import { verifyTelegramInitData, deleteAllUserData } from '../../../../lib/user-data';

export async function POST(request) {
  try {
    const { initData, confirmation } = await request.json();

    const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Защита от случайного удаления — нужно явное подтверждение
    if (confirmation !== 'DELETE_MY_DATA') {
      return NextResponse.json({
        error: 'Confirmation required',
        message: 'Передайте {"confirmation": "DELETE_MY_DATA"} для подтверждения'
      }, { status: 400 });
    }

    const deleted = await deleteAllUserData(user.id);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
