"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  fromVisitor: boolean;
  createdAt: Timestamp | null;
};

function getThreadId(): string {
  try {
    let id = localStorage.getItem("wa_thread");
    if (!id) {
      id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("wa_thread", id);
    }
    return id;
  } catch {
    return `t_${Date.now()}`;
  }
}

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

function Ticks() {
  return (
    <svg viewBox="0 0 16 11" className="ml-1 inline h-3.5 w-4 shrink-0" aria-hidden>
      <path
        fill="#53bdeb"
        d="M11.1 0 6.6 7.9 4.5 5.7 3.4 6.8l3.2 3.2L12.3 1 11.1 0ZM15.5 0l-4.5 7.9-1-1.1-1.1 1.1 2.1 2.1L16.7 1l-1.2-1Z"
      />
    </svg>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [hasName, setHasName] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wa_name");
      if (saved) {
        setName(saved);
        setHasName(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open || !hasName || !isFirebaseConfigured || !db) return;
    const threadId = getThreadId();
    const q = query(
      collection(db, "portfolio_chats"),
      where("threadId", "==", threadId),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }))
      );
    });
    return unsub;
  }, [open, hasName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const joinChat = () => {
    const n = nameInput.trim();
    if (!n) return;
    try {
      localStorage.setItem("wa_name", n);
    } catch {
      /* ignore */
    }
    setName(n);
    setHasName(true);
  };

  const sendMessage = async () => {
    const msg = text.trim();
    if (!msg || sending || !isFirebaseConfigured || !db) return;
    setSending(true);
    setText("");
    try {
      const threadId = getThreadId();
      await addDoc(collection(db, "portfolio_chats"), {
        threadId,
        name,
        text: msg,
        fromVisitor: true,
        createdAt: serverTimestamp(),
      });
      // Forward to Telegram (fire-and-forget)
      fetch("/api/chat/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, name, text: msg }),
      }).catch(() => {});
    } catch {
      /* message stays unsent; user can retry */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end">
      {open && (
        <div
          className="mb-3 flex h-[min(600px,70vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl shadow-2xl"
          style={{ backgroundColor: "#0b141a" }}
          role="dialog"
          aria-label="Chat with Anandh"
        >
          {/* Header — WhatsApp style */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: "#1f2c34" }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ backgroundColor: "#00a884" }}
            >
              {name ? name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-white">Anandh S</p>
              <p className="text-xs" style={{ color: "#8696a0" }}>
                {isFirebaseConfigured ? "online" : "setting up…"}
              </p>
            </div>
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
          ) : !hasName ? (
            /* Name prompt */
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
                  Enter your name to start chatting
                </p>
              </div>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinChat()}
                placeholder="Your name"
                maxLength={40}
                className="w-full rounded-full px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                style={{ backgroundColor: "#2a3942" }}
              />
              <button
                onClick={joinChat}
                disabled={!nameInput.trim()}
                className="rounded-full px-8 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: "#00a884" }}
              >
                Start chat
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
                {/* Welcome bubble */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-white shadow"
                    style={{ backgroundColor: "#1f2c34", borderTopLeftRadius: 0 }}
                  >
                    <p>
                      Hi {name}! Thanks for visiting my portfolio. Drop me a
                      message here and I&apos;ll get back to you.
                    </p>
                    <p className="mt-1 text-right text-[10px]" style={{ color: "#8696a0" }}>
                      Anandh
                    </p>
                  </div>
                </div>

                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.fromVisitor ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-white shadow"
                      style={{
                        backgroundColor: m.fromVisitor ? "#005c4b" : "#1f2c34",
                        borderTopRightRadius: m.fromVisitor ? 0 : undefined,
                        borderTopLeftRadius: m.fromVisitor ? undefined : 0,
                      }}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p
                        className="mt-1 flex items-center justify-end text-[10px]"
                        style={{ color: m.fromVisitor ? "#ffffffb3" : "#8696a0" }}
                      >
                        {formatTime(m.createdAt)}
                        {m.fromVisitor && <Ticks />}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Auto reply hint */}
                {messages.length > 0 && (
                  <div className="flex justify-start">
                    <div
                      className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-white shadow"
                      style={{ backgroundColor: "#1f2c34", borderTopLeftRadius: 0 }}
                    >
                      <p>
                        Got it — I&apos;ll reply to you soon.
                      </p>
                      <p className="mt-1 text-right text-[10px]" style={{ color: "#8696a0" }}>
                        Anandh
                      </p>
                    </div>
                  </div>
                )}
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

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: "#00a884" }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
            <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4Z" />
          </svg>
        ) : (
          <ChatIcon />
        )}
      </button>
    </div>
  );
}
