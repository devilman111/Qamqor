// ============================================================
// legal-rag.js — Senior-grade BM25+ RAG engine for Kazakhstan law
// In-memory, zero-dependency, works on Vercel Hobby without embedding API
// Features: BM25+, query expansion, bigrams, field boosting, deduplication
// ============================================================

import { ALL_LEGAL_CHUNKS as LEGAL_CHUNKS } from './legal-data';

// ─── Pre-computation at module load time ──────────────────────────────────────
// Build inverted index and IDF table once (module-level singleton)

const STOP_WORDS = new Set([
  'как', 'что', 'это', 'для', 'при', 'или', 'если', 'все', 'так', 'там',
  'кто', 'где', 'есть', 'его', 'она', 'они', 'мне', 'нет', 'уже', 'был',
  'мой', 'тот', 'вот', 'здесь', 'этот', 'даже', 'без', 'том', 'моя', 'стал',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'this', 'that',
  'по', 'на', 'от', 'до', 'за', 'со', 'из', 'об', 'под', 'над', 'перед',
  'между', 'через', 'после', 'до', 'во', 'вместе', 'вместо', 'около',
]);

// Synonyms / query expansion map (keyword → related terms)
const SYNONYMS = {
  'уволить': ['увольнение', 'расторжение', 'прекращение', 'сокращение'],
  'зарплата': ['заработная', 'оплата', 'вознаграждение', 'жалование'],
  'ребёнок': ['дети', 'несовершеннолетний', 'дитя'],
  'авто': ['автомобиль', 'машина', 'транспорт', 'vehicle'],
  'квартира': ['жильё', 'жилище', 'недвижимость', 'помещение'],
  'долг': ['займ', 'кредит', 'задолженность', 'обязательство'],
  'штраф': ['санкция', 'пеня', 'взыскание', 'наказание'],
  'суд': ['иск', 'судебный', 'процесс', 'разбирательство'],
  'договор': ['соглашение', 'контракт', 'сделка', 'обязательство'],
  'налог': ['сбор', 'платёж', 'обложение', 'бюджет'],
  'пенсия': ['пенсионный', 'накопление', 'ЕНПФ', 'ОПВ'],
  'больничный': ['нетрудоспособность', 'болезнь', 'листок'],
  'работодатель': ['наниматель', 'предприятие', 'организация'],
  'работник': ['сотрудник', 'служащий', 'наёмный'],
  'мошенничество': ['обман', 'хищение', 'афера'],
  'регистрация': ['постановка', 'учёт', 'оформление'],
  'страховка': ['страхование', 'страховщик', 'полис', 'ОСАГО'],
  'ип': ['предприниматель', 'индивидуальный'],
  'тоо': ['юрлицо', 'организация', 'общество'],
};

function normalize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function tokenize(text) {
  return normalize(text).filter(w => !STOP_WORDS.has(w));
}

// Stem / truncate word for partial matching (crude Porter-like for Russian)
function stem(word) {
  if (word.length <= 4) return word;
  // Strip common Russian suffixes
  for (const suffix of ['ость', 'ание', 'ение', 'tion', 'ться', 'ого', 'ому',
    'ных', 'ных', 'ных', 'ам', 'ах', 'ой', 'ий', 'ые', 'ых', 'ию', 'ья',
    'ей', 'ем', 'ов', 'ев', 'ми', 'ей', 'ях', 'ие', 'ия']) {
    if (word.endsWith(suffix) && word.length - suffix.length > 3) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

// Expand query with synonyms and stems
function expandQuery(tokens) {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    expanded.add(stem(t));
    const syns = SYNONYMS[t] || [];
    for (const s of syns) {
      expanded.add(s);
      expanded.add(stem(s));
    }
    // Also add stems of original
    for (const [key, vals] of Object.entries(SYNONYMS)) {
      if (vals.includes(t)) {
        expanded.add(key);
        expanded.add(stem(key));
      }
    }
  }
  return [...expanded];
}

// Build bigrams from token list
function bigrams(tokens) {
  const bg = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bg.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bg;
}

// ─── IDF computation (one-time at module init) ───────────────────────────────
const N = LEGAL_CHUNKS.length;

// Build per-chunk token sets and document frequency map
const chunkData = LEGAL_CHUNKS.map(chunk => {
  const fieldText = {
    keywords: tokenize(chunk.keywords || ''),
    topic:    tokenize(chunk.topic || ''),
    source:   tokenize(chunk.source || ''),
    content:  tokenize(chunk.content || ''),
  };
  const allTokens = [
    ...fieldText.keywords,
    ...fieldText.topic,
    ...fieldText.source,
    ...fieldText.content,
  ];
  // TF map
  const tf = {};
  for (const t of allTokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  // Stem-TF map for partial matching
  const stemTf = {};
  for (const t of allTokens) {
    const s = stem(t);
    stemTf[s] = (stemTf[s] || 0) + 1;
  }
  return { chunk, fieldText, tf, stemTf, len: allTokens.length };
});

// Document frequency
const df = {};
for (const { tf } of chunkData) {
  for (const t of Object.keys(tf)) {
    df[t] = (df[t] || 0) + 1;
  }
}

function idf(term) {
  const d = df[term] || 0;
  return Math.log((N - d + 0.5) / (d + 0.5) + 1);
}

// BM25 constants
const K1 = 1.5;
const B  = 0.75;
const AVG_LEN = chunkData.reduce((s, c) => s + c.len, 0) / N;

// Field weights
const FIELD_WEIGHTS = {
  keywords: 4.0,
  topic:    2.5,
  source:   1.5,
  content:  1.0,
};

function scoreBM25(cd, queryTokens) {
  let score = 0;
  const dl = cd.len;
  const K  = K1 * (1 - B + B * dl / AVG_LEN);

  for (const qt of queryTokens) {
    // Exact match per field
    for (const [field, tokens] of Object.entries(cd.fieldText)) {
      const f = tokens.filter(t => t === qt).length;
      if (f > 0) {
        const w   = FIELD_WEIGHTS[field];
        const tf_ = (f * (K1 + 1)) / (f + K);
        score += w * idf(qt) * tf_;
      }
    }

    // Stem partial match (lower weight)
    const qs = stem(qt);
    if (qs !== qt) {
      const stemF = cd.stemTf[qs] || 0;
      if (stemF > 0) {
        score += 0.5 * idf(qt) * (stemF * (K1 + 1)) / (stemF + K);
      }
    }
  }

  return score;
}

// ─── DB-first helpers (lazy import so module still works without DATABASE_URL) ─

async function tryDbRetrieve(query, topK) {
  try {
    if (!process.env.DATABASE_URL) return null;
    const { retrieveChunksDb } = await import('./legal-db.js');
    const chunks = await retrieveChunksDb(query, topK);
    if (chunks && chunks.length > 0) return chunks;
    return null;
  } catch {
    return null;
  }
}

async function tryDbSearch(query, opts) {
  try {
    if (!process.env.DATABASE_URL) return null;
    const { searchChunksDb } = await import('./legal-db.js');
    return await searchChunksDb(query, opts);
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Retrieve top-K most relevant legal chunks for a natural language query.
 * Strategy: PostgreSQL tsvector (if DATABASE_URL set) → BM25+ in-memory fallback.
 */
export async function retrieveLegalContext(query, topK = 6) {
  if (!query?.trim()) return { chunks: [], status: 'empty_query' };

  // Try PostgreSQL full-text search first
  const dbChunks = await tryDbRetrieve(query, topK);
  if (dbChunks) {
    return { chunks: dbChunks, status: 'ok', method: 'postgresql', totalChecked: dbChunks.length };
  }

  // Fallback: BM25+ in-memory
  const rawTokens   = tokenize(query);
  if (rawTokens.length === 0) return { chunks: [], status: 'no_tokens' };

  const expandedTokens = expandQuery(rawTokens);
  const bigramTokens   = bigrams(rawTokens);
  const allQueryTokens = [...new Set([...expandedTokens, ...bigramTokens])];

  // Score every chunk
  const scored = chunkData.map(cd => ({
    ...cd.chunk,
    score: scoreBM25(cd, allQueryTokens),
  }));

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  // Dynamic threshold: at least 10% of top score
  const topRaw  = scored[0]?.score ?? 0;
  const minScore = Math.max(0.05, topRaw * 0.10);
  const top = scored.slice(0, topK * 2).filter(c => c.score >= minScore);

  // Deduplicate by source+topic (take only best per topic cluster)
  const seen = new Set();
  const deduped = [];
  for (const c of top) {
    const key = `${c.source}::${c.topic}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
    if (deduped.length >= topK) break;
  }

  return {
    chunks: deduped.map(c => ({
      id:       c.id,
      source:   c.source,
      articles: c.articles,
      topic:    c.topic,
      content:  c.content,
      score:    Math.round(c.score * 100) / 100,
    })),
    status:       'ok',
    method:       'bm25plus',
    totalChecked: N,
    queryTokens:  rawTokens,
  };
}

/** Full-text search with pagination — for /api/legal/search endpoint */
export async function searchLegal(query, { page = 1, limit = 10, source = null } = {}) {
  // Try PostgreSQL first
  const dbResult = await tryDbSearch(query, { page, limit, source });
  if (dbResult) return { results: dbResult.chunks, total: dbResult.total, page, limit, query, method: 'postgresql' };

  // BM25+ fallback
  if (!query?.trim()) {
    const all = LEGAL_CHUNKS.filter(c => !source || c.source === source);
    return { results: all.slice(0, limit), total: all.length, page, limit, method: 'bm25plus' };
  }

  const tokens = expandQuery(tokenize(query));
  const scored = chunkData
    .filter(cd => !source || cd.chunk.source === source)
    .map(cd => ({ ...cd.chunk, score: scoreBM25(cd, tokens) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const offset = (page - 1) * limit;
  return {
    results: scored.slice(offset, offset + limit),
    total:   scored.length,
    page,
    limit,
    query,
    method: 'bm25plus',
  };
}

/** Get all unique legal sources (for filter UI) */
export function getLegalSources() {
  return [...new Set(LEGAL_CHUNKS.map(c => c.source))].sort();
}

/** Get chunk by id */
export function getLegalChunkById(id) {
  return LEGAL_CHUNKS.find(c => c.id === id) || null;
}

/** Format chunks for Gemini system prompt injection */
export function formatChunksForPrompt(chunks) {
  if (!chunks?.length) return '';
  return chunks.map((c, i) =>
    `[ИСТОЧНИК ${i + 1}: ${c.source}, ${c.articles} — ${c.topic}]\n${c.content}`
  ).join('\n\n');
}

// ─── Admin/compat stubs ───────────────────────────────────────────────────────
export async function seedLegalEmbeddings() {
  return { embedded: N, failed: 0, total: N, method: 'bm25plus' };
}
export async function getEmbedding()       { return null; }
export async function addChunkToDb()       { return { ok: false, error: 'BM25 mode — no DB needed' }; }
export async function bulkAddChunksToDb()  { return { ok: false, error: 'BM25 mode' }; }
export async function deleteChunkFromDb()  { return { ok: false, error: 'BM25 mode' }; }
export async function getAllChunksFromDb() {
  return LEGAL_CHUNKS.map(({ content: _c, ...rest }) => rest);
}
