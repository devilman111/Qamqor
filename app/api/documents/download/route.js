// POST /api/documents/download — генерация и скачивание .docx файла
export const maxDuration = 30;

import { getTemplate, fillTemplate } from '../../../../lib/document-templates';
import { generateDocx } from '../../../../lib/docx-generator';
import { verifyTelegramInitData } from '../../../../lib/user-data';

export async function POST(request) {
  try {
    const body = await request.json();
    const { templateId, fields, initData } = body;

    // Верификация Telegram (опционально — не блокируем при отсутствии)
    if (initData) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const valid = verifyTelegramInitData(initData, botToken);
        if (!valid) {
          return new Response('Unauthorized', { status: 401 });
        }
      }
    }

    if (!templateId || !fields) {
      return new Response(JSON.stringify({ error: 'templateId и fields обязательны' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const template = getTemplate(templateId);
    if (!template) {
      return new Response(JSON.stringify({ error: 'Шаблон не найден' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Заполняем шаблон
    const documentText = fillTemplate(template, fields);

    // Генерируем .docx
    const docxBuffer = await generateDocx(documentText, template.title);

    // Формируем безопасное имя файла
    const safeTitle = template.title
      .replace(/[^а-яёa-z0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .slice(0, 50);
    const filename = `${safeTitle}.docx`;

    return new Response(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(docxBuffer.length),
      }
    });
  } catch (err) {
    console.error('[documents/download] error:', err);
    return new Response(JSON.stringify({ error: 'Ошибка генерации документа', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
