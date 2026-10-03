"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { enablePush, disablePush, getPushState, pushSupported, playPop } from "@/lib/pushClient";
import {
  collection,
  addDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { db, auth, isFirebaseConfigured } from "@/lib/firebase";

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  fromVisitor: boolean;
  createdAt: Timestamp | null;
};

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.3 0-.5L9.4 8.2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.2-.7.5-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.5 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

function Ticks({ read }: { read: boolean }) {
  return (
    <svg viewBox="0 0 16 11" className="ml-1 inline h-3.5 w-4 shrink-0" aria-hidden>
      <path
        fill={read ? "#53bdeb" : "#8696a0"}
        d="M11.1 0 6.6 7.9 4.5 5.7 3.4 6.8l3.2 3.2L12.3 1 11.1 0ZM15.5 0l-4.5 7.9-1-1.1-1.1 1.1 2.1 2.1L16.7 1l-1.2-1Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.6-5 3.6-8.5Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.4 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.5 0 10.1 0 12s.5 3.5 1.4 5.1l3.8-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.4 6.8l3.8 2.9c1-2.9 3.7-5.1 6.8-5.1Z"
      />
    </svg>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pushState, setPushState] = useState<"on" | "off" | "unsupported">("unsupported");
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const latestOwnerAt = useRef<number>(0);
  const soundInit = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      // Link the signed-in identity to this visit's analytics row (no email)
      try {
        const vid = sessionStorage.getItem("pv_vid");
        if (u && vid) {
          fetch("/api/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updateId: vid, uid: u.uid, name: u.displayName || "" }),
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    });
    return unsub;
  }, []);

  // Auto-open the chat when arriving via a #chat link (e.g. from email)
  useEffect(() => {
    try {
      if (window.location.hash === "#chat") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open || !user || !isFirebaseConfigured || !db) return;
    // NOTE: no orderBy here — a where()+orderBy() combo needs a composite
    // Firestore index; we sort client-side instead so it just works.
    const q = query(
      collection(db, "portfolio_chats"),
      where("threadId", "==", user.uid),
      limit(100)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, "id">),
        }));
        msgs.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        setMessages(msgs);
      },
      () => {
        /* query failed; messages stay empty rather than crashing */
      }
    );
    return unsub;
  }, [open, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Push notification state for the visitor (notify about Anandh's replies)
  useEffect(() => {
    if (!user || !pushSupported()) return;
    getPushState().then(setPushState);
  }, [user]);

  // Play a sound when Anandh replies while the chat is open
  useEffect(() => {
    if (!soundInit.current && messages.length === 0) return; // not loaded yet
    let newest = 0;
    for (const m of messages) {
      if (!m.fromVisitor) newest = Math.max(newest, m.createdAt?.toMillis() ?? 0);
    }
    if (!soundInit.current) {
      latestOwnerAt.current = newest;
      soundInit.current = true;
      return;
    }
    if (newest > latestOwnerAt.current) {
      latestOwnerAt.current = newest;
      if (document.visibilityState === "visible") playPop();
    }
  }, [messages]);

  const togglePush = async () => {
    if (!user) return;
    const kind = user.uid;
    if (pushState === "on") {
      await disablePush(kind);
      setPushState("off");
    } else {
      const r = await enablePush(kind, () => user.getIdToken());
      setPushState(r.ok ? "on" : "off");
      if (!r.ok) alert(`Couldn't enable notifications (${r.reason}).`);
    }
  };

  // Presence heartbeat so the inbox can show online / last-seen
  useEffect(() => {
    if (!open || !user || !isFirebaseConfigured || !db) return;
    const ref = doc(db, "thread_seen", user.uid);
    const beat = () =>
      setDoc(ref, { lastActiveAt: serverTimestamp() }, { merge: true }).catch(() => {});
    beat();
    const iv = setInterval(beat, 60000);
    return () => clearInterval(iv);
  }, [open, user]);

  // Tell Anandh's inbox when the visitor has seen his replies: whenever the
  // chat is open, record the newest owner message timestamp in thread_seen.
  useEffect(() => {
    if (!open || !user || !isFirebaseConfigured || !db) return;
    const latestOwner = messages.reduce(
      (max, m) => (!m.fromVisitor && m.createdAt ? Math.max(max, m.createdAt.toMillis()) : max),
      0
    );
    if (!latestOwner) return;
    const ref = doc(db, "thread_seen", user.uid);
    getDoc(ref)
      .then((snap) => {
        const prev = snap.exists() ? (snap.data().ownerLastSeenAt?.toMillis() ?? 0) : 0;
        if (latestOwner > prev) {
          setDoc(ref, { ownerLastSeenAt: new Date(latestOwner) }, { merge: true }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [messages, open, user]);

  // Keep the panel fitted to the visible area on mobile: when the keyboard
  // opens, the visual viewport shrinks — resize the panel so it sits right
  // above the keyboard on every screen size / aspect ratio.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!vv || !panel) return;
    const fit = () => {
      // Mobile: full-screen panel sized to the visible area (above keyboard).
      // Desktop: floating card.
      const h =
        window.innerWidth < 640
          ? Math.round(vv.height)
          : Math.min(600, Math.round(vv.height * 0.75));
      panel.style.height = `${h}px`;
    };
    fit();
    vv.addEventListener("resize", fit);
    return () => vv.removeEventListener("resize", fit);
  }, [open ]);

  const signIn = async () => {
    if (!auth || signingIn) return;
    setSigningIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      /* user closed the popup or sign-in failed */
    } finally {
      setSigningIn(false);
    }
  };

  const signOutChat = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setMessages([]);
    } catch {
      /* ignore */
    }
  };

  const sendMessage = async () => {
    const msg = text.trim();
    if (!msg || sending || !isFirebaseConfigured || !db || !user) return;
    setSending(true);
    const name = user.displayName || user.email || "Visitor";
    try {
      const docRef = await addDoc(collection(db, "portfolio_chats"), {
        threadId: user.uid,
        name,
        email: user.email || "",
        text: msg,
        fromVisitor: true,
        createdAt: serverTimestamp(),
      });
      setText("");
      // Forward to Telegram (fire-and-forget)
      fetch("/api/chat/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: user.uid, name, text: msg, docId: docRef.id }),
      }).catch(() => {});
    } catch {
      alert("Couldn't send that message — check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const displayName = user?.displayName || user?.email || "you";

  // The inbox page has its own full messaging UI — don't overlay the
  // floating visitor chat button on top of it.
  const pathname = usePathname();
  if (pathname?.startsWith("/inbox")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end max-sm:bottom-3 max-sm:left-3 max-sm:right-3">
      {open && (
        <div
          ref={panelRef}
          className="mb-3 flex h-[min(600px,72dvh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl shadow-2xl max-sm:fixed max-sm:inset-0 max-sm:mb-0 max-sm:h-full max-sm:w-full max-sm:rounded-none"
          style={{ backgroundColor: "#0b141a" }}
          role="dialog"
          aria-label="Chat with Anandh"
        >
          {/* Header — WhatsApp style */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: "#1f2c34" }}
          >
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                style={{ backgroundColor: "#00a884" }}
              >
                A
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-white">Anandh S</p>
              <p className="text-xs" style={{ color: "#8696a0" }}>
                {!isFirebaseConfigured ? "setting up…" : user ? "online" : "sign in to chat"}
              </p>
            </div>
            {user && pushState !== "unsupported" && (
              <button
                onClick={togglePush}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label={pushState === "on" ? "Turn off reply notifications" : "Notify me of replies"}
                title={pushState === "on" ? "Reply notifications on" : "Notify me of replies"}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-current"
                  style={pushState === "on" ? { color: "#00a884" } : undefined}
                >
                  <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-4.5-5.8V4.5a1.5 1.5 0 0 0-3 0v.7A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" />
                </svg>
              </button>
            )}
            {user && (
              <button
                onClick={signOutChat}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M17 7l-1.4 1.4L18.2 11H8v2h10.2l-2.6 2.6L17 17l5-5-5-5ZM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5Z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4Z" />
              </svg>
            </button>
          </div>

          {!isFirebaseConfigured ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <p className="text-sm" style={{ color: "#8696a0" }}>
                Chat is being set up — check back soon.
              </p>
            </div>
          ) : !authReady ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-sm" style={{ color: "#8696a0" }}>Loading…</p>
            </div>
          ) : !user ? (
            /* Google sign-in prompt */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "#00a884" }}
              >
                <ChatIcon />
              </div>
              <div>
                <p className="text-[15px] font-medium text-white">Chat with Anandh</p>
                <p className="mt-1 text-sm" style={{ color: "#8696a0" }}>
                  Sign in with Google to start chatting. Your chat history is saved to your account.
                </p>
              </div>
              <button
                onClick={signIn}
                disabled={signingIn}
                className="flex items-center gap-2.5 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-slate-800 disabled:opacity-60"
              >
                <GoogleIcon />
                {signingIn ? "Signing in…" : "Sign in with Google"}
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
                style={{
                  backgroundColor: "#0b141a",
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              >
                {messages.length === 0 && (
                  <div className="flex justify-start">
                    <div
                      className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-white shadow"
                      style={{ backgroundColor: "#1f2c34", borderTopLeftRadius: 0 }}
                    >
                      <p>
                        Hi {displayName}! Thanks for visiting my portfolio. Drop me a
                        message here and I&apos;ll get back to you.
                      </p>
                      <p className="mt-1 text-right text-[10px]" style={{ color: "#8696a0" }}>
                        Anandh
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((m) => {
                  // Blue ticks only once Anandh has replied after this message —
                  // i.e. an owner message exists with a later timestamp.
                  const read =
                    m.fromVisitor &&
                    messages.some(
                      (o) =>
                        !o.fromVisitor &&
                        (o.createdAt?.toMillis() ?? Date.now()) >
                          (m.createdAt?.toMillis() ?? Date.now())
                    );
                  return (
                  <div key={m.id} className={`flex ${m.fromVisitor ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-white shadow"
                      style={{
                        backgroundColor: m.fromVisitor ? "#005c4b" : "#1f2c34",
                        borderTopRightRadius: m.fromVisitor ? 0 : undefined,
                        borderTopLeftRadius: m.fromVisitor ? undefined : 0,
                      }}
                    >
                      {!m.fromVisitor && (
                        <p className="mb-0.5 text-xs font-medium" style={{ color: "#00a884" }}>
                          Anandh
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p
                        className="mt-1 flex items-center justify-end text-[10px]"
                        style={{ color: m.fromVisitor ? "#ffffffb3" : "#8696a0" }}
                      >
                        {formatTime(m.createdAt)}
                        {m.fromVisitor && <Ticks read={read} />}
                      </p>
                    </div>
                  </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "#1f2c34" }}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message"
                  maxLength={500}
                  className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                  style={{ backgroundColor: "#2a3942" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
                  style={{ backgroundColor: "#00a884" }}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M3.4 20.4 21.8 12 3.4 3.6l-.01 6.53L14 12 3.39 13.87 3.4 20.4Z" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button — hidden while the chat is open (the panel header has its own close button) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: "#00a884" }}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      )}
    </div>
  );
}
