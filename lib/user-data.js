// Управление данными пользователя на сервере с шифрованием
// История чатов и документы — зашифрованы. Профиль — нет (не sensitive).

import { encryptJson, decryptJson } from './encryption';
import crypto from 'crypto';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });
    const data = await res.json();
    return data.result;
  } catch { return null; }
}

// ========== АВТОРИЗАЦИЯ ==========

/**
 * Проверить initData от Telegram. Возвращает user или null.
 * ВАЖНО: эту функцию вызываем ПЕРЕД любой операцией с данными,
 * чтобы пользователь не мог получить чужие данные.
 */
export function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

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

  // Проверяем что данные свежие (24 часа)
  const authDate = parseInt(urlParams.get('auth_date') || '0');
  if (Math.floor(Date.now() / 1000) - authDate > 86400) return null;

  try {
    return JSON.parse(urlParams.get('user') || '{}');
  } catch {
    return null;
  }
}

// ========== ПРОФИЛЬ ==========
// Хранится в plaintext — не sensitive (имя, telegramId публичны)

export async function getUserProfile(chatId) {
  const data = await redis(['GET', `user:${chatId}`]);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export async function upsertUserProfile(chatId, data) {
  const existing = await getUserProfile(chatId);
  const profile = {
    chatId,
    ...existing,
    ...data,
    updatedAt: new Date().toISOString()
  };
  if (!profile.joinedAt) profile.joinedAt = new Date().toISOString();
  if (!profile.subscription) profile.subscription = 'trial';
  if (!profile.trialEndsAt) {
    profile.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  await redis(['SET', `user:${chatId}`, JSON.stringify(profile)]);
  await redis(['SADD', 'users:all', String(chatId)]);
  return profile;
}

// ========== ИСТОРИЯ ЧАТОВ ==========
// Содержимое сообщений ЗАШИФРОВАНО — могут быть мед/юр/фин данные

const MAX_HISTORY = 50;  // храним последние 50 сообщений на агента

export async function getChatHistory(chatId, agentId) {
  const data = await redis(['GET', `chat:${chatId}:${agentId}`]);
  if (!data) return [];
  const decrypted = decryptJson(data);
  return Array.isArray(decrypted) ? decrypted : [];
}

export async function appendChatMessages(chatId, agentId, newMessages) {
  const history = await getChatHistory(chatId, agentId);
  const updated = [...history, ...newMessages].slice(-MAX_HISTORY);

  const encrypted = encryptJson(updated);
  if (!encrypted) return false;

  await redis(['SET', `chat:${chatId}:${agentId}`, encrypted]);
  return true;
}

export async function clearChatHistory(chatId, agentId) {
  await redis(['DEL', `chat:${chatId}:${agentId}`]);
  return true;
}

// ========== СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ==========
// Streak, health/finance scores и т.д. — не sensitive, хранится в plaintext

export async function getUserStats(chatId) {
  const data = await redis(['GET', `stats:${chatId}`]);
  if (!data) return { streak: 0, healthScore: 72, financeScore: 65, totalCheckins: 0 };
  try { return JSON.parse(data); } catch { return null; }
}

export async function updateUserStats(chatId, updates) {
  const existing = await getUserStats(chatId);
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await redis(['SET', `stats:${chatId}`, JSON.stringify(merged)]);
  return merged;
}

// ========== ПРАВО НА УДАЛЕНИЕ (GDPR-like) ==========

export async function deleteAllUserData(chatId) {
  const deleted = {
    profile: false,
    history: 0,
    stats: false,
    chunks: 0
  };

  // Удалить профиль
  const delProfile = await redis(['DEL', `user:${chatId}`]);
  deleted.profile = delProfile > 0;

  // Удалить из общего списка
  await redis(['SREM', 'users:all', String(chatId)]);

  // Удалить историю по всем агентам
  for (const agent of ['doctor', 'lawyer', 'financier']) {
    const del = await redis(['DEL', `chat:${chatId}:${agent}`]);
    if (del > 0) deleted.history++;
  }

  // Удалить статистику
  const delStats = await redis(['DEL', `stats:${chatId}`]);
  deleted.stats = delStats > 0;

  // Удалить чек-ины
  await redis(['DEL', `checkin:${chatId}`]);

  // Удалить rate limit counters (на всякий случай)
  const today = new Date().toISOString().split('T')[0];
  await redis(['DEL', `rl:min:${chatId}`]);
  await redis(['DEL', `rl:day:${chatId}:${today}`]);

  return deleted;
}
