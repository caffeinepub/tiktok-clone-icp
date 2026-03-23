import { Bookmark, ChevronLeft, Heart, Share2, Trash2, X } from "lucide-react";
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

  const current = stories[currentIndex];
  const isOwn = identity?.getPrincipal().toString() === creatorId;

  // Load creator profile
  useEffect(() => {
    if (!backend || !creatorId) return;
    const load = async () => {
      try {
        const { Principal } = await import("@dfinity/principal");
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
  }, [current, backend, photoClient, videoClient]);

  // Auto-advance timer
  useEffect(() => {
    if (!mediaUrl) return;
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
  }, [mediaUrl, currentIndex, stories.length, onClose]);

  const handleTap = (e: React.MouseEvent) => {
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
      if (backend && current?.mediaKey?.startsWith("sha256:")) {
        backend.likeVideo(current.id).catch(() => {});
      }
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
    if (saved) {
      setSaved(false);
    } else {
      setSaved(true);
      if (backend && current?.id) {
        backend.saveVideo(current.id).catch(() => {});
      }
    }
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
                  muted
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
      <div className="absolute right-4 bottom-28 z-50 flex flex-col gap-5 pointer-events-auto">
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
      </div>
    </motion.div>
  );
}
