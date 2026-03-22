import {
  ArrowLeft,
  Grid3x3,
  Heart,
  Play,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import AuthModal from "../components/AuthModal";
import { useBackend } from "../hooks/useBackend";
import { SAMPLE_PROFILES, SAMPLE_VIDEOS, formatCount } from "../types/app";

export default function UserProfilePage({
  creatorId,
  onBack,
}: {
  creatorId: string;
  onBack: () => void;
}) {
  const { isLoggedIn } = useBackend();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const profile = SAMPLE_PROFILES[creatorId] ?? {
    principal: creatorId,
    username: creatorId.slice(0, 12),
    bio: "VibeFlow creator",
    avatarKey: `https://i.pravatar.cc/100?u=${creatorId}`,
    createdAt: BigInt(0),
  };

  const videos = SAMPLE_VIDEOS.filter((v) => v.creator === creatorId);
  const followerCount = 8432;
  const followingCount = 234;
  const totalLikes = videos.reduce(
    (acc, _) => acc + Math.floor(Math.random() * 20000 + 5000),
    0,
  );

  const handleFollow = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setIsFollowing((f) => !f);
    toast.success(
      isFollowing ? "Unfollowed" : `Following @${profile.username}!`,
    );
  };

  return (
    <div
      className="h-full overflow-y-auto bg-[#0F1216]"
      data-ocid="user_profile.page"
    >
      {/* Back button */}
      <div className="sticky top-0 bg-[#0F1216]/90 backdrop-blur-sm px-4 py-3 z-10 border-b border-[#2A3038]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[#E9EEF5]"
          data-ocid="user_profile.back.button"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">@{profile.username}</span>
        </button>
      </div>

      <div className="px-4 pt-5 pb-3">
        {/* Avatar + follow button */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-20 h-20 rounded-full border-2 border-[#22D3EE] overflow-hidden bg-[#1A1F26]">
            <img
              src={profile.avatarKey}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleFollow}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isFollowing
                ? "border border-[#2A3038] text-[#E9EEF5] bg-transparent"
                : "bg-[#22D3EE] text-black"
            }`}
            data-ocid="user_profile.follow.button"
          >
            {isFollowing ? (
              <>
                <UserCheck size={16} /> Following
              </>
            ) : (
              <>
                <UserPlus size={16} /> Follow
              </>
            )}
          </button>
        </div>

        <h2 className="font-bold text-xl">@{profile.username}</h2>
        <p className="text-[#A6B0BC] text-sm mb-4">{profile.bio}</p>

        {/* Stats */}
        <div className="flex gap-0 mb-4">
          {[
            { label: "Videos", value: videos.length || 2 },
            { label: "Followers", value: formatCount(followerCount) },
            { label: "Following", value: formatCount(followingCount) },
            { label: "Likes", value: formatCount(totalLikes) },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 text-center">
              <p className="font-bold text-lg leading-none">{stat.value}</p>
              <p className="text-[10px] text-[#8B95A3] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex border-b border-[#2A3038] px-4 mb-3">
        <div className="flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 border-[#22D3EE] text-[#22D3EE]">
          <Grid3x3 size={16} /> Videos
        </div>
        <div className="flex items-center gap-2 py-3 px-4 text-sm font-semibold text-[#8B95A3]">
          <Heart size={16} /> Liked
        </div>
      </div>

      {/* Videos grid */}
      <div className="px-3 pb-6">
        {(videos.length > 0 ? videos : SAMPLE_VIDEOS.slice(0, 3)).map(
          (v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1F26] inline-block"
              style={{ width: "calc(33.333% - 3px)", margin: "1.5px" }}
              data-ocid={`user_profile.videos.item.${i + 1}`}
            >
              <img
                src={v.thumbnailKey}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                <Play size={9} className="text-white fill-white" />
                <span className="text-white text-[9px] font-bold">
                  {formatCount(v.views)}
                </span>
              </div>
            </motion.div>
          ),
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
