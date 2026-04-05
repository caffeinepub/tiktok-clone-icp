import { Camera, Image, Mic, Phone, Send, Smile, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import CallOverlay from "../components/CallOverlay";
import { useBackend } from "../hooks/useBackend";
import { timeAgo } from "../types/app";

interface ChatMessage {
  id: string;
  text: string;
  senderPrincipal: string;
  createdAt: bigint;
  isMe: boolean;
  reaction?: string;
}

const EMOJIS = [
  "\u2764\ufe0f",
  "\ud83d\ude02",
  "\ud83d\ude2e",
  "\ud83d\ude22",
  "\ud83d\ude21",
  "\ud83d\udc4d",
  "\ud83d\udd25",
];

const QUICK_EMOJI_MESSAGES = [
  "\ud83d\ude0d",
  "\ud83d\ude48",
  "\ud83d\udd25",
  "\ud83c\udf89",
  "\u2764\ufe0f",
  "\ud83d\udc8b",
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#1E1010] border border-rose-900/30 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-rose-400"
            animate={{ y: [-2, 2, -2] }}
            transition={{
              duration: 0.7,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatPage({
  otherPrincipal,
  username,
  avatarUrl,
  onBack,
}: {
  otherPrincipal: string;
  username: string;
  avatarUrl: string;
  onBack: () => void;
}) {
  const { backend, identity } = useBackend();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState<"video" | "voice">("video");
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [typingVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const loadMessages = async () => {
    if (!backend) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const other = Principal.fromText(otherPrincipal);
      const raw = await backend.getMessages(other);
      const resolved: ChatMessage[] = (raw as any[]).map((m) => ({
        id: m.id,
        text: m.text,
        senderPrincipal:
          typeof m.sender === "object" ? m.sender.toString() : String(m.sender),
        createdAt: m.createdAt,
        isMe:
          (typeof m.sender === "object"
            ? m.sender.toString()
            : String(m.sender)) === myPrincipal,
      }));
      setMessages(resolved);
    } catch {}
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [backend, otherPrincipal]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadMessages is stable
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !backend || sending) return;
    setSending(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const other = Principal.fromText(otherPrincipal);
      await backend.sendMessage(other, text.trim());
      setText("");
      await loadMessages();
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLongPressStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setReactionTarget(msgId);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: emoji } : m)),
    );
    setReactionTarget(null);
  };

  const openVideoCall = () => {
    setCallType("video");
    setCallOpen(true);
  };

  const openVoiceCall = () => {
    setCallType("voice");
    setCallOpen(true);
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups: { date: string; msgs: ChatMessage[] }[], msg) => {
      const d = new Date(Number(msg.createdAt) / 1_000_000);
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const last = groups[groups.length - 1];
      if (last && last.date === dateStr) {
        last.msgs.push(msg);
      } else {
        groups.push({ date: dateStr, msgs: [msg] });
      }
      return groups;
    },
    [],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "oklch(0.10 0.012 15)" }}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      data-ocid="chat.panel"
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 shrink-0 border-b"
        style={{
          borderColor: "oklch(0.22 0.018 15)",
          background: "oklch(0.12 0.015 15)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          data-ocid="chat.back.button"
        >
          <X size={20} style={{ color: "oklch(0.94 0.008 60)" }} />
        </button>

        {/* Avatar with online dot */}
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
            style={{ border: "2px solid oklch(0.65 0.22 10)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{
              background: "oklch(0.72 0.20 145)",
              borderColor: "oklch(0.12 0.015 15)",
            }}
          />
        </div>

        <div className="flex-1">
          <p
            className="font-semibold text-sm"
            style={{ color: "oklch(0.94 0.008 60)" }}
          >
            @{username}
          </p>
          <p className="text-[10px]" style={{ color: "oklch(0.72 0.20 145)" }}>
            Online
          </p>
        </div>

        {/* Call buttons */}
        <button
          type="button"
          onClick={openVoiceCall}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "oklch(0.22 0.015 15)" }}
          aria-label="Voice call"
          data-ocid="chat.voice_call.button"
        >
          <Phone size={16} style={{ color: "oklch(0.65 0.22 10)" }} />
        </button>
        <button
          type="button"
          onClick={openVideoCall}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "oklch(0.22 0.015 15)" }}
          aria-label="Video call"
          data-ocid="chat.video_call.button"
        >
          <Video size={16} style={{ color: "oklch(0.65 0.22 10)" }} />
        </button>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        data-ocid="chat.list"
        onClick={() => {
          setReactionTarget(null);
          setShowEmojiBar(false);
        }}
        onKeyDown={() => {
          setReactionTarget(null);
          setShowEmojiBar(false);
        }}
        role="presentation"
      >
        {messages.length === 0 && (
          <div className="text-center py-16" data-ocid="chat.empty_state">
            <div className="text-5xl mb-3">💌</div>
            <p className="text-sm" style={{ color: "oklch(0.60 0.010 15)" }}>
              Start a conversation with @{username}
            </p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              {QUICK_EMOJI_MESSAGES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={async () => {
                    if (!backend) return;
                    const { Principal } = await import(
                      "@icp-sdk/core/principal"
                    );
                    await backend
                      .sendMessage(Principal.fromText(otherPrincipal), e)
                      .catch(() => {});
                    await loadMessages();
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl active:scale-90 transition-transform"
                  style={{ background: "oklch(0.20 0.018 15)" }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div
                className="flex-1 h-px"
                style={{ background: "oklch(0.22 0.018 15)" }}
              />
              <span
                className="text-[10px] font-semibold px-2"
                style={{ color: "oklch(0.60 0.010 15)" }}
              >
                {date}
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "oklch(0.22 0.018 15)" }}
              />
            </div>

            {msgs.map((msg, i) => (
              <div key={msg.id} className="mb-2">
                {/* Reaction bar */}
                <AnimatePresence>
                  {reactionTarget === msg.id && (
                    <motion.div
                      className="flex justify-center mb-1"
                      initial={{ opacity: 0, scale: 0.8, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="flex gap-1 px-3 py-2 rounded-full shadow-xl"
                        style={{
                          background: "oklch(0.20 0.018 15)",
                          border: "1px solid oklch(0.28 0.020 15)",
                        }}
                      >
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="text-xl w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
                  data-ocid={`chat.item.${i + 1}`}
                >
                  {/* Avatar for received messages */}
                  {!msg.isMe && (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover self-end mr-2 shrink-0"
                    />
                  )}

                  <div className="max-w-[72%]">
                    {/* Bubble */}
                    <button
                      type="button"
                      className={`block w-full px-4 py-2.5 rounded-2xl text-sm text-left ${
                        msg.isMe ? "rounded-br-sm" : "rounded-bl-sm"
                      }`}
                      style={{
                        background: msg.isMe
                          ? "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))"
                          : "oklch(0.15 0.018 15)",
                        border: msg.isMe
                          ? "none"
                          : "1px solid oklch(0.25 0.03 15)",
                        color: msg.isMe
                          ? "oklch(0.98 0 0)"
                          : "oklch(0.94 0.008 60)",
                      }}
                      onTouchStart={() => handleLongPressStart(msg.id)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(msg.id)}
                      onMouseUp={handleLongPressEnd}
                    >
                      <p>{msg.text}</p>
                      <p
                        className="text-[9px] mt-1"
                        style={{
                          color: msg.isMe
                            ? "oklch(0.85 0.05 10)"
                            : "oklch(0.55 0.010 15)",
                        }}
                      >
                        {timeAgo(Number(msg.createdAt) / 1_000_000)}
                      </p>
                    </button>

                    {/* Reaction badge */}
                    {msg.reaction && (
                      <div
                        className={`mt-0.5 text-sm px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${msg.isMe ? "ml-auto" : ""}`}
                        style={{
                          background: "oklch(0.20 0.018 15)",
                          border: "1px solid oklch(0.28 0.020 15)",
                        }}
                      >
                        <span>{msg.reaction}</span>
                        <span
                          className="text-[10px]"
                          style={{ color: "oklch(0.60 0.010 15)" }}
                        >
                          1
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typingVisible && <TypingIndicator />}

        {/* Seen receipt */}
        {messages.length > 0 && messages[messages.length - 1].isMe && (
          <div className="flex justify-end items-center gap-1 pr-1">
            <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full" />
            <span
              className="text-[9px]"
              style={{ color: "oklch(0.55 0.010 15)" }}
            >
              Seen
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 px-3 py-3 flex items-center gap-2 border-t"
        style={{
          borderColor: "oklch(0.22 0.018 15)",
          background: "oklch(0.12 0.015 15)",
        }}
      >
        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojiBar((v) => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          style={{ background: "oklch(0.20 0.018 15)" }}
          aria-label="Emoji"
          data-ocid="chat.emoji.button"
        >
          <Smile size={18} style={{ color: "oklch(0.78 0.14 75)" }} />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <input
            className="w-full rounded-full px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: "oklch(0.18 0.018 15)",
              border: "1.5px solid oklch(0.28 0.020 15)",
              color: "oklch(0.94 0.008 60)",
            }}
            placeholder="Message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            data-ocid="chat.input"
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor =
                "oklch(0.65 0.22 10)";
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor =
                "oklch(0.28 0.020 15)";
            }}
          />
        </div>

        {/* Right side: icons when empty, send when text */}
        {text.trim() ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
            }}
            data-ocid="chat.send.button"
          >
            <Send size={16} style={{ color: "oklch(0.98 0 0)" }} />
          </button>
        ) : (
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "oklch(0.20 0.018 15)" }}
              aria-label="Camera"
              data-ocid="chat.camera.button"
            >
              <Camera size={16} style={{ color: "oklch(0.60 0.010 15)" }} />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "oklch(0.20 0.018 15)" }}
              aria-label="Image"
              data-ocid="chat.image.button"
            >
              <Image size={16} style={{ color: "oklch(0.60 0.010 15)" }} />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "oklch(0.20 0.018 15)" }}
              aria-label="Voice message"
              data-ocid="chat.mic.button"
            >
              <Mic size={16} style={{ color: "oklch(0.60 0.010 15)" }} />
            </button>
          </div>
        )}
      </div>

      {/* Emoji quick send bar */}
      <AnimatePresence>
        {showEmojiBar && (
          <motion.div
            className="shrink-0 flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {[
              "\u2764\ufe0f",
              "\ud83d\ude0d",
              "\ud83d\udc4d",
              "\ud83d\udd25",
              "\ud83c\udf89",
              "\ud83e\udd23",
              "\ud83d\ude2e",
              "\ud83d\ude22",
              "\ud83d\ude21",
              "\ud83d\udc8b",
              "\ud83d\ude48",
              "\ud83d\udc4f",
            ].map((e) => (
              <button
                key={e}
                type="button"
                onClick={async () => {
                  if (!backend) return;
                  const { Principal } = await import("@icp-sdk/core/principal");
                  await backend
                    .sendMessage(Principal.fromText(otherPrincipal), e)
                    .catch(() => {});
                  await loadMessages();
                  setShowEmojiBar(false);
                }}
                className="text-2xl w-10 h-10 shrink-0 flex items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ background: "oklch(0.20 0.018 15)" }}
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Overlay */}
      <CallOverlay
        open={callOpen}
        username={username}
        avatarUrl={avatarUrl}
        callType={callType}
        onDecline={() => setCallOpen(false)}
        onAccept={() => setCallOpen(false)}
      />
    </motion.div>
  );
}
