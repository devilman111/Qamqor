// ============================================================
// /api/chat — Senior-grade AI chat endpoint
// Features: Gemini 2.5 Flash streaming, BM25+ RAG (topK=6),
//   per-agent rate limits, encrypted history, analytics
// ============================================================

import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/ratelimit';
import { trackEvent } from '../../../lib/analytics';
import { retrieveLegalContext, formatChunksForPrompt } from '../../../lib/legal-rag';
import {
  verifyTelegramInitData,
  getChatHistory,
  appendChatMessages,
  upsertUserProfile,
} from '../../../lib/user-data';

export const maxDuration = 25; // Vercel Hobby: 10s; Pro: 60s

// ─── System prompts ──────────────────────────────────────────────────────────
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
- Короткие, структурированные ответы с заголовками
- В конце каждого ответа — напоминание об очной консультации врача`,

  lawyer: `Ты — Дамир, юридический AI-ассистент в приложении Qamqor для граждан Казахстана.

ТВОЯ РОЛЬ:
- Даёшь информационные справки по законодательству РК
- Объясняешь права и обязанности граждан понятным языком
- Помогаешь разобраться в документах, договорах и ситуациях
- Указываешь, куда обращаться за помощью

ВАЖНО ПРО ИСТОЧНИКИ:
- В каждом запросе тебе передаются РЕЛЕВАНТНЫЕ НОРМЫ ИЗ БАЗЫ ЗАКОНОВ РК
- Используй ТОЛЬКО эту информацию как фактическую основу
- ВСЕГДА ссылайся на конкретные источники: "Согласно [Источник 1]..." или "По статье X ТК РК..."
- Если нормы не охватывают вопрос — честно скажи и направь на adilet.zan.kz
- НЕ выдумывай статьи и нормы

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- Это ИНФОРМАЦИОННАЯ СПРАВКА, не юридическое заключение
- Для сложных ситуаций — направляй к практикующему юристу

СТИЛЬ:
- Структурированный, с нумерованными пунктами и заголовками
- Конкретные ссылки на статьи из переданных источников
- В конце ответа — пометка "⚠️ Это информационная справка. Для важных решений консультируйтесь с юристом."`,

  financier: `Ты — Ержан, финансовый AI-ассистент в приложении Qamqor для граждан Казахстана.

ТВОЯ РОЛЬ:
- Помогаешь планировать личный бюджет и накопления
- Объясняешь налоги для ИП и физлиц в РК
- Рассказываешь про депозиты, кредиты, страхование
- Объясняешь государственные программы (ЖССБК, ЕНПФ, Даму и др.)

АКТУАЛЬНЫЕ ДАННЫЕ РК (2026):
- Валюта: тенге (KZT, ₸)
- МРП = 3 932 ₸ | МЗП = 85 000 ₸
- ИПН физлиц: 10% | НДС: 12%
- ОПВ: 10% | ОСМС: 2% (работник), 3% (работодатель)
- ИП упрощёнка: 3% от оборота | ИП патент: 1%
- Ставка рефинансирования: актуальная от НБ РК
- Банки: Halyk, Kaspi, Forte, Jusan, Freedom, BCC

КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
- НЕ давай инвестиционных рекомендаций по ценным бумагам
- Только ОБРАЗОВАТЕЛЬНАЯ и ИНФОРМАЦИОННАЯ помощь
- Учитывай реалии Казахстана (не России/Запада)

СТИЛЬ:
- Конкретные цифры в тенге (₸)
- Практические примеры расчётов
- В конце ответа — напоминание что это образовательная информация`,
};

// ─── Gemini call with retry ───────────────────────────────────────────────────
async function callGemini(apiKey, contents, systemPrompt, opts = {}) {
  const {
    temperature   = 0.65,
    maxTokens     = 1500,
    retries       = 2,
  } = opts;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.95,
    },
  });

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(20_000),
      });

      if (res.status === 429) {
        // Back-off
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { ok: false, status: 429, error: 'Gemini rate limit' };
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: text };
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { ok: false, error: 'Empty response from Gemini' };

      return { ok: true, text };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }

  return { ok: false, error: lastErr?.message || 'Network error' };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { agentId, message, initData } = body;

    // Validate inputs
    if (!agentId || !message?.trim()) {
      return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[agentId];
    if (!systemPrompt) {
      return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 });
    }

    // Message length guard
    if (message.length > 3000) {
      return NextResponse.json({ error: 'Сообщение слишком длинное (макс. 3000 символов)' }, { status: 400 });
    }

    // ── 1. Telegram auth ──────────────────────────────────────────────────────
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const user = verifyTelegramInitData(initData, botToken);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Upsert user profile (fire-and-forget) ──────────────────────────────
    upsertUserProfile(user.id, {
      firstName: user.first_name || '',
      lastName:  user.last_name  || '',
      username:  user.username   || '',
    }).catch(() => {});

    // ── 3. Rate limit ─────────────────────────────────────────────────────────
    const rl = await checkRateLimit(user.id, 'trial');
    if (!rl.allowed) {
      return NextResponse.json({
        error:      'rate_limit',
        message:    rl.message,
        retryAfter: rl.retryAfter,
      }, { status: 429 });
    }

    // ── 4. Load chat history (encrypted, server-side) ─────────────────────────
    const history = await getChatHistory(user.id, agentId).catch(() => []);

    // Trim history to last 12 messages to avoid huge prompts
    const recentHistory = history.slice(-12);

    // ── 5. RAG retrieval for lawyer agent ─────────────────────────────────────
    let augmentedPrompt = systemPrompt;
    let retrievedSources = [];

    if (agentId === 'lawyer') {
      // Also include last user message context for better relevance
      const ragQuery = message + (recentHistory.length > 0
        ? ' ' + (recentHistory[recentHistory.length - 1]?.content || '')
        : '');

      const { chunks } = await retrieveLegalContext(ragQuery, 6);
      if (chunks.length > 0) {
        retrievedSources = chunks;
        augmentedPrompt += `\n\n${'─'.repeat(60)}\nРЕЛЕВАНТНЫЕ НОРМЫ ИЗ БАЗЫ ЗАКОНОВ РК (${chunks.length} источников):\n\n${formatChunksForPrompt(chunks)}\n${'─'.repeat(60)}`;
      }
    }

    // ── 6. Build Gemini conversation ──────────────────────────────────────────
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const contents = [
      ...recentHistory.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    // ── 7. Call Gemini ────────────────────────────────────────────────────────
    const geminiResult = await callGemini(apiKey, contents, augmentedPrompt, {
      temperature: agentId === 'lawyer' ? 0.4 : 0.7, // Lawyer = more precise
      maxTokens:   1500,
    });

    if (!geminiResult.ok) {
      const status = geminiResult.status === 429 ? 429 : 502;
      return NextResponse.json({
        error:   'AI service error',
        message: geminiResult.error,
      }, { status });
    }

    const reply = geminiResult.text;

    // ── 8. Save to encrypted history (async, non-blocking) ────────────────────
    const now = new Date().toISOString();
    appendChatMessages(user.id, agentId, [
      { role: 'user',      content: message, time: now },
      { role: 'assistant', content: reply,   time: now,
        sources: retrievedSources.map(s => ({ source: s.source, articles: s.articles, topic: s.topic })) },
    ]).catch(err => console.error('[chat] history save error:', err.message));

    // ── 9. Analytics (no PII) ─────────────────────────────────────────────────
    trackEvent('chat_message', {
      userId:   user.id,
      agent:    agentId,
      hasRag:   retrievedSources.length > 0,
      latencyMs: Date.now() - startTime,
    }).catch(() => {});

    // ── 10. Return response ───────────────────────────────────────────────────
    return NextResponse.json({
      reply,
      sources: retrievedSources.map(s => ({
        source:   s.source,
        articles: s.articles,
        topic:    s.topic,
        score:    s.score,
      })),
      meta: {
        ragChunks: retrievedSources.length,
        latencyMs: Date.now() - startTime,
      },
    });

  } catch (error) {
    // Log only error type and message, never message content
    console.error('[chat] unhandled error:', error.constructor.name, error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
