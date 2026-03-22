import {
  Bookmark,
  Heart,
  MessageCircle,
  Music,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AuthModal from "../components/AuthModal";
import CommentsDrawer from "../components/CommentsDrawer";
import { useBackend } from "../hooks/useBackend";
import {
  SAMPLE_PROFILES,
  SAMPLE_VIDEOS,
  type Video,
  formatCount,
} from "../types/app";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onViewProfile: (id: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  followedIds: Set<string>;
  onToggleFollow: (id: string) => void;
}

function VideoCard({
  video,
  isActive,
  onViewProfile,
  savedIds,
  onToggleSave,
  followedIds,
  onToggleFollow,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    Math.floor(Math.random() * 50000) + 5000,
  );
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const lastTap = useRef(0);
  const { isLoggedIn } = useBackend();
  const isSaved = savedIds.has(video.id);
  const isFollowed = followedIds.has(video.creator);

  const profile = SAMPLE_PROFILES[video.creator] ?? {
    username: video.creator.slice(0, 8),
    avatarKey: `https://i.pravatar.cc/100?u=${video.creator}`,
    bio: "",
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
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
  }, [isActive]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, []);

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
        setLikeCount((c) => c + 1);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 900);
      }
    }
    lastTap.current = now;
  }, [liked]);

  const handleLike = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setLiked((l) => !l);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleShare = () => {
    const url = `${window.location.origin}?v=${video.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Link copied!");
      })
      .catch(() => {
        toast.error("Could not copy link");
      });
  };

  const handleSave = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    onToggleSave(video.id);
    toast.success(isSaved ? "Removed from saved" : "Saved!");
  };

  const handleFollow = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    onToggleFollow(video.creator);
    toast.success(isFollowed ? "Unfollowed" : "Following!");
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  const commentCount = Math.floor(Math.random() * 5000) + 200;

  return (
    <>
      <div
        className="relative w-full h-full flex items-center justify-center bg-black"
        onClick={handleDoubleTap}
        onKeyDown={(e) => e.key === "Enter" && handleDoubleTap()}
      >
        <video
          ref={videoRef}
          src={video.videoKey}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          preload="metadata"
        />

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
              <Heart className="w-24 h-24 text-[#FF3B5C] fill-[#FF3B5C] drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/pause overlay */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Top right: mute toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
          aria-label="Toggle mute"
        >
          {muted ? (
            <VolumeX size={18} className="text-white" />
          ) : (
            <Volume2 size={18} className="text-white" />
          )}
        </button>

        {/* Right sidebar actions */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
          {/* Creator avatar + follow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(video.creator);
            }}
            className="relative flex flex-col items-center"
            data-ocid="feed.profile.button"
          >
            <img
              src={profile.avatarKey}
              alt={profile.username}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                isFollowed ? "bg-[#22D3EE]" : "bg-[#FF3B5C]"
              }`}
            >
              {isFollowed ? "✓" : "+"}
            </button>
          </button>

          {/* Like */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex flex-col items-center gap-1"
            data-ocid="feed.like.button"
          >
            <motion.div
              animate={liked ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center"
            >
              <Heart
                size={26}
                className={
                  liked ? "text-[#FF3B5C] fill-[#FF3B5C]" : "text-white"
                }
              />
            </motion.div>
            <span className="text-xs font-bold text-white drop-shadow">
              {formatCount(likeCount)}
            </span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-1"
            data-ocid="feed.comment.button"
          >
            <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
              <MessageCircle size={26} className="text-white" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">
              {formatCount(commentCount)}
            </span>
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="flex flex-col items-center gap-1"
            data-ocid="feed.save.button"
          >
            <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
              <Bookmark
                size={26}
                className={
                  isSaved ? "text-[#22D3EE] fill-[#22D3EE]" : "text-white"
                }
              />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">
              Save
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="flex flex-col items-center gap-1"
            data-ocid="feed.share.button"
          >
            <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
              <Share2 size={26} className="text-white" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">
              Share
            </span>
          </button>

          {/* Spinning disc */}
          <div
            className="w-11 h-11 rounded-full border-2 border-white overflow-hidden animate-spin"
            style={{ animationDuration: "5s" }}
          >
            <img
              src={profile.avatarKey}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Caption overlay */}
        <div className="absolute bottom-16 left-3 right-20 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(video.creator);
            }}
            className="flex items-center gap-2 mb-2"
          >
            <span className="font-bold text-white text-sm">
              @{profile.username}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              className={`text-xs border px-2 py-0.5 rounded-full ${
                isFollowed
                  ? "border-[#22D3EE] text-[#22D3EE]"
                  : "border-white text-white"
              }`}
            >
              {isFollowed ? "Following" : "Follow"}
            </button>
          </button>
          <p className="text-white text-sm leading-snug mb-1 line-clamp-2">
            {video.description}
          </p>
          <div className="flex items-center gap-1 text-white text-xs">
            <Music size={11} />
            <span className="truncate">
              Original sound – {profile.username}
            </span>
          </div>
        </div>

        {/* Progress bar + play control */}
        <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="text-white shrink-0"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div
            className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer relative"
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
              className="h-full bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <CommentsDrawer
        open={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
      />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

export default function FeedPage({
  onViewProfile,
}: { onViewProfile: (id: string) => void }) {
  const [videos] = useState<Video[]>(SAMPLE_VIDEOS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFollow = (id: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      { root: container, threshold: 0.6 },
    );
    const children = Array.from(container.querySelectorAll("[data-index]"));
    for (const el of children) observer.observe(el);
    return () => observer.disconnect();
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: "none" }}
      data-ocid="feed.list"
    >
      {videos.map((video, i) => (
        <div
          key={video.id}
          data-index={i}
          className="h-full w-full snap-start snap-always shrink-0"
          data-ocid={`feed.item.${i + 1}`}
        >
          <VideoCard
            video={video}
            isActive={i === activeIndex}
            onViewProfile={onViewProfile}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            followedIds={followedIds}
            onToggleFollow={toggleFollow}
          />
        </div>
      ))}
    </div>
  );
}
