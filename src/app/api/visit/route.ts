import { NextResponse } from "next/server";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

function header(req: Request, name: string): string {
  return req.headers.get(name) || "";
}

function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = "Other";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/msie|trident/i.test(ua)) browser = "IE";

  let os = "Other";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let device = "Desktop";
  if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) device = "Mobile";
  else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) device = "Tablet";

  return { browser, os, device };
}

/**
 * Visitor analytics beacon. POST from the site on page load; optionally
 * enriches the visit with the signed-in chat identity (no email stored).
 */
export async function POST(req: Request) {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    const body = await req.json();

    // Identity enrichment for an existing visit row
    if (body.updateId && typeof body.updateId === "string") {
      await updateDoc(doc(db, "site_visits", body.updateId), {
        uid: String(body.uid || "").slice(0, 128),
        name: String(body.name || "").slice(0, 128),
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    const ua = String(body.userAgent || header(req, "user-agent") || "").slice(0, 300);
    const { browser, os, device } = parseUA(ua);
    const fwd = header(req, "x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : "";
    let city = header(req, "x-vercel-ip-city");
    try {
      city = decodeURIComponent(city);
    } catch {
      /* keep raw */
    }

    const ref = await addDoc(collection(db, "site_visits"), {
      createdAt: serverTimestamp(),
      sessionId: String(body.sessionId || "").slice(0, 64),
      path: String(body.path || "/").slice(0, 200),
      referrer: String(body.referrer || "").slice(0, 500),
      utmSource: String(body.utm_source || "").slice(0, 100),
      utmMedium: String(body.utm_medium || "").slice(0, 100),
      utmCampaign: String(body.utm_campaign || "").slice(0, 100),
      userAgent: ua,
      browser,
      os,
      device,
      screen: String(body.screen || "").slice(0, 32),
      viewport: String(body.viewport || "").slice(0, 32),
      language: String(body.language || "").slice(0, 32),
      timezone: String(body.timezone || "").slice(0, 64),
      uid: "",
      name: "",
      country: header(req, "x-vercel-ip-country"),
      region: header(req, "x-vercel-ip-country-region"),
      city,
      ip,
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
