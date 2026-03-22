import { Heart, Pencil, Reply, Send, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useBackend } from "../hooks/useBackend";
import {
  type Comment,
  SAMPLE_COMMENTS,
  SAMPLE_PROFILES,
  timeAgo,
} from "../types/app";
import AuthModal from "./AuthModal";

export default function CommentsDrawer({
  open,
  onClose,
  videoId,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string;
}) {
  const { isLoggedIn, identity } = useBackend();
  const myId = identity?.getPrincipal().toString() ?? "";

  const [comments, setComments] = useState<Comment[]>(
    SAMPLE_COMMENTS.filter(
      (c) => c.videoId === videoId || videoId.startsWith("sample"),
    ).map((c) => ({ ...c })),
  );
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const send = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!text.trim()) return;
    const newComment: Comment = {
      id: String(Date.now()),
      videoId,
      author: myId || "you",
      text: text.trim(),
      createdAt: BigInt(Date.now()),
      likes: 0,
      likedByMe: false,
    };
    setComments((c) => [newComment, ...c]);
    setText("");
  };

  const reply = (username: string) => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setText(`@${username} `);
  };

  const likeComment = (id: string) => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              likes: (c.likes ?? 0) + (c.likedByMe ? -1 : 1),
              likedByMe: !c.likedByMe,
            }
          : c,
      ),
    );
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text: editText.trim() } : c)),
    );
    setEditingId(null);
    toast.success("Comment updated");
  };

  const deleteComment = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    toast.success("Comment deleted");
  };

  const getProfile = (authorId: string) => {
    return (
      SAMPLE_PROFILES[authorId] ?? {
        username: authorId === myId ? "you" : authorId.slice(0, 8),
        avatarKey: `https://i.pravatar.cc/100?u=${authorId}`,
      }
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              key="sheet"
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1F26] rounded-t-3xl max-h-[75vh] flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-ocid="comments.sheet"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3038] shrink-0">
                <span className="font-bold text-base">
                  {comments.length} Comments
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  data-ocid="comments.close_button"
                  className="w-8 h-8 rounded-full bg-[#2A3038] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {comments.length === 0 && (
                  <p
                    className="text-center text-[#8B95A3] py-8"
                    data-ocid="comments.empty_state"
                  >
                    No comments yet. Be the first!
                  </p>
                )}
                {comments.map((c, idx) => {
                  const profile = getProfile(c.author);
                  const isOwn = c.author === myId;
                  const isEditing = editingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="flex gap-3"
                      data-ocid={`comments.item.${idx + 1}`}
                    >
                      <img
                        src={profile.avatarKey}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#22D3EE] font-semibold mb-0.5">
                          @{profile.username}
                        </p>
                        {isEditing ? (
                          <div className="flex gap-2 items-center">
                            <input
                              className="flex-1 bg-[#0F1216] border border-[#22D3EE] rounded-lg px-3 py-1.5 text-sm text-[#E9EEF5] outline-none"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveEdit(c.id)
                              }
                              data-ocid="comments.edit.input"
                            />
                            <button
                              type="button"
                              onClick={() => saveEdit(c.id)}
                              className="text-[#22D3EE] text-xs font-bold"
                              data-ocid="comments.edit.save_button"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-[#8B95A3] text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[#E9EEF5] leading-snug">
                            {c.text}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-[#8B95A3]">
                            {timeAgo(c.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={() => reply(profile.username)}
                            className="flex items-center gap-1 text-[10px] text-[#8B95A3] hover:text-[#E9EEF5]"
                            data-ocid={`comments.reply.button.${idx + 1}`}
                          >
                            <Reply size={11} /> Reply
                          </button>
                          {isOwn && !isEditing && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(c)}
                                className="flex items-center gap-1 text-[10px] text-[#8B95A3] hover:text-[#22D3EE]"
                                data-ocid={`comments.edit.button.${idx + 1}`}
                              >
                                <Pencil size={11} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteComment(c.id)}
                                className="flex items-center gap-1 text-[10px] text-[#8B95A3] hover:text-[#FF3B5C]"
                                data-ocid={`comments.delete_button.${idx + 1}`}
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => likeComment(c.id)}
                        className="flex flex-col items-center gap-0.5 shrink-0 mt-1"
                        data-ocid={`comments.like.button.${idx + 1}`}
                      >
                        <Heart
                          size={14}
                          className={
                            c.likedByMe
                              ? "text-[#FF3B5C] fill-[#FF3B5C]"
                              : "text-[#8B95A3]"
                          }
                        />
                        <span className="text-[10px] text-[#8B95A3]">
                          {c.likes ?? 0}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-[#2A3038] flex gap-2 shrink-0">
                <input
                  className="flex-1 bg-[#0F1216] rounded-2xl px-4 py-2.5 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none border border-[#2A3038] focus:border-[#22D3EE] transition-colors"
                  placeholder="Add a comment..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  data-ocid="comments.input"
                />
                <button
                  type="button"
                  onClick={send}
                  className="w-10 h-10 rounded-xl bg-[#22D3EE] flex items-center justify-center shrink-0"
                  data-ocid="comments.submit_button"
                >
                  <Send size={16} className="text-black" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
