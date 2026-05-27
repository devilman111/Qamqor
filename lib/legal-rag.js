// RAG для юриста: эмбеддинги через Gemini + cosine similarity
import { LEGAL_CHUNKS, chunkToEmbedText } from './legal-data';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;

async function redis(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });
    const data = await res.json();
    return data.result;
  } catch { return null; }
}

// Получить эмбеддинг через Gemini Embedding API
export async function getEmbedding(text, taskType = 'RETRIEVAL_QUERY') {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (e) {
    console.error('Embedding error:', e);
    return null;
  }
}

// Cosine similarity между двумя векторами
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Сгенерировать эмбеддинги для всех chunks и сохранить в Upstash
// Вызывается один раз через /api/admin/seed-legal
export async function seedLegalEmbeddings() {
  const embedded = [];
  let failed = 0;

  for (const chunk of LEGAL_CHUNKS) {
    const text = chunkToEmbedText(chunk);
    const embedding = await getEmbedding(text, 'RETRIEVAL_DOCUMENT');
    if (embedding) {
      embedded.push({ ...chunk, embedding });
    } else {
      failed++;
    }
    // Маленькая задержка чтобы не упереться в rate limit Gemini
    await new Promise(r => setTimeout(r, 50));
  }

  if (embedded.length > 0) {
    // Сохраняем в Redis как JSON
    await redis(['SET', 'legal:knowledge', JSON.stringify(embedded)]);
  }

  return { embedded: embedded.length, failed, total: LEGAL_CHUNKS.length };
}

// Загрузить эмбеддинги из Upstash (кэшируем в памяти процесса)
let _cachedEmbeddings = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function loadEmbeddings() {
  // In-memory cache
  if (_cachedEmbeddings && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedEmbeddings;
  }
  const data = await redis(['GET', 'legal:knowledge']);
  if (!data) return null;
  try {
    _cachedEmbeddings = JSON.parse(data);
    _cacheTime = Date.now();
    return _cachedEmbeddings;
  } catch {
    return null;
  }
}

// Главная функция: найти топ-K релевантных chunks для запроса
export async function retrieveLegalContext(query, topK = 4) {
  const embeddings = await loadEmbeddings();
  if (!embeddings || embeddings.length === 0) {
    return { chunks: [], status: 'not_seeded' };
  }

  const queryEmbedding = await getEmbedding(query, 'RETRIEVAL_QUERY');
  if (!queryEmbedding) {
    return { chunks: [], status: 'embedding_failed' };
  }

  // Считаем cosine similarity для всех chunks
  const scored = embeddings.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Сортируем и берём топ-K
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK).filter(c => c.score > 0.5); // Минимальный порог

  return {
    chunks: top.map(c => ({
      source: c.source,
      articles: c.articles,
      topic: c.topic,
      content: c.content,
      score: Math.round(c.score * 100) / 100
    })),
    status: 'ok'
  };
}

// Форматировать chunks в текст для подкладывания в промпт LLM
export function formatChunksForPrompt(chunks) {
  if (!chunks || chunks.length === 0) return '';
  return chunks.map((c, i) =>
    `[ИСТОЧНИК ${i + 1}: ${c.source}, ${c.articles} — ${c.topic}]\n${c.content}`
  ).join('\n\n');
}
