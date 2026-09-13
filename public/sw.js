/*
 * 알림을 받아서 띄우는 일꾼이에요.
 *
 * 앱이 꺼져 있어도 브라우저가 이 파일을 대신 깨워서 돌려요. 그래서 여기에는
 * 앱 코드가 하나도 없어요. 받아서 띄우고, 누르면 앱을 여는 것만 해요.
 *
 * 아이폰은 "홈 화면에 추가" 를 한 경우에만 알림이 와요 (iOS 16.4 이상).
 * 사파리 탭으로 열어둔 것만으로는 안 와요.
 */

// 새로 올린 일꾼이 기다리지 않고 바로 일하게 해요.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let note = { title: '학교생활 도우미', body: '' };
  try {
    if (event.data) note = { ...note, ...event.data.json() };
  } catch {
    // 내용을 못 읽어도 알림은 띄워요. 빈 알림이 아무것도 없는 것보다 나아요.
    note.body = '새 소식이 있어요';
  }

  event.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      // 같은 딱지끼리는 마지막 것만 남아요. 한 쪽지에 답이 세 번 달려도
      // 알림이 세 개 쌓이면 성가셔요.
      tag: note.tag || 'school-app',
      data: { path: note.path || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.path) || '/';
  const url = new URL(path, self.registration.scope).href;

  event.waitUntil(
    (async () => {
      // 이미 열려 있는 창이 있으면 그걸 앞으로 가져와요. 창을 또 열면
      // 같은 앱이 두 개가 돼요.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.startsWith(self.registration.scope)) {
          await w.focus();
          if ('navigate' in w) await w.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
