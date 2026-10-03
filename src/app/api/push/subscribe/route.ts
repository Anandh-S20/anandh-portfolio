import { NextResponse } from "next/server";
import { adminDb, adminServerTimestamp } from "@/lib/firebaseAdmin";

const OWNER_EMAIL = "anandhsaji287@gmail.com";

/**
 * Store a push subscription. The caller proves identity with a Firebase
 * ID token: kind "owner" requires the owner email, otherwise kind must
 * equal the caller's UID (their own thread).
 */
export async function POST(req: Request) {
  try {
    if (!adminDb) return NextResponse.json({ ok: false }, { status: 500 });
    const { subscription, kind, idToken } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys || typeof kind !== "string" || !idToken) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const decoded = await import("firebase-admin/auth")
      .then((m) => m.getAuth().verifyIdToken(idToken))
      .catch(() => null);
    if (!decoded) return NextResponse.json({ ok: false }, { status: 401 });
    if (kind === "owner") {
      if (decoded.email !== OWNER_EMAIL) return NextResponse.json({ ok: false }, { status: 403 });
    } else if (decoded.uid !== kind) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    // Replace any existing record for this endpoint
    const existing = await adminDb
      .collection("push_subscriptions")
      .where("endpoint", "==", subscription.endpoint)
      .get()
      .catch(() => null);
    if (existing) {
      for (const d of existing.docs) {
        await adminDb.doc(`push_subscriptions/${d.id}`).delete().catch(() => {});
      }
    }
    await adminDb.collection("push_subscriptions").add({
      endpoint: String(subscription.endpoint).slice(0, 500),
      keys: {
        p256dh: String(subscription.keys.p256dh || "").slice(0, 200),
        auth: String(subscription.keys.auth || "").slice(0, 100),
      },
      kind: kind.slice(0, 128),
      createdAt: adminServerTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
