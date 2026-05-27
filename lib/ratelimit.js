// Rate limiting через Upstash Redis (INCR + TTL)
// Два лимита: per-minute (anti-spam) и per-day (anti-abuse)

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
  } catch {
    return null;
  }
}

// Лимиты
const LIMITS = {
  trial: { perMinute: 8, perDay: 50 },
  premium: { perMinute: 20, perDay: 300 },
};

/**
 * Проверяет, не превысил ли пользователь лимит.
 * Возвращает { allowed: boolean, reason?: string, retryAfter?: number, remaining?: number }
 */
export async function checkRateLimit(userId, tier = 'trial') {
  if (!userId) return { allowed: true };
  if (!UPSTASH_URL) return { allowed: true }; // Если БД не настроена — пропускаем

  const limits = LIMITS[tier] || LIMITS.trial;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Per-minute limit
    const minuteKey = `rl:min:${userId}`;
    const minuteCount = await redis(['INCR', minuteKey]);
    if (minuteCount === 1) {
      await redis(['EXPIRE', minuteKey, '60']);
    }
    if (minuteCount > limits.perMinute) {
      return {
        allowed: false,
        reason: 'minute',
        retryAfter: 60,
        message: 'Слишком много сообщений за минуту. Подождите немного.'
      };
    }

    // Per-day limit
    const dayKey = `rl:day:${userId}:${today}`;
    const dayCount = await redis(['INCR', dayKey]);
    if (dayCount === 1) {
      await redis(['EXPIRE', dayKey, '86400']);
    }
    if (dayCount > limits.perDay) {
      return {
        allowed: false,
        reason: 'day',
        retryAfter: 86400,
        message: `Дневной лимит исчерпан (${limits.perDay} сообщений). Возвращайтесь завтра или оформите Premium.`
      };
    }

    return {
      allowed: true,
      remaining: limits.perDay - dayCount,
      minuteUsed: minuteCount,
      dayUsed: dayCount
    };
  } catch (e) {
    // Если что-то пошло не так — пропускаем (fail open для UX)
    return { allowed: true };
  }
}
