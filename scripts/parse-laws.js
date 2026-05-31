#!/usr/bin/env node
/**
 * Парсер кодексов РК → JSON chunks для базы знаний юриста
 *
 * Использование:
 *   1. Скачать тексты кодексов с adilet.zan.kz как .txt файлы
 *   2. Положить их в data/raw-laws/ с конкретными именами (см. SOURCES ниже)
 *   3. Запустить: node scripts/parse-laws.js
 *   4. Результат — data/parsed-laws.json
 *   5. Импорт через upload-chunks.js или вручную через админ-панель
 */

const fs = require('fs');
const path = require('path');

// Маппинг файлов → официальные названия кодексов
// Положите .txt файлы с этими именами в data/raw-laws/
const SOURCES = {
  'trudovoy.txt':        { name: 'Трудовой кодекс РК',                  prefix: 'tk' },
  'grazhdansky.txt':     { name: 'Гражданский кодекс РК',               prefix: 'gk' },
  'nalogovy.txt':        { name: 'Налоговый кодекс РК',                 prefix: 'nk' },
  'ugolovny.txt':        { name: 'Уголовный кодекс РК',                 prefix: 'uk' },
  'koap.txt':            { name: 'Кодекс об административных правонарушениях РК', prefix: 'koap' },
  'brak_semya.txt':      { name: 'Кодекс О браке и семье РК',           prefix: 'sk' },
  'zemelny.txt':         { name: 'Земельный кодекс РК',                 prefix: 'zk' },
  'zdorovie.txt':        { name: 'Кодекс О здоровье народа РК',         prefix: 'kz' },
  'predprinim.txt':      { name: 'Предпринимательский кодекс РК',       prefix: 'pk' },
  'koap_dorozhny.txt':   { name: 'Правила дорожного движения РК',       prefix: 'pdd' },
  'zhilishnyy.txt':      { name: 'Закон РК О жилищных отношениях',      prefix: 'zh' },
  'potrebiteli.txt':     { name: 'Закон РК О защите прав потребителей', prefix: 'zpp' },
  'osms.txt':            { name: 'Закон РК Об ОСМС',                    prefix: 'osms' },
  'pensii.txt':          { name: 'Закон РК О пенсионном обеспечении',   prefix: 'pens' },
};

const RAW_DIR = path.join(__dirname, '..', 'data', 'raw-laws');
const OUTPUT = path.join(__dirname, '..', 'data', 'parsed-laws.json');

// Главный регекс для извлечения статей
// Ловит "Статья N. Заголовок\n\nСодержание" до следующей "Статья X" или конца
const ARTICLE_PATTERN = /Статья\s+(\d+(?:[-.]\d+)?)\.\s*([^\n]+?)\n+([\s\S]*?)(?=\n\s*Статья\s+\d|\nГлава\s+\d|\nРаздел\s+\d|$)/g;

// Минимальный/максимальный размер контента
const MIN_CONTENT = 80;
const MAX_CONTENT = 2000;

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')   // лишние пустые строки
    .replace(/[ \t]+/g, ' ')       // лишние пробелы
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function makeKeywords(title, content) {
  // Берём существительные из заголовка + первые слова контента
  const allText = (title + ' ' + content.substring(0, 200)).toLowerCase();
  const words = allText
    .replace(/[^а-яёa-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4)
    .filter(w => !['статья', 'кодекс', 'закон', 'настоящий', 'каждый', 'который', 'данной'].includes(w));
  return Array.from(new Set(words)).slice(0, 10).join(' ');
}

function parseCode(text, sourceName, prefix) {
  text = cleanText(text);
  const chunks = [];
  let match;
  ARTICLE_PATTERN.lastIndex = 0;

  while ((match = ARTICLE_PATTERN.exec(text)) !== null) {
    let [, articleNum, title, content] = match;
    title = title.trim().replace(/\.$/, '');
    content = content.trim();

    // Слишком короткие или длинные пропускаем
    if (content.length < MIN_CONTENT) continue;
    if (content.length > MAX_CONTENT) content = content.substring(0, MAX_CONTENT) + '...';

    chunks.push({
      id: `${prefix}_${articleNum.replace(/[.-]/g, '_')}`,
      source: sourceName,
      articles: `Статья ${articleNum}`,
      topic: title,
      keywords: makeKeywords(title, content),
      content: content
    });
  }

  return chunks;
}

// ====== MAIN ======
console.log('🔍 Парсинг законов РК...\n');

if (!fs.existsSync(RAW_DIR)) {
  console.log(`❌ Папка ${RAW_DIR} не найдена.`);
  console.log('Создайте её и положите туда скачанные .txt файлы кодексов.');
  process.exit(1);
}

let allChunks = [];
let processedFiles = 0;

for (const [filename, { name, prefix }] of Object.entries(SOURCES)) {
  const filepath = path.join(RAW_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`⏭  Пропуск ${filename} (не найден)`);
    continue;
  }

  try {
    const text = fs.readFileSync(filepath, 'utf-8');
    const chunks = parseCode(text, name, prefix);
    console.log(`✅ ${filename.padEnd(25)} → ${chunks.length} статей (${name})`);
    allChunks = allChunks.concat(chunks);
    processedFiles++;
  } catch (e) {
    console.log(`❌ Ошибка при обработке ${filename}: ${e.message}`);
  }
}

// Уникализация по id
const uniqueChunks = [];
const seenIds = new Set();
for (const c of allChunks) {
  if (!seenIds.has(c.id)) {
    seenIds.add(c.id);
    uniqueChunks.push(c);
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(uniqueChunks, null, 2), 'utf-8');

console.log(`\n📊 ИТОГО:`);
console.log(`   Обработано файлов:    ${processedFiles}`);
console.log(`   Всего статей:         ${allChunks.length}`);
console.log(`   Уникальных (по id):   ${uniqueChunks.length}`);
console.log(`   Размер JSON:          ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
console.log(`\n💾 Результат: ${OUTPUT}\n`);

console.log('🚀 Следующий шаг:');
console.log('   node scripts/upload-chunks.js');
console.log('   (загрузит в Upstash партиями с учётом лимита Gemini)');
