import nodemailer from "nodemailer";
import { adminDb, adminServerTimestamp } from "@/lib/firebaseAdmin";

const GMAIL_USER = process.env.GMAIL_USER || "botser287@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Anti-spam: at most one reply-email per visitor every 30 minutes.
const COOLDOWN_MS = 30 * 60 * 1000;

async function cooldownActive(threadId: string): Promise<boolean> {
  if (!adminDb || !threadId) return false;
  try {
    const snap = await adminDb.doc(`email_cooldowns/${threadId}`).get();
    const last = snap.exists ? ((snap.data()?.lastSentAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0) : 0;
    return Date.now() - last < COOLDOWN_MS;
  } catch {
    return false; // fail open — better to send than to silently drop
  }
}

async function recordSent(threadId: string): Promise<void> {
  if (!adminDb || !threadId) return;
  try {
    await adminDb
      .doc(`email_cooldowns/${threadId}`)
      .set({ lastSentAt: adminServerTimestamp() }, { merge: true });
  } catch {
    /* ignore */
  }
}

export async function findVisitorEmail(
  threadId: string
): Promise<{ email: string; name: string } | null> {
  if (!adminDb) return null;
  const snap = await adminDb
    .collection("portfolio_chats")
    .where("threadId", "==", threadId)
    .limit(100)
    .get();
  for (const d of snap.docs) {
    const data = d.data() as { email?: string; name?: string };
    if (data.email) return { email: data.email, name: data.name || "there" };
  }
  return null;
}

export async function sendReplyEmail(
  threadId: string,
  to: string,
  visitorName: string,
  replyText: string
): Promise<boolean> {
  if (!GMAIL_APP_PASSWORD || !to) return false;
  if (await cooldownActive(threadId)) return false;
  const chatUrl = "https://anandhs-portfolio.vercel.app/#chat";
  const safeName = visitorName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeReply = replyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 12px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e6e8eb;">
<tr><td style="background-color:#111b21;padding:22px 28px;">
<span style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:0.3px;">Anandh S</span><br>
<span style="color:#9aa5b1;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">IT Administrator &nbsp;·&nbsp; Portfolio</span>
</td></tr>
<tr><td style="padding:28px;">
<p style="color:#111b21;font-size:17px;font-weight:bold;margin:0 0 6px;">You have a new message</p>
<p style="color:#54656f;font-size:14px;margin:0 0 20px;">Hi ${safeName}, Anandh has replied to your message:</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:3px;background-color:#00a884;border-radius:2px;"></td>
<td style="background-color:#f7f9fa;border-radius:0 8px 8px 0;padding:16px 18px;">
<p style="color:#111b21;font-size:14px;line-height:1.6;margin:0;">${safeReply}</p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:26px 0 6px;">
<a href="${chatUrl}" style="display:inline-block;background-color:#00a884;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 44px;border-radius:6px;">Reply in Chat</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 24px;">
<p style="color:#8696a0;font-size:12px;line-height:1.6;margin:0;">You are receiving this email because you started a conversation on <a href="https://anandhs-portfolio.vercel.app/" style="color:#00a884;text-decoration:none;">Anandh's portfolio</a>. Your chat history is saved to your Google account.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"Anandh S" <${GMAIL_USER}>`,
      to,
      subject: "You have a new message from Anandh",
      headers: {
        "List-Unsubscribe": `<mailto:${GMAIL_USER}?subject=unsubscribe>`,
      },
      text:
        `Hi ${visitorName},\n\n` +
        `You have a new message from Anandh:\n\n` +
        `"${replyText}"\n\n` +
        `Reply in the chat: ${chatUrl}`,
      html,
    });
    await recordSent(threadId);
    return true;
  } catch {
    return false;
  }
}
