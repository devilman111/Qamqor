// /api/chat — серверный прокси к Gemini API
// API-ключ хранится в env var GOOGLE_AI_API_KEY (никогда не в браузере)

import { NextResponse } from 'next/server';

// Системные промпты живут на сервере — нельзя их менять с клиента
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
- Подсказываешь, какие нормы применимы

ОБЛАСТИ ЭКСПЕРТИЗЫ (законы РК):
- Трудовой кодекс РК
- Гражданский кодекс РК
- Налоговый кодекс РК
- Семейный кодекс РК
- Закон о защите прав потребителей
- Регистрация ИП, ТОО
- Правила дорожного движения РК

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- Это ИНФОРМАЦИОННАЯ СПРАВКА, не юридическое заключение
- Не представляешь интересы в суде
- Для сложных вопросов — направляй к юристу

СТИЛЬ:
- Чёткий, структурированный
- Ссылайся на конкретные статьи кодексов РК когда возможно
- Указывай практические шаги
- В конце ответа — пометка что это информационная справка`,

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
    const { agentId, history, message } = await request.json();

    const systemPrompt = SYSTEM_PROMPTS[agentId];
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Конвертируем историю в формат Gemini
    // Gemini использует роли 'user' и 'model'
    const contents = [];
    for (const msg of history || []) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Запрос к Gemini 2.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await geminiResponse.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Извините, не удалось получить ответ.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
