// background.js — Управление уведомлениями
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'clear') {
    // Очистка всех текущих браузерных уведомлений
    chrome.notifications.getAll(ids => ids.forEach(id => chrome.notifications.clear(id)));
    sendResponse({ status: 'cleared' });
  } else if (msg.action === 'allow') {
    // Возвращаем контроль системе (разрешаем показ новых)
    sendResponse({ status: 'allowed' });
  }
  return true; // Keep channel open for async if needed
});

// Запрос permissions при первом запуске (опционально)
chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create('init', {
    type: 'basic',
    title: '🪼 Jelly Focus установлен!',
    message: 'Откройте всплывающее окно, чтобы начать первую сессию.',
    iconUrl: ''
  });
});
