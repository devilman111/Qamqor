// GET /api/legal/news — Kazakhstan legal news and legislative updates
import { getLegalNews, getNewsById, NEWS_CATEGORIES } from '../../../../lib/legal-news';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit    = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
  const priority = searchParams.get('priority') || null;
  const id       = searchParams.get('id');

  if (id) {
    const item = getNewsById(id);
    if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ item });
  }

  if (searchParams.get('categories') === '1') {
    return Response.json({ categories: NEWS_CATEGORIES });
  }

  const news = getLegalNews({ category, limit, priority });
  return Response.json({
    news,
    total: news.length,
    category,
    updatedAt: new Date().toISOString(),
  });
}
