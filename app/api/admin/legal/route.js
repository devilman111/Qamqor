// Админ-страница управления базой знаний юриста
// GET /api/admin/legal?key=PASSWORD → HTML интерфейс
// POST /api/admin/legal?key=PASSWORD → действия (add, bulk, delete, reseed)
import { NextResponse } from 'next/server';
import {
  addChunkToDb,
  bulkAddChunksToDb,
  deleteChunkFromDb,
  getAllChunksFromDb,
  seedLegalEmbeddings
} from '../../../../lib/legal-rag';

export const maxDuration = 60;

function checkAuth(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const password = process.env.ADMIN_PASSWORD;
  if (!password || key !== password) return null;
  return key;
}

export async function POST(request) {
  const key = checkAuth(request);
  if (!key) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);

  // Парсим body — может быть JSON или form-data
  const contentType = request.headers.get('content-type') || '';
  let body;
  try {
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }
  } catch {
    body = {};
  }

  const action = body.action;
  let result = null;

  if (action === 'add') {
    result = await addChunkToDb({
      id: body.id,
      source: body.source,
      articles: body.articles,
      topic: body.topic,
      keywords: body.keywords || '',
      content: body.content
    });
  } else if (action === 'bulk') {
    let chunks = [];
    try {
      chunks = JSON.parse(body.json_data);
    } catch {
      result = { ok: false, error: 'Невалидный JSON' };
    }
    if (!result) result = await bulkAddChunksToDb(chunks);
  } else if (action === 'delete') {
    result = await deleteChunkFromDb(body.id);
  } else if (action === 'reseed') {
    result = await seedLegalEmbeddings();
    result.ok = true;
  } else {
    result = { ok: false, error: 'Unknown action' };
  }

  // Если это форма (не JSON) — редирект обратно с сообщением
  if (!contentType.includes('application/json')) {
    const msg = result.ok
      ? encodeURIComponent('✅ Готово: ' + JSON.stringify(result))
      : encodeURIComponent('❌ Ошибка: ' + (result.error || JSON.stringify(result)));
    return NextResponse.redirect(`${url.origin}/api/admin/legal?key=${key}&msg=${msg}`);
  }

  return NextResponse.json(result);
}

export async function GET(request) {
  const key = checkAuth(request);
  if (!key) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const msg = url.searchParams.get('msg') || '';

  const chunks = await getAllChunksFromDb();

  // Группируем по источникам
  const bySources = {};
  for (const c of chunks) {
    const s = c.source || 'Без источника';
    if (!bySources[s]) bySources[s] = [];
    bySources[s].push(c);
  }

  const sourcesHtml = Object.entries(bySources).map(([source, items]) => `
    <details ${items.length < 5 ? 'open' : ''}>
      <summary><b>${source}</b> · ${items.length} норм</summary>
      <table>
        ${items.map(c => `
          <tr>
            <td class="id">${c.id}</td>
            <td><b>${c.topic || ''}</b><br><span class="hint">${c.articles || ''}</span></td>
            <td>
              <form method="POST" style="display:inline" onsubmit="return confirm('Удалить ${c.id}?')">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="id" value="${c.id}">
                <button class="btn-danger" type="submit">×</button>
              </form>
            </td>
          </tr>
        `).join('')}
      </table>
    </details>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Qamqor — Управление базой юриста</title>
  <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Onest', sans-serif; background: #f5f5f4; color: #1c1917; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; letter-spacing: -0.02em; }
    .subtitle { color: #78716c; margin-bottom: 24px; font-size: 14px; }
    .msg { padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 14px; }
    .msg-ok { background: #d1fae5; color: #065f46; }
    .msg-err { background: #fee2e2; color: #991b1b; }
    .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #e7e5e4; }
    .card h2 { font-size: 18px; margin-bottom: 16px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media(max-width:768px) { .grid-2 { grid-template-columns: 1fr; } }
    .stat { font-size: 32px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; }

    form .row { display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; margin-bottom: 10px; }
    label { font-size: 13px; font-weight: 600; color: #44403c; }
    input, textarea, select { font-family: inherit; font-size: 14px; padding: 8px 12px; border: 1px solid #d6d3d1; border-radius: 8px; width: 100%; outline: none; }
    input:focus, textarea:focus { border-color: #1c1917; }
    textarea { resize: vertical; min-height: 80px; font-family: 'Courier New', monospace; font-size: 12px; }
    button { font-family: inherit; padding: 10px 16px; background: #1c1917; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
    button:hover { background: #44403c; }
    .btn-danger { background: #ef4444; padding: 4px 10px; font-size: 14px; }
    .btn-danger:hover { background: #dc2626; }
    .btn-secondary { background: #e7e5e4; color: #1c1917; }
    .btn-secondary:hover { background: #d6d3d1; }

    details { margin-bottom: 12px; }
    summary { padding: 12px 16px; background: #fafaf9; border-radius: 8px; cursor: pointer; font-size: 14px; user-select: none; }
    summary:hover { background: #f5f5f4; }
    table { width: 100%; margin-top: 8px; border-collapse: collapse; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f5f5f4; }
    td:last-child { text-align: right; }
    .id { font-family: 'Courier New', monospace; color: #78716c; font-size: 12px; }
    .hint { font-size: 11px; color: #78716c; }

    .footer { color: #a8a29e; font-size: 11px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚖️ База знаний юриста</h1>
    <p class="subtitle">Управление нормами законов РК для AI-агента Дамира</p>

    ${msg ? `<div class="msg ${msg.includes('✅') ? 'msg-ok' : 'msg-err'}">${decodeURIComponent(msg)}</div>` : ''}

    <div class="grid-2">
      <div class="card">
        <div class="stat-label">Всего норм в базе</div>
        <div class="stat">${chunks.length}</div>
      </div>
      <div class="card">
        <div class="stat-label">Источников</div>
        <div class="stat">${Object.keys(bySources).length}</div>
      </div>
    </div>

    <div class="card">
      <h2>➕ Добавить норму</h2>
      <form method="POST">
        <input type="hidden" name="action" value="add">
        <div class="row">
          <label>ID</label>
          <input name="id" required placeholder="tk_новый_id (только латиница, цифры, _)" pattern="[a-z0-9_]+">
        </div>
        <div class="row">
          <label>Источник</label>
          <input name="source" required placeholder="Например: Трудовой кодекс РК">
        </div>
        <div class="row">
          <label>Статьи</label>
          <input name="articles" required placeholder="Например: Статья 52, пункт 8">
        </div>
        <div class="row">
          <label>Тема</label>
          <input name="topic" required placeholder="Короткое описание темы">
        </div>
        <div class="row">
          <label>Ключевые слова</label>
          <input name="keywords" placeholder="через пробел: увольнение работа закон">
        </div>
        <div class="row">
          <label>Содержание</label>
          <textarea name="content" required placeholder="Полный текст нормы (100-300 слов)..."></textarea>
        </div>
        <button type="submit">Добавить норму</button>
      </form>
    </div>

    <div class="card">
      <h2>📦 Массовый импорт (JSON)</h2>
      <p style="font-size:13px; color:#78716c; margin-bottom:12px;">
        Вставьте JSON-массив объектов. Каждый объект: <code>{id, source, articles, topic, keywords, content}</code>.
        Дубликаты (по id) пропустятся.
      </p>
      <form method="POST">
        <input type="hidden" name="action" value="bulk">
        <textarea name="json_data" rows="10" required placeholder='[
  {
    "id": "tk_perevod",
    "source": "Трудовой кодекс РК",
    "articles": "Статья 38",
    "topic": "Перевод на другую работу",
    "keywords": "перевод другая должность",
    "content": "Перевод на другую работу..."
  }
]'></textarea>
        <button type="submit" style="margin-top:8px;">Импортировать пачкой</button>
      </form>
    </div>

    <div class="card">
      <h2>🔄 Переиндексация</h2>
      <p style="font-size:13px; color:#78716c; margin-bottom:12px;">
        Перегенерирует эмбеддинги для всех норм из <code>lib/legal-data.js</code> (заменит то что в базе).
        Используйте если меняли legal-data.js в коде или Gemini обновил модель.
      </p>
      <form method="POST" onsubmit="return confirm('Это перезапишет всю базу. Продолжить?')">
        <input type="hidden" name="action" value="reseed">
        <button class="btn-secondary" type="submit">Запустить переиндексацию</button>
      </form>
    </div>

    <div class="card">
      <h2>📚 Нормы в базе (${chunks.length})</h2>
      ${chunks.length === 0 ? '<p style="color:#78716c">База пуста. Запустите переиндексацию или добавьте нормы.</p>' : sourcesHtml}
    </div>

    <p class="footer">Qamqor Admin · ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</p>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
