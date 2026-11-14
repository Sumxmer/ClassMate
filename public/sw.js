const SHELL = 'classmate-shell-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(['/offline.html', '/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('classmate-shell-') && key !== SHELL).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }
  const alarm = data.alarm === true;
  event.waitUntil(self.registration.showNotification(data.title || 'ClassMate', {
    body: data.body,
    icon: '/icon-192.png',
    tag: data.tag || 'classmate',
    requireInteraction: alarm,
    renotify: alarm,
    vibrate: alarm ? [500, 160, 500, 160, 750, 200, 1000] : [180],
    actions: alarm ? [{action:'open', title:'เปิดเพื่อรับทราบ'}] : [],
    data: {path: data.path || '/groups'}
  }));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACK_ALARM' && typeof event.data.id === 'string') {
    event.waitUntil(self.registration.getNotifications({tag:event.data.id}).then(items => items.forEach(item => item.close())));
  }
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.path || '/groups', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({type:'window'}).then(async windows => {
    const client = windows.find(window => window.url === url.href);
    if (client) return client.focus();
    return self.clients.openWindow(url.href);
  }));
});
