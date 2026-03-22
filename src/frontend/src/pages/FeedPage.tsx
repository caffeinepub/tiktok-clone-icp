import {
  Heart,
  MessageCircle,
  Music,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthModal from "../components/AuthModal";
import CommentsDrawer from "../components/CommentsDrawer";
import { useBackend } from "../hooks/useBackend";
import {
  SAMPLE_PROFILES,
  SAMPLE_VIDEOS,
  type Video,
  formatCount,
} from "../types/app";

function VideoCard({ video, isActive }: { video: Video; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    Math.floor(Math.random() * 50000) + 1000,
  );
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const lastTap = useRef(0);
  const { isLoggedIn } = useBackend();

  const profile = SAMPLE_PROFILES[video.creator] ?? {
    username: video.creator.slice(0, 8),
    avatarKey: `https://i.pravatar.cc/100?u=${video.creator}`,
    bio: "",
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {});
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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  const commentCount = Math.floor(Math.random() * 5000) + 100;
  const shareCount = Math.floor(Math.random() * 2000) + 50;

  return (
    <>
      <div
        className="relative w-full h-full flex items-center justify-center bg-black"
        onClick={handleDoubleTap}
        onKeyDown={(e) => e.key === " " && handleDoubleTap()}
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

        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart className="w-24 h-24 text-[#FF3B5C] fill-[#FF3B5C] animate-ping" />
          </div>
        )}

        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Right action rail */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={profile.avatarKey}
                alt={profile.username}
                className="w-12 h-12 rounded-full border-2 border-white object-cover"
              />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FF3B5C] flex items-center justify-center text-white text-xs font-bold">
                +
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Heart
                size={24}
                className={
                  liked ? "text-[#FF3B5C] fill-[#FF3B5C]" : "text-white"
                }
              />
            </div>
            <span className="text-xs font-semibold text-white">
              {formatCount(likeCount)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-white">
              {formatCount(commentCount)}
            </span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Share2 size={24} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-white">
              {formatCount(shareCount)}
            </span>
          </button>
          <div
            className="w-12 h-12 rounded-full border-2 border-white overflow-hidden animate-spin"
            style={{ animationDuration: "4s" }}
          >
            <img
              src={profile.avatarKey}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Caption overlay */}
        <div className="absolute bottom-20 left-3 right-16 z-10">
          <div className="flex items-center gap-2 mb-2">
            <img
              src={profile.avatarKey}
              alt=""
              className="w-8 h-8 rounded-full border border-white object-cover"
            />
            <span className="font-bold text-white text-sm">
              @{profile.username}
            </span>
            <span className="text-xs border border-white text-white px-2 py-0.5 rounded-full">
              Follow
            </span>
          </div>
          <p className="text-white text-sm leading-snug mb-1 line-clamp-2">
            {video.description}
          </p>
          <div className="flex items-center gap-1 text-white text-xs">
            <Music size={12} />
            <span>Original sound – {profile.username}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-3">
          <button type="button" onClick={togglePlay} className="text-white">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div
            className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer relative"
            onClick={handleSeek}
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
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="text-white"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
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

export default function FeedPage() {
  const [videos] = useState<Video[]>(SAMPLE_VIDEOS);
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
    >
      {videos.map((video, i) => (
        <div
          key={video.id}
          data-index={i}
          className="h-full w-full snap-start snap-always shrink-0"
        >
          <VideoCard video={video} isActive={i === activeIndex} />
        </div>
      ))}
    </div>
  );
}
