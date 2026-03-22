import { ChevronLeft, Trash2, X } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5000;

  const current = stories[currentIndex];
  const isOwn = identity?.getPrincipal().toString() === creatorId;

  useEffect(() => {
    if (!current) return;
    setMediaUrl(null);
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

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-8 pt-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#22D3EE] flex items-center justify-center">
            <span className="text-black text-xs font-bold">
              {creatorId.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-white text-sm font-semibold">
            {creatorId.slice(0, 8)}...
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
