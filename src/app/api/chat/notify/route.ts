import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/** Remove a push subscription (no auth needed — endpoint is unguessable). */
export async function POST(req: Request) {
  try {
    if (!adminDb) return NextResponse.json({ ok: false }, { status: 500 });
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ ok: false }, { status: 400 });
    const snap = await adminDb
      .collection("push_subscriptions")
      .where("endpoint", "==", endpoint)
      .get()
      .catch(() => null);
    if (snap) {
      for (const d of snap.docs) {
        await adminDb.doc(`push_subscriptions/${d.id}`).delete().catch(() => {});
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
