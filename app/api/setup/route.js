// Одноразовый эндпоинт для настройки бота
// Просто откройте в браузере: https://yourdomain.vercel.app/api/setup
import { NextResponse } from 'next/server';
import { setWebhook, setMyCommands, setMenuButton, getWebhookInfo } from '../../../lib/bot';

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  // 1. Установить webhook
  const webhookResult = await setWebhook(webhookUrl);

  // 2. Установить список команд (видны при нажатии на "/")
  const commandsResult = await setMyCommands();

  // 3. Установить Menu Button (синяя кнопка с приложением)
  const menuResult = await setMenuButton();

  // 4. Получить статус webhook
  const info = await getWebhookInfo();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Qamqor Setup</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; background: #f5f5f4; color: #1c1917; }
    h1 { margin-bottom: 8px; }
    .card { background: white; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e7e5e4; }
    .ok { color: #059669; font-weight: 600; }
    .err { color: #dc2626; font-weight: 600; }
    pre { background: #f5f5f4; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-err { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <h1>⚙️ Qamqor Setup</h1>
  <p style="color: #78716c;">Одноразовая настройка бота. Если все три зелёных — всё ок.</p>

  <div class="card">
    <h3>1. Webhook ${webhookResult?.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-err">ERROR</span>'}</h3>
    <p style="font-size: 13px; color: #78716c;">URL: ${webhookUrl}</p>
    <pre>${JSON.stringify(webhookResult, null, 2)}</pre>
  </div>

  <div class="card">
    <h3>2. Commands ${commandsResult?.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-err">ERROR</span>'}</h3>
    <pre>${JSON.stringify(commandsResult, null, 2)}</pre>
  </div>

  <div class="card">
    <h3>3. Menu Button ${menuResult?.ok ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-err">ERROR</span>'}</h3>
    <pre>${JSON.stringify(menuResult, null, 2)}</pre>
  </div>

  <div class="card">
    <h3>📊 Webhook Info</h3>
    <pre>${JSON.stringify(info, null, 2)}</pre>
  </div>

  <p style="margin-top: 32px; padding: 16px; background: #dbeafe; border-radius: 8px; font-size: 14px;">
    ✅ Если всё ОК — откройте Telegram, найдите вашего бота, отправьте <b>/start</b>. Должна прийти кнопка "Открыть Qamqor".
  </p>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
