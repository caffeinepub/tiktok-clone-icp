import { ArrowLeft, Play } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

interface GridVideo {
  id: string;
  thumbUrl: string;
  views: bigint;
}

export default function HashtagPage({
  hashtag,
  onBack,
  onViewVideo,
}: {
  hashtag: string;
  onBack: () => void;
  onViewVideo?: (id: string) => void;
}) {
  const { backend } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend) return;
    setLoading(true);
    backend
      .searchVideos(hashtag)
      .then(async (rawVideos: any[]) => {
        const resolved: GridVideo[] = await Promise.all(
          rawVideos.map(async (v) => {
            let thumbUrl =
              v.thumbnailKey || `https://picsum.photos/seed/${v.id}/400/700`;
            if (thumbStorageClient && v.thumbnailKey?.startsWith("sha256:")) {
              try {
                thumbUrl = await thumbStorageClient.getDirectURL(
                  v.thumbnailKey,
                );
              } catch {}
            }
            return { id: v.id, thumbUrl, views: v.views || 0n };
          }),
        );
        setVideos(resolved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backend, hashtag, thumbStorageClient]);

  const formatViews = (v: bigint) => {
    const n = Number(v);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div
      className="h-full overflow-y-auto bg-[#0F1216]"
      data-ocid="hashtag.page"
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#0F1216]/95 backdrop-blur px-4 py-3 z-10 border-b border-[#2A3038]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#1A1F26] flex items-center justify-center"
            data-ocid="hashtag.back.button"
          >
            <ArrowLeft size={18} className="text-[#E9EEF5]" />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#E9EEF5]">#{hashtag}</h1>
            <p className="text-xs text-[#8B95A3]">
              {loading ? "Loading..." : `${videos.length} videos`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats banner */}
      <div className="px-4 py-4 border-b border-[#2A3038]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22D3EE] to-[#FF3B5C] flex items-center justify-center">
            <span className="text-white text-2xl font-black">#</span>
          </div>
          <div>
            <p className="text-[#E9EEF5] font-bold text-base">#{hashtag}</p>
            <p className="text-[#8B95A3] text-sm">
              {videos.length} videos found
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-2 py-3">
        {loading ? (
          <div
            className="grid grid-cols-3 gap-0.5"
            data-ocid="hashtag.loading_state"
          >
            {Array.from({ length: 9 }, (_, i) => i).map((i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                key={`sk-${i}`}
                className="aspect-square bg-[#1A1F26] animate-pulse rounded-sm"
              />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20" data-ocid="hashtag.empty_state">
            <p className="text-[#8B95A3] text-base">No videos for #{hashtag}</p>
            <p className="text-[#4A5568] text-sm mt-1">Be the first to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5" data-ocid="hashtag.list">
            {videos.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative aspect-square bg-[#1A1F26] overflow-hidden cursor-pointer active:scale-95 transition-transform"
                onClick={() => onViewVideo?.(v.id)}
                data-ocid={`hashtag.item.${i + 1}`}
              >
                <img
                  src={v.thumbUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                    <Play size={14} className="text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5">
                  <Play size={9} className="text-white fill-white" />
                  <span className="text-white text-[9px] font-bold">
                    {formatViews(v.views)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
