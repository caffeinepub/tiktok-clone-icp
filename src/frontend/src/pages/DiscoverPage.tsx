import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, User } from "lucide-react";
import { useState } from "react";
import { SAMPLE_PROFILES, SAMPLE_VIDEOS, type Video } from "../types/app";

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

export default function DiscoverPage({
  onViewProfile,
}: { onViewProfile: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [loading] = useState(false);

  const filteredVideos: Video[] = query.trim()
    ? SAMPLE_VIDEOS.filter(
        (v) =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          v.description.toLowerCase().includes(query.toLowerCase()) ||
          v.hashtags.some((h) => h.toLowerCase().includes(query.toLowerCase())),
      )
    : SAMPLE_VIDEOS;

  const filteredUsers = query.trim()
    ? Object.values(SAMPLE_PROFILES).filter(
        (p) =>
          p.username.toLowerCase().includes(query.toLowerCase()) ||
          p.bio.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216]">
      {/* Search bar */}
      <div className="sticky top-0 bg-[#0F1216] px-4 pt-4 pb-3 z-10">
        <div className="flex items-center gap-2 bg-[#1A1F26] rounded-2xl px-4 py-3 border border-[#2A3038] focus-within:border-[#22D3EE] transition-colors">
          <Search size={18} className="text-[#8B95A3] shrink-0" />
          <input
            className="flex-1 bg-transparent text-[#E9EEF5] placeholder-[#8B95A3] outline-none text-sm"
            placeholder="Search videos, users, hashtags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-ocid="discover.search_input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[#8B95A3]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Trending section */}
      {!query.trim() && (
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[#22D3EE]" />
            <span className="text-[#A6B0BC] text-xs uppercase tracking-widest font-semibold">
              Trending
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setQuery(tag.slice(1))}
                className="bg-[#1A1F26] border border-[#2A3038] text-[#22D3EE] text-sm px-3 py-1.5 rounded-full font-medium hover:bg-[#2A3038] transition-colors"
                data-ocid="discover.tag.button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User results */}
      {filteredUsers.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-[#A6B0BC] text-xs uppercase tracking-widest font-semibold mb-3">
            Accounts
          </p>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <button
                type="button"
                key={user.principal}
                onClick={() => onViewProfile(user.principal)}
                className="flex items-center gap-3 w-full"
                data-ocid="discover.user.button"
              >
                <img
                  src={user.avatarKey}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border border-[#2A3038]"
                />
                <div className="text-left">
                  <p className="font-semibold text-sm">@{user.username}</p>
                  <p className="text-xs text-[#8B95A3] line-clamp-1">
                    {user.bio}
                  </p>
                </div>
                <User size={14} className="text-[#8B95A3] ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Videos grid */}
      <div className="px-4 pb-6">
        {query.trim() && (
          <p className="text-[#A6B0BC] text-xs uppercase tracking-widest font-semibold mb-3">
            Videos
            {filteredVideos.length > 0 ? ` (${filteredVideos.length})` : ""}
          </p>
        )}
        {loading ? (
          <div className="grid grid-cols-3 gap-1">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <Skeleton
                key={k}
                className="aspect-[9/16] rounded-lg bg-[#1A1F26]"
              />
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div
            className="grid grid-cols-3 gap-1"
            data-ocid="discover.video.list"
          >
            {filteredVideos.map((video, i) => {
              const profile = SAMPLE_PROFILES[video.creator];
              return (
                <div
                  key={video.id}
                  className="relative rounded-lg overflow-hidden aspect-[9/16] bg-[#1A1F26]"
                  data-ocid={`discover.video.item.${i + 1}`}
                >
                  <img
                    src={video.thumbnailKey}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2">
                    <p className="text-white text-[10px] font-semibold line-clamp-1">
                      {video.title}
                    </p>
                    {profile && (
                      <p className="text-[#A6B0BC] text-[9px]">
                        @{profile.username}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16" data-ocid="discover.empty_state">
            <p className="text-[#8B95A3]">
              {query ? `No results for "${query}"` : "No videos yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
