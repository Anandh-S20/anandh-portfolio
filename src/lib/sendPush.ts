import webpush from "web-push";
import { adminDb } from "./firebaseAdmin";

let vapidReady = false;

function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails("mailto:anandhsaji287@gmail.com", pub, priv);
    vapidReady = true;
    return true;
  } catch {
    return false;
  }
}

type SubDoc = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

async function getSubs(kind: string): Promise<{ id: string; sub: SubDoc }[]> {
  if (!adminDb) return [];
  const snap = await adminDb
    .collection("push_subscriptions")
    .where("kind", "==", kind)
    .get()
    .catch(() => null);
  if (!snap) return [];
  return snap.docs
    .map((d) => {
      const f = d.data() as Partial<SubDoc>;
      if (!f.endpoint || !f.keys?.p256dh || !f.keys?.auth) return null;
      return { id: d.id, sub: { endpoint: f.endpoint, keys: f.keys } };
    })
    .filter((x): x is { id: string; sub: SubDoc } => x !== null);
}

async function sendTo(
  kind: string,
  title: string,
  body: string,
  url: string
): Promise<void> {
  if (!adminDb || !ensureVapid()) return;
  const subs = await getSubs(kind);
  for (const { id, sub } of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys } as never,
        JSON.stringify({ title, body, url, tag: `chat-${kind}` })
      );
    } catch (err) {
      // 410/404 = subscription gone — clean it up
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await adminDb.doc(`push_subscriptions/${id}`).delete().catch(() => {});
      }
    }
  }
}

/** Notify Anandh (inbox) about a new visitor message. */
export function pushToOwner(visitorName: string, text: string): Promise<void> {
  const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;
  return sendTo("owner", `New message from ${visitorName}`, preview, "/inbox");
}

/** Notify a visitor about Anandh's reply. */
export function pushToVisitor(threadId: string, text: string): Promise<void> {
  const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;
  return sendTo(threadId, "New message from Anandh", preview, "/#chat");
}
