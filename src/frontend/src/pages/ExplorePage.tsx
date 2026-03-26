import { Eye, Play, Search, TrendingUp, User } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

const TRENDING_TAGS = [
  "#fyp",
  "#viral",
  "#animation",
  "#nature",
  "#funny",
  "#art",
  "#music",
  "#dance",
  "#food",
  "#travel",
];

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

const formatViews = (v: bigint) => {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export default function ExplorePage({
  onViewProfile,
  onViewPost,
  refreshKey = 0,
}: {
  onViewProfile: (id: string) => void;
  onViewPost: (postId: string) => void;
  refreshKey?: number;
}) {
  const { backend } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const imageStorageClient = useStorageClient("images");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GridItem[]>([]);
  const [users, setUsers] = useState<ResolvedUser[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load initial feed: photos + videos interleaved — re-fetches when refreshKey changes
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

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216]">
      {/* Search bar */}
      <div className="sticky top-0 bg-[#0F1216]/95 backdrop-blur px-4 pt-4 pb-3 z-10">
        <div className="flex items-center gap-2 bg-[#1A1F26] rounded-2xl px-4 py-3 border border-[#2A3038] focus-within:border-[#22D3EE] transition-colors">
          <Search size={18} className="text-[#8B95A3] shrink-0" />
          <input
            className="flex-1 bg-transparent text-[#E9EEF5] placeholder-[#8B95A3] outline-none text-sm"
            placeholder="Search posts, videos, people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-ocid="explore.search_input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[#8B95A3] text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

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
                  className="shrink-0 relative w-24 h-36 rounded-xl overflow-hidden bg-[#1A1F26]"
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
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag.slice(1))}
                className="bg-[#1A1F26] border border-[#2A3038] text-[#22D3EE] text-xs px-3 py-1.5 rounded-full font-medium"
                data-ocid="explore.tag.button"
              >
                {tag}
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
                className="flex items-center gap-3 w-full"
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
        ) : items.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5" data-ocid="explore.list">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative aspect-square bg-[#1A1F26] overflow-hidden cursor-pointer"
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
              {query ? `No results for "${query}"` : "Nothing here yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
