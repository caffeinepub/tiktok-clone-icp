import type { Principal } from "@icp-sdk/core/principal";
import {
  Bookmark,
  Camera,
  GitMerge,
  Globe,
  Grid3x3,
  Heart,
  Image,
  Loader2,
  Pin,
  Play,
  Settings,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Story } from "../backend.d";
import AuthModal from "../components/AuthModal";
import FollowListModal from "../components/FollowListModal";
import ProfileVideoPlayer from "../components/ProfileVideoPlayer";
import type { ProfileResolvedVideo } from "../components/ProfileVideoPlayer";
import StoryViewer from "../components/StoryViewer";
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

// Parse pronouns/website from bio string
function parseBioExtras(bio: string) {
  let pronouns = "";
  let website = "";
  let cleanBio = bio;
  const pronounsMatch = bio.match(/\s*\|\s*pronouns:([^|]+)/);
  if (pronounsMatch) {
    pronouns = pronounsMatch[1].trim();
    cleanBio = cleanBio.replace(pronounsMatch[0], "");
  }
  const websiteMatch = cleanBio.match(/\s*\|\s*website:([^|]+)/);
  if (websiteMatch) {
    website = websiteMatch[1].trim();
    cleanBio = cleanBio.replace(websiteMatch[0], "");
  }
  return { pronouns, website, cleanBio: cleanBio.trim() };
}

function buildBioString(bio: string, pronouns: string, website: string) {
  let result = bio.trim();
  if (pronouns.trim()) result += ` | pronouns:${pronouns.trim()}`;
  if (website.trim()) result += ` | website:${website.trim()}`;
  return result;
}

// Enhanced edit profile sheet
function EditProfileSheet({
  open,
  profile,
  onClose,
  onSave,
  onChangeAvatar,
}: {
  open: boolean;
  profile: ProfileData;
  onClose: () => void;
  onSave: (p: { username: string; bio: string }) => void;
  onChangeAvatar: () => void;
}) {
  const extras = parseBioExtras(profile.bio);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(extras.cleanBio);
  const [pronouns, setPronouns] = useState(extras.pronouns);
  const [website, setWebsite] = useState(extras.website);

  useEffect(() => {
    const e = parseBioExtras(profile.bio);
    setUsername(profile.username);
    setBio(e.cleanBio);
    setPronouns(e.pronouns);
    setWebsite(e.website);
  }, [profile]);

  const handleSave = () => {
    const fullBio = buildBioString(bio, pronouns, website);
    onSave({ username, bio: fullBio });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="edit_profile.modal"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 w-full"
            onClick={onClose}
            aria-label="Close"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10 max-h-[90vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#E9EEF5] font-black text-lg">
                Edit Profile
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center"
                data-ocid="edit_profile.close_button"
              >
                <X size={16} className="text-[#8B95A3]" />
              </button>
            </div>

            <div className="flex justify-center mb-5">
              <button
                type="button"
                onClick={onChangeAvatar}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#22D3EE] group"
                data-ocid="edit_profile.avatar.button"
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1A1F26] flex items-center justify-center">
                    <User size={28} className="text-[#22D3EE]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </button>
            </div>
            <p className="text-center text-xs text-[#8B95A3] -mt-3 mb-5">
              Tap to change photo
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label
                  htmlFor="ep-username"
                  className="text-xs text-[#A6B0BC] mb-1.5 block font-semibold"
                >
                  Username
                </label>
                <input
                  id="ep-username"
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-ocid="edit_profile.username.input"
                />
              </div>
              <div>
                <label
                  htmlFor="ep-bio"
                  className="text-xs text-[#A6B0BC] mb-1.5 block font-semibold"
                >
                  Bio
                </label>
                <textarea
                  id="ep-bio"
                  rows={3}
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors resize-none"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  data-ocid="edit_profile.bio.textarea"
                />
              </div>
              <div>
                <label
                  htmlFor="ep-pronouns"
                  className="text-xs text-[#A6B0BC] mb-1.5 block font-semibold"
                >
                  Pronouns
                </label>
                <input
                  id="ep-pronouns"
                  placeholder="e.g. they/them, she/her"
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors placeholder:text-[#4A5568]"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  data-ocid="edit_profile.pronouns.input"
                />
              </div>
              <div>
                <label
                  htmlFor="ep-website"
                  className="text-xs text-[#A6B0BC] mb-1.5 block font-semibold"
                >
                  Website
                </label>
                <input
                  id="ep-website"
                  placeholder="https://yoursite.com"
                  type="url"
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors placeholder:text-[#4A5568]"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  data-ocid="edit_profile.website.input"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] text-black font-black text-base"
              data-ocid="edit_profile.save.submit_button"
            >
              Save Changes
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AvatarActionSheet({
  open,
  onClose,
  onCamera,
  onGallery,
}: {
  open: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 w-full"
            onClick={onClose}
            aria-label="Close"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3 className="text-[#E9EEF5] font-black text-base mb-4">
              Change Profile Photo
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onCamera();
                  onClose();
                }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#1A1F26] border border-[#2A3038]"
                data-ocid="avatar.camera.button"
              >
                <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/20 flex items-center justify-center">
                  <Camera size={20} className="text-[#22D3EE]" />
                </div>
                <span className="text-[#E9EEF5] font-semibold text-sm">
                  Take Photo
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onGallery();
                  onClose();
                }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#1A1F26] border border-[#2A3038]"
                data-ocid="avatar.gallery.button"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF3B5C]/20 flex items-center justify-center">
                  <Image size={20} className="text-[#FF3B5C]" />
                </div>
                <span className="text-[#E9EEF5] font-semibold text-sm">
                  Choose from Gallery
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 p-3 rounded-2xl text-[#8B95A3] text-sm font-semibold"
                data-ocid="avatar.cancel.button"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const imageStorageClient = useStorageClient("photos");
  const [showAuth, setShowAuth] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const [profile, setProfile] = useState<ProfileData>({
    username: "Loading...",
    bio: "",
    avatar: "",
  });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [myPhotos, setMyPhotos] = useState<PhotoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [pinnedVideo, setPinnedVideo] = useState<VideoItem | null>(null);
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
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [_storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(
    null,
  );
  const [playerSource, setPlayerSource] = useState<ProfileResolvedVideo[]>([]);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const avatarCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!identity) return;
    const key = `cover:${identity.getPrincipal().toString()}`;
    const stored = localStorage.getItem(key);
    if (stored) setCoverUrl(stored);
  }, [identity]);

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
      backend.getPinnedVideo(myPrincipal).catch(() => null),
      backend.getStoriesByUser(myPrincipal).catch(() => []),
    ])
      .then(
        async ([
          profileOpt,
          videos,
          stats,
          followers,
          following,
          pinnedOpt,
          userStories,
        ]) => {
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

          setMyStories((userStories as Story[]) || []);

          if (pinnedOpt && (pinnedOpt as any).__kind__ === "Some") {
            const pv = (pinnedOpt as any).value;
            const resolvedPin = await resolveVideos(
              [pv],
              thumbStorageClient,
              videoStorageClient,
            );
            setPinnedVideo(resolvedPin[0] || null);
          }
        },
      )
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

  const uploadAvatar = async (file: File) => {
    if (!backend || !thumbStorageClient || !identity) return;
    setAvatarUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: avatarKey } = await thumbStorageClient.putFile(bytes);
      const avatarUrl = await thumbStorageClient.getDirectURL(avatarKey);
      await backend.updateProfile(profile.username, profile.bio, avatarKey);
      setProfile((prev) => ({ ...prev, avatar: avatarUrl, avatarKey }));
    } catch {}
    setAvatarUploading(false);
  };

  const uploadCover = async (file: File) => {
    if (!identity) return;
    setCoverUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const key = `cover:${identity.getPrincipal().toString()}`;
      localStorage.setItem(key, dataUrl);
      setCoverUrl(dataUrl);
    } catch {}
    setCoverUploading(false);
  };

  const initials = profile.username.slice(0, 2).toUpperCase();
  const extras = parseBioExtras(profile.bio);

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

  // Horizontal scroll row for videos (9:16 cards)
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
      <div className="flex flex-row gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {items.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[#1A1F26] cursor-pointer group"
            style={{ width: 140, aspectRatio: "9/16" }}
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
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5">
              <Play size={9} className="text-white fill-white" />
              <span className="text-white text-[9px] font-bold">
                {formatCount(v.views)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    );

  // Horizontal scroll row for photos (square cards)
  const PhotoGrid = ({ items }: { items: PhotoItem[] }) =>
    items.length === 0 ? (
      <div className="text-center py-16">
        <Image size={40} className="text-[#2A3038] mx-auto mb-3" />
        <p className="text-[#8B95A3]">No photos yet. Start sharing!</p>
      </div>
    ) : (
      <div className="flex flex-row gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[#1A1F26] cursor-pointer"
            style={{ width: 140, height: 140 }}
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
      {/* Cover Photo */}
      <div className="relative w-full h-44 bg-gradient-to-br from-[#1A1F26] to-[#0F1216] overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#22D3EE]/10 via-[#FF3B5C]/10 to-[#0F1216]" />
        )}
        <button
          type="button"
          onClick={() => coverFileRef.current?.click()}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-semibold"
          disabled={coverUploading}
          data-ocid="profile.cover.upload_button"
        >
          {coverUploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Camera size={12} />
          )}
          {coverUploading ? "Uploading..." : "Edit Cover"}
        </button>
        <input
          ref={coverFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCover(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Header area */}
      <div className="px-4 pt-0 pb-3 -mt-10 relative">
        <div className="flex items-end justify-between mb-3">
          <button
            type="button"
            onClick={() => setShowAvatarSheet(true)}
            className="relative w-20 h-20 rounded-full border-[3px] border-[#0F1216] overflow-hidden bg-[#1A1F26] flex items-center justify-center group"
            disabled={avatarUploading}
            data-ocid="profile.avatar.button"
          >
            {avatarUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-black/60">
                <Loader2 size={20} className="text-[#22D3EE] animate-spin" />
              </div>
            ) : profile.avatar ? (
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
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
          </button>

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
        <p className="text-[#A6B0BC] text-sm mt-0.5">{extras.cleanBio}</p>
        {extras.pronouns && (
          <p className="text-[#8B95A3] text-xs mt-1">{extras.pronouns}</p>
        )}
        {extras.website && (
          <a
            href={extras.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#22D3EE] text-xs mt-1"
          >
            <Globe size={11} />
            {extras.website.replace(/^https?:\/\//, "")}
          </a>
        )}

        <div className="flex gap-0 mt-4 mb-4">
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
              className={`flex-1 text-center ${
                stat.onClick
                  ? "cursor-pointer active:opacity-70"
                  : "cursor-default"
              }`}
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

      {/* Highlights / Stories Row */}
      {myStories.length > 0 && (
        <div className="px-4 py-3 border-b border-[#2A3038]">
          <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {myStories.map((story, i) => (
              <button
                key={story.id}
                type="button"
                onClick={() => {
                  setStoryViewerIndex(i);
                  setStoryViewerOpen(true);
                }}
                className="flex flex-col items-center gap-1 shrink-0"
                data-ocid={
                  i === 0
                    ? "profile.highlights.item.1"
                    : i === 1
                      ? "profile.highlights.item.2"
                      : "profile.highlights.item.3"
                }
              >
                <div
                  className="w-16 h-16 rounded-full p-[2px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #f093fb, #f5576c, #fda085)",
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#2A3038] flex items-center justify-center">
                    {story.mediaType?.startsWith("video") ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#22D3EE]/30 to-[#FF3B5C]/30 flex items-center justify-center">
                        <Play size={16} className="text-white fill-white" />
                      </div>
                    ) : (
                      <StoryThumb mediaKey={story.mediaKey} />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#8B95A3] w-16 text-center truncate">
                  {story.caption || "Story"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs - horizontal scroll with hidden scrollbar */}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-[#2A3038]">
        <div className="flex px-2 min-w-max">
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
              className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
      </div>

      {/* Content */}
      <div className="px-3 pt-3 pb-6">
        {activeTab === "videos" && (
          <>
            {pinnedVideo && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Pin size={12} className="text-[#22D3EE]" />
                  <span className="text-xs text-[#22D3EE] font-semibold uppercase tracking-widest">
                    Pinned
                  </span>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-2xl overflow-hidden bg-[#1A1F26] cursor-pointer group"
                  style={{ aspectRatio: "16/9" }}
                  onClick={() => openPlayer([pinnedVideo], 0)}
                  data-ocid="profile.pinned.button"
                >
                  {pinnedVideo.thumbUrl ? (
                    <img
                      src={pinnedVideo.thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2A3038]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm line-clamp-1">
                      {pinnedVideo.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Play size={10} className="text-white fill-white" />
                      <span className="text-white text-[10px]">
                        {formatCount(pinnedVideo.views)} views
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <div className="bg-black/60 rounded-full p-1.5">
                      <Play size={14} className="text-white fill-white" />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
            <VideoGrid
              items={myVideos}
              emptyMsg="No videos yet. Start creating!"
              emptyIcon={<Grid3x3 size={40} className="text-[#2A3038]" />}
            />
          </>
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
            <div className="flex flex-row gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {duets.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[#1A1F26] cursor-pointer"
                  style={{ width: 140, aspectRatio: "9/16" }}
                  onClick={() => openPlayer(duets, i)}
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
                    <span className="text-white text-[8px] font-bold">D</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
      </div>

      {/* Avatar action sheet */}
      <AvatarActionSheet
        open={showAvatarSheet}
        onClose={() => setShowAvatarSheet(false)}
        onCamera={() => avatarCameraRef.current?.click()}
        onGallery={() => avatarFileRef.current?.click()}
      />

      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadAvatar(f);
          e.target.value = "";
        }}
      />
      <input
        ref={avatarCameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadAvatar(f);
          e.target.value = "";
        }}
      />

      <EditProfileSheet
        open={showEdit}
        profile={profile}
        onClose={() => setShowEdit(false)}
        onChangeAvatar={() => {
          setShowEdit(false);
          setShowAvatarSheet(true);
        }}
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

      <AnimatePresence>
        {storyViewerOpen && myStories.length > 0 && identity && (
          <StoryViewer
            stories={myStories}
            creatorId={identity.getPrincipal().toString()}
            onClose={() => setStoryViewerOpen(false)}
            onDeleted={() => {
              setMyStories([]);
              setStoryViewerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component to render story thumbnail from photos bucket
function StoryThumb({ mediaKey }: { mediaKey: string }) {
  const photoClient = useStorageClient("photos");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaKey?.startsWith("sha256:") || !photoClient) return;
    photoClient
      .getDirectURL(mediaKey)
      .then(setUrl)
      .catch(() => {});
  }, [mediaKey, photoClient]);

  if (!url) {
    return <div className="w-full h-full bg-[#2A3038]" />;
  }
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}
