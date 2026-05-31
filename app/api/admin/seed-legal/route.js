// Seed legal embeddings — поддерживает батчевую обработку
// GET /api/admin/seed-legal?key=... — обработать все чанки (до 10 за раз)
// GET /api/admin/seed-legal?key=...&offset=0&limit=10 — конкретный батч
// GET /api/admin/seed-legal?key=...&test=1 — проверить API ключ (1 запрос)
// GET /api/admin/seed-legal?key=...&reset=1 — очистить базу

export const maxDuration = 60;

import { seedLegalEmbeddings, getEmbedding } from '../../../../lib/legal-rag';
import { LEGAL_CHUNKS, chunkToEmbedText } from '../../../../lib/legal-data';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    });
    const data = await res.json();
    return data.result;
  } catch { return null; }
}

async function seedBatch(offset, limit) {
  const batch = LEGAL_CHUNKS.slice(offset, offset + limit);
  if (batch.length === 0) return { embedded: 0, failed: 0, errors: [] };

  // Загрузить текущую базу
  const raw = await redis(['GET', 'legal:knowledge']);
  let existing = [];
  if (raw) {
    try { existing = JSON.parse(raw); } catch {}
  }
  const existingIds = new Set(existing.map(c => c.id));

  let embedded = 0, failed = 0;
  const errors = [];

  for (const chunk of batch) {
    if (existingIds.has(chunk.id)) {
      embedded++; // уже есть — считаем как успех
      continue;
    }
    const text = chunkToEmbedText(chunk);
    const embedding = await getEmbedding(text, 'RETRIEVAL_DOCUMENT');
    if (embedding) {
      existing.push({ ...chunk, embedding });
      existingIds.add(chunk.id);
      embedded++;
    } else {
      failed++;
      errors.push(chunk.id);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (embedded > 0 || failed === 0) {
    await redis(['SET', 'legal:knowledge', JSON.stringify(existing)]);
  }

  return { embedded, failed, errors, total: existing.length };
}

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const adminPassword = process.env.ADMIN_PASSWORD;
  const GOOGLE_KEY = process.env.GOOGLE_AI_API_KEY;

  if (!adminPassword) return new Response('ADMIN_PASSWORD не настроен', { status: 500 });
  if (key !== adminPassword) return new Response('Unauthorized', { status: 401 });

  const isTest = url.searchParams.get('test') === '1';
  const isReset = url.searchParams.get('reset') === '1';
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  const start = Date.now();

  // === ТЕСТ ===
  if (isTest) {
    let testResult = 'FAIL';
    let testError = '';
    let testDim = 0;
    if (!GOOGLE_KEY) {
      testError = 'GOOGLE_AI_API_KEY не задан в env!';
    } else {
      const vec = await getEmbedding('тест казахстан закон', 'RETRIEVAL_DOCUMENT');
      if (vec) {
        testResult = 'OK';
        testDim = vec.length;
      } else {
        testError = 'Embedding API вернул null. Проверьте Vercel Logs для деталей.';
      }
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Embedding Test</title>
    <style>body{font-family:-apple-system,sans-serif;max-width:600px;margin:40px auto;padding:20px;background:#f5f5f4}
    .card{background:#fff;border-radius:12px;padding:20px;border:1px solid #e7e5e4;margin:16px 0}
    .ok{color:#059669;font-size:28px;font-weight:800}.fail{color:#dc2626;font-size:28px;font-weight:800}</style>
    </head><body>
    <h1>🔬 Тест Embedding API</h1>
    <div class="card">
      <div class="${testResult === 'OK' ? 'ok' : 'fail'}">${testResult === 'OK' ? '✅ API работает!' : '❌ API не работает'}</div>
      ${testResult === 'OK'
        ? `<p>Размерность вектора: <strong>${testDim}</strong></p><p>Google API Key: ${GOOGLE_KEY ? GOOGLE_KEY.slice(0,10) + '...' : 'НЕТ'}</p>`
        : `<p style="color:#dc2626">${testError}</p>
           <p>Ключ: ${GOOGLE_KEY ? GOOGLE_KEY.slice(0,10) + '...' : 'НЕТ'}</p>
           <p>Проверьте: <a href="https://vercel.com/dashboard">Vercel Logs</a> → Functions → seed-legal</p>`
      }
      <p style="color:#78716c;font-size:13px">Время: ${Date.now() - start}мс</p>
    </div>
    ${testResult === 'OK'
      ? `<div class="card" style="background:#d1fae5;border-color:#a7f3d0">
           <p>✅ API работает! Теперь запустите посев базы:</p>
           <p><strong>Батч 1:</strong> <a href="?key=${key}&offset=0&limit=10">/seed-legal?offset=0&limit=10</a></p>
           <p><strong>Батч 2:</strong> <a href="?key=${key}&offset=10&limit=10">/seed-legal?offset=10&limit=10</a></p>
           <p><strong>Батч 3:</strong> <a href="?key=${key}&offset=20&limit=10">/seed-legal?offset=20&limit=10</a></p>
           <p><strong>Батч 4:</strong> <a href="?key=${key}&offset=30&limit=10">/seed-legal?offset=30&limit=10</a></p>
           <p><strong>Батч 5:</strong> <a href="?key=${key}&offset=40">/seed-legal?offset=40</a></p>
         </div>`
      : `<div class="card" style="background:#fee2e2;border-color:#fca5a5">
           <h3>Возможные причины:</h3>
           <ul>
             <li>GOOGLE_AI_API_KEY не добавлен в Vercel Environment Variables</li>
             <li>API ключ не имеет доступа к Embedding API</li>
             <li>Превышен дневной лимит (1500 запросов/день)</li>
           </ul>
         </div>`
    }
    </body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // === СБРОС ===
  if (isReset) {
    await redis(['DEL', 'legal:knowledge']);
    return new Response(`<!DOCTYPE html><html><body><h1>✅ База очищена</h1>
    <p>Теперь можно запустить посев заново: <a href="?key=${key}&test=1">Тест API</a></p>
    </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // === БАТЧ ===
  const result = await seedBatch(offset, limit);
  const elapsed = Date.now() - start;
  const nextOffset = offset + limit;
  const hasMore = nextOffset < LEGAL_CHUNKS.length;

  const statusColor = result.failed === 0 ? '#d1fae5' : '#fee2e2';
  const statusBorder = result.failed === 0 ? '#a7f3d0' : '#fca5a5';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Seed Legal — Батч ${Math.floor(offset/limit)+1}</title>
<style>
  body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#f5f5f4}
  .card{background:#fff;border-radius:12px;padding:20px;border:1px solid #e7e5e4;margin:16px 0}
  .num{font-size:32px;font-weight:800;color:#1c1917}.label{font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:.05em}
  .ok{color:#059669}.err{color:#dc2626}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  a.btn{display:inline-block;background:#1c1917;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:8px}
</style></head><body>
<h1>🌱 Seed Legal — Батч ${Math.floor(offset/limit)+1}</h1>
<p style="color:#78716c">Чанки ${offset}–${Math.min(offset+limit, LEGAL_CHUNKS.length)-1} из ${LEGAL_CHUNKS.length-1}</p>

<div class="card">
  <div class="grid">
    <div><div class="num ${result.embedded > 0 ? 'ok' : ''}">${result.embedded}</div><div class="label">Успешно</div></div>
    <div><div class="num ${result.failed > 0 ? 'err' : ''}">${result.failed}</div><div class="label">Ошибки</div></div>
    <div><div class="num">${result.total || 0}</div><div class="label">Всего в базе</div></div>
  </div>
  <p style="color:#78716c;font-size:13px;margin-top:12px">Время: ${Math.round(elapsed/1000)} сек</p>
  ${result.errors && result.errors.length > 0 ? `<p style="color:#dc2626;font-size:13px">Не удалось: ${result.errors.join(', ')}</p>` : ''}
</div>

<div class="card" style="background:${statusColor};border-color:${statusBorder}">
  ${result.failed === 0
    ? `<p class="ok">✅ Батч обработан без ошибок!</p>`
    : `<p class="err">⚠️ ${result.failed} ошибок. Проверьте <a href="https://vercel.com">Vercel Logs</a> → Functions.</p>`
  }
</div>

${hasMore
  ? `<div class="card">
       <p><strong>Следующий батч:</strong></p>
       <a class="btn" href="?key=${key}&offset=${nextOffset}&limit=${limit}">
         → Батч ${Math.floor(nextOffset/limit)+1} (чанки ${nextOffset}–${Math.min(nextOffset+limit, LEGAL_CHUNKS.length)-1})
       </a>
     </div>`
  : `<div class="card" style="background:#d1fae5;border-color:#a7f3d0">
       <p class="ok">🎉 Все ${LEGAL_CHUNKS.length} чанков обработаны! База знаний юриста заполнена.</p>
       <p>Теперь Дамир будет ссылаться на конкретные статьи законов РК.</p>
     </div>`
}

<div class="card">
  <p style="font-size:13px;color:#78716c">Все батчи:</p>
  ${Array.from({ length: Math.ceil(LEGAL_CHUNKS.length / limit) }, (_, i) => {
    const o = i * limit;
    const isCurrent = o === offset;
    return `<a href="?key=${key}&offset=${o}&limit=${limit}" style="display:inline-block;margin:4px;padding:6px 12px;border-radius:8px;font-size:13px;text-decoration:none;background:${isCurrent ? '#1c1917' : '#f5f5f4'};color:${isCurrent ? '#fff' : '#1c1917'};border:1px solid #e7e5e4">
      ${o}–${Math.min(o+limit, LEGAL_CHUNKS.length)-1}
    </a>`;
  }).join('')}
</div>

</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
