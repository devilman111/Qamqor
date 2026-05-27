// Простая обёртка над Upstash Redis REST API
// Не требует client библиотек, работает через fetch

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Upstash not configured');
    return null;
  }
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
  } catch (e) {
    console.error('Redis error:', e);
    return null;
  }
}

// Сохранить пользователя (chat_id, имя, дата регистрации)
export async function saveUser(chatId, data) {
  const userKey = `user:${chatId}`;
  // Сохраняем профиль
  await redis(['SET', userKey, JSON.stringify({
    chatId,
    ...data,
    updatedAt: new Date().toISOString()
  })]);
  // Добавляем в общий список пользователей
  await redis(['SADD', 'users:all', String(chatId)]);
}

// Получить всех пользователей (для рассылки)
export async function getAllUsers() {
  const chatIds = await redis(['SMEMBERS', 'users:all']);
  if (!chatIds || !Array.isArray(chatIds)) return [];

  const users = [];
  for (const chatId of chatIds) {
    const data = await redis(['GET', `user:${chatId}`]);
    if (data) {
      try { users.push(JSON.parse(data)); } catch {}
    }
  }
  return users;
}

// Получить одного пользователя
export async function getUser(chatId) {
  const data = await redis(['GET', `user:${chatId}`]);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

// Обновить активность пользователя (когда заходил последний раз)
export async function touchUser(chatId) {
  const user = await getUser(chatId);
  if (user) {
    user.lastActive = new Date().toISOString();
    await redis(['SET', `user:${chatId}`, JSON.stringify(user)]);
  }
}

// Отметить что пользователь сделал чек-ин сегодня (чтобы не слать ему лишнего)
export async function markCheckedInToday(chatId) {
  const today = new Date().toISOString().split('T')[0];
  await redis(['SET', `checkin:${chatId}:${today}`, '1', 'EX', '172800']); // TTL 2 дня
}

export async function didCheckInToday(chatId) {
  const today = new Date().toISOString().split('T')[0];
  const val = await redis(['GET', `checkin:${chatId}:${today}`]);
  return val === '1';
}
