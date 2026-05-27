// Одноразовый эндпоинт: генерирует эмбеддинги для всей базы знаний юриста
// Защищён ADMIN_PASSWORD (через query param ?key=...)
// Используется так: GET /api/admin/seed-legal?key=YOUR_PASSWORD
import { NextResponse } from 'next/server';
import { seedLegalEmbeddings } from '../../../../lib/legal-rag';
import { LEGAL_CHUNKS } from '../../../../lib/legal-data';

export const maxDuration = 60; // Vercel: до 60 секунд на запрос

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return new Response('ADMIN_PASSWORD env var not configured', { status: 500 });
  }
  if (key !== adminPassword) {
    return new Response('Unauthorized', { status: 401 });
  }

  const start = Date.now();
  const result = await seedLegalEmbeddings();
  const duration = Date.now() - start;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Seed Legal Embeddings</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; background: #f5f5f4; color: #1c1917; }
    .card { background: white; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e7e5e4; }
    .ok { color: #059669; font-weight: 600; }
    .err { color: #dc2626; font-weight: 600; }
    .num { font-size: 36px; font-weight: 700; color: #1c1917; }
    .label { font-size: 12px; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 6px 8px; border-bottom: 1px solid #f5f5f4; }
    .chunk-id { font-family: monospace; color: #78716c; }
  </style>
</head>
<body>
  <h1>🌱 Seed Legal Embeddings</h1>
  <p style="color: #78716c;">Сгенерированы эмбеддинги для базы знаний юриста и сохранены в Upstash Redis.</p>

  <div class="card">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div>
        <div class="num ${result.embedded === result.total ? 'ok' : ''}">${result.embedded}</div>
        <div class="label">Успешно</div>
      </div>
      <div>
        <div class="num ${result.failed > 0 ? 'err' : ''}">${result.failed}</div>
        <div class="label">Ошибки</div>
      </div>
      <div>
        <div class="num">${result.total}</div>
        <div class="label">Всего chunks</div>
      </div>
    </div>
    <p style="margin-top: 16px; color: #78716c; font-size: 14px;">Время: ${Math.round(duration / 1000)} сек</p>
  </div>

  <div class="card">
    <h3>Список chunks в базе</h3>
    <table>
      ${LEGAL_CHUNKS.map(c => `
        <tr>
          <td class="chunk-id">${c.id}</td>
          <td><b>${c.topic}</b></td>
          <td style="color: #78716c;">${c.source}, ${c.articles}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <div class="card" style="background: ${result.embedded === result.total ? '#d1fae5' : '#fee2e2'};">
    <p style="margin: 0;">
      ${result.embedded === result.total
        ? '✅ База знаний загружена. Юрист теперь отвечает с опорой на нормы законов РК.'
        : '⚠️ Не все chunks обработаны. Проверьте GOOGLE_AI_API_KEY и попробуйте ещё раз.'}
    </p>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
