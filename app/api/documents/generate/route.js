// /api/documents/generate — заполнить шаблон значениями
// Защищено через Telegram initData (rate limit + аналитика)
import { NextResponse } from 'next/server';
import { getTemplate, fillTemplate } from '../../../../lib/document-templates';
import { verifyTelegramInitData } from '../../../../lib/user-data';
import { checkRateLimit } from '../../../../lib/ratelimit';
import { trackEvent } from '../../../../lib/analytics';

export async function POST(request) {
  try {
    const { templateId, fields, initData } = await request.json();

    // Проверка авторизации (если в production)
    const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    if (user) {
      const rl = await checkRateLimit(user.id, 'trial');
      if (!rl.allowed) {
        return NextResponse.json({
          error: 'rate_limit',
          message: rl.message
        }, { status: 429 });
      }
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Валидация обязательных полей
    const missing = template.fields
      .filter(f => f.required && !fields[f.name])
      .map(f => f.label);
    if (missing.length > 0) {
      return NextResponse.json({
        error: 'missing_fields',
        message: `Не заполнены обязательные поля: ${missing.join(', ')}`,
        missing
      }, { status: 400 });
    }

    const document = fillTemplate(template, fields);

    // Аналитика
    if (user) {
      trackEvent('document_generated', { userId: user.id, agent: 'documents' }).catch(() => {});
    }

    return NextResponse.json({
      document,
      title: template.title,
      legalNotes: template.legalNotes
    });
  } catch (error) {
    console.error('Document generation error:', error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
