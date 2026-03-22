import { Search } from "lucide-react";
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

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const filtered: Video[] = query.trim()
    ? SAMPLE_VIDEOS.filter(
        (v) =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          v.description.toLowerCase().includes(query.toLowerCase()) ||
          v.hashtags.some((h) => h.toLowerCase().includes(query.toLowerCase())),
      )
    : SAMPLE_VIDEOS;

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216]">
      <div className="sticky top-0 bg-[#0F1216] px-4 pt-4 pb-3 z-10">
        <div className="flex items-center gap-2 bg-[#1A1F26] rounded-2xl px-4 py-3 border border-[#2A3038]">
          <Search size={18} className="text-[#8B95A3] shrink-0" />
          <input
            className="flex-1 bg-transparent text-[#E9EEF5] placeholder-[#8B95A3] outline-none text-sm"
            placeholder="Search videos, users, hashtags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {!query.trim() && (
        <div className="px-4 mb-4">
          <p className="text-[#A6B0BC] text-xs mb-3 uppercase tracking-widest">
            Trending
          </p>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setQuery(tag.slice(1))}
                className="bg-[#1A1F26] border border-[#2A3038] text-[#22D3EE] text-sm px-3 py-1.5 rounded-full"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        {query.trim() && (
          <p className="text-[#A6B0BC] text-xs mb-3 uppercase tracking-widest">
            Results for "{query}"
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((video) => {
            const profile = SAMPLE_PROFILES[video.creator];
            return (
              <div
                key={video.id}
                className="relative rounded-xl overflow-hidden aspect-[9/16] bg-[#1A1F26]"
              >
                <img
                  src={video.thumbnailKey}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                  <p className="text-white text-xs font-semibold line-clamp-1">
                    {video.title}
                  </p>
                  {profile && (
                    <p className="text-[#A6B0BC] text-[10px]">
                      @{profile.username}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-[#8B95A3] py-12">No results found</p>
        )}
      </div>
    </div>
  );
}
