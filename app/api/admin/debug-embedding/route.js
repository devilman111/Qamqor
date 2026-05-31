// Диагностика Embedding API — показывает полный ответ
// GET /api/admin/debug-embedding?key=ADMIN_PASSWORD
export const maxDuration = 30;

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key !== process.env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  const GOOGLE_KEY = process.env.GOOGLE_AI_API_KEY;
  const results = [];

  if (!GOOGLE_KEY) {
    results.push({ test: 'API Key check', status: 'FAIL', detail: 'GOOGLE_AI_API_KEY не задан в env!' });
  } else {
    results.push({ test: 'API Key check', status: 'OK', detail: `Ключ: ${GOOGLE_KEY.slice(0, 12)}...` });

    // Тест 1: text-embedding-004
    try {
      const r1 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: 'тест казахстан закон' }] },
            taskType: 'RETRIEVAL_DOCUMENT'
          })
        }
      );
      const body1 = await r1.text();
      if (r1.ok) {
        const d = JSON.parse(body1);
        results.push({
          test: 'text-embedding-004',
          status: 'OK',
          detail: `Размерность: ${d.embedding?.values?.length || '?'}`
        });
      } else {
        results.push({
          test: 'text-embedding-004',
          status: `HTTP ${r1.status}`,
          detail: body1.slice(0, 500)
        });
      }
    } catch (e) {
      results.push({ test: 'text-embedding-004', status: 'EXCEPTION', detail: e.message });
    }

    // Тест 2: embedding-001 (старая модель)
    try {
      const r2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GOOGLE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: 'тест казахстан закон' }] },
            taskType: 'RETRIEVAL_DOCUMENT'
          })
        }
      );
      const body2 = await r2.text();
      if (r2.ok) {
        const d = JSON.parse(body2);
        results.push({
          test: 'embedding-001',
          status: 'OK',
          detail: `Размерность: ${d.embedding?.values?.length || '?'}`
        });
      } else {
        results.push({
          test: 'embedding-001',
          status: `HTTP ${r2.status}`,
          detail: body2.slice(0, 500)
        });
      }
    } catch (e) {
      results.push({ test: 'embedding-001', status: 'EXCEPTION', detail: e.message });
    }

    // Тест 3: Gemini chat (для проверки что сам ключ работает)
    try {
      const r3 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say "test ok" only' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );
      const body3 = await r3.text();
      if (r3.ok) {
        results.push({ test: 'Gemini Chat (контрольный)', status: 'OK', detail: 'Chat API работает ✓' });
      } else {
        results.push({ test: 'Gemini Chat (контрольный)', status: `HTTP ${r3.status}`, detail: body3.slice(0, 300) });
      }
    } catch (e) {
      results.push({ test: 'Gemini Chat (контрольный)', status: 'EXCEPTION', detail: e.message });
    }
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Embedding Debug</title>
<style>
  body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#f5f5f4}
  .card{background:#fff;border-radius:12px;padding:16px 20px;border:1px solid #e7e5e4;margin:12px 0}
  .ok{color:#059669;font-weight:700}.fail{color:#dc2626;font-weight:700}.warn{color:#d97706;font-weight:700}
  pre{background:#f5f5f4;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all;margin-top:8px}
  h3{margin:0 0 6px 0;font-size:15px}
</style></head><body>
<h1>🔬 Embedding API Debug</h1>
${results.map(r => {
  const cls = r.status === 'OK' ? 'ok' : 'fail';
  return `<div class="card">
    <h3>${r.test}</h3>
    <span class="${cls}">${r.status}</span>
    <pre>${r.detail}</pre>
  </div>`;
}).join('')}

<div class="card" style="background:#f0f9ff;border-color:#bae6fd">
  <h3>Как исправить:</h3>
  <ul style="font-size:13px;line-height:1.8">
    <li>Если Chat работает, а Embedding — нет: попробуйте модель <strong>embedding-001</strong></li>
    <li>Если ошибка 403 — API Embedding недоступен для этого ключа (нужен Google Cloud API)</li>
    <li>Если ошибка 429 — превышен лимит, подождите или используйте другой ключ</li>
    <li>Если оба FAIL — ключ неверный или не активирован</li>
  </ul>
</div>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
