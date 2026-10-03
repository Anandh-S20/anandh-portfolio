import { NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(req: Request) {
  try {
    const { threadId, name, text, docId } = await req.json();
    if (!BOT_TOKEN || !CHAT_ID || !threadId || !text) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const message =
      `New portfolio chat message\n\nFrom: ${name}\n${text}\n\n` +
      `[thread:${threadId}] — reply to respond · reply /seen to check if read · reply /unsend to delete a message`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
    });
    const data = await res.json();
    // Tag the chat message with its Telegram message id so /unsend can find it later
    const tgMessageId = data?.result?.message_id;
    if (data.ok === true && tgMessageId && docId && isFirebaseConfigured && db) {
      await updateDoc(doc(db, "portfolio_chats", docId), {
        telegramMessageId: tgMessageId,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: data.ok === true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
