/* Portfolio chat push notifications */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* ignore */
  }
  const title = data.title || "New message";
  const body = data.body || "";
  const url = data.url || "/";
  event.waitUntil(
    (async () => {
      // If the relevant page is already open and visible, the page itself
      // plays a sound — don't double up with a system notification.
      try {
        const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
        if (wins.some((w) => w.visibilityState === "visible" && w.url.includes(url))) return;
      } catch {
        /* ignore */
      }
      await self.registration.showNotification(title, {
        body,
        data: { url },
        tag: data.tag || "portfolio-chat",
        renotify: true,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (w.url.includes(url)) {
          await w.focus();
          return;
        }
      }
      await clients.openWindow(url);
    })()
  );
});
