import {
  Bookmark,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { formatCount } from "../types/app";
import CommentsDrawer from "./CommentsDrawer";

export interface ProfileResolvedVideo {
  id: string;
  creator: string;
  title: string;
  description: string;
  hashtags: string[];
  videoKey: string;
  thumbnailKey: string;
  videoUrl: string;
  thumbUrl: string;
  creatorUsername: string;
  creatorAvatar: string;
  views: bigint;
  createdAt: bigint;
}

interface Props {
  videos: ProfileResolvedVideo[];
  startIndex: number;
  onClose: () => void;
}

function VideoSlide({
  video,
  isActive,
  muted,
  onDoubleTap,
}: {
  video: ProfileResolvedVideo;
  isActive: boolean;
  muted: boolean;
  onDoubleTap: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleTap = (_e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      onDoubleTap();
    } else {
      togglePlay();
    }
    lastTap.current = now;
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (el?.duration) {
      setProgress(el.currentTime / el.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * el.duration;
  };

  const handleSeekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el) return;
    if (e.key === "ArrowRight")
      el.currentTime = Math.min(el.currentTime + 5, el.duration);
    if (e.key === "ArrowLeft") el.currentTime = Math.max(el.currentTime - 5, 0);
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
      />

      {/* Tap overlay */}
      <div
        className="absolute inset-0 z-10"
        onClick={handleTap}
        onTouchEnd={handleTap}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") togglePlay();
        }}
        role="button"
        tabIndex={0}
        aria-label="Toggle play"
      />

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Heart
              size={90}
              className="text-[#FF3B5C] fill-[#FF3B5C] drop-shadow-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/pause center indicator */}
      <AnimatePresence>
        {!playing && isActive && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-black/50 rounded-full p-4">
              <Play size={36} className="text-white fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 cursor-pointer"
        onClick={handleSeek}
        onKeyUp={handleSeekKey}
        role="slider"
        tabIndex={0}
        aria-label="Video progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[#22D3EE] transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-4 left-0 right-16 px-4 z-20 pointer-events-none">
        <p className="font-bold text-white text-sm drop-shadow">
          @{video.creatorUsername}
        </p>
        <p className="text-white/90 text-xs mt-0.5 line-clamp-2 drop-shadow">
          {video.description || video.title}
        </p>
        {video.hashtags?.length > 0 && (
          <p className="text-[#22D3EE] text-xs mt-0.5 drop-shadow">
            {video.hashtags
              .slice(0, 3)
              .map((h) => `#${h}`)
              .join(" ")}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-white/60 text-[10px]">
            {formatCount(video.views)} views
          </span>
          {duration > 0 && (
            <span className="text-white/40 text-[10px]">
              &bull; {Math.floor(duration)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type LikeStateMap = Record<string, { liked: boolean; count: bigint }>;

export default function ProfileVideoPlayer({
  videos,
  startIndex,
  onClose,
}: Props) {
  const { backend, isLoggedIn } = useBackend();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [likeStates, setLikeStates] = useState<LikeStateMap>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = videos[currentIndex];

  // Load like state for current video (guard inside setState to avoid dep)
  useEffect(() => {
    if (!backend || !current) return;
    const id = current.id;
    Promise.all([
      backend.getLikeCount(id).catch(() => 0n),
      backend.didCallerLike(id).catch(() => false),
    ]).then(([count, liked]) => {
      setLikeStates((prev) => {
        if (prev[id]) return prev;
        return {
          ...prev,
          [id]: { liked: liked as boolean, count: count as bigint },
        };
      });
    });
  }, [backend, current]);

  const handleLike = useCallback(async () => {
    if (!backend || !isLoggedIn || !current) return;
    const id = current.id;
    const state = likeStates[id] ?? { liked: false, count: 0n };
    if (state.liked) {
      setLikeStates((prev) => ({
        ...prev,
        [id]: { liked: false, count: (prev[id]?.count ?? 1n) - 1n },
      }));
      await backend.unlikeVideo(id).catch(() => {});
    } else {
      setLikeStates((prev) => ({
        ...prev,
        [id]: { liked: true, count: (prev[id]?.count ?? 0n) + 1n },
      }));
      await backend.likeVideo(id).catch(() => {});
    }
  }, [backend, isLoggedIn, current, likeStates]);

  const handleSave = useCallback(async () => {
    if (!backend || !isLoggedIn || !current) return;
    const id = current.id;
    if (savedIds.has(id)) {
      setSavedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      await backend.unsaveVideo(id).catch(() => {});
    } else {
      setSavedIds((prev) => new Set(prev).add(id));
      await backend.saveVideo(id).catch(() => {});
    }
  }, [backend, isLoggedIn, current, savedIds]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, videos.length - 1));
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  const likeState = likeStates[current.id];

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-ocid="profile.video_player.modal"
    >
      {/* Main video area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <VideoSlide
              video={current}
              isActive
              muted={muted}
              onDoubleTap={handleLike}
            />
          </motion.div>
        </AnimatePresence>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-40 bg-gradient-to-b from-black/60 to-transparent">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
            data-ocid="profile.video_player.close_button"
          >
            <X size={20} className="text-white" />
          </button>

          <span className="text-white text-sm font-semibold bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
            {currentIndex + 1} / {videos.length}
          </span>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
            data-ocid="profile.video_player.toggle"
          >
            {muted ? (
              <VolumeX size={20} className="text-white" />
            ) : (
              <Volume2 size={20} className="text-white" />
            )}
          </button>
        </div>

        {/* Prev arrow */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
            data-ocid="profile.video_player.pagination_prev"
          >
            <span className="text-white text-xl leading-none">&lsaquo;</span>
          </button>
        )}

        {/* Next arrow */}
        {currentIndex < videos.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-14 top-1/2 -translate-y-1/2 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
            data-ocid="profile.video_player.pagination_next"
          >
            <span className="text-white text-xl leading-none">&rsaquo;</span>
          </button>
        )}

        {/* Right sidebar actions */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5 z-30">
          {/* Creator avatar */}
          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-[#1A1F26]">
            {current.creatorAvatar ? (
              <img
                src={current.creatorAvatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#22D3EE]">
                <span className="text-black text-xs font-bold">
                  {current.creatorUsername.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
            data-ocid="profile.video_player.toggle"
          >
            <motion.div
              whileTap={{ scale: 1.3 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm ${
                likeState?.liked ? "bg-[#FF3B5C]/20" : "bg-black/40"
              }`}
            >
              <Heart
                size={24}
                className={
                  likeState?.liked
                    ? "text-[#FF3B5C] fill-[#FF3B5C]"
                    : "text-white"
                }
              />
            </motion.div>
            <span className="text-white text-[11px] font-semibold drop-shadow">
              {likeState ? formatCount(likeState.count) : "0"}
            </span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1"
            data-ocid="profile.video_player.open_modal_button"
          >
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <span className="text-white text-[11px] font-semibold drop-shadow">
              Comment
            </span>
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            className="flex flex-col items-center gap-1"
            data-ocid="profile.video_player.secondary_button"
          >
            <div
              className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center ${
                savedIds.has(current.id) ? "bg-[#22D3EE]/20" : "bg-black/40"
              }`}
            >
              <Bookmark
                size={24}
                className={
                  savedIds.has(current.id)
                    ? "text-[#22D3EE] fill-[#22D3EE]"
                    : "text-white"
                }
              />
            </div>
            <span className="text-white text-[11px] font-semibold drop-shadow">
              Save
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1"
            data-ocid="profile.video_player.button"
          >
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Share2 size={24} className="text-white" />
            </div>
            <span className="text-white text-[11px] font-semibold drop-shadow">
              Share
            </span>
          </button>
        </div>
      </div>

      {/* Comments drawer */}
      <CommentsDrawer
        open={showComments}
        onClose={() => setShowComments(false)}
        videoId={current.id}
      />
    </motion.div>
  );
}
