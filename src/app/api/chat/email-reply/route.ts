import { NextResponse } from "next/server";
import { findVisitorEmail, sendReplyEmail } from "@/lib/sendReplyEmail";

/**
 * Called when Anandh replies from the inbox.
 * Looks up the visitor's email and notifies them.
 */
export async function POST(req: Request) {
  try {
    const { threadId, text } = await req.json();
    if (!threadId || !text) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const visitor = await findVisitorEmail(threadId);
    if (!visitor) {
      return NextResponse.json({ ok: false, reason: "no-email" });
    }
    const ok = await sendReplyEmail(threadId, visitor.email, visitor.name, text);
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
