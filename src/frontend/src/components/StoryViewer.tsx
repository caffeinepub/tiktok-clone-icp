import {
  Bookmark,
  ChevronLeft,
  Heart,
  MessageCircle,
  Send,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Story } from "../backend.d";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

interface Props {
  stories: Story[];
  creatorId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

interface StoryComment {
  id: string;
  storyId: string;
  author: any;
  text: string;
  createdAt: bigint;
}

const EMOJIS = [
  "\u2764\uFE0F",
  "\uD83D\uDE02",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
  "\uD83D\uDC4F",
  "\uD83D\uDD25",
];

function timeAgo(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StoryViewer({
  stories,
  creatorId,
  onClose,
  onDeleted,
}: Props) {
  const { backend, identity } = useBackend();
  const photoClient = useStorageClient("photos");
  const videoClient = useStorageClient("videos");
  const thumbClient = useStorageClient("thumbnails");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoMuted, setVideoMuted] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5000;

  // Creator profile
  const [creatorProfile, setCreatorProfile] = useState<{
    username: string;
    avatarUrl: string;
  } | null>(null);

  // Action states
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);

  // Emoji reactions
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(
    {},
  );
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  // Poll state
  const [pollVote, setPollVote] = useState<string | null>(null);

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const current = stories[currentIndex];
  const isOwn = identity?.getPrincipal().toString() === creatorId;

  // Load creator profile
  useEffect(() => {
    if (!backend || !creatorId) return;
    const load = async () => {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const profileOpt = await backend.getProfile(
          Principal.fromText(creatorId),
        );
        if ((profileOpt as any).__kind__ === "Some") {
          const p = (profileOpt as any).value;
          let avatarUrl = `https://i.pravatar.cc/100?u=${creatorId}`;
          if (p.avatarKey?.startsWith("sha256:") && thumbClient) {
            try {
              avatarUrl = await thumbClient.getDirectURL(p.avatarKey);
            } catch {}
          }
          setCreatorProfile({ username: p.username, avatarUrl });
        }
      } catch {}
    };
    load();
  }, [backend, creatorId, thumbClient]);

  useEffect(() => {
    if (!current) return;
    setMediaUrl(null);
    setLiked(false);
    setLikeCount(0);
    setSaved(false);
    setMyReaction(null);
    setReactionCounts({});
    setShowEmojiBar(false);
    setCommentsOpen(false);
    setPollVote(null);
    const load = async () => {
      const key = current.mediaKey;
      if (!key?.startsWith("sha256:")) {
        setMediaUrl(key);
        return;
      }
      try {
        const client = current.mediaType.startsWith("video")
          ? videoClient
          : photoClient;
        if (!client) return;
        const url = await client.getDirectURL(key);
        setMediaUrl(url);
      } catch {}
    };
    load();
    if (backend) backend.viewStory(current.id).catch(() => {});
    // Load reactions
    if (backend) {
      backend
        .getStoryReactions(current.id)
        .then((reactions: any[]) => {
          const counts: Record<string, number> = {};
          for (const r of reactions) {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          }
          setReactionCounts(counts);
        })
        .catch(() => {});
      (backend as any)
        .getMyStoryReaction(current.id)
        .then((opt: any) => {
          if (opt?.__kind__ === "Some") setMyReaction(opt.value.emoji);
        })
        .catch(() => {});
    }
  }, [current, backend, photoClient, videoClient]);

  // Pause auto-advance when comments or emoji bar open
  useEffect(() => {
    if (!mediaUrl) return;
    if (commentsOpen || showEmojiBar) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setProgress(0);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / DURATION, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          onClose();
        }
      }
    }, 50);
    return () => clearInterval(intervalRef.current!);
  }, [
    mediaUrl,
    currentIndex,
    stories.length,
    onClose,
    commentsOpen,
    showEmojiBar,
  ]);

  const loadComments = async () => {
    if (!backend || !current) return;
    setCommentLoading(true);
    try {
      const result = await (backend as any).getStoryComments(current.id);
      setComments(result || []);
      setTimeout(
        () => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleToggleComments = () => {
    if (!commentsOpen) {
      setCommentsOpen(true);
      setShowEmojiBar(false);
      loadComments();
    } else {
      setCommentsOpen(false);
    }
  };

  const handleSendComment = async () => {
    if (!backend || !commentText.trim() || !current) return;
    setSendingComment(true);
    try {
      await (backend as any).addStoryComment(current.id, commentText.trim());
      setCommentText("");
      await loadComments();
    } catch {
    } finally {
      setSendingComment(false);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (commentsOpen || showEmojiBar) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isRight = e.clientX > rect.left + rect.width / 2;
    if (isRight) {
      if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1);
      else onClose();
    } else {
      if (currentIndex > 0) setCurrentIndex((i) => i - 1);
    }
  };

  const handleDelete = async () => {
    if (!backend || !current) return;
    await backend.deleteStory(current.id).catch(() => {});
    onDeleted?.();
    onClose();
  };

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this story on VibeFlow",
          url,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    }
  };

  const handleSave = () => {
    setSaved((s) => !s);
  };

  const handleEmojiReact = async (emoji: string) => {
    if (!backend || !current) return;
    if (myReaction === emoji) {
      // Toggle off
      setMyReaction(null);
      setReactionCounts((prev) => {
        const next = { ...prev };
        if (next[emoji] > 1) next[emoji] -= 1;
        else delete next[emoji];
        return next;
      });
      try {
        await (backend as any).removeStoryReaction(current.id);
      } catch {}
    } else {
      const prevEmoji = myReaction;
      setMyReaction(emoji);
      setReactionCounts((prev) => {
        const next = { ...prev };
        if (prevEmoji) {
          if (next[prevEmoji] > 1) next[prevEmoji] -= 1;
          else delete next[prevEmoji];
        }
        next[emoji] = (next[emoji] || 0) + 1;
        return next;
      });
      try {
        await (backend as any).addStoryReaction(current.id, emoji);
      } catch {}
    }
    setShowEmojiBar(false);
  };

  if (!current) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-ocid="story_viewer.modal"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-10 z-50">
        {stories.map((s, i) => (
          <div
            key={s.id}
            className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-none"
              style={{
                width:
                  i < currentIndex
                    ? "100%"
                    : i === currentIndex
                      ? `${progress * 100}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Top controls */}
      <div className="absolute top-12 left-0 right-0 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVideoMuted((m) => !m)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40"
            data-ocid="story_viewer.mute_toggle"
          >
            {videoMuted ? (
              <VolumeX size={18} className="text-white" />
            ) : (
              <Volume2 size={18} className="text-white" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40"
            data-ocid="story_viewer.close_button"
          >
            {currentIndex > 0 ? (
              <ChevronLeft size={20} className="text-white" />
            ) : (
              <X size={20} className="text-white" />
            )}
          </button>
        </div>
        {isOwn && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40"
            data-ocid="story_viewer.delete_button"
          >
            <Trash2 size={18} className="text-red-400" />
          </button>
        )}
      </div>

      {/* Media */}
      <button
        type="button"
        className="absolute inset-0 z-10 w-full h-full bg-transparent border-0 p-0"
        onClick={handleTap}
        aria-label="Story media"
      >
        <AnimatePresence mode="wait">
          {mediaUrl ? (
            <motion.div
              key={current.id}
              className="w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {current.mediaType.startsWith("video") ? (
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={videoMuted}
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
            </div>
          )}
        </AnimatePresence>
      </button>

      {/* Right sidebar actions */}
      <div className="absolute right-4 bottom-36 z-50 flex flex-col gap-5 pointer-events-auto">
        {/* Emoji Reaction button */}
        <button
          type="button"
          onClick={() => {
            setShowEmojiBar((v) => !v);
            setCommentsOpen(false);
          }}
          className="flex flex-col items-center gap-1"
          data-ocid="story_viewer.react.button"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-xl ${
              myReaction ? "bg-white/20 border border-white/40" : "bg-black/40"
            }`}
          >
            {myReaction ?? "\uD83D\uDE0A"}
          </div>
          {Object.keys(reactionCounts).length > 0 && (
            <span className="text-white text-[10px] font-bold">
              {Object.values(reactionCounts).reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          data-ocid="story_viewer.like.button"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
            <Heart
              size={22}
              className={liked ? "text-[#FF3B5C] fill-[#FF3B5C]" : "text-white"}
            />
          </div>
          {likeCount > 0 && (
            <span className="text-white text-[10px] font-bold">
              {likeCount}
            </span>
          )}
        </button>
        {/* Comments */}
        <button
          type="button"
          onClick={handleToggleComments}
          className="flex flex-col items-center gap-1"
          data-ocid="story_viewer.comment.button"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              commentsOpen
                ? "bg-[#22D3EE]/20 border border-[#22D3EE]"
                : "bg-black/40"
            }`}
          >
            <MessageCircle
              size={20}
              className={commentsOpen ? "text-[#22D3EE]" : "text-white"}
            />
          </div>
          {comments.length > 0 && (
            <span className="text-white text-[10px] font-bold">
              {comments.length}
            </span>
          )}
        </button>
        {/* Share */}
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
          data-ocid="story_viewer.share.button"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
            <Share2 size={20} className="text-white" />
          </div>
        </button>
        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="flex flex-col items-center gap-1"
          data-ocid="story_viewer.save.button"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
            <Bookmark
              size={20}
              className={saved ? "text-[#22D3EE] fill-[#22D3EE]" : "text-white"}
            />
          </div>
        </button>
      </div>

      {/* Emoji reaction bar */}
      <AnimatePresence>
        {showEmojiBar && (
          <motion.div
            className="absolute bottom-28 left-0 right-0 z-50 flex justify-center px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-3 border border-white/10">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiReact(emoji)}
                  className={`text-2xl transition-transform active:scale-75 hover:scale-110 relative ${
                    myReaction === emoji ? "scale-125" : ""
                  }`}
                  data-ocid={`story_viewer.emoji.${emoji}`}
                >
                  {emoji}
                  {reactionCounts[emoji] > 0 && (
                    <span className="absolute -top-1 -right-1 bg-white text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {reactionCounts[emoji]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Sticker */}
      <div className="absolute top-1/2 left-4 right-16 -translate-y-1/2 z-40 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 p-4">
          <p className="text-white font-bold text-sm text-center mb-3">
            Which do you prefer?
          </p>
          <div className="space-y-2">
            {["Option A", "Option B"].map((opt) => {
              const votes = opt.includes("A") ? 62 : 38;
              const isSelected = pollVote === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPollVote(opt);
                  }}
                  className={`w-full relative rounded-xl overflow-hidden border transition-all ${
                    isSelected ? "border-[#22D3EE]" : "border-white/20"
                  }`}
                >
                  {pollVote && (
                    <div
                      className={`absolute top-0 left-0 bottom-0 rounded-xl ${
                        isSelected ? "bg-[#22D3EE]/30" : "bg-white/10"
                      }`}
                      style={{ width: `${votes}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between px-3 py-2.5">
                    <span className="text-white text-sm font-semibold">
                      {opt}
                    </span>
                    {pollVote && (
                      <span className="text-white text-xs font-bold">
                        {votes}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-8 pt-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2 mb-2">
          {creatorProfile ? (
            <img
              src={creatorProfile.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#22D3EE] flex items-center justify-center">
              <span className="text-black text-xs font-bold">
                {creatorId.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-white text-sm font-semibold">
            {creatorProfile?.username ?? `${creatorId.slice(0, 8)}...`}
          </span>
          <span className="text-white/60 text-xs">
            {timeAgo(current.createdAt)}
          </span>
        </div>
        {current.caption && (
          <p className="text-white text-sm">{current.caption}</p>
        )}
        {/* Reaction summary */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span
                key={emoji}
                className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white flex items-center gap-0.5"
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comments Drawer */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-[70] bg-[#0F1216]/95 backdrop-blur-xl rounded-t-3xl flex flex-col"
            style={{ maxHeight: "65vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            data-ocid="story_viewer.dialog"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <h3 className="text-white font-semibold text-sm">Comments</h3>
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"
                data-ocid="story_viewer.comments.close_button"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            {/* Comment list */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ minHeight: 120 }}
            >
              {commentLoading ? (
                <div
                  className="flex justify-center py-6"
                  data-ocid="story_viewer.loading_state"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div
                  className="text-center py-8"
                  data-ocid="story_viewer.empty_state"
                >
                  <MessageCircle
                    size={28}
                    className="text-white/20 mx-auto mb-2"
                  />
                  <p className="text-white/40 text-sm">No comments yet</p>
                  <p className="text-white/25 text-xs mt-1">
                    Be the first to comment!
                  </p>
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div
                    key={c.id}
                    className="flex gap-2.5"
                    data-ocid={`story_viewer.comment.item.${idx + 1}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/30 flex items-center justify-center shrink-0">
                      <span className="text-[#22D3EE] text-[10px] font-bold">
                        {c.author.toString().slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-white/80 text-xs font-semibold">
                          {c.author.toString().slice(0, 8)}...
                        </span>
                        <span className="text-white/30 text-[10px]">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-white/90 text-sm mt-0.5 leading-snug">
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment input */}
            <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full px-4 py-2 flex items-center">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
                  data-ocid="story_viewer.comment.input"
                />
              </div>
              <button
                type="button"
                onClick={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
                className="w-9 h-9 rounded-full bg-[#22D3EE] flex items-center justify-center disabled:opacity-40 transition-opacity"
                data-ocid="story_viewer.comment.submit_button"
              >
                {sendingComment ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <Send size={14} className="text-black" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
