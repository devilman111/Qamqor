// Регистрация пользователя в БД когда он впервые открыл Mini App
// (если ещё нет, или обновить если уже есть)
import { NextResponse } from 'next/server';
import { saveUser } from '../../../../lib/db';
import crypto from 'crypto';

function verifyTelegramData(initData, botToken) {
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

export async function POST(request) {
  try {
    const { initData } = await request.json();
    if (!initData) return NextResponse.json({ error: 'No initData' }, { status: 400 });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const user = verifyTelegramData(initData, botToken);
    if (!user) return NextResponse.json({ error: 'Invalid' }, { status: 401 });

    await saveUser(user.id, {
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
      languageCode: user.language_code || 'ru',
      source: 'mini_app'
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
