import type { Principal } from "@icp-sdk/core/principal";
import {
  Bookmark,
  GitMerge,
  Grid3x3,
  Heart,
  Image,
  Play,
  Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import AuthModal from "../components/AuthModal";
import EditProfileModal from "../components/EditProfileModal";
import FollowListModal from "../components/FollowListModal";
import ProfileVideoPlayer from "../components/ProfileVideoPlayer";
import type { ProfileResolvedVideo } from "../components/ProfileVideoPlayer";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";
import { formatCount } from "../types/app";
import SettingsPage from "./SettingsPage";

type ProfileTab = "videos" | "photos" | "saved" | "liked" | "duets";

interface ProfileData {
  username: string;
  bio: string;
  avatar: string;
  avatarKey?: string;
}

interface VideoItem {
  id: string;
  videoKey: string;
  thumbnailKey: string;
  title: string;
  description: string;
  hashtags: string[];
  views: bigint;
  createdAt: bigint;
  creator: string;
  thumbUrl?: string;
  videoUrl?: string;
}

interface PhotoItem {
  id: string;
  imageKey: string;
  caption: string;
  hashtags: string[];
  createdAt: bigint;
  creator: string;
  imageUrl?: string;
}

async function resolveVideos(
  videos: any[],
  thumbClient: ReturnType<
    typeof import("../hooks/useStorageClient").useStorageClient
  >,
  videoClient: ReturnType<
    typeof import("../hooks/useStorageClient").useStorageClient
  >,
): Promise<VideoItem[]> {
  return Promise.all(
    videos.map(async (v) => {
      let thumbUrl =
        v.thumbnailKey || `https://picsum.photos/seed/${v.id}/400/700`;
      if (thumbClient && v.thumbnailKey?.startsWith("sha256:")) {
        try {
          thumbUrl = await thumbClient.getDirectURL(v.thumbnailKey);
        } catch {}
      }
      let videoUrl = v.videoKey || "";
      if (videoClient && v.videoKey?.startsWith("sha256:")) {
        try {
          videoUrl = await videoClient.getDirectURL(v.videoKey);
        } catch {}
      }
      return {
        id: v.id,
        videoKey: v.videoKey || "",
        thumbnailKey: v.thumbnailKey || "",
        title: v.title || "",
        description: v.description || "",
        hashtags: v.hashtags || [],
        views: v.views,
        createdAt: v.createdAt || 0n,
        creator:
          typeof v.creator === "object"
            ? v.creator.toString()
            : String(v.creator),
        thumbUrl,
        videoUrl,
      };
    }),
  );
}

export default function ProfilePage({
  onViewProfile: _onViewProfile,
  onViewPost,
}: {
  onViewProfile: (id: string) => void;
  onViewPost?: (postId: string) => void;
}) {
  const { isLoggedIn, identity, backend, login } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const videoStorageClient = useStorageClient("videos");
  const imageStorageClient = useStorageClient("images");
  const [showAuth, setShowAuth] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const [profile, setProfile] = useState<ProfileData>({
    username: "Loading...",
    bio: "",
    avatar: "",
  });
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [myPhotos, setMyPhotos] = useState<PhotoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [likedLoaded, setLikedLoaded] = useState(false);
  const [duets, setDuets] = useState<VideoItem[]>([]);
  const [duetsLoaded, setDuetsLoaded] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [followerCount, setFollowerCount] = useState(0n);
  const [followingCount, setFollowingCount] = useState(0n);
  const [totalLikes, setTotalLikes] = useState(0n);
  const [followerPrincipals, setFollowerPrincipals] = useState<Principal[]>([]);
  const [followingPrincipals, setFollowingPrincipals] = useState<Principal[]>(
    [],
  );
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(
    null,
  );
  const [playerSource, setPlayerSource] = useState<ProfileResolvedVideo[]>([]);

  useEffect(() => {
    if (!isLoggedIn || !identity || !backend) {
      setLoading(false);
      return;
    }
    const myPrincipal = identity.getPrincipal();
    setLoading(true);

    Promise.all([
      backend.getProfile(myPrincipal),
      backend.getUserVideos(myPrincipal),
      backend.getUserStats(myPrincipal),
      backend.getFollowers(myPrincipal),
      backend.getFollowing(myPrincipal),
    ])
      .then(async ([profileOpt, videos, stats, followers, following]) => {
        if ((profileOpt as any).__kind__ === "Some") {
          const p = (profileOpt as any).value;
          let avatar =
            p.avatarKey ||
            `https://i.pravatar.cc/100?u=${myPrincipal.toString()}`;
          if (thumbStorageClient && p.avatarKey?.startsWith("sha256:")) {
            try {
              avatar = await thumbStorageClient.getDirectURL(p.avatarKey);
            } catch {}
          }
          setProfile({
            username: p.username,
            bio: p.bio,
            avatar,
            avatarKey: p.avatarKey,
          });
        } else {
          setProfile({
            username: `${myPrincipal.toString().slice(0, 8)}...`,
            bio: "VibeFlow creator",
            avatar: `https://i.pravatar.cc/100?u=${myPrincipal.toString()}`,
          });
        }
        const resolved = await resolveVideos(
          videos as any[],
          thumbStorageClient,
          videoStorageClient,
        );
        setMyVideos(resolved);
        setFollowerCount((stats as any).followerCount);
        setFollowingCount((stats as any).followingCount);
        const likeCounts = await Promise.all(
          (videos as any[])
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, identity, backend, thumbStorageClient, videoStorageClient]);

  useEffect(() => {
    if (activeTab !== "photos" || photosLoaded || !backend || !identity) return;
    backend
      .getUserPhotos(identity.getPrincipal())
      .then(async (rawPhotos) => {
        const resolved: PhotoItem[] = await Promise.all(
          (rawPhotos as any[]).map(async (p) => {
            let imageUrl =
              p.imageKey || `https://picsum.photos/seed/${p.id}/400/400`;
            if (imageStorageClient && imageUrl.startsWith("sha256:")) {
              try {
                imageUrl = await imageStorageClient.getDirectURL(p.imageKey);
              } catch {}
            }
            return {
              id: p.id,
              imageKey: p.imageKey || "",
              caption: p.caption || "",
              hashtags: p.hashtags || [],
              createdAt: p.createdAt || 0n,
              creator:
                typeof p.creator === "object"
                  ? p.creator.toString()
                  : String(p.creator),
              imageUrl,
            };
          }),
        );
        setMyPhotos(resolved);
        setPhotosLoaded(true);
      })
      .catch(() => {});
  }, [activeTab, photosLoaded, backend, identity, imageStorageClient]);

  useEffect(() => {
    if (activeTab !== "saved" || savedLoaded || !backend) return;
    backend
      .getSavedVideos()
      .then(async (videos) => {
        const resolved = await resolveVideos(
          videos as any[],
          thumbStorageClient,
          videoStorageClient,
        );
        setSavedVideos(resolved);
        setSavedLoaded(true);
      })
      .catch(() => {});
  }, [activeTab, savedLoaded, backend, thumbStorageClient, videoStorageClient]);

  useEffect(() => {
    if (activeTab !== "liked" || likedLoaded || !backend) return;
    backend
      .getLikedVideos()
      .then(async (videos) => {
        const resolved = await resolveVideos(
          videos as any[],
          thumbStorageClient,
          videoStorageClient,
        );
        setLikedVideos(resolved);
        setLikedLoaded(true);
      })
      .catch(() => {});
  }, [activeTab, likedLoaded, backend, thumbStorageClient, videoStorageClient]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: storage clients stable
  useEffect(() => {
    if (activeTab !== "duets" || duetsLoaded || !backend || !identity) return;
    const p = identity.getPrincipal();
    backend
      .getUserDuets(p)
      .then(async (rawDuets: any[]) => {
        const resolved = await resolveVideos(
          rawDuets,
          thumbStorageClient,
          videoStorageClient,
        );
        setDuets(resolved);
        setDuetsLoaded(true);
      })
      .catch(() => setDuetsLoaded(true));
  }, [activeTab, duetsLoaded, backend, identity]);

  const initials = profile.username.slice(0, 2).toUpperCase();

  const toPlayerVideos = (items: VideoItem[]): ProfileResolvedVideo[] =>
    items.map((v) => ({
      id: v.id,
      creator: v.creator,
      title: v.title,
      description: v.description,
      hashtags: v.hashtags,
      videoKey: v.videoKey,
      thumbnailKey: v.thumbnailKey,
      videoUrl: v.videoUrl || "",
      thumbUrl: v.thumbUrl || "",
      creatorUsername: profile.username,
      creatorAvatar: profile.avatar,
      views: v.views,
      createdAt: v.createdAt,
    }));

  const openPlayer = (items: VideoItem[], index: number) => {
    setPlayerSource(toPlayerVideos(items));
    setSelectedVideoIndex(index);
  };

  if (!isLoggedIn) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8 bg-[#0F1216]">
        <div className="w-24 h-24 rounded-full bg-[#1A1F26] flex items-center justify-center">
          <span className="text-4xl font-bold text-[#8B95A3]">?</span>
        </div>
        <div className="text-center">
          <p className="font-bold text-xl mb-2">Join VibeFlow</p>
          <p className="text-[#8B95A3] text-sm">
            Sign in to create content, follow creators, and more
          </p>
        </div>
        <button
          type="button"
          onClick={login}
          className="bg-[#22D3EE] text-black font-bold px-8 py-3.5 rounded-2xl text-base"
          data-ocid="profile.login.primary_button"
        >
          Sign In
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        data-ocid="profile.loading_state"
      >
        <div className="w-8 h-8 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
      </div>
    );
  }

  const VideoGrid = ({
    items,
    emptyMsg,
    emptyIcon,
  }: { items: VideoItem[]; emptyMsg: string; emptyIcon: React.ReactNode }) =>
    items.length === 0 ? (
      <div className="text-center py-16">
        <div className="flex justify-center mb-3">{emptyIcon}</div>
        <p className="text-[#8B95A3]">{emptyMsg}</p>
      </div>
    ) : (
      <div className="grid grid-cols-3 gap-1">
        {items.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1F26] cursor-pointer group"
            onClick={() => openPlayer(items, i)}
            data-ocid={`profile.${activeTab}.item.${i + 1}`}
          >
            {v.thumbUrl ? (
              <img
                src={v.thumbUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[#2A3038]" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 group-active:bg-black/40 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                <Play size={20} className="text-white fill-white" />
              </div>
            </div>
            <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
              <Play size={9} className="text-white fill-white" />
              <span className="text-white text-[9px] font-bold">
                {formatCount(v.views)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    );

  const PhotoGrid = ({ items }: { items: PhotoItem[] }) =>
    items.length === 0 ? (
      <div className="text-center py-16">
        <Image size={40} className="text-[#2A3038] mx-auto mb-3" />
        <p className="text-[#8B95A3]">No photos yet. Start sharing!</p>
      </div>
    ) : (
      <div className="grid grid-cols-3 gap-1">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="relative aspect-square rounded-lg overflow-hidden bg-[#1A1F26] cursor-pointer"
            onClick={() => onViewPost?.(p.id)}
            data-ocid={`profile.photos.item.${i + 1}`}
          >
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#2A3038] flex items-center justify-center">
                <Image size={20} className="text-[#8B95A3]" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );

  return (
    <div
      className="h-full overflow-y-auto bg-[#0F1216]"
      data-ocid="profile.page"
    >
      {/* Header area */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-[#22D3EE] overflow-hidden bg-[#1A1F26] flex items-center justify-center">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-[#22D3EE]">
                  {initials}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 border border-[#2A3038] px-4 py-2 rounded-xl text-sm text-[#E9EEF5] font-medium"
              data-ocid="profile.edit.button"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 border border-[#2A3038] rounded-xl flex items-center justify-center"
              data-ocid="profile.settings.button"
            >
              <Settings size={16} className="text-[#8B95A3]" />
            </button>
          </div>
        </div>

        <h2 className="font-bold text-xl">@{profile.username}</h2>
        <p className="text-[#A6B0BC] text-sm mb-4">{profile.bio}</p>

        <div className="flex gap-0 mb-4">
          {[
            { label: "Videos", value: myVideos.length, onClick: undefined },
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
              className={`flex-1 text-center ${stat.onClick ? "cursor-pointer active:opacity-70" : "cursor-default"}`}
              data-ocid={
                stat.onClick
                  ? `profile.${stat.label.toLowerCase()}.button`
                  : undefined
              }
            >
              <p className="font-bold text-lg leading-none">{stat.value}</p>
              <p className="text-[10px] text-[#8B95A3] mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A3038] px-2">
        {(
          [
            { id: "videos", icon: <Grid3x3 size={15} />, label: "Videos" },
            { id: "photos", icon: <Image size={15} />, label: "Photos" },
            { id: "saved", icon: <Bookmark size={15} />, label: "Saved" },
            { id: "liked", icon: <Heart size={15} />, label: "Liked" },
            { id: "duets", icon: <GitMerge size={15} />, label: "Duets" },
          ] as const
        ).map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === id
                ? "border-[#22D3EE] text-[#22D3EE]"
                : "border-transparent text-[#8B95A3]"
            }`}
            data-ocid={`profile.${id}.tab`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="px-3 pt-3 pb-6">
        {activeTab === "videos" && (
          <VideoGrid
            items={myVideos}
            emptyMsg="No videos yet. Start creating!"
            emptyIcon={<Grid3x3 size={40} className="text-[#2A3038]" />}
          />
        )}
        {activeTab === "photos" &&
          (!photosLoaded ? (
            <div
              className="flex justify-center py-16"
              data-ocid="profile.photos.loading_state"
            >
              <div className="w-7 h-7 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
            </div>
          ) : (
            <PhotoGrid items={myPhotos} />
          ))}
        {activeTab === "saved" &&
          (!savedLoaded ? (
            <div
              className="flex justify-center py-16"
              data-ocid="profile.saved.loading_state"
            >
              <div className="w-7 h-7 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
            </div>
          ) : (
            <VideoGrid
              items={savedVideos}
              emptyMsg="No saved videos yet"
              emptyIcon={<Bookmark size={40} className="text-[#2A3038]" />}
            />
          ))}
        {activeTab === "liked" &&
          (!likedLoaded ? (
            <div
              className="flex justify-center py-16"
              data-ocid="profile.liked.loading_state"
            >
              <div className="w-7 h-7 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
            </div>
          ) : (
            <VideoGrid
              items={likedVideos}
              emptyMsg="No liked videos yet"
              emptyIcon={<Heart size={40} className="text-[#2A3038]" />}
            />
          ))}
      </div>

      {activeTab === "duets" &&
        (!duetsLoaded ? (
          <div
            className="flex justify-center py-16"
            data-ocid="profile.duets.loading_state"
          >
            <div className="w-7 h-7 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
          </div>
        ) : duets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="profile.duets.empty_state"
          >
            <GitMerge size={40} className="text-[#2A3038]" />
            <p className="text-[#8B95A3] text-sm text-center">
              No duets yet. Tap Duet on any video to collaborate!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {duets.map((item, i) => (
              <div
                key={item.id}
                className="aspect-[9/16] relative overflow-hidden bg-[#1A1F26]"
                data-ocid={`profile.duets.item.${i + 1}`}
              >
                {item.thumbUrl ? (
                  <img
                    src={item.thumbUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1A1F26] flex items-center justify-center">
                    <GitMerge size={20} className="text-[#2A3038]" />
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-[#9333EA]/90 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                  <GitMerge size={9} className="text-white" />
                  <span className="text-white text-[8px] font-bold">Duet</span>
                </div>
              </div>
            ))}
          </div>
        ))}

      <EditProfileModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        profile={profile}
        onSave={(p) => {
          setProfile((prev) => ({ ...prev, ...p }));
          if (backend)
            backend
              .updateProfile(p.username, p.bio, profile.avatarKey || "")
              .catch(() => {});
          setShowEdit(false);
        }}
      />

      {identity && (
        <>
          <FollowListModal
            open={showFollowers}
            onClose={() => setShowFollowers(false)}
            title="Followers"
            principals={followerPrincipals}
            currentUserPrincipal={identity.getPrincipal()}
            backend={backend}
          />
          <FollowListModal
            open={showFollowing}
            onClose={() => setShowFollowing(false)}
            title="Following"
            principals={followingPrincipals}
            currentUserPrincipal={identity.getPrincipal()}
            backend={backend}
          />
        </>
      )}

      <AnimatePresence>
        {selectedVideoIndex !== null && (
          <ProfileVideoPlayer
            videos={playerSource}
            startIndex={selectedVideoIndex}
            onClose={() => setSelectedVideoIndex(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsPage
            onBack={() => setShowSettings(false)}
            onEditProfile={() => {
              setShowSettings(false);
              setShowEdit(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
