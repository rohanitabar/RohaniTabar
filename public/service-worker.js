// Take control promptly so push events use the current notification handler.
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; }
  catch (_) { message = { body: event.data?.text() || '' }; }
  const title = String(message.title || 'Abbas Rohani Tabar').slice(0, 90);
  const options = {
    body: String(message.body || '').slice(0, 240),
    icon: new URL('/icons/brand.jpg', self.location.origin).href,
    badge: new URL('/icons/brand.jpg', self.location.origin).href,
    data: { url: typeof message.url === 'string' ? message.url : '/' },
    // Unique tags keep ordinary updates from silently replacing an earlier notification.
    tag: `${message.kind === 'advertisement' ? 'sponsored' : 'site-update'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    renotify: false
  };
  if (typeof message.image === 'string' && message.image) {
    try { options.image = new URL(message.image, self.location.origin).href; } catch (_) { /* Ignore invalid poster URLs. */ }
  }
  event.waitUntil((async () => {
    try {
      await self.registration.showNotification(title, options);
    } catch (error) {
      // An unsupported/broken poster or icon must not suppress the text notification.
      try {
        await self.registration.showNotification(title, {
          body: options.body,
          data: options.data,
          tag: options.tag,
          renotify: false
        });
      } catch (fallbackError) {
        console.error('Notification display failed:', fallbackError || error);
      }
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let target;
  try {
    target = new URL(event.notification.data?.url || '/', self.location.origin);
    if (!['http:', 'https:'].includes(target.protocol)) target = new URL('/', self.location.origin);
  } catch (_) { target = new URL('/', self.location.origin); }
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const current = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (current && target.origin === self.location.origin) { await current.navigate(target.href); await current.focus(); }
    else await self.clients.openWindow(target.href);
  })());
});
