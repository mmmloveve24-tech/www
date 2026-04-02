// background.js — Управление уведомлениями
const NOTIFY_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y0X58QAAAAASUVORK5CYII=';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'clear') {
    // Очистка всех текущих браузерных уведомлений
    chrome.notifications.getAll(ids => ids.forEach(id => chrome.notifications.clear(id)));
    sendResponse({ status: 'cleared' });
  } else if (msg.action === 'allow') {
    // Возвращаем контроль системе (разрешаем показ новых)
    sendResponse({ status: 'allowed' });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.notifications.create('init', {
    type: 'basic',
    title: '🪼 Jelly Focus установлен!',
    message: 'Откройте всплывающее окно, чтобы начать первую сессию.',
    iconUrl: NOTIFY_ICON
  });
});
