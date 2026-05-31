// RAG для юриста — keyword-based поиск по базе законов РК
// Не требует embedding API, работает полностью в памяти
// Алгоритм: BM25-like scoring по совпадению токенов запроса с keywords/topic/content

import { LEGAL_CHUNKS } from './legal-data';

// Нормализация текста для поиска
function normalize(text) {
  return text.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// Стоп-слова — частые слова, не несущие смысл
const STOP_WORDS = new Set([
  'как', 'что', 'это', 'для', 'при', 'или', 'если', 'все', 'так', 'там',
  'кто', 'где', 'есть', 'его', 'она', 'они', 'мне', 'нет', 'уже', 'был',
  'мой', 'тот', 'вот', 'здесь', 'этот', 'даже', 'без', 'том', 'моя', 'стал',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'this', 'that'
]);

function tokenize(text) {
  return normalize(text).filter(w => !STOP_WORDS.has(w));
}

// BM25-подобный скоринг
function scoreChunk(chunk, queryTokens) {
  const searchText = [
    chunk.topic,
    chunk.keywords,
    chunk.source,
    chunk.articles,
    chunk.content
  ].join(' ');

  const chunkTokens = tokenize(searchText);
  const chunkSet = new Set(chunkTokens);

  // Частота токенов в чанке
  const tf = {};
  for (const t of chunkTokens) {
    tf[t] = (tf[t] || 0) + 1;
  }

  let score = 0;
  for (const qt of queryTokens) {
    if (chunkSet.has(qt)) {
      // Бонус за точное совпадение в keywords/topic (они более релевантны)
      const inKeywords = chunk.keywords.toLowerCase().includes(qt);
      const inTopic    = chunk.topic.toLowerCase().includes(qt);
      const inContent  = chunk.content.toLowerCase().includes(qt);

      const termScore = (tf[qt] || 0) / Math.sqrt(chunkTokens.length);
      const fieldBonus = (inKeywords ? 3 : 0) + (inTopic ? 2 : 0) + (inContent ? 1 : 0);
      score += termScore * (1 + fieldBonus);
    }
  }

  // Нормализуем по длине запроса
  return score / Math.max(queryTokens.length, 1);
}

// Главная функция: найти топ-K релевантных норм для запроса
export async function retrieveLegalContext(query, topK = 4) {
  if (!query || !query.trim()) {
    return { chunks: [], status: 'empty_query' };
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { chunks: [], status: 'no_tokens' };
  }

  // Скоринг всех чанков
  const scored = LEGAL_CHUNKS.map(chunk => ({
    ...chunk,
    score: scoreChunk(chunk, queryTokens)
  }));

  // Сортировка и фильтрация
  scored.sort((a, b) => b.score - a.score);
  const minScore = 0.05;
  const top = scored.slice(0, topK).filter(c => c.score >= minScore);

  return {
    chunks: top.map(c => ({
      source: c.source,
      articles: c.articles,
      topic: c.topic,
      content: c.content,
      score: Math.round(c.score * 100) / 100
    })),
    status: 'ok',
    method: 'keyword'
  };
}

// Форматировать chunks в текст для промпта
export function formatChunksForPrompt(chunks) {
  if (!chunks || chunks.length === 0) return '';
  return chunks.map((c, i) =>
    `[ИСТОЧНИК ${i + 1}: ${c.source}, ${c.articles} — ${c.topic}]\n${c.content}`
  ).join('\n\n');
}

// Заглушки для совместимости с роутами admin/seed-legal и admin/legal
export async function seedLegalEmbeddings() {
  return { embedded: LEGAL_CHUNKS.length, failed: 0, total: LEGAL_CHUNKS.length, method: 'keyword' };
}
export async function getEmbedding() { return null; }
export async function addChunkToDb() { return { ok: false, error: 'Keyword mode — embedding не нужен' }; }
export async function bulkAddChunksToDb() { return { ok: false, error: 'Keyword mode' }; }
export async function deleteChunkFromDb() { return { ok: false, error: 'Keyword mode' }; }
export async function getAllChunksFromDb() { return LEGAL_CHUNKS.map(({ content, ...rest }) => rest); }
