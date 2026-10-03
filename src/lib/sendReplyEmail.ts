import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = "anandhsaji287@gmail.com";

export async function findVisitorEmail(
  threadId: string
): Promise<{ email: string; name: string } | null> {
  if (!isFirebaseConfigured || !db) return null;
  const snap = await getDocs(
    query(collection(db, "portfolio_chats"), where("threadId", "==", threadId), limit(100))
  );
  for (const d of snap.docs) {
    const data = d.data() as { email?: string; name?: string };
    if (data.email) return { email: data.email, name: data.name || "there" };
  }
  return null;
}

export async function sendReplyEmail(
  to: string,
  visitorName: string,
  replyText: string
): Promise<boolean> {
  if (!SENDGRID_KEY || !to) return false;
  const chatUrl = "https://anandhs-portfolio.vercel.app/#chat";
  const safeReply = replyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:24px 12px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background-color:#00a884;padding:20px 24px;">
<span style="color:#ffffff;font-size:20px;font-weight:bold;">Anandh S</span><br>
<span style="color:#e8f5f0;font-size:13px;">Portfolio chat</span>
</td></tr>
<tr><td style="padding:24px;">
<p style="color:#111b21;font-size:16px;margin:0 0 4px;">Hi ${visitorName},</p>
<p style="color:#54656f;font-size:14px;margin:0 0 16px;">You have a new reply:</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#e7fce3;border-radius:8px;padding:14px 16px;">
<p style="color:#111b21;font-size:14px;margin:0;">${safeReply}</p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 8px;">
<a href="${chatUrl}" style="display:inline-block;background-color:#00a884;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 40px;border-radius:24px;">Open Chat</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 20px;">
<p style="color:#8696a0;font-size:12px;margin:0;">This email was sent because you chatted on Anandh's portfolio. <a href="${chatUrl}" style="color:#00a884;">Continue the conversation here</a>.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: "Anandh S" },
        subject: "Anandh replied to your message",
        content: [
          {
            type: "text/plain",
            value:
              `Hi ${visitorName},\n\n` +
              `Anandh replied to your message on his portfolio:\n\n` +
              `"${replyText}"\n\n` +
              `Open the chat to continue the conversation: ${chatUrl}`,
          },
          { type: "text/html", value: html },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
