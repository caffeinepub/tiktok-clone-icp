import { Send, X } from "lucide-react";
import { useState } from "react";

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "1",
    username: "bunny_vibes",
    avatar: "https://i.pravatar.cc/100?img=1",
    text: "This is amazing! 🔥",
    time: "2m ago",
  },
  {
    id: "2",
    username: "fire_king99",
    avatar: "https://i.pravatar.cc/100?img=3",
    text: "Can't stop watching 🔄",
    time: "5m ago",
  },
  {
    id: "3",
    username: "escape.artist",
    avatar: "https://i.pravatar.cc/100?img=4",
    text: "Love the vibe here",
    time: "10m ago",
  },
];

export default function CommentsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string;
}) {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    setComments((c) => [
      {
        id: String(Date.now()),
        username: "you",
        avatar: "https://i.pravatar.cc/100?u=me",
        text: text.trim(),
        time: "just now",
      },
      ...c,
    ]);
    setText("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close"
      />
      <div className="relative w-full bg-[#1A1F26] rounded-t-3xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3038]">
          <span className="font-semibold">{comments.length} Comments</span>
          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <img
                src={c.avatar}
                alt=""
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
              <div>
                <p className="text-xs text-[#22D3EE] font-semibold">
                  @{c.username}
                </p>
                <p className="text-sm text-[#E9EEF5]">{c.text}</p>
                <p className="text-xs text-[#8B95A3]">{c.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-[#2A3038] flex gap-2">
          <input
            className="flex-1 bg-[#0F1216] rounded-xl px-3 py-2 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none border border-[#2A3038] focus:border-[#22D3EE]"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            type="button"
            onClick={send}
            className="w-10 h-10 rounded-xl bg-[#22D3EE] flex items-center justify-center shrink-0"
          >
            <Send size={16} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
