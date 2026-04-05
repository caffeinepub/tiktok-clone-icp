import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Clock,
  Coins,
  Grid3x3,
  Heart,
  MessageCircle,
  Play,
  Star,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import AuthModal from "../components/AuthModal";
import FollowListModal from "../components/FollowListModal";
import { GradientRing } from "../components/LoveThemeEffects";
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
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "videos" | "reels" | "liked" | "collab"
  >("videos");

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

        if (identity) {
          const myFollowing = await backend.getFollowing(
            identity.getPrincipal(),
          );
          const isNowFollowing = (myFollowing as Principal[]).some(
            (p) => p.toString() === creatorId,
          );
          setIsFollowing(isNowFollowing);
          if (!isNowFollowing) {
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
      setPendingRequest(false);
      (backend as any).cancelFollowRequest(creatorPrincipal).catch(() => {
        setPendingRequest(true);
      });
    } else {
      backend
        .followUser(creatorPrincipal)
        .then(() => {
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

  const isCreator = followerCount >= 100n || videos.length >= 5;

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: "oklch(0.10 0.012 15)" }}
        data-ocid="user_profile.loading_state"
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "oklch(0.65 0.22 10)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "oklch(0.10 0.012 15)" }}
      data-ocid="user_profile.page"
    >
      {/* Back button overlay */}
      <div
        className="sticky top-0 flex items-center px-4 py-3 z-10"
        style={{
          background: "oklch(0.10 0.012 15 / 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(0.22 0.018 15 / 0.5)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 active:scale-95 transition-transform"
          style={{ color: "oklch(0.94 0.008 60)" }}
          data-ocid="user_profile.back.button"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold text-sm">@{profileData.username}</span>
        </button>

        {isCreator && (
          <div
            className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: "oklch(0.78 0.14 75 / 0.15)",
              border: "1px solid oklch(0.78 0.14 75 / 0.4)",
              color: "oklch(0.78 0.14 75)",
            }}
          >
            <Star size={9} className="fill-current" /> Creator
          </div>
        )}
      </div>

      {/* Cover area */}
      <div
        className="h-44 relative"
        style={{ background: "var(--love-dark-gradient)" }}
      >
        {/* Decorative overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, oklch(0.65 0.22 10 / 0.15) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <span className="text-9xl">❤️</span>
        </div>
      </div>

      {/* Avatar section */}
      <div className="px-4 pb-4 relative" style={{ marginTop: -40 }}>
        <div className="flex items-end justify-between mb-4">
          {/* Avatar with gradient ring */}
          <GradientRing size={80} gold={isCreator}>
            <img
              src={profileData.avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          </GradientRing>

          {/* Action buttons */}
          <div className="flex gap-2 items-center">
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                  color: "oklch(0.98 0 0)",
                }}
                data-ocid="user_profile.message.primary_button"
              >
                <MessageCircle size={14} /> DM
              </button>
            )}
            <button
              type="button"
              onClick={handleFollow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all active:scale-95"
              style={{
                background: isFollowing
                  ? "transparent"
                  : pendingRequest
                    ? "transparent"
                    : "oklch(0.65 0.22 10)",
                border: isFollowing
                  ? "1.5px solid oklch(0.28 0.020 15)"
                  : pendingRequest
                    ? "1.5px solid oklch(0.65 0.22 10 / 0.5)"
                    : "none",
                color: isFollowing
                  ? "oklch(0.94 0.008 60)"
                  : pendingRequest
                    ? "oklch(0.65 0.22 10)"
                    : "oklch(0.98 0 0)",
              }}
              data-ocid="user_profile.follow.button"
            >
              {isFollowing ? (
                <>
                  <UserCheck size={14} /> Following
                </>
              ) : pendingRequest ? (
                <>
                  <Clock size={14} /> Pending
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Follow
                </>
              )}
            </button>
          </div>
        </div>

        {/* Activity status */}
        <div className="mb-2">
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: "oklch(0.18 0.018 15)",
              color: "oklch(0.60 0.010 15)",
            }}
          >
            {(() => {
              const hash = creatorId
                .split("")
                .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
              const mins = hash % 120;
              if (mins < 5) return "🟢 Active now";
              if (mins < 60) return `🕐 Active ${mins}m ago`;
              return `🕐 Active ${Math.floor(mins / 60)}h ago`;
            })()}
          </span>
        </div>

        <h2
          className="font-bold text-xl"
          style={{ color: "oklch(0.94 0.008 60)" }}
        >
          @{profileData.username}
        </h2>
        <p
          className="text-sm mt-1 mb-4"
          style={{ color: "oklch(0.65 0.010 15)" }}
        >
          {profileData.bio}
        </p>

        {/* Secondary actions: Subscribe + Tip */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowSubscribe(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.14 75), oklch(0.68 0.18 60))",
              color: "oklch(0.10 0 0)",
            }}
            data-ocid="user_profile.subscribe.button"
          >
            <Star size={14} className="fill-current" /> Subscribe
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform"
            style={{
              border: "1.5px solid oklch(0.78 0.14 75 / 0.5)",
              color: "oklch(0.78 0.14 75)",
            }}
            data-ocid="user_profile.tip.button"
          >
            <Coins size={14} /> Tip
          </button>
        </div>

        {/* Stats row */}
        <div
          className="flex rounded-2xl overflow-hidden mb-5"
          style={{
            background: "oklch(0.15 0.018 15)",
            border: "1px solid oklch(0.22 0.018 15)",
          }}
        >
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
          ].map((stat, idx, arr) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className={`flex-1 text-center py-3 ${
                stat.onClick
                  ? "cursor-pointer active:opacity-70"
                  : "cursor-default"
              } ${idx < arr.length - 1 ? "border-r" : ""}`}
              style={{
                borderColor: "oklch(0.22 0.018 15)",
              }}
            >
              <p
                className="font-bold text-lg leading-none"
                style={{ color: "oklch(0.94 0.008 60)" }}
              >
                {stat.value}
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "oklch(0.55 0.010 15)" }}
              >
                {stat.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b mx-4 mb-3 overflow-x-auto no-scrollbar"
        style={{ borderColor: "oklch(0.22 0.018 15)" }}
      >
        {(
          [
            { id: "videos", label: "Videos", icon: <Grid3x3 size={14} /> },
            { id: "reels", label: "Reels", icon: <Play size={14} /> },
            { id: "liked", label: "Liked", icon: <Heart size={14} /> },
            { id: "collab", label: "Collab", icon: <Star size={14} /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 py-3 px-3 text-sm font-semibold border-b-2 shrink-0 transition-colors"
            style={{
              borderBottomColor:
                activeTab === tab.id ? "oklch(0.65 0.22 10)" : "transparent",
              color:
                activeTab === tab.id
                  ? "oklch(0.65 0.22 10)"
                  : "oklch(0.55 0.010 15)",
            }}
            data-ocid={`user_profile.${tab.id}.tab`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="px-3 pb-24">
        {(activeTab === "videos" || activeTab === "reels") && (
          <>
            {/* Pinned video */}
            {videos.length > 0 && (
              <div className="mb-4">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                  style={{ color: "oklch(0.65 0.22 10)" }}
                >
                  📌 Pinned
                </p>
                <div
                  className="relative aspect-[9/16] max-w-[140px] rounded-xl overflow-hidden"
                  style={{ background: "oklch(0.20 0.018 15)" }}
                >
                  {videos[0].thumbUrl && (
                    <img
                      src={videos[0].thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div
                    className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "oklch(0.65 0.22 10)",
                      color: "oklch(0.98 0 0)",
                    }}
                  >
                    📌
                  </div>
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                    <Play size={9} className="text-white fill-white" />
                    <span className="text-white text-[9px] font-bold">
                      {formatCount(videos[0].views)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Videos grid */}
            {videos.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="user_profile.videos.empty_state"
              >
                <div className="text-4xl mb-2">🎬</div>
                <p style={{ color: "oklch(0.60 0.010 15)" }}>No videos yet</p>
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
                    transition={{ delay: i * 0.05 }}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden"
                    style={{ background: "oklch(0.20 0.018 15)" }}
                    data-ocid={`user_profile.videos.item.${i + 1}`}
                  >
                    {v.thumbUrl ? (
                      <img
                        src={v.thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{ background: "oklch(0.22 0.018 15)" }}
                      />
                    )}
                    {/* Overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, oklch(0.05 0.015 15 / 0.7) 0%, transparent 50%)",
                      }}
                    />
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
          </>
        )}

        {activeTab === "liked" && (
          <div className="text-center py-16">
            <Heart
              size={40}
              style={{ color: "oklch(0.65 0.22 10)" }}
              className="mx-auto mb-2 fill-current"
            />
            <p style={{ color: "oklch(0.60 0.010 15)" }}>
              Liked videos are private
            </p>
          </div>
        )}

        {activeTab === "collab" && (
          <div
            className="text-center py-16"
            data-ocid="user_profile.collab.empty_state"
          >
            <Star
              size={40}
              style={{ color: "oklch(0.78 0.14 75)" }}
              className="mx-auto mb-2"
            />
            <p style={{ color: "oklch(0.60 0.010 15)" }}>
              No collaborations yet
            </p>
          </div>
        )}
      </div>

      {/* Subscribe Sheet */}
      {showSubscribe && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 w-full"
            onClick={() => setShowSubscribe(false)}
            aria-label="Close"
          />
          <div
            className="relative w-full rounded-t-3xl px-5 pt-4 pb-10 z-10"
            style={{ background: "oklch(0.15 0.018 15)" }}
            data-ocid="subscribe.modal"
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3
              className="font-display font-bold text-base italic mb-1"
              style={{ color: "oklch(0.94 0.008 60)" }}
            >
              Subscribe to @{profileData.username}
            </h3>
            <p
              className="text-xs mb-5"
              style={{ color: "oklch(0.60 0.010 15)" }}
            >
              Unlock exclusive content and perks
            </p>
            <div className="space-y-2.5">
              {[
                {
                  tier: "Fan",
                  price: "Free",
                  gradient: "transparent",
                  borderColor: "oklch(0.28 0.020 15)",
                  badge: "",
                },
                {
                  tier: "Super Fan",
                  price: "$4.99/mo",
                  gradient: "oklch(0.65 0.22 10 / 0.08)",
                  borderColor: "oklch(0.65 0.22 10 / 0.4)",
                  badge: "Popular",
                },
                {
                  tier: "VIP",
                  price: "$9.99/mo",
                  gradient: "oklch(0.78 0.14 75 / 0.08)",
                  borderColor: "oklch(0.78 0.14 75 / 0.4)",
                  badge: "Best Value",
                },
              ].map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => setShowSubscribe(false)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border active:scale-95 transition-transform"
                  style={{
                    background: t.gradient,
                    borderColor: t.borderColor,
                  }}
                  data-ocid={`subscribe.${t.tier.toLowerCase().replace(" ", "_")}.button`}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold text-sm"
                        style={{ color: "oklch(0.94 0.008 60)" }}
                      >
                        {t.tier}
                      </span>
                      {t.badge && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "oklch(0.65 0.22 10 / 0.2)",
                            color: "oklch(0.65 0.22 10)",
                          }}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="font-bold text-sm"
                    style={{ color: "oklch(0.78 0.14 75)" }}
                  >
                    {t.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      )}

      {showFollowers && creatorPrincipal && identity && (
        <FollowListModal
          open={showFollowers}
          title="Followers"
          principals={followerPrincipals}
          onClose={() => setShowFollowers(false)}
          currentUserPrincipal={identity.getPrincipal()}
          backend={backend}
        />
      )}

      {showFollowing && creatorPrincipal && identity && (
        <FollowListModal
          open={showFollowing}
          title="Following"
          principals={followingPrincipals}
          onClose={() => setShowFollowing(false)}
          currentUserPrincipal={identity.getPrincipal()}
          backend={backend}
        />
      )}
    </div>
  );
}
