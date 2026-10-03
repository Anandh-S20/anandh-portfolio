import { NextResponse } from "next/server";
import { createVerify } from "crypto";
import { adminDb, adminServerTimestamp } from "@/lib/firebaseAdmin";

const OWNER_EMAIL = "anandhsaji287@gmail.com";
const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

function b64urlToB64(s: string): string {
  return s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
}

// Cached Google public certs for Firebase ID token verification.
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error("certs-fetch-failed");
  const certs = (await res.json()) as Record<string, string>;
  const m = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
  const ttl = m ? parseInt(m[1], 10) * 1000 : 3600000;
  certCache = { certs, expiresAt: Date.now() + ttl };
  return certs;
}

/**
 * Verify a Firebase ID token without firebase-admin/auth (its dynamic import
 * fails on Vercel with ERR_REQUIRE_ESM). Same checks the Admin SDK performs:
 * RS256 signature against Google's certs, audience, issuer, expiry.
 */
async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("no-service-account");
  let projectId = "";
  try {
    projectId = JSON.parse(raw).project_id || "";
  } catch {
    throw new Error("bad-service-account");
  }
  if (!projectId) throw new Error("no-project-id");

  const parts = String(idToken).split(".");
  if (parts.length !== 3) throw new Error("malformed-token");
  const [hB64, pB64, sB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(b64urlToB64(hB64), "base64").toString("utf8"));
    payload = JSON.parse(Buffer.from(b64urlToB64(pB64), "base64").toString("utf8"));
  } catch {
    throw new Error("malformed-token");
  }
  if (header.alg !== "RS256" || !header.kid) throw new Error("bad-header");

  const certs = await getCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error("unknown-kid");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(hB64 + "." + pB64);
  if (!verifier.verify(cert, b64urlToB64(sB64), "base64")) throw new Error("bad-signature");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("aud-mismatch");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("iss-mismatch");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("no-sub");
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("token-expired");
  if (typeof payload.iat === "number" && payload.iat > now + 300) throw new Error("iat-in-future");

  return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}

/**
 * Store a push subscription. The caller proves identity with a Firebase
 * ID token: kind "owner" requires the owner email, otherwise kind must
 * equal the caller's UID (their own thread).
 */
export async function POST(req: Request) {
  try {
    if (!adminDb) return NextResponse.json({ ok: false }, { status: 500 });
    const { subscription, kind, idToken } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys || typeof kind !== "string" || !idToken) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    let verifyError = "unknown";
    let decoded: { uid: string; email?: string } | null = null;
    try {
      decoded = await verifyIdToken(idToken);
    } catch (e: any) {
      // Error code only (no secrets) — surfaced for diagnostics
      verifyError = String(e?.message || "unknown").slice(0, 100);
    }
    if (!decoded) return NextResponse.json({ ok: false, code: verifyError }, { status: 401 });
    if (kind === "owner") {
      if (decoded.email !== OWNER_EMAIL) return NextResponse.json({ ok: false }, { status: 403 });
    } else if (decoded.uid !== kind) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    // Replace any existing record for this endpoint
    const existing = await adminDb
      .collection("push_subscriptions")
      .where("endpoint", "==", subscription.endpoint)
      .get()
      .catch(() => null);
    if (existing) {
      for (const d of existing.docs) {
        await adminDb.doc(`push_subscriptions/${d.id}`).delete().catch(() => {});
      }
    }
    await adminDb.collection("push_subscriptions").add({
      endpoint: String(subscription.endpoint).slice(0, 500),
      keys: {
        p256dh: String(subscription.keys.p256dh || "").slice(0, 200),
        auth: String(subscription.keys.auth || "").slice(0, 100),
      },
      kind: kind.slice(0, 128),
      createdAt: adminServerTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
