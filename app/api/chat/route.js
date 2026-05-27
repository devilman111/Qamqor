// /api/chat — прокси к Gemini с rate limit, аналитикой и RAG для юриста
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/ratelimit';
import { trackEvent } from '../../../lib/analytics';
import { retrieveLegalContext, formatChunksForPrompt } from '../../../lib/legal-rag';

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
- Если в источниках нет ответа на вопрос — честно скажи "В моей базе нет точной нормы по этому вопросу, рекомендую обратиться к юристу или проверить на adilet.zan.kz"
- НЕ выдумывай статьи и номера

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- Это ИНФОРМАЦИОННАЯ СПРАВКА, не юридическое заключение
- Не представляешь интересы в суде
- Для сложных вопросов — направляй к юристу

СТИЛЬ:
- Чёткий, структурированный (если уместно — маркированный список)
- Цитируй конкретные статьи кодексов из переданных источников
- Указывай практические шаги
- В конце ответа — пометка "Это информационная справка. Для важных решений — к юристу."`,

  financier: `Ты — Ержан, финансовый AI-ассистент в приложении Qamqor для граждан Казахстана.

ТВОЯ РОЛЬ:
- Помогаешь планировать личный бюджет
- Объясняешь налоги для ИП и физлиц в РК
- Рассказываешь про депозиты, накопления
- Объясняешь финансовые инструменты
- Учишь финансовой грамотности

ВАЖНЫЕ ПАРАМЕТРЫ РК (актуально на 2026):
- Валюта: тенге (KZT, ₸)
- ИПН для физлиц: 10%
- НДС: 12%
- ОПВ (пенсионные): 10%
- ОСМС (медстрах): 2%
- ИП по упрощёнке: 3% от оборота
- МЗП 2026: примерно 85 000 ₸
- Банки: Halyk, Kaspi, Forte, Jusan, Freedom

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- НЕ давай инвестиционных рекомендаций ("купи акцию X")
- Только ОБРАЗОВАТЕЛЬНАЯ информация
- Не гарантируй доходность
- Учитывай реалии Казахстана

СТИЛЬ:
- Конкретные цифры в тенге
- Структурированные расчёты
- Правило 50/30/20 при планировании бюджета
- В конце ответа — напоминание что это образовательная информация`
};

export async function POST(request) {
  try {
    const { agentId, history, message, telegramId } = await request.json();

    let systemPrompt = SYSTEM_PROMPTS[agentId];
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 1. RATE LIMIT
    if (telegramId) {
      const rl = await checkRateLimit(telegramId, 'trial');
      if (!rl.allowed) {
        return NextResponse.json({
          error: 'rate_limit',
          message: rl.message,
          retryAfter: rl.retryAfter
        }, { status: 429 });
      }
    }

    // 2. RAG для юриста — подмешиваем релевантные нормы законов
    let retrievedSources = [];
    if (agentId === 'lawyer') {
      const { chunks, status } = await retrieveLegalContext(message, 4);
      if (chunks.length > 0) {
        retrievedSources = chunks;
        systemPrompt += `\n\nРЕЛЕВАНТНЫЕ НОРМЫ ИЗ ЗАКОНОВ РК (используй ТОЛЬКО эту информацию):\n\n${formatChunksForPrompt(chunks)}`;
      } else if (status === 'not_seeded') {
        // База ещё не проинициализирована — мягко предупреждаем
        systemPrompt += `\n\n[ВНИМАНИЕ: база знаний ещё не загружена. Отвечай только общими принципами и направляй к юристу.]`;
      }
    }

    // 3. Конвертируем историю в формат Gemini
    const contents = [];
    for (const msg of history || []) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // 4. Запрос к Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await geminiResponse.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Извините, не удалось получить ответ.';

    // 5. Аналитика
    trackEvent('chat_message', { userId: telegramId, agent: agentId }).catch(() => {});

    // 6. Возвращаем ответ + источники (для лоера показываем их в UI)
    return NextResponse.json({
      reply,
      sources: retrievedSources.map(s => ({
        source: s.source,
        articles: s.articles,
        topic: s.topic
      }))
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
