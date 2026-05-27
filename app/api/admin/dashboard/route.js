// Простой аналитический дашборд для админа
// GET /api/admin/dashboard?key=YOUR_ADMIN_PASSWORD
import { getStats } from '../../../../lib/analytics';

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

  const stats = await getStats();
  if (!stats) {
    return new Response('Failed to load stats', { status: 500 });
  }

  const totalAgentMsg = stats.byAgent.doctor + stats.byAgent.lawyer + stats.byAgent.financier || 1;
  const pct = (n) => Math.round((n / totalAgentMsg) * 100);

  // Простая SVG-диаграмма DAU за неделю
  const maxDau = Math.max(...stats.dau, 1);
  const dauBars = stats.dau.map((v, i) => {
    const h = (v / maxDau) * 80;
    const x = i * 50 + 10;
    return `<g>
      <rect x="${x}" y="${100 - h}" width="35" height="${h}" fill="url(#bargrad)" rx="4"/>
      <text x="${x + 17.5}" y="${95 - h}" text-anchor="middle" font-size="11" fill="#1c1917" font-weight="600">${v}</text>
      <text x="${x + 17.5}" y="115" text-anchor="middle" font-size="9" fill="#78716c">${stats.days[i].slice(5)}</text>
    </g>`;
  }).join('');

  const maxMsg = Math.max(...stats.dailyMessages, 1);
  const msgBars = stats.dailyMessages.map((v, i) => {
    const h = (v / maxMsg) * 80;
    const x = i * 50 + 10;
    return `<g>
      <rect x="${x}" y="${100 - h}" width="35" height="${h}" fill="url(#bargrad2)" rx="4"/>
      <text x="${x + 17.5}" y="${95 - h}" text-anchor="middle" font-size="11" fill="#1c1917" font-weight="600">${v}</text>
      <text x="${x + 17.5}" y="115" text-anchor="middle" font-size="9" fill="#78716c">${stats.days[i].slice(5)}</text>
    </g>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Qamqor — Аналитика</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Onest', -apple-system, sans-serif; background: #f5f5f4; color: #1c1917; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; letter-spacing: -0.02em; }
    .subtitle { color: #78716c; margin-bottom: 32px; font-size: 14px; }

    .grid { display: grid; gap: 16px; }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-2 { grid-template-columns: 1fr 1fr; }
    @media (max-width: 768px) { .grid-4, .grid-2 { grid-template-columns: 1fr 1fr; } }

    .card { background: white; border-radius: 16px; padding: 20px; border: 1px solid #e7e5e4; }
    .card h3 { font-size: 13px; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; font-weight: 600; }
    .stat-num { font-size: 36px; font-weight: 700; letter-spacing: -0.02em; }
    .stat-sub { font-size: 12px; color: #78716c; margin-top: 4px; }

    .agent-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
    .agent-name { width: 100px; font-size: 14px; font-weight: 600; }
    .agent-bar { flex: 1; height: 8px; background: #f5f5f4; border-radius: 4px; overflow: hidden; }
    .agent-bar-fill { height: 100%; border-radius: 4px; }
    .agent-num { width: 70px; text-align: right; font-size: 14px; font-weight: 600; }
    .agent-pct { width: 40px; text-align: right; font-size: 11px; color: #78716c; }

    section { margin-top: 32px; }
    section h2 { font-size: 18px; margin-bottom: 16px; font-weight: 700; }

    .footer { margin-top: 48px; color: #a8a29e; font-size: 12px; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #d1fae5; color: #065f46; margin-left: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Аналитика Qamqor</h1>
    <p class="subtitle">Обновлено: ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })} (Астана) <span class="badge">LIVE</span></p>

    <div class="grid grid-4">
      <div class="card">
        <h3>Всего пользователей</h3>
        <div class="stat-num">${stats.totalUsers}</div>
        <div class="stat-sub">всё время</div>
      </div>
      <div class="card">
        <h3>Сегодня в приложении</h3>
        <div class="stat-num">${stats.dau[stats.dau.length - 1]}</div>
        <div class="stat-sub">DAU</div>
      </div>
      <div class="card">
        <h3>Сообщений всего</h3>
        <div class="stat-num">${stats.totalMessages}</div>
        <div class="stat-sub">все агенты</div>
      </div>
      <div class="card">
        <h3>Чек-инов</h3>
        <div class="stat-num">${stats.totalCheckins}</div>
        <div class="stat-sub">всего</div>
      </div>
    </div>

    <section>
      <h2>DAU за 7 дней</h2>
      <div class="card">
        <svg viewBox="0 0 360 130" width="100%" height="160">
          <defs>
            <linearGradient id="bargrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#6366f1"/>
              <stop offset="100%" stop-color="#a855f7"/>
            </linearGradient>
          </defs>
          ${dauBars}
        </svg>
      </div>
    </section>

    <section>
      <h2>Сообщений по дням</h2>
      <div class="card">
        <svg viewBox="0 0 360 130" width="100%" height="160">
          <defs>
            <linearGradient id="bargrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981"/>
              <stop offset="100%" stop-color="#0891b2"/>
            </linearGradient>
          </defs>
          ${msgBars}
        </svg>
      </div>
    </section>

    <section>
      <h2>Использование агентов</h2>
      <div class="card">
        <div class="agent-row">
          <div class="agent-name">🩺 Доктор</div>
          <div class="agent-bar"><div class="agent-bar-fill" style="width:${pct(stats.byAgent.doctor)}%; background: linear-gradient(90deg,#f43f5e,#ef4444);"></div></div>
          <div class="agent-num">${stats.byAgent.doctor}</div>
          <div class="agent-pct">${pct(stats.byAgent.doctor)}%</div>
        </div>
        <div class="agent-row">
          <div class="agent-name">⚖️ Юрист</div>
          <div class="agent-bar"><div class="agent-bar-fill" style="width:${pct(stats.byAgent.lawyer)}%; background: linear-gradient(90deg,#3b82f6,#6366f1);"></div></div>
          <div class="agent-num">${stats.byAgent.lawyer}</div>
          <div class="agent-pct">${pct(stats.byAgent.lawyer)}%</div>
        </div>
        <div class="agent-row">
          <div class="agent-name">💰 Финансист</div>
          <div class="agent-bar"><div class="agent-bar-fill" style="width:${pct(stats.byAgent.financier)}%; background: linear-gradient(90deg,#10b981,#0891b2);"></div></div>
          <div class="agent-num">${stats.byAgent.financier}</div>
          <div class="agent-pct">${pct(stats.byAgent.financier)}%</div>
        </div>
      </div>
    </section>

    <section>
      <h2>Конверсия</h2>
      <div class="grid grid-2">
        <div class="card">
          <h3>Кликов "Подписка"</h3>
          <div class="stat-num">${stats.totalSubClicks}</div>
          <div class="stat-sub">конверсия: ${stats.totalUsers > 0 ? Math.round((stats.totalSubClicks / stats.totalUsers) * 100) : 0}%</div>
        </div>
        <div class="card">
          <h3>Сообщ. на пользователя</h3>
          <div class="stat-num">${stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0}</div>
          <div class="stat-sub">средний engagement</div>
        </div>
      </div>
    </section>

    <p class="footer">Qamqor Admin Dashboard · Обновляется при каждой загрузке страницы</p>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
