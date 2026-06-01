// GET/POST /api/legal/search — Full-text BM25+ search over Kazakhstan laws
// Supports pagination, source filtering, and instant results (no DB calls)

import { searchLegal, getLegalSources, getLegalChunkById } from '../../../../lib/legal-rag';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query  = searchParams.get('q') || '';
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const source = searchParams.get('source') || null;
  const id     = searchParams.get('id');

  // Single chunk lookup
  if (id) {
    const chunk = getLegalChunkById(id);
    if (!chunk) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json({ chunk });
  }

  // Sources list
  if (searchParams.get('sources') === '1') {
    return Response.json({ sources: getLegalSources() });
  }

  const result = await searchLegal(query, { page, limit, source });
  return Response.json(result);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { q = '', page = 1, limit = 10, source = null } = body;
    const result = await searchLegal(q, { page, limit, source });
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
}
