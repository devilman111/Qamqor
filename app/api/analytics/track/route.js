// /api/analytics/track — приём событий с клиента
// Безопасно: telegramId извлекается из верифицированного initData
import { NextResponse } from 'next/server';
import { trackEvent } from '../../../../lib/analytics';
import crypto from 'crypto';

function verifyTelegramData(initData, botToken) {
  if (!initData) return null;
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return null;
  urlParams.delete('hash');
  const arr = [];
  urlParams.forEach((v, k) => arr.push(`${k}=${v}`));
  arr.sort();
  const dataCheckString = arr.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (calculatedHash !== hash) return null;
  const userJson = urlParams.get('user');
  if (!userJson) return null;
  try { return JSON.parse(userJson); } catch { return null; }
}

const ALLOWED_EVENTS = ['agent_open', 'checkin', 'subscription_clicked', 'login'];

export async function POST(request) {
  try {
    const { event, initData, data = {} } = await request.json();

    if (!ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
    }

    let userId = null;
    if (initData) {
      const user = verifyTelegramData(initData, process.env.TELEGRAM_BOT_TOKEN);
      userId = user?.id;
    }

    await trackEvent(event, { userId, ...data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
