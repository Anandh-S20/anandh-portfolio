import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";

/**
 * Server-only Firestore access via the Firebase Admin SDK.
 * Uses the FIREBASE_SERVICE_ACCOUNT_JSON env var (the service account
 * key JSON, stored as a Vercel secret). Bypasses security rules, so it
 * must only be used in server routes / server components — never ship
 * this to the client.
 */
function initAdminDb(): Firestore | null {
  try {
    if (!getApps().length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) return null;
      initializeApp({ credential: cert(JSON.parse(raw)) });
    }
    return getFirestore();
  } catch {
    return null;
  }
}

export const adminDb: Firestore | null = initAdminDb();

export function adminServerTimestamp() {
  return FieldValue.serverTimestamp();
}
