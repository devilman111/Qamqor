// Аналитика на Upstash Redis: счётчики событий, DAU, разбивки
// Простая, без внешних зависимостей. Для лёгкой нагрузки хватит.

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

const TTL_90D = 7776000;

/**
 * Регистрирует событие. Примеры:
 *   trackEvent('chat_message', { userId: 123, agent: 'lawyer' })
 *   trackEvent('checkin', { userId: 123 })
 *   trackEvent('subscription_clicked', { userId: 123 })
 */
export async function trackEvent(event, data = {}) {
  if (!UPSTASH_URL) return;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Общий счётчик за всё время
    await redis(['INCR', `stats:total:${event}`]);

    // Счётчик за день
    const dailyKey = `stats:day:${event}:${today}`;
    await redis(['INCR', dailyKey]);
    await redis(['EXPIRE', dailyKey, String(TTL_90D)]);

    // По агенту (если есть)
    if (data.agent) {
      await redis(['INCR', `stats:total:${event}:${data.agent}`]);
      const agentDailyKey = `stats:day:${event}:${data.agent}:${today}`;
      await redis(['INCR', agentDailyKey]);
      await redis(['EXPIRE', agentDailyKey, String(TTL_90D)]);
    }

    // DAU — добавляем пользователя в set активных за день
    if (data.userId) {
      const dauKey = `stats:dau:${today}`;
      await redis(['SADD', dauKey, String(data.userId)]);
      await redis(['EXPIRE', dauKey, String(TTL_90D)]);
    }
  } catch {}
}

/**
 * Получить статистику для дашборда
 */
export async function getStats() {
  if (!UPSTASH_URL) return null;

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  // Параллельно достаём всё
  const [
    totalUsers,
    totalMessages,
    totalCheckins,
    totalDoctor,
    totalLawyer,
    totalFinancier,
    totalSubClicks,
    ...dauResults
  ] = await Promise.all([
    redis(['SCARD', 'users:all']),
    redis(['GET', 'stats:total:chat_message']),
    redis(['GET', 'stats:total:checkin']),
    redis(['GET', 'stats:total:chat_message:doctor']),
    redis(['GET', 'stats:total:chat_message:lawyer']),
    redis(['GET', 'stats:total:chat_message:financier']),
    redis(['GET', 'stats:total:subscription_clicked']),
    ...days.map(d => redis(['SCARD', `stats:dau:${d}`])),
  ]);

  // Дневные сообщения по дням
  const dailyMessages = await Promise.all(
    days.map(d => redis(['GET', `stats:day:chat_message:${d}`]))
  );

  return {
    totalUsers: parseInt(totalUsers) || 0,
    totalMessages: parseInt(totalMessages) || 0,
    totalCheckins: parseInt(totalCheckins) || 0,
    totalSubClicks: parseInt(totalSubClicks) || 0,
    byAgent: {
      doctor: parseInt(totalDoctor) || 0,
      lawyer: parseInt(totalLawyer) || 0,
      financier: parseInt(totalFinancier) || 0,
    },
    days,
    dau: dauResults.map(v => parseInt(v) || 0),
    dailyMessages: dailyMessages.map(v => parseInt(v) || 0),
  };
}
