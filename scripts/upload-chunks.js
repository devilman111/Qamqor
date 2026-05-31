#!/usr/bin/env node
/**
 * Загрузчик законов в админ-панель пачками
 *
 * Использование:
 *   node scripts/upload-chunks.js --url https://qamqor-seven.vercel.app --key YOUR_ADMIN_PASSWORD
 *
 * Скрипт:
 *   - Читает data/parsed-laws.json
 *   - Загружает пачками по 30 чанков
 *   - Между пачками — пауза 5 секунд
 *   - Если упирается в лимит Gemini — пишет в файл прогресс и предлагает запустить завтра
 */

const fs = require('fs');
const path = require('path');

// === Парсинг аргументов командной строки ===
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
}

const URL = getArg('url');
const KEY = getArg('key');

if (!URL || !KEY) {
  console.log('❌ Использование:');
  console.log('   node scripts/upload-chunks.js --url https://ваш-домен.vercel.app --key ВАШ_ADMIN_PASSWORD');
  console.log('');
  console.log('Можно использовать переменные окружения:');
  console.log('   APP_URL=https://... ADMIN_PASSWORD=... node scripts/upload-chunks.js');
  process.exit(1);
}

const BATCH_SIZE = 30;
const DELAY_MS = 5000;
const INPUT_FILE = path.join(__dirname, '..', 'data', 'parsed-laws.json');
const PROGRESS_FILE = path.join(__dirname, '..', 'data', '.upload-progress.json');

// === Загрузить чанки ===
if (!fs.existsSync(INPUT_FILE)) {
  console.log(`❌ Файл ${INPUT_FILE} не найден.`);
  console.log('Сначала запустите: node scripts/parse-laws.js');
  process.exit(1);
}

const allChunks = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
console.log(`📚 Загружено ${allChunks.length} чанков из parsed-laws.json`);

// === Прогресс ===
let startFrom = 0;
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    startFrom = progress.lastUploaded || 0;
    console.log(`▶️  Продолжаем с позиции ${startFrom} (прошлый раз остановились)`);
  } catch {}
}

const apiUrl = `${URL.replace(/\/$/, '')}/api/admin/legal?key=${encodeURIComponent(KEY)}`;

async function uploadBatch(batch) {
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk', json_data: JSON.stringify(batch) })
    });
    const data = await res.json();
    return { ok: res.ok, ...data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function saveProgress(idx) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastUploaded: idx, when: new Date().toISOString() }, null, 2));
}

async function main() {
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = startFrom; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allChunks.length / BATCH_SIZE);

    process.stdout.write(`\n📦 Пачка ${batchNum}/${totalBatches} (${i+1}-${i+batch.length} из ${allChunks.length})... `);

    const result = await uploadBatch(batch);

    if (!result.ok) {
      console.log(`❌ Ошибка: ${result.error || JSON.stringify(result)}`);
      saveProgress(i);
      console.log(`\n💾 Прогресс сохранён. Запустите снова через какое-то время.`);
      break;
    }

    totalAdded += result.added || 0;
    totalSkipped += result.skipped || 0;
    totalFailed += result.failed || 0;

    console.log(`✅ +${result.added || 0} (skip:${result.skipped || 0}, fail:${result.failed || 0})`);

    saveProgress(i + batch.length);

    // Если большинство упали — наверное лимит Gemini, останавливаемся
    if (result.failed > result.added && result.failed > 5) {
      console.log(`\n⚠️  Похоже на исчерпание лимита Gemini Embedding (1500/день).`);
      console.log(`   Прогресс сохранён. Запустите скрипт снова завтра.`);
      break;
    }

    // Пауза между пачками (не нагружаем сервер)
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n\n📊 ИТОГИ:`);
  console.log(`   Добавлено:   ${totalAdded}`);
  console.log(`   Пропущено:   ${totalSkipped} (дубликаты по id)`);
  console.log(`   Ошибки:      ${totalFailed}`);

  if (startFrom + totalAdded + totalSkipped + totalFailed >= allChunks.length) {
    console.log(`\n🎉 Все чанки обработаны! Можно удалить ${PROGRESS_FILE}`);
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(e => {
  console.log(`\n❌ Критическая ошибка: ${e.message}`);
  process.exit(1);
});
