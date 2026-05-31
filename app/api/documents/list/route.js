// /api/documents/list — публичный список шаблонов
import { NextResponse } from 'next/server';
import { TEMPLATES, DOCUMENT_CATEGORIES } from '../../../../lib/document-templates';

export async function GET() {
  // Возвращаем без `template` поля (это контент, нужен только при генерации)
  const lightweight = TEMPLATES.map(({ template, postProcess, ...rest }) => rest);
  return NextResponse.json({
    categories: DOCUMENT_CATEGORIES,
    templates: lightweight
  });
}
