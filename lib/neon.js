// lib/neon.js — Neon PostgreSQL serverless connection
// Free tier: 3 GB storage, 10 GB transfer/month, 0 cost
// Setup: https://neon.tech → create project → copy DATABASE_URL
// Add to Vercel: Settings → Environment Variables → DATABASE_URL

import { neon } from '@neondatabase/serverless';

let _sql = null;

/**
 * Returns a tagged-template SQL function.
 * Usage: const sql = getSql(); const rows = await sql`SELECT * FROM legal_chunks WHERE id = ${id}`;
 */
export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL not configured. ' +
        'Go to https://neon.tech → New Project (free) → Dashboard → ' +
        '"Connection string" → copy → add to Vercel env vars as DATABASE_URL'
      );
    }
    _sql = neon(url);
  }
  return _sql;
}

/** Health-check — true if DB is reachable */
export async function pingNeon() {
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return true;
  } catch {
    return false;
  }
}

export default getSql;
