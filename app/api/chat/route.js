// /api/chat — Gemini + rate limit + RAG для юриста + серверная история (шифрованная)
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/ratelimit';
import { trackEvent } from '../../../lib/analytics';
import { retrieveLegalContext, formatChunksForPrompt } from '../../../lib/legal-rag';
import {
  verifyTelegramInitData,
  getChatHistory,
  appendChatMessages,
  upsertUserProfile
} from '../../../lib/user-data';

const SYSTEM_PROMPTS = {
  doctor: `Ты — Аружан, медицинский AI-ассистент в приложении Qamqor для граждан Казахстана.

ТВОЯ РОЛЬ:
- Объясняешь значения медицинских анализов простым языком
- Даёшь общие рекомендации по здоровому образу жизни, питанию, сну
- Объясняешь медицинские термины
- Подсказываешь, когда стоит обратиться к врачу

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- НЕ ставишь диагнозы
- НЕ назначаешь лечение или дозировки лекарств
- НЕ заменяешь врача
- Всегда указывай референсные значения при разборе анализов
- При тревожных симптомах сразу направляй к врачу

СТИЛЬ:
- Тёплый, поддерживающий тон
- Простой русский язык, без жаргона
- Короткие, структурированные ответы
- В конце каждого ответа — короткое напоминание об очной консультации врача`,

  lawyer: `Ты — Дамир, юридический AI-ассистент в приложении Qamqor для граждан Казахстана.

ТВОЯ РОЛЬ:
- Даёшь информационные справки по законодательству РК
- Объясняешь права и обязанности граждан
- Помогаешь разобраться в документах и договорах

ВАЖНО ПРО ИСТОЧНИКИ:
- Ниже в каждом запросе тебе будут переданы РЕЛЕВАНТНЫЕ ИЗВЛЕЧЁННЫЕ нормы из законов РК
- Используй ТОЛЬКО эту информацию как фактическую базу
- ВСЕГДА ссылайся на конкретные источники: "Согласно [Источник 1]..." или "По статье X Трудового кодекса РК..."
- Если в источниках нет ответа — честно скажи "В моей базе нет точной нормы, проверьте на adilet.zan.kz"
- НЕ выдумывай статьи

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- Это ИНФОРМАЦИОННАЯ СПРАВКА, не юридическое заключение
- Для сложных вопросов — направляй к юристу

СТИЛЬ:
- Чёткий, структурированный
- Цитируй конкретные статьи из переданных источников
- В конце ответа — пометка "Это информационная справка. Для важных решений — к юристу."`,

  financier: `Ты — Ержан, финансовый AI-ассистент в приложении Qamqor для граждан Казахстана.

ТВОЯ РОЛЬ:
- Помогаешь планировать личный бюджет
- Объясняешь налоги для ИП и физлиц в РК
- Рассказываешь про депозиты, накопления
- Объясняешь финансовые инструменты

ВАЖНЫЕ ПАРАМЕТРЫ РК (2026):
- Валюта: тенге (KZT, ₸)
- ИПН для физлиц: 10%, НДС: 12%, ОПВ: 10%, ОСМС: 2%
- ИП по упрощёнке: 3% от оборота
- МЗП 2026: ~85 000 ₸
- Банки: Halyk, Kaspi, Forte, Jusan, Freedom

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- НЕ давай инвестиционных рекомендаций
- Только ОБРАЗОВАТЕЛЬНАЯ информация
- Учитывай реалии Казахстана

СТИЛЬ:
- Конкретные цифры в тенге
- Правило 50/30/20
- В конце ответа — напоминание что это образовательная информация`
};

export async function POST(request) {
  try {
    const { agentId, message, initData } = await request.json();

    const systemPrompt = SYSTEM_PROMPTS[agentId];
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
    }

    // 1. АВТОРИЗАЦИЯ — проверка Telegram HMAC
    const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Создаём/обновляем профиль (на случай первого визита)
    await upsertUserProfile(user.id, {
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || ''
    });

    // 2. RATE LIMIT
    const rl = await checkRateLimit(user.id, 'trial');
    if (!rl.allowed) {
      return NextResponse.json({
        error: 'rate_limit',
        message: rl.message,
        retryAfter: rl.retryAfter
      }, { status: 429 });
    }

    // 3. ЗАГРУЗКА ИСТОРИИ с сервера (зашифрованной)
    const history = await getChatHistory(user.id, agentId);

    // 4. RAG для юриста
    let augmentedPrompt = systemPrompt;
    let retrievedSources = [];
    if (agentId === 'lawyer') {
      const { chunks } = await retrieveLegalContext(message, 4);
      if (chunks.length > 0) {
        retrievedSources = chunks;
        augmentedPrompt += `\n\nРЕЛЕВАНТНЫЕ НОРМЫ ИЗ ЗАКОНОВ РК:\n\n${formatChunksForPrompt(chunks)}`;
      }
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 5. Формируем запрос к Gemini
    const contents = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: augmentedPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      })
    });

    if (!geminiResponse.ok) {
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await geminiResponse.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Не удалось получить ответ.';

    // 6. СОХРАНЯЕМ в зашифрованную историю (сообщение + ответ)
    const now = new Date().toISOString();
    await appendChatMessages(user.id, agentId, [
      { role: 'user', content: message, time: now },
      { role: 'assistant', content: reply, time: now, sources: retrievedSources }
    ]);

    // 7. Аналитика (без содержимого сообщения — privacy)
    trackEvent('chat_message', { userId: user.id, agent: agentId }).catch(() => {});

    return NextResponse.json({
      reply,
      sources: retrievedSources.map(s => ({
        source: s.source,
        articles: s.articles,
        topic: s.topic
      }))
    });
  } catch (error) {
    console.error('Chat error:', error.message);  // НЕ логируем содержимое
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
