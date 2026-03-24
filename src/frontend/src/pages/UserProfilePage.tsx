import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Clock,
  Grid3x3,
  Heart,
  MessageCircle,
  Play,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import AuthModal from "../components/AuthModal";
import FollowListModal from "../components/FollowListModal";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";
import { formatCount } from "../types/app";

interface VideoItem {
  id: string;
  views: bigint;
  thumbUrl?: string;
}

export default function UserProfilePage({
  creatorId,
  onBack,
  onOpenChat,
}: {
  creatorId: string;
  onBack: () => void;
  onOpenChat?: (principal: string, username: string, avatarUrl: string) => void;
}) {
  const { isLoggedIn, identity, backend } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const [isFollowing, setIsFollowing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    username: string;
    bio: string;
    avatar: string;
  }>({ username: "", bio: "", avatar: "" });
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [followerCount, setFollowerCount] = useState(0n);
  const [followingCount, setFollowingCount] = useState(0n);
  const [totalLikes, setTotalLikes] = useState(0n);
  const [creatorPrincipal, setCreatorPrincipal] = useState<Principal | null>(
    null,
  );
  const [followerPrincipals, setFollowerPrincipals] = useState<Principal[]>([]);
  const [followingPrincipals, setFollowingPrincipals] = useState<Principal[]>(
    [],
  );
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    if (!backend || !creatorId) return;
    setLoading(true);

    const load = async () => {
      const { Principal } = await import("@icp-sdk/core/principal");
      let principal: Principal;
      try {
        principal = Principal.fromText(creatorId);
      } catch {
        principal = Principal.anonymous();
      }
      setCreatorPrincipal(principal);

      try {
        const [profileOpt, vids, stats, followers, following] =
          await Promise.all([
            backend.getProfile(principal),
            backend.getUserVideos(principal),
            backend.getUserStats(principal),
            backend.getFollowers(principal),
            backend.getFollowing(principal),
          ]);

        if (profileOpt.__kind__ === "Some") {
          const p = profileOpt.value;
          let avatar =
            p.avatarKey || `https://i.pravatar.cc/100?u=${creatorId}`;
          if (thumbStorageClient && p.avatarKey?.startsWith("sha256:")) {
            try {
              avatar = await thumbStorageClient.getDirectURL(p.avatarKey);
            } catch {}
          }
          setProfileData({ username: p.username, bio: p.bio, avatar });
        } else {
          setProfileData({
            username: creatorId.slice(0, 12),
            bio: "VibeFlow creator",
            avatar: `https://i.pravatar.cc/100?u=${creatorId}`,
          });
        }

        // Resolve video thumbs
        const resolvedVids: VideoItem[] = await Promise.all(
          (vids as any[]).map(async (v) => {
            let thumbUrl =
              v.thumbnailKey || `https://picsum.photos/seed/${v.id}/400/700`;
            if (thumbStorageClient && v.thumbnailKey?.startsWith("sha256:")) {
              try {
                thumbUrl = await thumbStorageClient.getDirectURL(
                  v.thumbnailKey,
                );
              } catch {}
            }
            return { id: v.id, views: v.views, thumbUrl };
          }),
        );
        setVideos(resolvedVids);

        setFollowerCount((stats as any).followerCount);
        setFollowingCount((stats as any).followingCount);

        // Estimate likes
        const likeCounts = await Promise.all(
          (vids as any[])
            .slice(0, 10)
            .map((v: any) => backend.getLikeCount(v.id).catch(() => 0n)),
        );
        setTotalLikes(
          likeCounts.reduce(
            (a: bigint, b: bigint | number) => a + BigInt(b),
            0n,
          ),
        );

        setFollowerPrincipals(followers as Principal[]);
        setFollowingPrincipals(following as Principal[]);

        // Check if current user follows this creator
        if (identity) {
          const myFollowing = await backend.getFollowing(
            identity.getPrincipal(),
          );
          const following = (myFollowing as Principal[]).some(
            (p) => p.toString() === creatorId,
          );
          setIsFollowing(following);
          if (!following) {
            try {
              const hasPending = await (backend as any).hasPendingFollowRequest(
                principal,
              );
              setPendingRequest(!!hasPending);
            } catch {}
          }
        }
      } catch {}
    };

    load().finally(() => setLoading(false));
  }, [backend, creatorId, identity, thumbStorageClient]);

  const handleFollow = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!backend || !creatorPrincipal) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((c) => (c > 0n ? c - 1n : 0n));
      backend.unfollowUser(creatorPrincipal).catch(() => {
        setIsFollowing(true);
        setFollowerCount((c) => c + 1n);
      });
    } else if (pendingRequest) {
      // Cancel the pending follow request
      setPendingRequest(false);
      (backend as any).cancelFollowRequest(creatorPrincipal).catch(() => {
        setPendingRequest(true);
      });
    } else {
      // Try to follow - if private account, backend auto-creates a follow request
      backend
        .followUser(creatorPrincipal)
        .then(() => {
          // Check if we actually followed or just sent a request
          return backend
            .getFollowing(creatorPrincipal)
            .then(() =>
              (backend as any).hasPendingFollowRequest(creatorPrincipal),
            )
            .then((pending: boolean) => {
              if (pending) {
                setPendingRequest(true);
              } else {
                setIsFollowing(true);
                setFollowerCount((c) => c + 1n);
              }
            });
        })
        .catch(() => {});
    }
  };

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center bg-[#0F1216]"
        data-ocid="user_profile.loading_state"
      >
        <div className="w-8 h-8 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
      </div>
    );
  }

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
          <span className="font-semibold">@{profileData.username}</span>
        </button>
      </div>

      <div className="px-4 pt-5 pb-3">
        {/* Avatar + action buttons */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-20 h-20 rounded-full border-2 border-[#22D3EE] overflow-hidden bg-[#1A1F26]">
            <img
              src={profileData.avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            {onOpenChat && (
              <button
                type="button"
                onClick={() =>
                  onOpenChat(
                    creatorId,
                    profileData.username,
                    profileData.avatar,
                  )
                }
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#FF3B5C] to-[#22D3EE] text-white px-4 py-2.5 rounded-xl font-bold text-sm"
                data-ocid="user_profile.message.primary_button"
              >
                <MessageCircle size={15} /> Message
              </button>
            )}
            <button
              type="button"
              onClick={handleFollow}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isFollowing
                  ? "border border-[#2A3038] text-[#E9EEF5] bg-transparent"
                  : pendingRequest
                    ? "border border-[#22D3EE]/50 text-[#22D3EE] bg-transparent"
                    : "bg-[#22D3EE] text-black"
              }`}
              data-ocid="user_profile.follow.button"
            >
              {isFollowing ? (
                <>
                  <UserCheck size={16} /> Following
                </>
              ) : pendingRequest ? (
                <>
                  <Clock size={16} /> Requested
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Follow
                </>
              )}
            </button>
          </div>
        </div>

        <h2 className="font-bold text-xl">@{profileData.username}</h2>
        <p className="text-[#A6B0BC] text-sm mb-4">{profileData.bio}</p>

        {/* Stats */}
        <div className="flex gap-0 mb-4">
          {[
            { label: "Videos", value: videos.length, onClick: undefined },
            {
              label: "Followers",
              value: formatCount(followerCount),
              onClick: () => setShowFollowers(true),
            },
            {
              label: "Following",
              value: formatCount(followingCount),
              onClick: () => setShowFollowing(true),
            },
            {
              label: "Likes",
              value: formatCount(totalLikes),
              onClick: undefined,
            },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className={`flex-1 text-center ${
                stat.onClick
                  ? "cursor-pointer active:opacity-70"
                  : "cursor-default"
              }`}
            >
              <p className="font-bold text-lg leading-none">{stat.value}</p>
              <p className="text-[10px] text-[#8B95A3] mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
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
        {videos.length === 0 ? (
          <div
            className="text-center py-16"
            data-ocid="user_profile.videos.empty_state"
          >
            <p className="text-[#8B95A3]">No videos yet</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-3 gap-1"
            data-ocid="user_profile.videos.list"
          >
            {videos.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1F26]"
                data-ocid={`user_profile.videos.item.${i + 1}`}
              >
                {v.thumbUrl ? (
                  <img
                    src={v.thumbUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#2A3038]" />
                )}
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                  <Play size={9} className="text-white fill-white" />
                  <span className="text-white text-[9px] font-bold">
                    {formatCount(v.views)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      {creatorPrincipal && (
        <>
          <FollowListModal
            open={showFollowers}
            onClose={() => setShowFollowers(false)}
            title="Followers"
            principals={followerPrincipals}
            currentUserPrincipal={identity?.getPrincipal() ?? null}
            backend={backend}
          />
          <FollowListModal
            open={showFollowing}
            onClose={() => setShowFollowing(false)}
            title="Following"
            principals={followingPrincipals}
            currentUserPrincipal={identity?.getPrincipal() ?? null}
            backend={backend}
          />
        </>
      )}
    </div>
  );
}
