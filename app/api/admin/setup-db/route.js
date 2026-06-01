// POST /api/admin/setup-db — one-click database setup + seed
// Protected by ADMIN_PASSWORD env var
// Call once after setting DATABASE_URL in Vercel

import { NextResponse } from 'next/server';
import { setupDatabase } from '../../../../lib/legal-db.js';
import { pingNeon } from '../../../../lib/neon.js';

export async function POST(request) {
  // Auth
  const { password } = await request.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check DB connection first
  const alive = await pingNeon();
  if (!alive) {
    return NextResponse.json({
      error: 'Cannot connect to Neon PostgreSQL',
      hint: 'Make sure DATABASE_URL is set in Vercel env vars. Get it from https://neon.tech → your project → Connection string',
    }, { status: 503 });
  }

  // Run setup
  try {
    const result = await setupDatabase();
    return NextResponse.json({
      success: true,
      message: '🎉 Database ready!',
      ...result,
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Setup failed',
      detail: err.message,
    }, { status: 500 });
  }
}

// GET — just check connection status
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alive = await pingNeon();
  if (!alive) {
    return NextResponse.json({
      connected: false,
      hint: 'Set DATABASE_URL in Vercel env vars (get from https://neon.tech)',
    });
  }

  try {
    const { countChunksDb, getSourcesDb } = await import('../../../../lib/legal-db.js');
    const [count, sources] = await Promise.all([countChunksDb(), getSourcesDb()]);
    return NextResponse.json({
      connected: true,
      chunks: count,
      sources: sources.length,
      sourceList: sources,
    });
  } catch (err) {
    return NextResponse.json({ connected: true, error: err.message });
  }
}
