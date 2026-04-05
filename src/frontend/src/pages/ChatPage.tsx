import { ArrowLeft, Phone, Send, Video } from "lucide-react";
import { motion } from "motion/react";
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
  const bottomRef = useRef<HTMLDivElement>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openVideoCall = () => {
    setCallType("video");
    setCallOpen(true);
  };

  const openVoiceCall = () => {
    setCallType("voice");
    setCallOpen(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#0F1216]"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      data-ocid="chat.panel"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#0F1216] border-b border-[#2A3038] shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          data-ocid="chat.back.button"
        >
          <ArrowLeft size={20} className="text-[#E9EEF5]" />
        </button>
        <img
          src={avatarUrl}
          alt=""
          className="w-9 h-9 rounded-full object-cover border border-[#2A3038]"
        />
        <div className="flex-1">
          <p className="font-semibold text-sm text-[#E9EEF5]">@{username}</p>
          <p className="text-[10px] text-[#22C55E]">Online</p>
        </div>
        {/* Call buttons */}
        <button
          type="button"
          onClick={openVoiceCall}
          className="w-9 h-9 rounded-full bg-[#1A1F26] flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Voice call"
          data-ocid="chat.voice_call.button"
        >
          <Phone size={16} className="text-[#22D3EE]" />
        </button>
        <button
          type="button"
          onClick={openVideoCall}
          className="w-9 h-9 rounded-full bg-[#1A1F26] flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Video call"
          data-ocid="chat.video_call.button"
        >
          <Video size={16} className="text-[#22D3EE]" />
        </button>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        data-ocid="chat.list"
      >
        {messages.length === 0 && (
          <div className="text-center py-12" data-ocid="chat.empty_state">
            <p className="text-[#8B95A3] text-sm">Say hi to @{username}! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
            data-ocid={`chat.item.${i + 1}`}
          >
            <div
              className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.isMe
                  ? "bg-[#22D3EE] text-black rounded-br-sm"
                  : "bg-[#1A1F26] text-[#E9EEF5] rounded-bl-sm border border-[#2A3038]"
              }`}
            >
              <p>{msg.text}</p>
              <p
                className={`text-[9px] mt-1 ${msg.isMe ? "text-black/50" : "text-[#8B95A3]"}`}
              >
                {timeAgo(Number(msg.createdAt) / 1_000_000)}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 bg-[#0F1216] border-t border-[#2A3038] flex items-center gap-2">
        <input
          className="flex-1 bg-[#1A1F26] border border-[#2A3038] rounded-2xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] transition-colors"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          data-ocid="chat.input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-full bg-[#22D3EE] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          data-ocid="chat.send.button"
        >
          <Send size={17} className="text-black" />
        </button>
      </div>

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
