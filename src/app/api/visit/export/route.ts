import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * Export new site visits for the Google Sheet sync.
 * Protected by a shared secret (VISIT_SYNC_SECRET env var) — the sync
 * job passes it as ?secret=. Not for browsers.
 */
export async function GET(req: Request) {
  try {
    const secret = process.env.VISIT_SYNC_SECRET;
    const url = new URL(req.url);
    if (!secret || url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    if (!adminDb) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    const since = url.searchParams.get("since") || "2026-10-03T00:00:00Z";
    const snap = await adminDb
      .collection("site_visits")
      .where("createdAt", ">", new Date(since))
      .orderBy("createdAt", "asc")
      .limit(500)
      .get();
    const rows = snap.docs
      .map((d) => {
        const f = d.data() as Record<string, unknown>;
        const ts = f.createdAt as { toDate?: () => Date } | undefined;
        if (!ts?.toDate) return null;
        const s = (k: string) => String((f[k] as string) || "");
        return {
          createdAt: ts.toDate().toISOString(),
          sessionId: s("sessionId"),
          path: s("path"),
          name: s("name"),
          uid: s("uid"),
          country: s("country"),
          region: s("region"),
          city: s("city"),
          ip: s("ip"),
          device: s("device"),
          browser: s("browser"),
          os: s("os"),
          screen: s("screen"),
          viewport: s("viewport"),
          language: s("language"),
          timezone: s("timezone"),
          referrer: s("referrer"),
          utmSource: s("utmSource"),
          utmMedium: s("utmMedium"),
          utmCampaign: s("utmCampaign"),
        };
      })
      .filter(Boolean);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
