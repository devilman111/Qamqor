// lib/legal-db.js — PostgreSQL operations for Kazakhstan legal knowledge base
// Tables: legal_chunks (full-text search), legal_news (legislative updates)
// Full-text search: tsvector column + GIN index (built-in PostgreSQL)

import { getSql } from './neon.js';
import { LEGAL_CHUNKS } from './legal-data.js';
import { LEGAL_NEWS } from './legal-news.js';

// ─── Schema SQL ───────────────────────────────────────────────────────────────

export const SCHEMA_SQL = `
-- Legal knowledge base chunks
CREATE TABLE IF NOT EXISTS legal_chunks (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  articles    TEXT,
  topic       TEXT NOT NULL,
  keywords    TEXT,
  content     TEXT NOT NULL,
  search_vec  TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce(topic,'')),    'A') ||
    setweight(to_tsvector('russian', coalesce(keywords,'')), 'A') ||
    setweight(to_tsvector('russian', coalesce(source,'')),   'B') ||
    setweight(to_tsvector('russian', coalesce(content,'')),  'C')
  ) STORED,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_chunks_search_idx ON legal_chunks USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS legal_chunks_source_idx ON legal_chunks (source);

-- Legislative news and updates
CREATE TABLE IF NOT EXISTS legal_news (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium',
  badge       TEXT,
  badge_color TEXT,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  details     TEXT,
  source      TEXT,
  link        TEXT,
  tags        TEXT[],
  search_vec  TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce(title,'')),   'A') ||
    setweight(to_tsvector('russian', coalesce(summary,'')), 'B') ||
    setweight(to_tsvector('russian', coalesce(details,'')), 'C')
  ) STORED,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_news_search_idx ON legal_news USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS legal_news_category_idx ON legal_news (category);
CREATE INDEX IF NOT EXISTS legal_news_priority_idx ON legal_news (priority);
`;

// ─── Setup: create tables + seed data ────────────────────────────────────────

export async function setupDatabase() {
  const sql = getSql();
  const log = [];

  // Create schema
  await sql.unsafe(SCHEMA_SQL);
  log.push('✅ Tables created (legal_chunks, legal_news)');

  // Seed legal chunks
  const existingChunks = await sql`SELECT COUNT(*) AS n FROM legal_chunks`;
  const chunkCount = parseInt(existingChunks[0].n, 10);

  if (chunkCount < LEGAL_CHUNKS.length) {
    let inserted = 0;
    for (const chunk of LEGAL_CHUNKS) {
      await sql`
        INSERT INTO legal_chunks (id, source, articles, topic, keywords, content)
        VALUES (${chunk.id}, ${chunk.source}, ${chunk.articles || ''}, ${chunk.topic}, ${chunk.keywords || ''}, ${chunk.content})
        ON CONFLICT (id) DO UPDATE SET
          source   = EXCLUDED.source,
          articles = EXCLUDED.articles,
          topic    = EXCLUDED.topic,
          keywords = EXCLUDED.keywords,
          content  = EXCLUDED.content
      `;
      inserted++;
    }
    log.push(`✅ Seeded ${inserted} legal chunks`);
  } else {
    log.push(`ℹ️  legal_chunks already has ${chunkCount} rows — skipped seed`);
  }

  // Seed legal news
  const existingNews = await sql`SELECT COUNT(*) AS n FROM legal_news`;
  const newsCount = parseInt(existingNews[0].n, 10);

  if (newsCount < LEGAL_NEWS.length) {
    let inserted = 0;
    for (const item of LEGAL_NEWS) {
      await sql`
        INSERT INTO legal_news (id, date, category, priority, badge, badge_color, title, summary, details, source, link, tags)
        VALUES (
          ${item.id}, ${item.date}, ${item.category}, ${item.priority},
          ${item.badge || ''}, ${item.badgeColor || ''},
          ${item.title}, ${item.summary}, ${item.details || ''},
          ${item.source || ''}, ${item.link || ''},
          ${item.tags || []}
        )
        ON CONFLICT (id) DO UPDATE SET
          title      = EXCLUDED.title,
          summary    = EXCLUDED.summary,
          details    = EXCLUDED.details,
          priority   = EXCLUDED.priority
      `;
      inserted++;
    }
    log.push(`✅ Seeded ${inserted} legal news items`);
  } else {
    log.push(`ℹ️  legal_news already has ${newsCount} rows — skipped seed`);
  }

  const totalChunks = await sql`SELECT COUNT(*) AS n FROM legal_chunks`;
  const totalNews   = await sql`SELECT COUNT(*) AS n FROM legal_news`;

  return {
    success: true,
    log,
    stats: {
      chunks: parseInt(totalChunks[0].n, 10),
      news:   parseInt(totalNews[0].n, 10),
    },
  };
}

// ─── Search legal chunks (PostgreSQL full-text) ───────────────────────────────

/**
 * Full-text search using tsvector.
 * Falls back to trigram LIKE if no ts_query matches.
 * Returns chunks sorted by relevance rank.
 */
export async function searchChunksDb(query, { page = 1, limit = 20, source = null } = {}) {
  const sql = getSql();
  const offset = (page - 1) * limit;

  // Sanitise query for ts_query: split words, join with &
  const tsQuery = query.trim().split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g, '')).filter(Boolean)
    .join(' & ');

  if (!tsQuery) return { chunks: [], total: 0, page, limit };

  let rows;
  try {
    if (source) {
      rows = await sql`
        SELECT id, source, articles, topic, keywords, content,
               ts_rank(search_vec, to_tsquery('russian', ${tsQuery})) AS rank
        FROM legal_chunks
        WHERE search_vec @@ to_tsquery('russian', ${tsQuery})
          AND source ILIKE ${'%' + source + '%'}
        ORDER BY rank DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT id, source, articles, topic, keywords, content,
               ts_rank(search_vec, to_tsquery('russian', ${tsQuery})) AS rank
        FROM legal_chunks
        WHERE search_vec @@ to_tsquery('russian', ${tsQuery})
        ORDER BY rank DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
  } catch {
    // Fallback: simple ILIKE search (handles typos/single words)
    const like = '%' + query.trim() + '%';
    rows = source
      ? await sql`SELECT id, source, articles, topic, keywords, content, 0.5 AS rank FROM legal_chunks WHERE (topic ILIKE ${like} OR content ILIKE ${like} OR keywords ILIKE ${like}) AND source ILIKE ${'%' + source + '%'} LIMIT ${limit} OFFSET ${offset}`
      : await sql`SELECT id, source, articles, topic, keywords, content, 0.5 AS rank FROM legal_chunks WHERE (topic ILIKE ${like} OR content ILIKE ${like} OR keywords ILIKE ${like}) LIMIT ${limit} OFFSET ${offset}`;
  }

  return {
    chunks: rows.map(r => ({
      id: r.id, source: r.source, articles: r.articles,
      topic: r.topic, keywords: r.keywords, content: r.content,
      score: parseFloat(r.rank) || 0,
    })),
    total: rows.length,
    page,
    limit,
  };
}

/**
 * RAG retrieval: top-K relevant chunks for a query.
 * Used by the lawyer AI agent.
 */
export async function retrieveChunksDb(query, topK = 6) {
  const sql = getSql();

  const tsQuery = query.trim().split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g, '')).filter(Boolean)
    .join(' | '); // OR for RAG — cast wider net

  if (!tsQuery) return [];

  try {
    const rows = await sql`
      SELECT id, source, articles, topic, keywords, content,
             ts_rank_cd(search_vec, to_tsquery('russian', ${tsQuery}), 32) AS rank
      FROM legal_chunks
      WHERE search_vec @@ to_tsquery('russian', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${topK}
    `;
    return rows.map(r => ({
      id: r.id, source: r.source, articles: r.articles,
      topic: r.topic, keywords: r.keywords, content: r.content,
      score: parseFloat(r.rank) || 0,
    }));
  } catch (e) {
    console.error('[legal-db] retrieveChunksDb error:', e.message);
    return [];
  }
}

/** Get a single chunk by ID */
export async function getChunkByIdDb(id) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM legal_chunks WHERE id = ${id}`;
  return rows[0] || null;
}

/** Get all distinct sources */
export async function getSourcesDb() {
  const sql = getSql();
  const rows = await sql`SELECT DISTINCT source FROM legal_chunks ORDER BY source`;
  return rows.map(r => r.source);
}

/** Count total chunks */
export async function countChunksDb() {
  const sql = getSql();
  const rows = await sql`SELECT COUNT(*) AS n FROM legal_chunks`;
  return parseInt(rows[0].n, 10);
}

// ─── Legal news DB operations ─────────────────────────────────────────────────

export async function getNewsDb({ category = 'all', limit = 50, priority = null } = {}) {
  const sql = getSql();

  let rows;
  if (category !== 'all' && priority) {
    rows = await sql`SELECT * FROM legal_news WHERE category = ${category} AND priority = ${priority} ORDER BY date DESC LIMIT ${limit}`;
  } else if (category !== 'all') {
    rows = await sql`SELECT * FROM legal_news WHERE category = ${category} ORDER BY date DESC LIMIT ${limit}`;
  } else if (priority) {
    rows = await sql`SELECT * FROM legal_news WHERE priority = ${priority} ORDER BY date DESC LIMIT ${limit}`;
  } else {
    rows = await sql`SELECT * FROM legal_news ORDER BY date DESC LIMIT ${limit}`;
  }

  return rows.map(r => ({
    id: r.id, date: r.date, category: r.category, priority: r.priority,
    badge: r.badge, badgeColor: r.badge_color, title: r.title,
    summary: r.summary, details: r.details, source: r.source,
    link: r.link, tags: r.tags || [],
  }));
}

export async function getNewsByIdDb(id) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM legal_news WHERE id = ${id}`;
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id, date: r.date, category: r.category, priority: r.priority,
    badge: r.badge, badgeColor: r.badge_color, title: r.title,
    summary: r.summary, details: r.details, source: r.source,
    link: r.link, tags: r.tags || [],
  };
}

/** Add a new chunk (for future admin import of additional laws) */
export async function addChunkDb(chunk) {
  const sql = getSql();
  await sql`
    INSERT INTO legal_chunks (id, source, articles, topic, keywords, content)
    VALUES (${chunk.id}, ${chunk.source}, ${chunk.articles || ''}, ${chunk.topic}, ${chunk.keywords || ''}, ${chunk.content})
    ON CONFLICT (id) DO UPDATE SET
      source = EXCLUDED.source, articles = EXCLUDED.articles,
      topic = EXCLUDED.topic, keywords = EXCLUDED.keywords, content = EXCLUDED.content
  `;
}

/** Bulk insert an array of chunks (batch import of new laws) */
export async function bulkAddChunksDb(chunks) {
  const sql = getSql();
  let inserted = 0;
  for (const chunk of chunks) {
    await addChunkDb(chunk);
    inserted++;
  }
  return inserted;
}
