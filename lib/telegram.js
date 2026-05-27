// Helpers для работы с Telegram WebApp SDK
// Telegram грузит скрипт глобально, доступ через window.Telegram.WebApp

export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

export function initTelegram() {
  const tg = getTelegramWebApp();
  if (!tg) return null;

  // Готовность к показу (Telegram покажет приложение)
  tg.ready();

  // Развернуть на весь экран
  tg.expand();

  // Включить подтверждение закрытия
  tg.enableClosingConfirmation();

  return tg;
}

export function getTelegramUser() {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  return tg.initDataUnsafe?.user || null;
}

export function getInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || '';
}

// Тактильная обратная связь (вибрация)
export function hapticFeedback(type = 'medium') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(type)) {
    tg.HapticFeedback.impactOccurred(type);
  } else if (['success', 'warning', 'error'].includes(type)) {
    tg.HapticFeedback.notificationOccurred(type);
  }
}

// Показать главную кнопку Telegram
export function showMainButton(text, onClick) {
  const tg = getTelegramWebApp();
  if (!tg?.MainButton) return;

  tg.MainButton.setText(text);
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
}

export function hideMainButton() {
  const tg = getTelegramWebApp();
  tg?.MainButton?.hide();
}

// Закрыть Mini App
export function closeApp() {
  const tg = getTelegramWebApp();
  tg?.close();
}
