// Шифрование чувствительных данных пользователя (история чатов, документы)
// AES-256-GCM с authenticated encryption — стандарт для защиты данных at-rest

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY не задан в env. Сгенерируйте: openssl rand -hex 32');
  }
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY должен быть 64 hex символа (32 байта)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Зашифровать строку. Результат: base64(iv | authTag | ciphertext)
 */
export function encrypt(plaintext) {
  if (!plaintext) return '';
  try {
    const key = getKey();
    const iv = crypto.randomBytes(12);  // GCM рекомендует 12 байт
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  } catch (e) {
    console.error('Encryption error:', e.message);
    return null;
  }
}

/**
 * Расшифровать. Принимает base64 от encrypt().
 */
export function decrypt(encrypted) {
  if (!encrypted) return '';
  try {
    const key = getKey();
    const buf = Buffer.from(encrypted, 'base64');

    const iv = buf.slice(0, 12);
    const authTag = buf.slice(12, 28);
    const ciphertext = buf.slice(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf8');
  } catch (e) {
    console.error('Decryption error:', e.message);
    return null;
  }
}

// Хелперы для JSON
export function encryptJson(obj) {
  return encrypt(JSON.stringify(obj));
}

export function decryptJson(encrypted) {
  const text = decrypt(encrypted);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
