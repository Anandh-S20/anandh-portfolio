import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { pushToOwner } from "@/lib/sendPush";

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
    // Push-notify Anandh's devices too (fire-and-forget)
    pushToOwner(name || "Visitor", text).catch(() => {});
    // Tag the chat message with its Telegram message id so /unsend can find it later
    const tgMessageId = data?.result?.message_id;
    if (data.ok === true && tgMessageId && docId && adminDb) {
      await adminDb
        .doc(`portfolio_chats/${docId}`)
        .update({ telegramMessageId: tgMessageId })
        .catch(() => {});
    }
    return NextResponse.json({ ok: data.ok === true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
