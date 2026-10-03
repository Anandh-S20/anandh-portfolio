"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
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
import { enablePush, disablePush, getPushState, pushSupported, playPop } from "@/lib/pushClient";

const OWNER_EMAILS = ["anandhsaji287@gmail.com"];
const READ_KEY = "inbox_read_v1";
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const AVATAR_COLORS = [
  "#00a884", "#7c5cff", "#e91e63", "#ff9800",
  "#03a9f4", "#8bc34a", "#ff5722", "#9c27b0",
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

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
  lastFromVisitor: boolean;
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

function relativeTime(millis: number): string {
  if (!millis) return "";
  const d = new Date(millis);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (now.getTime() - millis < 7 * 86400000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
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

function getReadMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function InboxPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [readMap, setReadMap] = useState<Record<string, number>>({});
  const [seenInfo, setSeenInfo] = useState<Record<string, { seenAt: number; activeAt: number }>>({});
  const [pushState, setPushState] = useState<"on" | "off" | "unsupported">("unsupported");
  const bottomRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const latestVisitorAt = useRef<number>(0);
  const pushInit = useRef(false);

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

  useEffect(() => {
    setReadMap(getReadMap());
  }, []);

  // Keep the inbox fitted above the mobile keyboard (visualViewport shrinks
  // when the keyboard opens) so the reply box stays visible and usable.
  useEffect(() => {
    const vv = window.visualViewport;
    const root = rootRef.current;
    if (!vv || !root) return;
    const fit = () => {
      root.style.height = `${Math.round(vv.height)}px`;
    };
    fit();
    vv.addEventListener("resize", fit);
    return () => vv.removeEventListener("resize", fit);
  }, [authReady, user]);

  // Push notification state (owner)
  const isOwner = !!user?.email && OWNER_EMAILS.includes(user.email);
  useEffect(() => {
    if (!isOwner || !pushSupported()) return;
    getPushState().then(setPushState);
  }, [isOwner]);

  // Play a sound when a new visitor message arrives while the inbox is open
  useEffect(() => {
    if (!pushInit.current && messages.length === 0) return; // not loaded yet
    let newest = 0;
    for (const m of messages) {
      if (m.fromVisitor) newest = Math.max(newest, m.createdAt?.toMillis() ?? 0);
    }
    if (!pushInit.current) {
      latestVisitorAt.current = newest;
      pushInit.current = true;
      return;
    }
    if (newest > latestVisitorAt.current) {
      latestVisitorAt.current = newest;
      if (document.visibilityState === "visible") playPop();
    }
  }, [messages]);

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

  // Visitor seen-markers + presence for all threads
  useEffect(() => {
    if (!isOwner || !isFirebaseConfigured || !db) return;
    const unsub = onSnapshot(
      collection(db, "thread_seen"),
      (snap) => {
        const map: Record<string, { seenAt: number; activeAt: number }> = {};
        for (const d of snap.docs) {
          const data = d.data() as { ownerLastSeenAt?: Timestamp; lastActiveAt?: Timestamp };
          map[d.id] = {
            seenAt: data.ownerLastSeenAt?.toMillis() ?? 0,
            activeAt: data.lastActiveAt?.toMillis() ?? 0,
          };
        }
        setSeenInfo(map);
      },
      () => {}
    );
    return unsub;
  }, [isOwner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeThread]);

  const seenAt = activeThread ? (seenInfo[activeThread]?.seenAt ?? 0) : 0;

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
          lastFromVisitor: m.fromVisitor,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
  }, [messages]);

  const unreadByThread = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of messages) {
      if (m.fromVisitor && (m.createdAt?.toMillis() ?? 0) > (readMap[m.threadId] || 0)) {
        counts[m.threadId] = (counts[m.threadId] || 0) + 1;
      }
    }
    return counts;
  }, [messages, readMap]);

  const totalUnread = useMemo(
    () => Object.values(unreadByThread).reduce((a, b) => a + b, 0),
    [unreadByThread]
  );

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    const texts: Record<string, string> = {};
    for (const m of messages) {
      texts[m.threadId] = (texts[m.threadId] || "") + " " + m.text.toLowerCase();
    }
    return threads.filter(
      (t) => t.name.toLowerCase().includes(q) || (texts[t.threadId] || "").includes(q)
    );
  }, [threads, messages, search]);

  const activeMessages = useMemo(
    () =>
      messages
        .filter((m) => m.threadId === activeThread)
        .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)),
    [messages, activeThread]
  );

  const isOnline = (threadId: string) =>
    Date.now() - (seenInfo[threadId]?.activeAt ?? 0) < ONLINE_WINDOW_MS;

  const activeStatus = useMemo(() => {
    if (!activeThread) return "";
    const at = seenInfo[activeThread]?.activeAt ?? 0;
    if (Date.now() - at < ONLINE_WINDOW_MS) return "online";
    if (at) return `last seen ${relativeTime(at).toLowerCase()}`;
    return "";
  }, [activeThread, seenInfo]);

  const openThread = (t: Thread) => {
    setActiveThread(t.threadId);
    try {
      const map = getReadMap();
      map[t.threadId] = Date.now();
      localStorage.setItem(READ_KEY, JSON.stringify(map));
      setReadMap(map);
    } catch {
      /* ignore */
    }
  };

  const signIn = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      /* user closed the popup */
    }
  };

  const togglePush = async () => {
    const cu = auth?.currentUser;
    if (!cu) return;
    if (pushState === "on") {
      await disablePush("owner");
      setPushState("off");
    } else {
      const r = await enablePush("owner", () => cu.getIdToken());
      setPushState(r.ok ? "on" : "off");
      if (!r.ok) alert(`Couldn't enable notifications (${r.reason}).`);
    }
  };

  const sendReply = async () => {
    const msg = text.trim();
    if (!msg || sending || !isFirebaseConfigured || !db || !activeThread) return;
    setSending(true);
    try {
      await addDoc(collection(db, "portfolio_chats"), {
        threadId: activeThread,
        name: "Anandh",
        text: msg,
        fromVisitor: false,
        createdAt: serverTimestamp(),
      });
      setText("");
      // Email the visitor about the reply (fire-and-forget)
      fetch("/api/chat/email-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThread, text: msg }),
      }).catch(() => {});
    } catch {
      alert("Couldn't send that message — check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteDoc(doc(db, "portfolio_chats", id));
    } catch {
      /* ignore */
    }
  };

  const deleteChat = async () => {
    if (!isFirebaseConfigured || !db || !activeThread) return;
    const name = activeThreadInfo?.name ?? "this chat";
    if (!window.confirm(`Delete the entire conversation with ${name}? All messages will be cleared for everyone.`)) return;
    try {
      const snap = await getDocs(
        query(collection(db, "portfolio_chats"), where("threadId", "==", activeThread))
      );
      // Delete in batches (Firestore caps at 500 ops per batch)
      let batch = writeBatch(db);
      let count = 0;
      const commits: Promise<void>[] = [];
      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= 400) {
          commits.push(batch.commit());
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) commits.push(batch.commit());
      await Promise.all(commits);
      await deleteDoc(doc(db, "thread_seen", activeThread)).catch(() => {});
      setActiveThread(null);
    } catch {
      alert("Couldn't delete the chat — try again.");
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
    // Signed in but not the owner — send them to their own chat instead
    // of a dead-end wall.
    if (typeof window !== "undefined") {
      window.location.replace("/#chat");
    }
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0b141a" }}>
        <p className="text-sm" style={{ color: "#8696a0" }}>Opening your chat…</p>
      </div>
    );
  }

  const activeThreadInfo = threads.find((t) => t.threadId === activeThread);

  return (
    <div ref={rootRef} className="flex h-dvh" style={{ backgroundColor: "#0b141a" }}>
      {/* Chat list */}
      <div
        className={`${activeThread ? "hidden md:flex" : "flex"} w-full flex-col md:w-[360px] md:shrink-0`}
        style={{ backgroundColor: "#111b21", borderRight: "1px solid #222d34" }}
      >
        <div className="px-4 pb-3 pt-4" style={{ backgroundColor: "#1f2c34" }}>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-lg font-semibold text-white">
              Chats
              {totalUnread > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: "#00a884" }}
                >
                  {totalUnread}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {pushState !== "unsupported" && (
                <button
                  onClick={togglePush}
                  className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label={pushState === "on" ? "Turn off notifications" : "Turn on notifications"}
                  title={pushState === "on" ? "Notifications on" : "Notifications off"}
                >
                  {pushState === "on" ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" style={{ color: "#00a884" }}>
                      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-4.5-5.8V4.5a1.5 1.5 0 0 0-3 0v.7A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-4.5-5.8V4.5a1.5 1.5 0 0 0-3 0v.7A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={() => signOut(auth!)}
                className="text-xs text-white/70 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
          <div
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "#0b141a" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-white/40">
              <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filteredThreads.length === 0 && (
            <p className="p-6 text-center text-sm" style={{ color: "#8696a0" }}>
              {search ? "No chats match your search." : "No messages yet."}
            </p>
          )}
          {filteredThreads.map((t) => {
            const unread = unreadByThread[t.threadId] || 0;
            const online = isOnline(t.threadId);
            return (
              <button
                key={t.threadId}
                onClick={() => openThread(t)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
                style={t.threadId === activeThread ? { backgroundColor: "#1f2c34" } : undefined}
              >
                <div className="relative shrink-0">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white"
                    style={{ backgroundColor: avatarColor(t.name) }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  {online && (
                    <span
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2"
                      style={{ backgroundColor: "#00a884", borderColor: "#111b21" }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 border-b pb-2" style={{ borderColor: "#222d34" }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[15px] font-medium text-white">{t.name}</p>
                    <span
                      className="shrink-0 text-xs"
                      style={{ color: unread > 0 ? "#00a884" : "#8696a0" }}
                    >
                      {relativeTime(t.lastAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[13px]" style={{ color: "#8696a0" }}>
                      {!t.lastFromVisitor && (
                        <span style={{ color: "#00a884" }}>You: </span>
                      )}
                      {t.lastText}
                    </p>
                    {unread > 0 && (
                      <span
                        className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: "#00a884" }}
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className={`${activeThread ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!activeThread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "#1f2c34" }}
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white/30">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "#8696a0" }}>
              Select a conversation to start messaging
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: "#1f2c34" }}>
              <button
                onClick={() => setActiveThread(null)}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 md:hidden"
                aria-label="Back"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z" />
                </svg>
              </button>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ backgroundColor: avatarColor(activeThreadInfo?.name ?? "?") }}
              >
                {(activeThreadInfo?.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-white">
                  {activeThreadInfo?.name ?? "Chat"}
                </p>
                {activeStatus && (
                  <p className="text-xs" style={{ color: activeStatus === "online" ? "#00a884" : "#8696a0" }}>
                    {activeStatus}
                  </p>
                )}
              </div>
              <button
                onClick={deleteChat}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Delete conversation"
                title="Delete conversation"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M6 7h12l-1 14H7L6 7Zm3-5h6l1 2h5v2H3V4h5l1-2Z" />
                </svg>
              </button>
            </div>
            <div
              className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
              style={{
                backgroundColor: "#0b141a",
                backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            >
              {activeMessages.map((m) => {
                // Seen = the visitor opened the chat after this reply was sent
                const seen = !m.fromVisitor && !!m.createdAt && seenAt > 0 && m.createdAt.toMillis() <= seenAt;
                return (
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
                      <p
                        className="mt-1 flex items-center justify-end text-[10px]"
                        style={{ color: "#8696a0" }}
                      >
                        {!m.fromVisitor && (
                          <button
                            onClick={() => deleteMessage(m.id)}
                            className="mr-1 rounded p-0.5 text-white/30 hover:bg-white/10 hover:text-white"
                            aria-label="Delete message"
                            title="Delete message"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                              <path d="M6 7h12l-1 14H7L6 7Zm3-5h6l1 2h5v2H3V4h5l1-2Z" />
                            </svg>
                          </button>
                        )}
                        {formatTime(m.createdAt)}
                        {!m.fromVisitor && <Ticks read={seen} />}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "#1f2c34" }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="Type a reply"
                maxLength={500}
                enterKeyHint="send"
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
