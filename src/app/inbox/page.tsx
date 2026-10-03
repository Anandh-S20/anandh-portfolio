"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
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

const OWNER_EMAIL = "anandhsaji287@gmail.com";

type ChatMessage = {
  id: string;
  threadId: string;
  name: string;
  text: string;
  fromVisitor: boolean;
  createdAt: Timestamp | null;
};

type Thread = {
  threadId: string;
  name: string;
  lastText: string;
  lastAt: number;
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

export default function InboxPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const isOwner = user?.email === OWNER_EMAIL;

  useEffect(() => {
    if (!isOwner || !isFirebaseConfigured || !db) return;
    const q = query(
      collection(db, "portfolio_chats"),
      orderBy("createdAt", "desc"),
      limit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }))
      );
    });
    return unsub;
  }, [isOwner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeThread]);

  const threads: Thread[] = useMemo(() => {
    const map = new Map<string, Thread>();
    // messages are desc; first occurrence per thread is the latest
    for (const m of messages) {
      if (!map.has(m.threadId)) {
        map.set(m.threadId, {
          threadId: m.threadId,
          name: m.name || "Visitor",
          lastText: m.text,
          lastAt: m.createdAt?.toMillis() ?? 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
  }, [messages]);

  const activeMessages = useMemo(
    () =>
      messages
        .filter((m) => m.threadId === activeThread)
        .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)),
    [messages, activeThread]
  );

  const signIn = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      /* user closed the popup */
    }
  };

  const sendReply = async () => {
    const msg = text.trim();
    if (!msg || sending || !isFirebaseConfigured || !db || !activeThread) return;
    setSending(true);
    setText("");
    try {
      await addDoc(collection(db, "portfolio_chats"), {
        threadId: activeThread,
        name: "Anandh",
        text: msg,
        fromVisitor: false,
        createdAt: serverTimestamp(),
      });
    } catch {
      /* retry */
    } finally {
      setSending(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0b141a" }}>
        <p className="text-sm" style={{ color: "#8696a0" }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" style={{ backgroundColor: "#0b141a" }}>
        <p className="text-lg font-medium text-white">Chat Inbox</p>
        <p className="text-sm" style={{ color: "#8696a0" }}>Sign in with Google to view messages.</p>
        <button
          onClick={signIn}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-slate-800"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" style={{ backgroundColor: "#0b141a" }}>
        <p className="text-lg font-medium text-white">Private inbox</p>
        <p className="text-sm" style={{ color: "#8696a0" }}>
          Signed in as {user.email} — this inbox belongs to the site owner.
        </p>
        <button
          onClick={() => signOut(auth!)}
          className="rounded-full px-6 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: "#00a884" }}
        >
          Sign out
        </button>
      </div>
    );
  }

  const activeName = threads.find((t) => t.threadId === activeThread)?.name ?? "Chat";

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#0b141a" }}>
      {/* Thread list */}
      <div
        className={`${activeThread ? "hidden md:flex" : "flex"} w-full flex-col md:w-[340px] md:shrink-0`}
        style={{ backgroundColor: "#111b21", borderRight: "1px solid #222d34" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#1f2c34" }}>
          <p className="text-[15px] font-medium text-white">Inbox</p>
          <button
            onClick={() => signOut(auth!)}
            className="text-xs text-white/70 hover:text-white"
          >
            Sign out
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="p-6 text-center text-sm" style={{ color: "#8696a0" }}>
              No messages yet.
            </p>
          )}
          {threads.map((t) => (
            <button
              key={t.threadId}
              onClick={() => setActiveThread(t.threadId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
              style={t.threadId === activeThread ? { backgroundColor: "#1f2c34" } : undefined}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ backgroundColor: "#00a884" }}
              >
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-white">{t.name}</p>
                <p className="truncate text-[13px]" style={{ color: "#8696a0" }}>{t.lastText}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className={`${activeThread ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!activeThread ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm" style={{ color: "#8696a0" }}>Select a conversation.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#1f2c34" }}>
              <button
                onClick={() => setActiveThread(null)}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 md:hidden"
                aria-label="Back"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z" />
                </svg>
              </button>
              <p className="text-[15px] font-medium text-white">{activeName}</p>
            </div>
            <div
              className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
              style={{
                backgroundColor: "#0b141a",
                backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            >
              {activeMessages.map((m) => (
                <div key={m.id} className={`flex ${m.fromVisitor ? "justify-start" : "justify-end"}`}>
                  <div
                    className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-white shadow"
                    style={{
                      backgroundColor: m.fromVisitor ? "#1f2c34" : "#005c4b",
                      borderTopLeftRadius: m.fromVisitor ? 0 : undefined,
                      borderTopRightRadius: m.fromVisitor ? undefined : 0,
                    }}
                  >
                    {m.fromVisitor && (
                      <p className="mb-0.5 text-xs font-medium" style={{ color: "#00a884" }}>
                        {m.name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className="mt-1 text-right text-[10px]" style={{ color: "#8696a0" }}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "#1f2c34" }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="Type a reply"
                maxLength={500}
                className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                style={{ backgroundColor: "#2a3942" }}
              />
              <button
                onClick={sendReply}
                disabled={!text.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
                style={{ backgroundColor: "#00a884" }}
                aria-label="Send reply"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M3.4 20.4 21.8 12 3.4 3.6l-.01 6.53L14 12 3.39 13.87 3.4 20.4Z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
