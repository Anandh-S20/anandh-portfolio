import { NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

/**
 * Telegram webhook: when Anandh swipes-replies to a chat notification
 * in Telegram, the reply is written back to Firestore so the visitor
 * sees it in the portfolio chat widget.
 */
export async function POST(req: Request) {
  try {
    const update = await req.json();
    const msg = update?.message;
    const replyTo = msg?.reply_to_message?.text as string | undefined;
    const text = msg?.text as string | undefined;

    const match = replyTo?.match(/\[thread:([^\]]+)\]/);
    if (!match || !text || !isFirebaseConfigured || !db) {
      return NextResponse.json({ ok: true });
    }

    await addDoc(collection(db, "portfolio_chats"), {
      threadId: match[1],
      name: "Anandh",
      text,
      fromVisitor: false,
      createdAt: serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Always 200 so Telegram doesn't retry endlessly
    return NextResponse.json({ ok: true });
  }
}
