/**
 * Client-side push helpers: register the service worker, subscribe with
 * the VAPID public key, and store the subscription server-side.
 * kind is "owner" (Anandh's inbox) or a visitor threadId.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushState(): Promise<"on" | "off" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

export async function enablePush(
  kind: string,
  getIdToken: () => Promise<string>
): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "permission-" + perm };
    let reg: ServiceWorkerRegistration | undefined;
    try {
      reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));
      // Android Chrome can reject subscribe() while the worker is still
      // installing — wait until it's active, and clear any stale subscription.
      await navigator.serviceWorker.ready.catch(() => {});
      if (reg) {
        const stale = await reg.pushManager.getSubscription().catch(() => null);
        if (stale) await stale.unsubscribe().catch(() => {});
      }
    } catch {
      return { ok: false, reason: "sw-register-failed" };
    }
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!pubKey) return { ok: false, reason: "no-vapid-key" };
    let sub: PushSubscription;
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey) as BufferSource,
      });
    } catch (e: any) {
      const detail = String(e?.name ? e.name + ": " : "") + String(e?.message || "unknown");
      return { ok: false, reason: "push-subscribe-failed:" + detail.slice(0, 80) };
    }
    let idToken: string;
    try {
      idToken = await getIdToken();
    } catch {
      await sub.unsubscribe().catch(() => {});
      return { ok: false, reason: "id-token-failed" };
    }
    let res: Response;
    try {
      res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), kind, idToken }),
      });
    } catch {
      await sub.unsubscribe().catch(() => {});
      return { ok: false, reason: "server-unreachable" };
    }
    if (!res.ok) {
      await sub.unsubscribe().catch(() => {});
      let code = "";
      try {
        const data = await res.json();
        if (data && typeof data.code === "string" && data.code) code = ":" + data.code.slice(0, 60);
      } catch {
        /* ignore */
      }
      return { ok: false, reason: "server-" + res.status + code };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

export async function disablePush(kind: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, kind }),
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/** Tiny WhatsApp-style "pop" for in-app message alerts (no asset file). */
export function playPop(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 640;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t);
    o.stop(t + 0.2);
    o.onended = () => ctx.close().catch(() => {});
  } catch {
    /* ignore */
  }
}
