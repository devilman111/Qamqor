// Генератор .docx файлов из заполненных шаблонов
// Форматирование соответствует официальным документам РК:
// шрифт Times New Roman 14pt, поля 20-30мм, заголовки жирным, выравнивание по ширине

import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, HeadingLevel,
  convertInchesToTwip, PageMargin
} from 'docx';

const FONT = 'Times New Roman';
const FONT_SIZE = 28; // 14pt в полупунктах
const FONT_SIZE_HEADER = 32; // 16pt

function parseDocumentText(text) {
  const lines = text.split('\n');
  const paragraphs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Пустая строка — отступ
    if (trimmed === '') {
      paragraphs.push(new Paragraph({ spacing: { before: 120, after: 0 } }));
      continue;
    }

    // Определяем тип строки
    const isMainTitle = isDocumentTitle(trimmed, i, lines);
    const isSectionHeader = isSectionTitle(trimmed);
    const isSignatureLine = isSignature(trimmed);
    const isBothSides = isTwoColumnLine(trimmed);

    if (isMainTitle) {
      // Главный заголовок — по центру, жирный, крупнее
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: trimmed,
          bold: true,
          size: FONT_SIZE_HEADER,
          font: FONT,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
      }));
    } else if (isSectionHeader) {
      // Заголовок раздела — жирный
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: trimmed,
          bold: true,
          size: FONT_SIZE,
          font: FONT,
        })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 200, after: 80 },
      }));
    } else if (isSignatureLine) {
      // Строки подписей — моноширинный вид
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: line,
          size: FONT_SIZE,
          font: FONT,
        })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
      }));
    } else if (isBothSides) {
      // Строки с двумя колонками (реквизиты сторон)
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: line,
          size: FONT_SIZE,
          font: FONT,
        })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
      }));
    } else {
      // Обычный текст — по ширине, с отступом первой строки для абзацев
      const isSubItem = trimmed.startsWith('—') || trimmed.startsWith('-') || /^\d+\.\d+/.test(trimmed);
      const isTopItem = /^\d+\.(?!\d)/.test(trimmed); // "1. " but not "1.1."

      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: trimmed,
          size: FONT_SIZE,
          font: FONT,
          bold: isTopItem,
        })],
        alignment: isSubItem ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
        indent: isSubItem
          ? { left: convertInchesToTwip(0.3) }
          : (isTopItem ? {} : { firstLine: convertInchesToTwip(0.5) }),
        spacing: { before: 60, after: 60 },
      }));
    }
  }

  return paragraphs;
}

function isDocumentTitle(trimmed, index, lines) {
  // Главный заголовок: строка полностью заглавными, первые строки документа
  if (index > 6) return false;
  if (trimmed.length > 100) return false;
  const upper = trimmed.toUpperCase();
  // Заголовки вида "ДОГОВОР ...", "РАСПИСКА", "ДОВЕРЕННОСТЬ", "ЗАЯВЛЕНИЕ", "АКТ", "СОГЛАШЕНИЕ"
  return /^(ДОГОВОР|РАСПИСКА|ДОВЕРЕННОСТЬ|ЗАЯВЛЕНИЕ|ПРЕТЕНЗИЯ|АКТ|СОГЛАШЕНИЕ|ТРУДОВОЙ|ИСКОВОЕ|ПРИКАЗ)/.test(upper)
    && trimmed === trimmed.toUpperCase();
}

function isSectionTitle(trimmed) {
  // Разделы договора: "1. ПРЕДМЕТ ДОГОВОРА", "2. ОПЛАТА" и т.д.
  return /^\d+\.\s+[А-ЯA-Z\s]+$/.test(trimmed) && trimmed.length < 80;
}

function isSignature(trimmed) {
  return trimmed.includes('___________________________') ||
    trimmed.includes('(подпись') ||
    trimmed.includes('(печать');
}

function isTwoColumnLine(trimmed) {
  // Строки типа "ПРОДАВЕЦ:         ПОКУПАТЕЛЬ:"
  return /[А-ЯA-Z]+:.*[А-ЯA-Z]+:/.test(trimmed) && trimmed.length > 30;
}

/**
 * Генерирует .docx Buffer из заполненного текста документа
 * @param {string} documentText - готовый текст документа
 * @param {string} title - заголовок документа
 * @returns {Promise<Buffer>}
 */
export async function generateDocx(documentText, title) {
  const paragraphs = parseDocumentText(documentText);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1.18),    // 30мм
            right: convertInchesToTwip(0.79),   // 20мм
            bottom: convertInchesToTwip(0.79),  // 20мм
            left: convertInchesToTwip(1.18),    // 30мм (сторона прошивки)
          },
        },
      },
      children: paragraphs,
    }],
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE,
          },
          paragraph: {
            spacing: { line: 360 }, // полуторный интервал
          },
        },
      },
    },
  });

  return await Packer.toBuffer(doc);
}
