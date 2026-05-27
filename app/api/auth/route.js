// /api/auth — проверка подлинности данных от Telegram
// Telegram передаёт initData в Mini App, мы должны проверить HMAC

import { NextResponse } from 'next/server';
import crypto from 'crypto';

function verifyTelegramData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return null;

  urlParams.delete('hash');
  // Сортируем параметры алфавитно — это требование Telegram
  const dataCheckArr = [];
  urlParams.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  // Вычисляем секретный ключ из токена бота
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Вычисляем HMAC от строки проверки
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) return null;

  // Проверим, что данные свежие (не старше 24 часов)
  const authDate = parseInt(urlParams.get('auth_date') || '0');
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) return null;

  const userJson = urlParams.get('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const { initData } = await request.json();

    if (!initData) {
      return NextResponse.json({ error: 'No initData' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const user = verifyTelegramData(initData, botToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 });
    }

    // В production здесь бы сохраняли пользователя в БД
    // Для MVP — просто возвращаем валидированные данные
    return NextResponse.json({
      verified: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name || '',
        username: user.username || '',
        languageCode: user.language_code || 'ru'
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
