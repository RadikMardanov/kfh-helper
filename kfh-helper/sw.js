/* ============================================
   КФХ-Помощник · service worker
   Минимальный вариант для возможности установки (PWA).
   Ничего не кэширует, чтобы обновления были видны сразу.
   ============================================ */
self.addEventListener("install",function(e){
  self.skipWaiting();
});
self.addEventListener("activate",function(e){
  e.waitUntil(self.clients.claim());
});
/* обработчик fetch обязателен — без него браузер не предложит установку */
self.addEventListener("fetch",function(e){
  /* работаем через сеть без кэша */
});