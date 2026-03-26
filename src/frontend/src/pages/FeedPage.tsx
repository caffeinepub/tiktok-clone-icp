import {
  Bookmark,
  Compass,
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
}

function VideoCard({
  video,
  isActive,
  onViewProfile,
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
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<bigint>(0n);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const lastTap = useRef(0);
  const { isLoggedIn, backend } = useBackend();
  const isSaved = savedIds.has(video.id);
  const creatorId =
    typeof video.creator === "object"
      ? (video.creator as { toString(): string }).toString()
      : String(video.creator);
  const isFollowed = followedIds.has(creatorId);
  const isPinned = pinnedIds.has(video.id);
  const isOwner = currentUserPrincipal === creatorId;

  // Load real like count and whether caller liked
  useEffect(() => {
    if (!backend) return;
    Promise.all([
      backend.getLikeCount(video.id),
      backend.didCallerLike(video.id),
    ])
      .then(([count, didLike]) => {
        setLikeCount(count);
        setLiked(didLike);
      })
      .catch(() => {});
  }, [backend, video.id]);

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

  const handleLike = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!backend) return;
    if (liked) {
      setLiked(false);
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

  const handleShare = () => {
    const url = `${window.location.origin}?v=${video.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
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
        className="relative w-full h-full flex items-center justify-center bg-black"
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
          preload="metadata"
        />

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

        {/* Top-right controls: 3-dot menu + mute */}
        <div className="absolute top-4 right-3 z-20 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(true);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="More options"
            data-ocid="video_options.open_modal_button"
          >
            <MoreVertical size={18} className="text-white" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
            aria-label="Toggle mute"
          >
            {muted ? (
              <VolumeX size={18} className="text-white" />
            ) : (
              <Volume2 size={18} className="text-white" />
            )}
          </button>
        </div>

        {/* Right sidebar actions */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
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
              {isFollowed ? "\u2713" : "+"}
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
              Comment
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
              src={video.creatorAvatar}
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
              onViewProfile(creatorId);
            }}
            className="flex items-center gap-2 mb-2"
          >
            <span className="font-bold text-white text-sm">
              @{video.creatorUsername}
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
              Original sound \u2013 {video.creatorUsername}
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
    </>
  );
}

interface VideoScrollFeedProps {
  videos: ResolvedVideo[];
  onViewProfile: (id: string) => void;
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
      { root: container, threshold: 0.6 },
    );
    const children = Array.from(container.querySelectorAll("[data-index]"));
    for (const el of children) observer.observe(el);
    return () => observer.disconnect();
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
            isActive={feedActive && i === activeIndex}
            onViewProfile={onViewProfile}
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
          />
        </div>
      ))}
    </div>
  );
}

export default function FeedPage({
  onViewProfile,
  isActive,
  onDuet,
  refreshKey = 0,
}: {
  onViewProfile: (id: string) => void;
  isActive: boolean;
  onDuet?: (videoId: string, videoUrl: string) => void;
  refreshKey?: number;
}) {
  const { backend, isLoggedIn, identity } = useBackend();
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
  const [storyRefreshKey, setStoryRefreshKey] = useState(0);
  const [viewerStories, setViewerStories] = useState<Story[] | null>(null);
  const [viewerCreatorId, setViewerCreatorId] = useState<string>("");
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const currentUserPrincipal = identity?.getPrincipal().toString() ?? null;

  // Load feed + followedIds simultaneously
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers reload
  useEffect(() => {
    if (!backend) return;
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
  }, [backend, identity, refreshKey]);

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

  return (
    <div className="relative h-full flex flex-col">
      {/* Stories bar */}
      <StoriesBar
        onOpenViewer={(stories, creatorId) => {
          setViewerStories(stories);
          setViewerCreatorId(creatorId);
        }}
        onOpenCreator={() => setShowStoryCreator(true)}
        refreshKey={storyRefreshKey}
      />
      <div className="relative flex-1 overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 bg-black"
            data-ocid="feed.loading_state"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
              <p className="text-[#8B95A3] text-sm">Loading feed...</p>
            </div>
          </div>
        )}

        {/* Empty state when logged in with no videos */}
        <AnimatePresence>
          {!loading && visibleVideos.length === 0 && (
            <motion.div
              key="empty-feed"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-4 px-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-ocid="feed.empty_state"
            >
              {!isLoggedIn ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <Heart size={36} className="text-[#FF3B5C]" />
                  </div>
                  <p className="text-white text-lg font-bold">
                    Log in to see your feed
                  </p>
                  <p className="text-white/60 text-sm">
                    Log in to see videos from creators you follow
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAuth(true)}
                    className="mt-2 px-6 py-2.5 bg-[#FF3B5C] text-white font-bold rounded-full text-sm active:opacity-80"
                    data-ocid="feed.login.primary_button"
                  >
                    Log In
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <Compass size={36} className="text-white/70" />
                  </div>
                  <p className="text-white text-lg font-bold">No videos yet</p>
                  <p className="text-white/60 text-sm">
                    Be the first to upload a video!
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video feed */}
        <VideoScrollFeed
          videos={visibleVideos}
          onViewProfile={onViewProfile}
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

        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

        {/* Story Viewer */}
        <AnimatePresence>
          {viewerStories && (
            <StoryViewer
              stories={viewerStories}
              creatorId={viewerCreatorId}
              onClose={() => setViewerStories(null)}
              onDeleted={() => setStoryRefreshKey((k) => k + 1)}
            />
          )}
        </AnimatePresence>

        {/* Story Creator */}
        <AnimatePresence>
          {showStoryCreator && (
            <StoryCreator
              onClose={() => setShowStoryCreator(false)}
              onCreated={() => {
                setStoryRefreshKey((k) => k + 1);
                setShowStoryCreator(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
