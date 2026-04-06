import {
  Bookmark,
  Compass,
  Gift,
  Heart,
  MessageCircle,
  MoreVertical,
  Music,
  Pause,
  Play,
  Share2,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../backend.d";
import AuthModal from "../components/AuthModal";
import CommentsDrawer from "../components/CommentsDrawer";
import StoriesBar from "../components/StoriesBar";
import StoryCreator from "../components/StoryCreator";
import StoryViewer from "../components/StoryViewer";
import VideoOptionsSheet from "../components/VideoOptionsSheet";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";
import { type Video, formatCount } from "../types/app";

const FAKE_TRACKS = [
  "Trending Beat #1",
  "Chill Vibes 2026",
  "Urban Flow Remix",
  "Midnight Dreams",
  "Summer Haze",
];

const VERIFIED_SUFFIXES = new Set(["_official", "_verified", "_real"]);
const COIN_OPTIONS = [10, 50, 100, 500];

interface ResolvedVideo extends Video {
  videoUrl: string;
  thumbUrl: string;
  creatorUsername: string;
  creatorAvatar: string;
}

interface VideoCardProps {
  video: ResolvedVideo;
  isActive: boolean;
  onViewProfile: (id: string) => void;
  onViewHashtag?: (tag: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  followedIds: Set<string>;
  onToggleFollow: (creatorId: string) => void;
  pinnedIds: Set<string>;
  onPinToggle: (id: string) => void;
  onRemoveFromFeed: (id: string) => void;
  onEditSave: (id: string, title: string, desc: string, tags: string[]) => void;
  currentUserPrincipal: string | null;
  onDuet?: (videoId: string, videoUrl: string) => void;
  isFirstVideo?: boolean;
}

// Share Sheet component
function ShareSheet({
  open,
  onClose,
  videoId,
  videoUrl,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string;
  videoUrl: string;
}) {
  const link = `${window.location.origin}?v=${videoId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    onClose();
  };

  const downloadVideo = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `vibeflow-${videoId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "VibeFlow Video", url: link });
      } catch {}
    } else {
      copyLink();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="share.sheet"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 w-full"
            onClick={onClose}
            aria-label="Close share"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3 className="text-[#E9EEF5] font-bold text-base mb-4">
              Share Video
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#1A1F26] border border-[#2A3038] active:scale-95 transition-transform"
                data-ocid="share.copy_link.button"
              >
                <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/20 flex items-center justify-center">
                  <Share2 size={18} className="text-[#22D3EE]" />
                </div>
                <div className="text-left">
                  <p className="text-[#E9EEF5] font-semibold text-sm">
                    Copy Link
                  </p>
                  <p className="text-[#8B95A3] text-xs">Share via clipboard</p>
                </div>
              </button>
              <button
                type="button"
                onClick={downloadVideo}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#1A1F26] border border-[#2A3038] active:scale-95 transition-transform"
                data-ocid="share.download.button"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF3B5C]/20 flex items-center justify-center">
                  <span className="text-[#FF3B5C] text-lg">⬇️</span>
                </div>
                <div className="text-left">
                  <p className="text-[#E9EEF5] font-semibold text-sm">
                    Download
                  </p>
                  <p className="text-[#8B95A3] text-xs">Save to device</p>
                </div>
              </button>
              <button
                type="button"
                onClick={shareNative}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#1A1F26] border border-[#2A3038] active:scale-95 transition-transform"
                data-ocid="share.native.button"
              >
                <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 flex items-center justify-center">
                  <span className="text-[#A855F7] text-lg">📤</span>
                </div>
                <div className="text-left">
                  <p className="text-[#E9EEF5] font-semibold text-sm">Share</p>
                  <p className="text-[#8B95A3] text-xs">Share to another app</p>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Gift Sheet component
function GiftSheet({
  open,
  onClose,
  username,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="gift.sheet"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 w-full"
            onClick={onClose}
            aria-label="Close gift"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3 className="text-[#E9EEF5] font-bold text-base mb-1">
              Send a Gift
            </h3>
            <p className="text-[#8B95A3] text-xs mb-5">
              Support @{username} with virtual coins
            </p>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {COIN_OPTIONS.map((coins) => (
                <button
                  key={coins}
                  type="button"
                  onClick={() => onClose()}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#1A1F26] border border-[#2A3038] active:scale-95 transition-transform"
                  data-ocid={`gift.coins_${coins}.button`}
                >
                  <span className="text-xl">
                    {coins >= 100 ? "💎" : coins >= 50 ? "🌟" : "🎁"}
                  </span>
                  <span className="text-[#E9EEF5] text-xs font-bold">
                    {coins}
                  </span>
                  <span className="text-[#8B95A3] text-[9px]">coins</span>
                </button>
              ))}
            </div>
            <div className="bg-[#FF3B5C]/10 border border-[#FF3B5C]/20 rounded-2xl p-3 text-center">
              <p className="text-[#FF3B5C] text-xs font-semibold">
                Not enough coins
              </p>
              <p className="text-[#8B95A3] text-xs mt-0.5">
                Earn coins by watching videos and daily check-ins
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Music Library Sheet
function MusicSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="music.sheet"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 w-full"
            onClick={onClose}
            aria-label="Close music"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3 className="text-[#E9EEF5] font-bold text-base mb-4">
              🎵 Sounds
            </h3>
            <div className="space-y-2">
              {FAKE_TRACKS.map((track) => (
                <div
                  key={track}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#1A1F26] border border-[#2A3038]"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22D3EE]/30 to-[#FF3B5C]/30 flex items-center justify-center">
                    <Music size={16} className="text-[#22D3EE]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#E9EEF5] text-sm font-semibold">
                      {track}
                    </p>
                    <p className="text-[#8B95A3] text-xs">Trending</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlaying(playing === track ? null : track)}
                    className="w-9 h-9 rounded-full bg-[#22D3EE]/20 flex items-center justify-center"
                    data-ocid="music.play.button"
                  >
                    {playing === track ? (
                      <Pause size={14} className="text-[#22D3EE]" />
                    ) : (
                      <Play
                        size={14}
                        className="text-[#22D3EE] fill-[#22D3EE] ml-0.5"
                      />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VideoCard({
  video,
  isActive,
  onViewProfile,
  onViewHashtag,
  savedIds,
  onToggleSave,
  followedIds,
  onToggleFollow,
  pinnedIds,
  onPinToggle,
  onRemoveFromFeed,
  onEditSave,
  currentUserPrincipal,
  onDuet,
  isFirstVideo,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<bigint>(0n);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactionAnim, setReactionAnim] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const lastTap = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isLoggedIn, backend } = useBackend();
  const isSaved = savedIds.has(video.id);
  const creatorId =
    typeof video.creator === "object"
      ? (video.creator as { toString(): string }).toString()
      : String(video.creator);
  const isFollowed = followedIds.has(creatorId);
  const isPinned = pinnedIds.has(video.id);
  const isOwner = currentUserPrincipal === creatorId;

  // Creator verified badge
  const isVerified =
    VERIFIED_SUFFIXES.has(`_${video.creatorUsername.split("_").pop()}`) ||
    (video.description || "").includes("✓");

  // HD badge
  const isHD =
    video.videoUrl.includes("hd") ||
    video.videoUrl.includes("1080") ||
    video.videoUrl.includes("720");

  // Load real like count, whether caller liked, and comment count
  useEffect(() => {
    if (!backend) return;
    Promise.all([
      backend.getLikeCount(video.id),
      backend.didCallerLike(video.id),
      backend.getComments(video.id),
    ])
      .then(([count, didLike, comments]) => {
        setLikeCount(count);
        setLiked(didLike);
        setCommentCount((comments as any[]).length);
      })
      .catch(() => {});
  }, [backend, video.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.playbackRate = speed;
      el.muted = false;
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {
          el.muted = true;
          setMuted(true);
          el.play()
            .then(() => setPlaying(true))
            .catch(() => {});
        });
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [isActive, speed]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, []);

  // Increment view count when video becomes active
  useEffect(() => {
    if (isActive && backend) {
      backend.incrementView(video.id).catch(() => {});
    }
  }, [isActive, backend, video.id]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikeCount((c) => c + 1n);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 900);
        if (backend) backend.likeVideo(video.id).catch(() => {});
      }
    }
    lastTap.current = now;
  }, [liked, backend, video.id]);

  // Long press for reaction bar
  const handleLikePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionBar(true);
    }, 500);
  };

  const handleLikePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReaction = (emoji: string) => {
    setReaction(emoji);
    setReactionAnim(emoji);
    setShowReactionBar(false);
    setTimeout(() => setReactionAnim(null), 1200);
    if (!liked && backend) {
      setLiked(true);
      setLikeCount((c) => c + 1n);
      backend.likeVideo(video.id).catch(() => {});
    }
  };

  const handleLikeTap = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!backend) return;
    if (liked) {
      setLiked(false);
      setReaction(null);
      setLikeCount((c) => (c > 0n ? c - 1n : 0n));
      backend.unlikeVideo(video.id).catch(() => {});
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1n);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      backend.likeVideo(video.id).catch(() => {});
    }
  };

  const handleSave = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    onToggleSave(video.id);
  };

  const handleFollow = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    onToggleFollow(creatorId);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  // Convert video to old Video type for VideoOptionsSheet
  const videoForSheet: Video = {
    ...video,
    videoKey: video.videoUrl,
    thumbnailKey: video.thumbUrl,
    creator: creatorId,
  };

  return (
    <>
      <div
        className="relative w-full h-full flex items-center justify-center bg-black select-none"
        onClick={handleDoubleTap}
        onKeyDown={(e) => e.key === "Enter" && handleDoubleTap()}
      >
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          preload="auto"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none z-[1]" />

        {/* Quality badge top-left */}
        <div className="absolute top-14 left-3 z-20">
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
              isHD ? "bg-[#22D3EE]/80 text-black" : "bg-white/20 text-white/70"
            }`}
          >
            {isHD ? "HD" : "SD"}
          </span>
        </div>

        {/* LIVE badge on first video */}
        {isFirstVideo && (
          <div className="absolute top-14 left-12 z-20 flex items-center gap-1 bg-[#FF3B5C] rounded-full px-2 py-0.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-white text-[8px] font-black">LIVE</span>
          </div>
        )}

        {/* Pinned badge */}
        {isPinned && (
          <div className="absolute top-12 left-3 z-20 flex items-center gap-1 bg-yellow-400/90 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            <Star size={10} className="fill-black" />
            Pinned
          </div>
        )}

        {/* Double tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              key="heart"
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.4, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Heart className="w-28 h-28 text-[#FF3B5C] fill-[#FF3B5C] drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction emoji animation */}
        <AnimatePresence>
          {reactionAnim && (
            <motion.div
              key="reaction-anim"
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              initial={{ scale: 0, y: 0, opacity: 1 }}
              animate={{ scale: [0, 2, 1.5], y: -60, opacity: [1, 1, 0] }}
              transition={{ duration: 1.2 }}
            >
              <span className="text-6xl drop-shadow-2xl">{reactionAnim}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/pause overlay */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3-dot menu — top right */}
        <div className="absolute top-16 right-3 z-30">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(true);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: "rgba(0,0,0,0.50)",
              backdropFilter: "blur(10px)",
            }}
            aria-label="More options"
            data-ocid="video_options.open_modal_button"
          >
            <MoreVertical size={18} className="text-white" />
          </button>
        </div>

        {/* Reaction bar */}
        <AnimatePresence>
          {showReactionBar && (
            <motion.div
              className="absolute right-14 z-30 flex flex-col gap-1"
              style={{ bottom: "calc(50% - 60px)" }}
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="flex gap-2 bg-black/80 backdrop-blur-md rounded-full px-3 py-2 border border-white/10 flex-col items-center">
                {["❤️", "😂", "😮", "😢", "😡", "🔥"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(emoji);
                    }}
                    className="text-2xl transition-transform active:scale-75 hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close reaction bar overlay */}
        {showReactionBar && (
          <button
            type="button"
            className="absolute inset-0 z-[25] w-full h-full"
            onClick={(e) => {
              e.stopPropagation();
              setShowReactionBar(false);
            }}
            aria-label="Close reactions"
          />
        )}

        {/* Right sidebar actions */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
          {/* Creator avatar + follow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(creatorId);
            }}
            className="relative flex flex-col items-center"
            data-ocid="feed.profile.button"
          >
            <img
              src={video.creatorAvatar}
              alt={video.creatorUsername}
              className="w-11 h-11 rounded-full border-2 border-white object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold active:scale-90 transition-transform ${
                isFollowed ? "bg-[#22D3EE]" : "bg-[#FF3B5C]"
              }`}
            >
              {isFollowed ? "✓" : "+"}
            </button>
          </button>

          {/* Like with long-press reaction */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLikeTap();
            }}
            onMouseDown={() => handleLikePressStart()}
            onMouseUp={() => handleLikePressEnd()}
            onTouchStart={() => handleLikePressStart()}
            onTouchEnd={() => handleLikePressEnd()}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            data-ocid="feed.like.button"
          >
            <motion.div
              animate={liked ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
            >
              {reaction ? (
                <span className="text-2xl">{reaction}</span>
              ) : (
                <Heart
                  size={24}
                  className={
                    liked ? "text-[#FF3B5C] fill-[#FF3B5C]" : "text-white"
                  }
                />
              )}
            </motion.div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              {formatCount(likeCount)}
            </span>
          </button>

          {/* Comment with count */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            data-ocid="feed.comment.button"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              {commentCount > 0 ? formatCount(BigInt(commentCount)) : "Comment"}
            </span>
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            data-ocid="feed.save.button"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
              <Bookmark
                size={24}
                className={
                  isSaved ? "text-[#22D3EE] fill-[#22D3EE]" : "text-white"
                }
              />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              Save
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowShare(true);
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            data-ocid="feed.share.button"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
              <Share2 size={24} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              Share
            </span>
          </button>

          {/* Gift */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowGift(true);
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            data-ocid="feed.gift.button"
          >
            <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center">
              <Gift size={22} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              Gift
            </span>
          </button>

          {/* Spinning disc */}
          <div
            className="w-10 h-10 rounded-full border-2 border-white overflow-hidden animate-spin"
            style={{ animationDuration: "5s" }}
          >
            <img
              src={video.creatorAvatar}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Caption overlay */}
        <div className="absolute bottom-24 left-3 right-16 z-20 pr-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(creatorId);
            }}
            className="flex items-center gap-2 mb-1.5"
          >
            <span className="font-bold text-white text-sm drop-shadow">
              @{video.creatorUsername}
            </span>
            {isVerified && (
              <span className="text-[#3B82F6] text-xs font-black">✓</span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              className={`text-[10px] border px-2 py-0.5 rounded-full active:scale-90 transition-transform ${
                isFollowed
                  ? "border-[#22D3EE] text-[#22D3EE]"
                  : "border-white/70 text-white"
              }`}
            >
              {isFollowed ? "Following" : "Follow"}
            </button>
          </button>
          <p className="text-white/85 text-sm leading-snug mb-1.5 line-clamp-2 drop-shadow">
            {video.description}
          </p>
          {/* Hashtags — tappable */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            {(video.hashtags || []).slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewHashtag?.(tag);
                }}
                className="text-[#22D3EE] text-xs font-semibold drop-shadow active:opacity-70"
              >
                #{tag}
              </button>
            ))}
          </div>
          {/* Music row — tappable */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMusic(true);
            }}
            className="flex items-center gap-1.5 text-white/70 text-xs active:opacity-70"
          >
            <Music size={11} />
            <span className="truncate">
              Original sound – {video.creatorUsername}
            </span>
          </button>
        </div>

        {/* Bottom-left controls: Mute + Speed */}
        <div className="absolute bottom-8 left-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Toggle mute"
          >
            {muted ? (
              <VolumeX size={14} className="text-white/60" />
            ) : (
              <Volume2 size={14} className="text-white/60" />
            )}
          </button>

          {/* Speed control */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeedMenu((v) => !v);
              }}
              className="h-8 px-2 rounded-full flex items-center justify-center active:scale-90 transition-transform text-white/60 text-xs font-bold"
              style={{
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
              }}
              aria-label="Speed"
              data-ocid="feed.speed.button"
            >
              {speed}x
            </button>
            <AnimatePresence>
              {showSpeedMenu && (
                <motion.div
                  className="absolute bottom-10 left-0 flex flex-col gap-1 bg-black/80 backdrop-blur-md rounded-2xl p-2 border border-white/10 z-30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeedChange(s);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        speed === s
                          ? "bg-[#22D3EE] text-black"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress bar — thin sleek line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div
            className="h-[2px] bg-white/20 cursor-pointer relative"
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(e);
            }}
            onKeyDown={(e) => {
              const el = videoRef.current;
              if (!el) return;
              if (e.key === "ArrowRight")
                el.currentTime = Math.min(el.currentTime + 5, el.duration);
              if (e.key === "ArrowLeft")
                el.currentTime = Math.max(el.currentTime - 5, 0);
            }}
            role="slider"
            tabIndex={0}
            aria-label="Video progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[#22D3EE] rounded-full transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Play control bottom-right */}
        <div className="absolute bottom-4 right-3 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="text-white/60 active:scale-90 transition-transform"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>

      <CommentsDrawer
        open={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
      />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <VideoOptionsSheet
        open={showOptions}
        onClose={() => setShowOptions(false)}
        video={videoForSheet}
        isOwner={isOwner}
        isSaved={isSaved}
        isPinned={isPinned}
        onViewProfile={onViewProfile}
        onRemoveFromFeed={onRemoveFromFeed}
        onSaveToggle={onToggleSave}
        onEditSave={onEditSave}
        onPinToggle={onPinToggle}
        onDuet={onDuet ? (id) => onDuet(id, video.videoUrl) : undefined}
      />
      <ShareSheet
        open={showShare}
        onClose={() => setShowShare(false)}
        videoId={video.id}
        videoUrl={video.videoUrl}
      />
      <GiftSheet
        open={showGift}
        onClose={() => setShowGift(false)}
        username={video.creatorUsername}
      />
      <MusicSheet open={showMusic} onClose={() => setShowMusic(false)} />
    </>
  );
}

interface VideoScrollFeedProps {
  videos: ResolvedVideo[];
  onViewProfile: (id: string) => void;
  onViewHashtag?: (tag: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  followedIds: Set<string>;
  onToggleFollow: (creatorId: string) => void;
  pinnedIds: Set<string>;
  onPinToggle: (id: string) => void;
  onRemoveFromFeed: (id: string) => void;
  onEditSave: (id: string, title: string, desc: string, tags: string[]) => void;
  currentUserPrincipal: string | null;
  feedActive: boolean;
  onDuet?: (videoId: string, videoUrl: string) => void;
}

function VideoScrollFeed({
  videos,
  onViewProfile,
  onViewHashtag,
  savedIds,
  onToggleSave,
  followedIds,
  onToggleFollow,
  pinnedIds,
  onPinToggle,
  onRemoveFromFeed,
  onEditSave,
  currentUserPrincipal,
  feedActive,
  onDuet,
}: VideoScrollFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );
    const children = Array.from(container.querySelectorAll("[data-index]"));
    for (const el of children) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-0 overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: "none" }}
      data-ocid="feed.list"
    >
      {videos.map((video, i) => (
        <div
          key={video.id}
          data-index={i}
          className="h-full min-h-0 w-full snap-start snap-always shrink-0"
          data-ocid={`feed.item.${i + 1}`}
        >
          <VideoCard
            video={video}
            isActive={feedActive && i === activeIndex}
            onViewProfile={onViewProfile}
            onViewHashtag={onViewHashtag}
            savedIds={savedIds}
            onToggleSave={onToggleSave}
            followedIds={followedIds}
            onToggleFollow={onToggleFollow}
            pinnedIds={pinnedIds}
            onPinToggle={onPinToggle}
            onRemoveFromFeed={onRemoveFromFeed}
            onEditSave={onEditSave}
            currentUserPrincipal={currentUserPrincipal}
            onDuet={onDuet}
            isFirstVideo={i === 0}
          />
        </div>
      ))}
    </div>
  );
}

export default function FeedPage({
  onViewProfile,
  onViewHashtag,
  isActive,
  onDuet,
  refreshKey = 0,
}: {
  onViewProfile: (id: string) => void;
  onViewHashtag?: (tag: string) => void;
  isActive: boolean;
  onDuet?: (videoId: string, videoUrl: string) => void;
  refreshKey?: number;
}) {
  const { backend, isLoggedIn, identity, isFetching } = useBackend();
  const videoStorageClient = useStorageClient("videos");
  const thumbStorageClient = useStorageClient("thumbnails");
  const [rawVideos, setRawVideos] = useState<Video[]>([]);
  const [resolvedVideos, setResolvedVideos] = useState<ResolvedVideo[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [_storyRefreshKey, setStoryRefreshKey] = useState(0);
  const [viewerStories, setViewerStories] = useState<Story[] | null>(null);
  const [viewerCreatorId, _setViewerCreatorId] = useState<string>("");
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const currentUserPrincipal = identity?.getPrincipal().toString() ?? null;

  // Load feed + followedIds simultaneously
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers reload
  useEffect(() => {
    if (isFetching) return; // Actor still initializing — wait
    if (!backend) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const feedPromise = backend.getFeed(0n, 20n).catch(() => []);
    const followingPromise = identity
      ? backend.getFollowing(identity.getPrincipal()).catch(() => [])
      : Promise.resolve([]);

    Promise.all([feedPromise, followingPromise])
      .then(([vids, principals]) => {
        setRawVideos(vids as Video[]);
        setFollowedIds(
          new Set(
            (principals as any[]).map((p) =>
              typeof p === "object"
                ? (p as { toString(): string }).toString()
                : String(p),
            ),
          ),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backend, identity, refreshKey, isFetching]);

  // Resolve hashes to URLs — all profile lookups in parallel
  useEffect(() => {
    if (!rawVideos.length) {
      setResolvedVideos([]);
      return;
    }
    let cancelled = false;

    const resolveVideos = async () => {
      // 1. Collect unique creator IDs
      const uniqueCreatorIds = [
        ...new Set(
          rawVideos.map((v) =>
            typeof v.creator === "object"
              ? (v.creator as { toString(): string }).toString()
              : String(v.creator),
          ),
        ),
      ];

      // 2. Fetch all profiles in parallel
      const profileMap = new Map<
        string,
        { username: string; avatarUrl: string }
      >();
      if (backend) {
        const { Principal } = await import("@icp-sdk/core/principal");
        const profileResults = await Promise.allSettled(
          uniqueCreatorIds.map(async (cid) => {
            const opt = await backend.getProfile(Principal.fromText(cid));
            let avatarUrl = `https://i.pravatar.cc/100?u=${cid}`;
            let username = `${cid.slice(0, 8)}...`;
            if (opt.__kind__ === "Some") {
              username = opt.value.username;
              const ak = opt.value.avatarKey;
              if (ak) {
                if (thumbStorageClient && ak.startsWith("sha256:")) {
                  try {
                    avatarUrl = await thumbStorageClient.getDirectURL(ak);
                  } catch {
                    avatarUrl = `https://i.pravatar.cc/100?u=${cid}`;
                  }
                } else {
                  avatarUrl = ak || `https://i.pravatar.cc/100?u=${cid}`;
                }
              }
            }
            return { cid, username, avatarUrl };
          }),
        );
        for (const r of profileResults) {
          if (r.status === "fulfilled") {
            profileMap.set(r.value.cid, {
              username: r.value.username,
              avatarUrl: r.value.avatarUrl,
            });
          }
        }
      }

      // 3. Resolve video/thumb URLs in parallel using pre-built profile map
      const resolved = await Promise.all(
        rawVideos.map(async (v) => {
          const creatorId =
            typeof v.creator === "object"
              ? (v.creator as { toString(): string }).toString()
              : String(v.creator);

          let videoUrl = v.videoKey;
          if (videoStorageClient && v.videoKey.startsWith("sha256:")) {
            try {
              videoUrl = await videoStorageClient.getDirectURL(v.videoKey);
            } catch {}
          }

          let thumbUrl =
            v.thumbnailKey || `https://i.pravatar.cc/400?u=${v.id}`;
          if (thumbStorageClient && v.thumbnailKey?.startsWith("sha256:")) {
            try {
              thumbUrl = await thumbStorageClient.getDirectURL(v.thumbnailKey);
            } catch {}
          }

          const profile = profileMap.get(creatorId);
          const creatorUsername =
            profile?.username ?? `${creatorId.slice(0, 8)}...`;
          const creatorAvatar =
            profile?.avatarUrl ?? `https://i.pravatar.cc/100?u=${creatorId}`;

          return {
            ...v,
            creator: creatorId,
            videoUrl,
            thumbUrl,
            creatorUsername,
            creatorAvatar,
          } as ResolvedVideo;
        }),
      );

      if (!cancelled) setResolvedVideos(resolved);
    };

    resolveVideos();
    return () => {
      cancelled = true;
    };
  }, [rawVideos, videoStorageClient, thumbStorageClient, backend]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFollow = (creatorId: string) => {
    if (!backend || !identity) return;
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
        import("@icp-sdk/core/principal").then(({ Principal }) => {
          backend.unfollowUser(Principal.fromText(creatorId)).catch(() => {});
        });
      } else {
        next.add(creatorId);
        import("@icp-sdk/core/principal").then(({ Principal }) => {
          backend.followUser(Principal.fromText(creatorId)).catch(() => {});
        });
      }
      return next;
    });
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.clear();
      if (!prev.has(id)) next.add(id);
      return next;
    });
  };

  const removeFromFeed = (id: string) => {
    setHiddenIds((prev) => new Set([...prev, id]));
  };

  const handleEditSave = (
    id: string,
    title: string,
    desc: string,
    tags: string[],
  ) => {
    setRawVideos((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, title, description: desc, hashtags: tags } : v,
      ),
    );
  };

  const visibleVideos = resolvedVideos.filter((v) => !hiddenIds.has(v.id));

  // Skeleton loaders
  if (loading || isFetching) {
    return (
      <div
        className="h-full bg-black flex flex-col"
        data-ocid="feed.loading_state"
      >
        <div className="flex-1 animate-pulse bg-[#1A1F26]">
          <div className="absolute bottom-24 right-3 flex flex-col gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-11 h-11 rounded-full bg-[#2A3038]" />
            ))}
          </div>
          <div className="absolute bottom-20 left-3 right-20">
            <div className="h-3 bg-[#2A3038] rounded w-32 mb-2" />
            <div className="h-3 bg-[#2A3038] rounded w-48 mb-2" />
            <div className="h-2 bg-[#2A3038] rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!visibleVideos.length) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-5 bg-[#0F1216]"
        data-ocid="feed.empty_state"
      >
        <div className="w-20 h-20 rounded-full bg-[#1A1F26] flex items-center justify-center">
          <Compass size={36} className="text-[#8B95A3]" />
        </div>
        <p className="font-bold text-xl text-[#E9EEF5]">No videos yet</p>
        <p className="text-[#8B95A3] text-sm text-center px-8">
          Be the first to upload a video or follow more creators
        </p>
        <button
          type="button"
          onClick={() => setShowAuth(!isLoggedIn)}
          className="bg-[#22D3EE] text-black font-bold px-6 py-3 rounded-2xl"
          data-ocid="feed.empty.primary_button"
        >
          {isLoggedIn ? "Upload Video" : "Sign In"}
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <VideoScrollFeed
        videos={visibleVideos}
        onViewProfile={onViewProfile}
        onViewHashtag={onViewHashtag}
        savedIds={savedIds}
        onToggleSave={toggleSave}
        followedIds={followedIds}
        onToggleFollow={toggleFollow}
        pinnedIds={pinnedIds}
        onPinToggle={togglePin}
        onRemoveFromFeed={removeFromFeed}
        onEditSave={handleEditSave}
        currentUserPrincipal={currentUserPrincipal}
        feedActive={isActive}
        onDuet={onDuet}
      />

      {/* Story viewer */}
      {viewerStories && (
        <StoryViewer
          stories={viewerStories}
          creatorId={viewerCreatorId}
          onClose={() => setViewerStories(null)}
        />
      )}

      {/* Story creator */}
      {showStoryCreator && (
        <StoryCreator
          onClose={() => setShowStoryCreator(false)}
          onCreated={() => {
            setShowStoryCreator(false);
            setStoryRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Unused StoriesBar kept for compatibility */}
      <div className="hidden">
        <StoriesBar
          refreshKey={_storyRefreshKey}
          onOpenViewer={(stories, creatorId) => {
            setViewerStories(stories);
            _setViewerCreatorId(creatorId);
          }}
          onOpenCreator={() => setShowStoryCreator(true)}
        />
      </div>
    </div>
  );
}
