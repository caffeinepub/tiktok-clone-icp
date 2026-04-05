import {
  Eye,
  Flame,
  Play,
  Radio,
  Search,
  Star,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

const TRENDING_TAGS = [
  "#fyp",
  "#viral",
  "#dance",
  "#comedy",
  "#trending2026",
  "#vibeflow",
  "#music",
  "#sports",
  "#gaming",
  "#art",
];

const TAG_GRADIENTS = [
  "from-[#FF3B5C] to-[#FF8C69]",
  "from-[#22D3EE] to-[#3B82F6]",
  "from-[#A855F7] to-[#EC4899]",
  "from-[#F59E0B] to-[#EF4444]",
  "from-[#10B981] to-[#22D3EE]",
  "from-[#FF3B5C] to-[#A855F7]",
  "from-[#F59E0B] to-[#A855F7]",
  "from-[#22D3EE] to-[#10B981]",
  "from-[#3B82F6] to-[#22D3EE]",
  "from-[#FF8C69] to-[#FF3B5C]",
];

// Seeded fake post counts so they don't re-render
const TAG_POST_COUNTS = TRENDING_TAGS.map((tag, i) => {
  const seed = tag.split("").reduce((a, c) => a + c.charCodeAt(0), i * 17);
  const count = (seed % 900) + 100;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`;
});

const LIVE_ROOMS = [
  {
    username: "vibemaster",
    viewers: "2.4K",
    bg: "from-[#FF3B5C] to-[#FF8C69]",
  },
  { username: "stargazer", viewers: "891", bg: "from-[#22D3EE] to-[#3B82F6]" },
  {
    username: "neon_dancer",
    viewers: "5.1K",
    bg: "from-[#A855F7] to-[#EC4899]",
  },
  { username: "beatmaker", viewers: "1.2K", bg: "from-[#F59E0B] to-[#10B981]" },
];

interface LiveRoomOverlayProps {
  room: (typeof LIVE_ROOMS)[0];
  onClose: () => void;
}

function LiveRoomOverlay({ room, onClose }: LiveRoomOverlayProps) {
  const [chatMessages] = useState([
    { user: "user1", text: "this is 🔥" },
    { user: "creator_fan", text: "love your content!" },
    { user: "nightowl", text: "❤️❤️❤️" },
    { user: "vibe99", text: "first time here, amazing" },
    { user: "music_lover", text: "drop the beat!" },
  ]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-ocid="live_room.modal"
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${room.bg}`} />
      <div className="absolute inset-0 bg-black/40" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#FF3B5C] rounded-full px-2.5 py-1">
            <motion.div
              className="w-2 h-2 rounded-full bg-white"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-white text-xs font-black">LIVE</span>
          </div>
          <div className="bg-black/50 rounded-full px-3 py-1">
            <span className="text-white text-xs font-semibold">
              {room.viewers} watching
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          data-ocid="live_room.close_button"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Creator info */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-2">
        <img
          src={`https://i.pravatar.cc/100?u=${room.username}`}
          alt=""
          className="w-12 h-12 rounded-full border-2 border-white object-cover"
        />
        <div>
          <p className="text-white font-bold">@{room.username}</p>
          <p className="text-white/70 text-xs">Live streaming</p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Chat sidebar */}
      <div className="relative z-10 px-4 pb-2 space-y-1.5 max-h-[35vh] overflow-y-auto">
        {chatMessages.map((msg, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static
          <div key={i} className="flex items-start gap-2">
            <span className="text-[#22D3EE] text-xs font-semibold shrink-0">
              @{msg.user}
            </span>
            <span className="text-white/90 text-xs">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-8 flex items-center gap-3">
        <div className="flex-1 bg-white/15 backdrop-blur rounded-full px-4 py-2.5 border border-white/20">
          <span className="text-white/50 text-sm">Say something...</span>
        </div>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-[#22D3EE] flex items-center justify-center"
          data-ocid="live_room.send.button"
        >
          <span className="text-black text-base">👍</span>
        </button>
      </div>
    </motion.div>
  );
}

interface ResolvedPost {
  id: string;
  creator: string;
  creatorUsername: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
  createdAt: bigint;
  type: "photo";
}

interface ResolvedVideo {
  id: string;
  creator: string;
  creatorUsername: string;
  thumbUrl: string;
  title: string;
  views: bigint;
  type: "video";
}

type GridItem = ResolvedPost | ResolvedVideo;

interface ResolvedUser {
  principal: string;
  username: string;
  bio: string;
  avatarUrl: string;
}

type ExploreTab = "for-you" | "following" | "trending" | "popular";
type FilterType = "all" | "video" | "photo";

const EXPLORE_TABS: Array<{
  id: ExploreTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "for-you", label: "For You", icon: <Star size={13} /> },
  { id: "following", label: "Following", icon: <Users size={13} /> },
  { id: "trending", label: "Trending", icon: <TrendingUp size={13} /> },
  { id: "popular", label: "Popular", icon: <Flame size={13} /> },
];

const formatViews = (v: bigint) => {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export default function ExplorePage({
  onViewProfile,
  onViewPost,
  onViewHashtag,
  refreshKey = 0,
}: {
  onViewProfile: (id: string) => void;
  onViewPost: (postId: string) => void;
  onViewHashtag?: (tag: string) => void;
  refreshKey?: number;
}) {
  const { backend, identity } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const imageStorageClient = useStorageClient("images");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GridItem[]>([]);
  const [users, setUsers] = useState<ResolvedUser[]>([]);
  const [exploreTab, setExploreTab] = useState<ExploreTab>("for-you");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [topCreators, setTopCreators] = useState<
    Array<{
      principal: string;
      username: string;
      avatarUrl: string;
      followerCount: bigint;
    }>
  >([]);
  const [autocompleteResults, setAutocompleteResults] = useState<
    Array<{ type: "user" | "hashtag"; label: string; sub: string }>
  >([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [liveRoom, setLiveRoom] = useState<(typeof LIVE_ROOMS)[0] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveImageUrl = async (key: string, id: string): Promise<string> => {
    if (!key) return `https://picsum.photos/seed/${id}/400/400`;
    if (key.startsWith("sha256:") && imageStorageClient) {
      try {
        return await imageStorageClient.getDirectURL(key);
      } catch {}
    }
    return key;
  };

  const resolveThumbUrl = async (key: string, id: string): Promise<string> => {
    if (!key) return `https://picsum.photos/seed/${id}/400/700`;
    if (key.startsWith("sha256:") && thumbStorageClient) {
      try {
        return await thumbStorageClient.getDirectURL(key);
      } catch {}
    }
    return key;
  };

  const getCreatorUsername = async (creatorPrincipal: any): Promise<string> => {
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const pStr =
        typeof creatorPrincipal === "object"
          ? creatorPrincipal.toString()
          : String(creatorPrincipal);
      const opt = await backend!.getProfile(Principal.fromText(pStr));
      if (opt.__kind__ === "Some") return opt.value.username;
      return pStr.slice(0, 8);
    } catch {
      return "...";
    }
  };

  // Load followedIds
  useEffect(() => {
    if (!backend || !identity) return;
    backend
      .getFollowing(identity.getPrincipal())
      .then((principals) => {
        setFollowedIds(
          new Set(
            (principals as any[]).map((p) =>
              typeof p === "object" ? p.toString() : String(p),
            ),
          ),
        );
      })
      .catch(() => {});
  }, [backend, identity]);

  // Load top creators for leaderboard
  // biome-ignore lint/correctness/useExhaustiveDependencies: storage clients stable
  useEffect(() => {
    if (!backend) return;
    const loadLeaderboard = async () => {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const allUsers = await backend.getAllUsers().catch(() => []);
        const withStats = await Promise.allSettled(
          (allUsers as any[]).slice(0, 15).map(async (u) => {
            const pStr =
              typeof u.principal === "object"
                ? u.principal.toString()
                : String(u.principal);
            const stats = await backend
              .getUserStats(Principal.fromText(pStr))
              .catch(() => ({ followerCount: 0n }));
            let avatarUrl =
              u.avatarKey || `https://i.pravatar.cc/100?u=${pStr}`;
            if (thumbStorageClient && avatarUrl.startsWith("sha256:")) {
              try {
                avatarUrl = await thumbStorageClient.getDirectURL(avatarUrl);
              } catch {}
            }
            return {
              principal: pStr,
              username: u.username,
              avatarUrl,
              followerCount: (stats as any).followerCount ?? 0n,
            };
          }),
        );
        const resolved = withStats
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<any>).value)
          .sort((a, b) => Number(b.followerCount - a.followerCount))
          .slice(0, 5);
        setTopCreators(resolved);
      } catch {}
    };
    loadLeaderboard();
  }, [backend]);

  // Load initial feed: photos + videos interleaved
  // biome-ignore lint/correctness/useExhaustiveDependencies: storage clients are stable; refreshKey intentionally triggers reload
  useEffect(() => {
    if (!backend) return;
    setLoading(true);

    Promise.all([
      backend.getPhotoPosts(0n, 12n).catch(() => []),
      backend.getFeed(0n, 12n).catch(() => []),
    ])
      .then(async ([posts, videos]) => {
        const resolvedPosts: ResolvedPost[] = await Promise.all(
          (posts as any[]).map(async (p) => {
            const creatorUsername = await getCreatorUsername(p.creator);
            const imageUrl = await resolveImageUrl(p.imageKey, p.id);
            return {
              id: p.id,
              creator:
                typeof p.creator === "object"
                  ? p.creator.toString()
                  : String(p.creator),
              creatorUsername,
              imageUrl,
              caption: p.caption || "",
              hashtags: p.hashtags || [],
              createdAt: p.createdAt,
              type: "photo" as const,
            };
          }),
        );

        const resolvedVideos: ResolvedVideo[] = await Promise.all(
          (videos as any[]).map(async (v) => {
            const creatorUsername = await getCreatorUsername(v.creator);
            const thumbUrl = await resolveThumbUrl(v.thumbnailKey, v.id);
            return {
              id: v.id,
              creator:
                typeof v.creator === "object"
                  ? v.creator.toString()
                  : String(v.creator),
              creatorUsername,
              thumbUrl,
              title: v.title || "",
              views: v.views || 0n,
              type: "video" as const,
            };
          }),
        );

        // Interleave posts and videos
        const interleaved: GridItem[] = [];
        const maxLen = Math.max(resolvedPosts.length, resolvedVideos.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < resolvedPosts.length) interleaved.push(resolvedPosts[i]);
          if (i < resolvedVideos.length) interleaved.push(resolvedVideos[i]);
        }
        setItems(interleaved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, refreshKey]);

  // Debounced search
  // biome-ignore lint/correctness/useExhaustiveDependencies: storage clients are stable
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setUsers([]);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (!backend) return;
      setLoading(true);
      try {
        const [rawVideos, rawUsers, rawPosts] = await Promise.all([
          backend.searchVideos(query).catch(() => []),
          backend.searchUsers(query).catch(() => []),
          backend.searchPosts(query).catch(() => []),
        ]);

        const resolvedVideos: ResolvedVideo[] = await Promise.all(
          (rawVideos as any[]).map(async (v) => {
            const creatorUsername = await getCreatorUsername(v.creator);
            const thumbUrl = await resolveThumbUrl(v.thumbnailKey, v.id);
            return {
              id: v.id,
              creator: v.creator.toString(),
              creatorUsername,
              thumbUrl,
              title: v.title,
              views: v.views || 0n,
              type: "video" as const,
            };
          }),
        );

        const resolvedPosts: ResolvedPost[] = await Promise.all(
          (rawPosts as any[]).map(async (p) => {
            const creatorUsername = await getCreatorUsername(p.creator);
            const imageUrl = await resolveImageUrl(p.imageKey, p.id);
            return {
              id: p.id,
              creator: p.creator.toString(),
              creatorUsername,
              imageUrl,
              caption: p.caption,
              hashtags: p.hashtags || [],
              createdAt: p.createdAt,
              type: "photo" as const,
            };
          }),
        );

        const mixed: GridItem[] = [];
        const maxLen = Math.max(resolvedPosts.length, resolvedVideos.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < resolvedPosts.length) mixed.push(resolvedPosts[i]);
          if (i < resolvedVideos.length) mixed.push(resolvedVideos[i]);
        }
        setItems(mixed);

        setUsers(
          (rawUsers as any[]).map((u) => {
            const pStr =
              typeof u.principal === "object"
                ? u.principal.toString()
                : String(u.principal);
            return {
              principal: pStr,
              username: u.username,
              bio: u.bio,
              avatarUrl: u.avatarKey || `https://i.pravatar.cc/100?u=${pStr}`,
            };
          }),
        );
      } catch {}
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, backend]);

  // Autocomplete
  useEffect(() => {
    if (acDebounceRef.current) clearTimeout(acDebounceRef.current);
    if (!query.trim() || query.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }
    acDebounceRef.current = setTimeout(async () => {
      if (!backend) return;
      try {
        const [rawUsers, rawVideos] = await Promise.all([
          backend.searchUsers(query).catch(() => []),
          backend.searchVideos(query).catch(() => []),
        ]);
        const results: Array<{
          type: "user" | "hashtag";
          label: string;
          sub: string;
        }> = [];
        for (const u of (rawUsers as any[]).slice(0, 3)) {
          results.push({
            type: "user",
            label: `@${u.username}`,
            sub: u.bio?.slice(0, 30) || "",
          });
        }
        // Extract hashtags from videos
        const tagSet = new Set<string>();
        for (const v of (rawVideos as any[]).slice(0, 5)) {
          for (const tag of v.hashtags || []) {
            if (tag.toLowerCase().includes(query.toLowerCase()))
              tagSet.add(tag);
          }
        }
        for (const tag of Array.from(tagSet).slice(0, 3)) {
          results.push({ type: "hashtag", label: `#${tag}`, sub: "Trending" });
        }
        setAutocompleteResults(results.slice(0, 5));
        setShowAutocomplete(results.length > 0);
      } catch {}
    }, 200);
    return () => {
      if (acDebounceRef.current) clearTimeout(acDebounceRef.current);
    };
  }, [query, backend]);

  // Filter/sort items based on active tab + filterType
  const displayItems = useMemo(() => {
    let base = (() => {
      if (query.trim()) return items;
      switch (exploreTab) {
        case "following":
          return items.filter((i) => followedIds.has(i.creator));
        case "trending":
        case "popular":
          return [...items].sort(
            (a, b) =>
              Number((b as ResolvedVideo).views ?? 0n) -
              Number((a as ResolvedVideo).views ?? 0n),
          );
        default:
          return items;
      }
    })();

    if (filterType === "video") base = base.filter((i) => i.type === "video");
    else if (filterType === "photo")
      base = base.filter((i) => i.type === "photo");
    return base;
  }, [items, exploreTab, followedIds, query, filterType]);

  // Top users for "Creators to Follow" row
  const topUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: { principal: string; username: string; avatarUrl: string }[] =
      [];
    for (const item of items) {
      if (!seen.has(item.creator)) {
        seen.add(item.creator);
        result.push({
          principal: item.creator,
          username: item.creatorUsername,
          avatarUrl: `https://i.pravatar.cc/100?u=${item.creator}`,
        });
        if (result.length >= 8) break;
      }
    }
    return result;
  }, [items]);

  const toggleFollow = (principal: string) => {
    if (!backend || !identity) return;
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(principal)) {
        next.delete(principal);
        import("@icp-sdk/core/principal").then(({ Principal }) => {
          backend.unfollowUser(Principal.fromText(principal)).catch(() => {});
        });
      } else {
        next.add(principal);
        import("@icp-sdk/core/principal").then(({ Principal }) => {
          backend.followUser(Principal.fromText(principal)).catch(() => {});
        });
      }
      return next;
    });
  };

  const RANK_LABELS = ["🥇", "🥈", "🥉", "4th", "5th"];

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216]">
      {/* Search bar */}
      <div className="sticky top-0 bg-[#0F1216]/95 backdrop-blur px-4 pt-4 pb-0 z-10">
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#1A1F26] rounded-2xl px-4 py-3 border border-[#2A3038] focus-within:border-[#22D3EE] transition-colors mb-3">
            <Search size={18} className="text-[#8B95A3] shrink-0" />
            <input
              className="flex-1 bg-transparent text-[#E9EEF5] placeholder-[#8B95A3] outline-none text-sm"
              placeholder="Search posts, videos, people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              data-ocid="explore.search_input"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setShowAutocomplete(false);
                }}
                className="text-[#8B95A3] text-sm"
              >
                ×
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          <AnimatePresence>
            {showAutocomplete && autocompleteResults.length > 0 && (
              <motion.div
                className="absolute left-0 right-0 top-full mt-1 bg-[#1A1F26] border border-[#2A3038] rounded-2xl overflow-hidden z-20 shadow-xl"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                data-ocid="explore.autocomplete.dropdown"
              >
                {autocompleteResults.map((result, i) => (
                  <button
                    key={`${result.type}-${result.label}`}
                    type="button"
                    onMouseDown={() => {
                      if (result.type === "hashtag") {
                        const tag = result.label.slice(1);
                        onViewHashtag?.(tag);
                      } else {
                        setQuery(result.label.slice(1));
                      }
                      setShowAutocomplete(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-[#2A3038] transition-colors ${
                      i > 0 ? "border-t border-[#2A3038]" : ""
                    }`}
                    data-ocid={`explore.autocomplete.item.${i + 1}`}
                  >
                    <span className="text-lg">
                      {result.type === "user" ? "👤" : "#"}
                    </span>
                    <div className="text-left">
                      <p className="text-[#E9EEF5] text-sm font-semibold">
                        {result.label}
                      </p>
                      {result.sub && (
                        <p className="text-[#8B95A3] text-xs">{result.sub}</p>
                      )}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trending hashtag pills row */}
        {!query.trim() && (
          <div className="flex gap-2 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {TRENDING_TAGS.map((tag, i) => (
              <button
                key={tag}
                type="button"
                onClick={() => onViewHashtag?.(tag.slice(1))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 text-white bg-gradient-to-r ${TAG_GRADIENTS[i % TAG_GRADIENTS.length]} active:scale-95 transition-transform shadow-sm`}
                data-ocid="explore.hashtag.button"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Feed tabs */}
        {!query.trim() && (
          <div className="flex gap-2 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {EXPLORE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setExploreTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                  exploreTab === tab.id
                    ? "bg-[#22D3EE] text-black"
                    : "bg-[#1A1F26] border border-[#2A3038] text-[#8B95A3]"
                }`}
                data-ocid={`explore.${tab.id}.tab`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Creators to Follow row */}
      {!query.trim() && topUsers.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={13} className="text-[#22D3EE]" />
            <span className="text-[#A6B0BC] text-[11px] uppercase tracking-widest font-semibold">
              Creators to Follow
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
            {topUsers.map((u) => (
              <div
                key={u.principal}
                className="flex flex-col items-center gap-2 shrink-0 w-20"
              >
                <button
                  type="button"
                  onClick={() => onViewProfile(u.principal)}
                  className="active:scale-90 transition-transform"
                >
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#2A3038]"
                  />
                </button>
                <p className="text-[10px] text-[#E9EEF5] font-semibold truncate w-full text-center">
                  @{u.username}
                </p>
                <button
                  type="button"
                  onClick={() => toggleFollow(u.principal)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-90 ${
                    followedIds.has(u.principal)
                      ? "bg-[#2A3038] text-[#8B95A3]"
                      : "bg-[#22D3EE] text-black"
                  }`}
                  data-ocid="explore.follow.button"
                >
                  {followedIds.has(u.principal) ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Creators Leaderboard */}
      {!query.trim() && topCreators.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-[#FFD700]" />
            <span className="text-[#A6B0BC] text-[11px] uppercase tracking-widest font-semibold">
              Top Creators
            </span>
          </div>
          <div className="bg-[#1A1F26] rounded-2xl border border-[#2A3038] overflow-hidden">
            {topCreators.map((creator, i) => (
              <div
                key={creator.principal}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? "border-t border-[#2A3038]" : ""
                }`}
                data-ocid={`explore.leaderboard.item.${i + 1}`}
              >
                <span className="w-6 text-base shrink-0">{RANK_LABELS[i]}</span>
                <button
                  type="button"
                  onClick={() => onViewProfile(creator.principal)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <img
                    src={creator.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-[#2A3038] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#E9EEF5] text-sm font-semibold truncate">
                      @{creator.username}
                    </p>
                    <p className="text-[#8B95A3] text-xs">
                      {formatViews(creator.followerCount)} followers
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFollow(creator.principal)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${
                    followedIds.has(creator.principal)
                      ? "bg-[#2A3038] text-[#8B95A3]"
                      : "bg-[#22D3EE] text-black"
                  }`}
                  data-ocid={`explore.leaderboard.follow.button.${i + 1}`}
                >
                  {followedIds.has(creator.principal) ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Now row */}
      {!query.trim() && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={13} className="text-[#FF3B5C]" />
            <span className="text-[#A6B0BC] text-[11px] uppercase tracking-widest font-semibold">
              Live Now
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {LIVE_ROOMS.map((u) => (
              <button
                key={u.username}
                type="button"
                onClick={() => setLiveRoom(u)}
                className="relative shrink-0 w-20 h-28 rounded-2xl overflow-hidden bg-[#1A1F26] cursor-pointer active:scale-95 transition-transform"
                data-ocid="explore.live.button"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${u.bg} opacity-70`}
                />
                <img
                  src={`https://i.pravatar.cc/200?u=${u.username}`}
                  alt=""
                  className="w-full h-full object-cover mix-blend-overlay"
                />
                {/* LIVE badge */}
                <div className="absolute top-2 left-1.5 flex items-center gap-1 bg-[#FF3B5C] rounded-full px-1.5 py-0.5">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-white"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                  <span className="text-white text-[8px] font-black">LIVE</span>
                </div>
                <div className="absolute bottom-1.5 left-0 right-0 text-center">
                  <p className="text-white text-[9px] font-bold truncate px-1">
                    @{u.username}
                  </p>
                  <p className="text-white/70 text-[8px]">
                    {u.viewers} watching
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills */}
      {!query.trim() && (
        <div className="px-4 mb-4">
          <div className="flex gap-2">
            {(["all", "video", "photo"] as FilterType[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 capitalize ${
                  filterType === f
                    ? "bg-[#22D3EE] text-black"
                    : "bg-[#1A1F26] border border-[#2A3038] text-[#8B95A3]"
                }`}
                data-ocid={`explore.filter.${f}.tab`}
              >
                {f === "all" ? "All" : f === "video" ? "Videos" : "Photos"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Most Viewed */}
      {!query.trim() && items.some((i) => i.type === "video") && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={13} className="text-[#FF3B5C]" />
            <span className="text-[#A6B0BC] text-[11px] uppercase tracking-widest font-semibold">
              Most Viewed
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
            {[...items]
              .filter((i) => i.type === "video")
              .sort((a, b) =>
                Number((b as ResolvedVideo).views - (a as ResolvedVideo).views),
              )
              .slice(0, 5)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewProfile(item.creator)}
                  className="shrink-0 relative w-24 h-36 rounded-xl overflow-hidden bg-[#1A1F26] active:scale-95 transition-transform"
                >
                  <img
                    src={(item as ResolvedVideo).thumbUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-0.5">
                    <Eye size={9} className="text-white" />
                    <span className="text-white text-[9px] font-bold">
                      {formatViews((item as ResolvedVideo).views)}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Trending tags */}
      {!query.trim() && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-[#22D3EE]" />
            <span className="text-[#A6B0BC] text-[11px] uppercase tracking-widest font-semibold">
              Trending
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TAGS.map((tag, idx) => (
              <button
                key={tag}
                type="button"
                onClick={() => onViewHashtag?.(tag.slice(1))}
                className="bg-[#1A1F26] border border-[#2A3038] text-[#22D3EE] text-xs px-3 py-1.5 rounded-full font-medium active:scale-95 transition-transform"
                data-ocid="explore.tag.button"
              >
                {tag}{" "}
                <span className="text-[#8B95A3] font-normal">
                  &middot; {TAG_POST_COUNTS[idx]} posts
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User results */}
      {users.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[#A6B0BC] text-[11px] uppercase tracking-widest font-semibold mb-2">
            Accounts
          </p>
          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user.principal}
                type="button"
                onClick={() => onViewProfile(user.principal)}
                className="flex items-center gap-3 w-full active:opacity-70 transition-opacity"
                data-ocid="explore.user.button"
              >
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-[#2A3038]"
                />
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">@{user.username}</p>
                  <p className="text-xs text-[#8B95A3] line-clamp-1">
                    {user.bio}
                  </p>
                </div>
                <User size={13} className="text-[#8B95A3]" />
              </button>
            ))}
          </div>
          <div className="h-px bg-[#2A3038] mt-4" />
        </div>
      )}

      {/* Grid */}
      <div className="px-2 pb-6">
        {loading ? (
          <div
            className="grid grid-cols-3 gap-0.5"
            data-ocid="explore.loading_state"
          >
            {["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((k) => (
              <div
                key={k}
                className="aspect-square bg-[#1A1F26] animate-pulse rounded-sm"
              />
            ))}
          </div>
        ) : displayItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5" data-ocid="explore.list">
            {displayItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative aspect-square bg-[#1A1F26] overflow-hidden cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                  if (item.type === "photo") onViewPost(item.id);
                  else onViewProfile(item.creator);
                }}
                data-ocid={`explore.item.${i + 1}`}
              >
                <img
                  src={item.type === "photo" ? item.imageUrl : item.thumbUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                      <Play
                        size={14}
                        className="text-white fill-white ml-0.5"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16" data-ocid="explore.empty_state">
            <p className="text-[#8B95A3]">
              {query
                ? `No results for \"${query}\"`
                : exploreTab === "following"
                  ? "Follow creators to see their content here"
                  : "Nothing here yet"}
            </p>
          </div>
        )}
      </div>

      {/* Live Room Overlay */}
      <AnimatePresence>
        {liveRoom && (
          <LiveRoomOverlay room={liveRoom} onClose={() => setLiveRoom(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
