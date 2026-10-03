import { NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, getDoc, limit } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { findVisitorEmail, sendReplyEmail } from "@/lib/sendReplyEmail";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function tgSend(text: string, replyToMessageId?: number): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      }),
    });
  } catch {
    /* ignore */
  }
}

/**
 * Telegram webhook: when Anandh swipes-replies to a chat notification
 * in Telegram, the reply is written back to Firestore so the visitor
 * sees it in the portfolio chat widget.
 *
 * Replying "/unsend" to a message deletes it from the chat as well.
 */
export async function POST(req: Request) {
  try {
    const update = await req.json();
    const msg = update?.message;
    const replyTo = msg?.reply_to_message?.text as string | undefined;
    const text = msg?.text as string | undefined;

    const match = replyTo?.match(/\[thread:([^\]]+)\]/);
    if (!text || !isFirebaseConfigured || !db) {
      return NextResponse.json({ ok: true });
    }

    // "/unsend" as a reply deletes the replied-to message from the chat too.
    // (Telegram doesn't notify bots about native message deletions, so this
    // explicit command is the reliable path.)
    if (text.trim().toLowerCase() === "/unsend") {
      const targetTgId = (msg?.reply_to_message as { message_id?: number } | undefined)?.message_id;
      if (!targetTgId) {
        await tgSend("Reply /unsend to the message you want to delete from the chat.", msg?.message_id);
        return NextResponse.json({ ok: true });
      }
      const snap = await getDocs(
        query(collection(db, "portfolio_chats"), where("telegramMessageId", "==", targetTgId))
      ).catch(() => null);
      if (snap && !snap.empty) {
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "portfolio_chats", d.id)).catch(() => {});
        }
        await tgSend("Deleted from the chat ✅", msg?.message_id);
      } else {
        await tgSend("Couldn't find that message in the chat.", msg?.message_id);
      }
      return NextResponse.json({ ok: true });
    }

    // "/seen" as a reply checks whether the visitor has seen your reply.
    if (text.trim().toLowerCase() === "/seen") {
      let seenThreadId: string | null = match?.[1] ?? null;
      if (!seenThreadId) {
        // Replied to one of his own messages instead of a notification —
        // look up which thread that message belongs to.
        const targetTgId = (msg?.reply_to_message as { message_id?: number } | undefined)?.message_id;
        if (targetTgId) {
          const found = await getDocs(
            query(collection(db, "portfolio_chats"), where("telegramMessageId", "==", targetTgId), limit(1))
          ).catch(() => null);
          const d = found?.docs[0];
          if (d) seenThreadId = (d.data() as { threadId?: string }).threadId ?? null;
        }
      }
      if (!seenThreadId) {
        await tgSend("Reply /seen to a chat notification to check if the visitor saw your reply.", msg?.message_id);
        return NextResponse.json({ ok: true });
      }
      const seenSnap = await getDoc(doc(db, "thread_seen", seenThreadId)).catch(() => null);
      const seenAt = seenSnap?.exists() ? (seenSnap.data().ownerLastSeenAt?.toMillis() ?? 0) : 0;
      const threadSnap = await getDocs(
        query(collection(db, "portfolio_chats"), where("threadId", "==", seenThreadId), limit(100))
      ).catch(() => null);
      let visitorName = "The visitor";
      let latestOwnerAt = 0;
      if (threadSnap) {
        for (const d of threadSnap.docs) {
          const data = d.data() as { fromVisitor?: boolean; name?: string; createdAt?: { toMillis(): number } };
          if (data.fromVisitor && data.name) visitorName = data.name;
          if (!data.fromVisitor && data.createdAt) {
            latestOwnerAt = Math.max(latestOwnerAt, data.createdAt.toMillis());
          }
        }
      }
      if (latestOwnerAt === 0) {
        await tgSend("You haven't replied in this chat yet.", msg?.message_id);
      } else if (seenAt > 0 && seenAt >= latestOwnerAt) {
        await tgSend(`✅ ${visitorName} has seen your reply.`, msg?.message_id);
      } else {
        await tgSend(`⏳ ${visitorName} hasn't opened the chat since your reply.`, msg?.message_id);
      }
      return NextResponse.json({ ok: true });
    }

    if (!match) {
      return NextResponse.json({ ok: true });
    }

    const threadId = match[1];
    await addDoc(collection(db, "portfolio_chats"), {
      threadId,
      name: "Anandh",
      text,
      fromVisitor: false,
      createdAt: serverTimestamp(),
      telegramMessageId: msg?.message_id,
    });
    // Email the visitor about the reply (fire-and-forget)
    findVisitorEmail(threadId).then((visitor) => {
      if (visitor) sendReplyEmail(threadId, visitor.email, visitor.name, text).catch(() => {});
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    // Always 200 so Telegram doesn't retry endlessly
    return NextResponse.json({ ok: true });
  }
}
