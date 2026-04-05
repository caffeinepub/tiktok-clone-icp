import type { Principal } from "@icp-sdk/core/principal";
import {
  BarChart2,
  Bookmark,
  Camera,
  ChevronRight,
  GitMerge,
  Globe,
  Grid3x3,
  Heart,
  Image,
  Loader2,
  Lock,
  Pin,
  Play,
  Settings,
  Share2,
  Star,
  Trophy,
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
type UserTier = "free" | "premium" | "vip";

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

const NICHE_TAGS = [
  "Music",
  "Comedy",
  "Fashion",
  "Dance",
  "Food",
  "Travel",
  "Tech",
  "Gaming",
  "Art",
  "Fitness",
];

// Parse all bio extras from bio string
function parseBioExtras(bio: string) {
  let pronouns = "";
  let website = "";
  let displayName = "";
  let location = "";
  let gender = "";
  let birthday = "";
  let ig = "";
  let tw = "";
  let yt = "";
  let tags: string[] = [];
  let cleanBio = bio;

  const extract = (pattern: RegExp) => {
    const m = cleanBio.match(pattern);
    if (m) {
      cleanBio = cleanBio.replace(m[0], "");
      return m[1].trim();
    }
    return "";
  };

  pronouns = extract(/\s*\|\s*pronouns:([^|]+)/);
  website = extract(/\s*\|\s*website:([^|]+)/);
  displayName = extract(/\s*\|\s*displayName:([^|]+)/);
  location = extract(/\s*\|\s*location:([^|]+)/);
  gender = extract(/\s*\|\s*gender:([^|]+)/);
  birthday = extract(/\s*\|\s*birthday:([^|]+)/);
  ig = extract(/\s*\|\s*ig:([^|]+)/);
  tw = extract(/\s*\|\s*tw:([^|]+)/);
  yt = extract(/\s*\|\s*yt:([^|]+)/);
  const tagsStr = extract(/\s*\|\s*tags:([^|]+)/);
  tags = tagsStr
    ? tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return {
    pronouns,
    website,
    displayName,
    location,
    gender,
    birthday,
    ig,
    tw,
    yt,
    tags,
    cleanBio: cleanBio.trim(),
  };
}

function buildBioString(
  bio: string,
  extras: {
    pronouns: string;
    website: string;
    displayName: string;
    location: string;
    gender: string;
    birthday: string;
    ig: string;
    tw: string;
    yt: string;
    tags: string[];
  },
) {
  let result = bio.trim();
  if (extras.pronouns.trim()) result += ` | pronouns:${extras.pronouns.trim()}`;
  if (extras.website.trim()) result += ` | website:${extras.website.trim()}`;
  if (extras.displayName.trim())
    result += ` | displayName:${extras.displayName.trim()}`;
  if (extras.location.trim()) result += ` | location:${extras.location.trim()}`;
  if (extras.gender.trim()) result += ` | gender:${extras.gender.trim()}`;
  if (extras.birthday.trim()) result += ` | birthday:${extras.birthday.trim()}`;
  if (extras.ig.trim()) result += ` | ig:${extras.ig.trim()}`;
  if (extras.tw.trim()) result += ` | tw:${extras.tw.trim()}`;
  if (extras.yt.trim()) result += ` | yt:${extras.yt.trim()}`;
  if (extras.tags.length > 0) result += ` | tags:${extras.tags.join(",")}`;
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
  const [displayName, setDisplayName] = useState(extras.displayName);
  const [location, setLocation] = useState(extras.location);
  const [gender, setGender] = useState(extras.gender);
  const [birthday, setBirthday] = useState(extras.birthday);
  const [ig, setIg] = useState(extras.ig);
  const [tw, setTw] = useState(extras.tw);
  const [yt, setYt] = useState(extras.yt);
  const [tags, setTags] = useState<string[]>(extras.tags);

  useEffect(() => {
    const e = parseBioExtras(profile.bio);
    setUsername(profile.username);
    setBio(e.cleanBio);
    setPronouns(e.pronouns);
    setWebsite(e.website);
    setDisplayName(e.displayName);
    setLocation(e.location);
    setGender(e.gender);
    setBirthday(e.birthday);
    setIg(e.ig);
    setTw(e.tw);
    setYt(e.yt);
    setTags(e.tags);
  }, [profile]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = () => {
    const fullBio = buildBioString(bio, {
      pronouns,
      website,
      displayName,
      location,
      gender,
      birthday,
      ig,
      tw,
      yt,
      tags,
    });
    onSave({ username, bio: fullBio });
  };

  const inputCls =
    "w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors placeholder:text-[#4A5568]";
  const labelCls = "text-xs text-[#A6B0BC] mb-1.5 block font-semibold";
  const sectionCls =
    "text-xs font-bold text-[#22D3EE] uppercase tracking-widest mb-3 mt-5";

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
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10 max-h-[92vh] overflow-y-auto"
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

            {/* Avatar */}
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

            {/* Basic Info section */}
            <p className={sectionCls}>Basic Info</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="ep-username" className={labelCls}>
                  Username
                </label>
                <input
                  id="ep-username"
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-ocid="edit_profile.username.input"
                />
              </div>
              <div>
                <label htmlFor="ep-displayname" className={labelCls}>
                  Display Name
                </label>
                <input
                  id="ep-displayname"
                  placeholder="Your public display name"
                  className={inputCls}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ep-bio" className={labelCls}>
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
                <label htmlFor="ep-pronouns" className={labelCls}>
                  Pronouns
                </label>
                <input
                  id="ep-pronouns"
                  placeholder="e.g. they/them, she/her"
                  className={inputCls}
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  data-ocid="edit_profile.pronouns.input"
                />
              </div>
            </div>

            {/* About You section */}
            <p className={sectionCls}>About You</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="ep-location" className={labelCls}>
                  Location
                </label>
                <input
                  id="ep-location"
                  placeholder="City, Country"
                  className={inputCls}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ep-gender" className={labelCls}>
                  Gender
                </label>
                <select
                  id="ep-gender"
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Man">Man</option>
                  <option value="Woman">Woman</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label htmlFor="ep-birthday" className={labelCls}>
                  Birthday
                </label>
                <input
                  id="ep-birthday"
                  type="date"
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ep-website" className={labelCls}>
                  Website
                </label>
                <input
                  id="ep-website"
                  placeholder="https://yoursite.com"
                  type="url"
                  className={inputCls}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  data-ocid="edit_profile.website.input"
                />
              </div>
            </div>

            {/* Social Links section */}
            <p className={sectionCls}>Social Links</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="ep-ig" className={labelCls}>
                  Instagram
                </label>
                <input
                  id="ep-ig"
                  placeholder="@yourhandle"
                  className={inputCls}
                  value={ig}
                  onChange={(e) => setIg(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ep-tw" className={labelCls}>
                  Twitter / X
                </label>
                <input
                  id="ep-tw"
                  placeholder="@yourhandle"
                  className={inputCls}
                  value={tw}
                  onChange={(e) => setTw(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ep-yt" className={labelCls}>
                  YouTube Channel
                </label>
                <input
                  id="ep-yt"
                  placeholder="channel name or URL"
                  className={inputCls}
                  value={yt}
                  onChange={(e) => setYt(e.target.value)}
                />
              </div>
            </div>

            {/* Niche / Category Tags */}
            <p className={sectionCls}>Content Niche</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {NICHE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    tags.includes(tag.toLowerCase())
                      ? "bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE]"
                      : "bg-transparent border-[#2A3038] text-[#8B95A3]"
                  }`}
                >
                  {tag}
                </button>
              ))}
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

// Premium sheet
function PremiumSheet({
  open,
  onClose,
  userTier,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  userTier: UserTier;
  onUpgrade: (tier: UserTier) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[55] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="premium.modal"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
            aria-label="Close"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10 max-h-[88vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[#E9EEF5] font-black text-xl">
                  Choose Your Plan
                </h2>
                <p className="text-[#8B95A3] text-xs mt-0.5">
                  Unlock premium features
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center"
                data-ocid="premium.close_button"
              >
                <X size={16} className="text-[#8B95A3]" />
              </button>
            </div>

            {/* Classic Free */}
            <div
              className={`rounded-2xl border p-4 mb-3 ${
                userTier === "free"
                  ? "border-[#2A3038] bg-[#1A1F26]"
                  : "border-[#2A3038] bg-[#151920]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[#E9EEF5] font-bold text-base">
                    Classic
                  </span>
                  <span className="ml-2 text-[#8B95A3] text-sm">Free</span>
                </div>
                {userTier === "free" && (
                  <span className="text-[10px] font-bold bg-[#2A3038] text-[#8B95A3] px-2 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {[
                  "Basic feed access",
                  "5 hashtag slots",
                  "Standard support",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-[#8B95A3]"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#8B95A3]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div
              className={`rounded-2xl border-2 p-4 mb-3 ${
                userTier === "premium"
                  ? "border-[#22D3EE] bg-[#22D3EE]/5"
                  : "border-[#22D3EE]/50 bg-[#1A1F26]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#E9EEF5] font-bold text-base">
                    Premium
                  </span>
                  <span className="text-[#22D3EE] text-sm font-semibold">
                    $4.99/mo
                  </span>
                </div>
                {userTier === "premium" && (
                  <span className="text-[10px] font-bold bg-[#22D3EE]/20 text-[#22D3EE] px-2 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 mb-3">
                {[
                  "Verified badge \u2713",
                  "10 hashtag slots",
                  "Story analytics",
                  "Priority notifications",
                  "HD uploads",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-[#A6B0BC]"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#22D3EE]" />
                    {f}
                  </li>
                ))}
              </ul>
              {userTier !== "premium" && (
                <button
                  type="button"
                  onClick={() => {
                    onUpgrade("premium");
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#22D3EE] text-black font-bold text-sm"
                  data-ocid="premium.upgrade.primary_button"
                >
                  Upgrade
                </button>
              )}
            </div>

            {/* VIP */}
            <div
              className={`rounded-2xl border-2 p-4 ${
                userTier === "vip"
                  ? "border-[#FFD700] bg-[#FFD700]/5"
                  : "border-[#FFD700]/50 bg-[#1A1F26]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-[#FFD700] fill-[#FFD700]" />
                  <span className="text-[#E9EEF5] font-bold text-base">
                    VIP
                  </span>
                  <span className="text-[#FFD700] text-sm font-semibold">
                    $9.99/mo
                  </span>
                </div>
                {userTier === "vip" && (
                  <span className="text-[10px] font-bold bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 mb-3">
                {[
                  "Everything in Premium",
                  "Priority feed placement",
                  "Exclusive VIP badge",
                  "Profile border glow",
                  "Custom profile themes",
                  "Early access to features",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-[#A6B0BC]"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#FFD700]" />
                    {f}
                  </li>
                ))}
              </ul>
              {userTier !== "vip" && (
                <button
                  type="button"
                  onClick={() => {
                    onUpgrade("vip");
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FF8C69] text-black font-bold text-sm"
                  data-ocid="premium.vip.primary_button"
                >
                  Go VIP
                </button>
              )}
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [showPremium, setShowPremium] = useState(false);
  const [showQRCard, setShowQRCard] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
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
      backend
        .getUserSettings()
        .catch(() => ({ isPrivate: false, notificationsEnabled: true })),
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
          userSettings,
        ]) => {
          setIsPrivate((userSettings as any)?.isPrivate ?? false);
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
            // Auto-register user so profile is persisted
            const defaultUsername = myPrincipal.toString().slice(0, 8);
            backend
              .registerUser(defaultUsername, "VibeFlow creator", "")
              .catch(() => {});
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
    if (!backend || !thumbStorageClient || !identity) return;
    setCoverUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: coverPhotoKey } = await thumbStorageClient.putFile(bytes);
      const coverPhotoUrl =
        await thumbStorageClient.getDirectURL(coverPhotoKey);
      await backend.updateCoverPhoto(coverPhotoKey);
      setProfile((prev) => ({ ...prev, coverPhotoKey }));
      setCoverUrl(coverPhotoUrl);
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
      <div className="relative w-full h-52 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 50%, rgba(34,211,238,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,59,92,0.10) 0%, transparent 50%)",
              }}
            />
          </div>
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
          {/* VIP animated border on avatar */}
          <div
            className={`rounded-full p-[3px] ${userTier === "vip" ? "" : ""}`}
            style={{
              background:
                userTier === "vip"
                  ? "linear-gradient(135deg, #FFD700, #FF3B5C, #22D3EE, #FFD700)"
                  : "transparent",
            }}
          >
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
            {/* Camera badge */}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#22D3EE] flex items-center justify-center border-2 border-[#0F1216] pointer-events-none">
              <Camera size={10} className="text-black" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 border border-[#2A3038] px-4 py-2 rounded-xl text-sm text-[#E9EEF5] font-medium active:scale-95 transition-transform"
              data-ocid="profile.edit.button"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowQRCard(true)}
              className="w-10 h-10 border border-[#2A3038] rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Share profile"
              data-ocid="profile.share.button"
            >
              <Share2 size={16} className="text-[#8B95A3]" />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 border border-[#2A3038] rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              data-ocid="profile.settings.button"
            >
              <Settings size={16} className="text-[#8B95A3]" />
            </button>
          </div>
        </div>

        {/* Username + tier badge + privacy */}
        <h2 className="font-bold text-xl flex items-center gap-1.5">
          @{profile.username}
          {isPrivate && <Lock size={14} className="text-[#8B95A3] shrink-0" />}
          {userTier === "premium" && (
            <span className="text-[10px] font-black bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40 px-1.5 py-0.5 rounded-md">
              PRO
            </span>
          )}
          {userTier === "vip" && (
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
              style={{
                background: "linear-gradient(90deg, #FFD700, #FF8C69)",
                color: "#000",
                boxShadow: "0 0 8px rgba(255,215,0,0.4)",
              }}
            >
              VIP
            </span>
          )}
        </h2>
        {extras.displayName && (
          <p className="text-[#E9EEF5] text-sm font-semibold mt-0.5">
            {extras.displayName}
          </p>
        )}
        <p className="text-[#A6B0BC] text-sm mt-0.5">{extras.cleanBio}</p>
        {extras.pronouns && (
          <p className="text-[#8B95A3] text-xs mt-1">{extras.pronouns}</p>
        )}
        {extras.location && (
          <p className="text-[#8B95A3] text-xs mt-0.5">
            \uD83D\uDCCD {extras.location}
          </p>
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
        {/* Social links row */}
        {(extras.ig || extras.tw || extras.yt) && (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {extras.ig && (
              <span className="text-xs text-[#8B95A3] bg-[#1A1F26] px-2 py-0.5 rounded-full">
                \uD83D\uDCF8 {extras.ig}
              </span>
            )}
            {extras.tw && (
              <span className="text-xs text-[#8B95A3] bg-[#1A1F26] px-2 py-0.5 rounded-full">
                \uD835\uDD4F {extras.tw}
              </span>
            )}
            {extras.yt && (
              <span className="text-xs text-[#8B95A3] bg-[#1A1F26] px-2 py-0.5 rounded-full">
                \uD83C\uDFA5 {extras.yt}
              </span>
            )}
          </div>
        )}
        {/* Niche tags */}
        {extras.tags.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {extras.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20 capitalize"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Stats row — premium pill style */}
        <div className="flex mt-4 mb-2 bg-[#1A1F26] rounded-2xl p-2 gap-0">
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
          ].map((stat, si) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className={`flex-1 flex flex-col items-center py-2 ${
                stat.onClick
                  ? "cursor-pointer active:scale-95 transition-transform"
                  : "cursor-default"
              } ${si > 0 ? "border-l border-[#2A3038]" : ""}`}
              data-ocid={
                stat.onClick
                  ? `profile.${stat.label.toLowerCase()}.button`
                  : undefined
              }
            >
              <p className="font-black text-lg leading-none text-[#E9EEF5]">
                {stat.value}
              </p>
              <p className="text-[9px] text-[#8B95A3] mt-0.5 uppercase tracking-widest">
                {stat.label}
              </p>
            </button>
          ))}
        </div>

        {/* Premium row */}
        <div className="pb-1">
          <button
            type="button"
            onClick={() => setShowPremium(true)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-[#1A1F26] to-[#22D3EE]/10 border border-[#22D3EE]/30 rounded-2xl px-4 py-3"
            data-ocid="profile.premium.button"
          >
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#FFD700]" />
              <span className="text-sm font-semibold text-[#E9EEF5]">
                {userTier === "free"
                  ? "Upgrade to Premium"
                  : userTier === "premium"
                    ? "Premium Member"
                    : "VIP Member"}
              </span>
            </div>
            <ChevronRight size={16} className="text-[#8B95A3]" />
          </button>
        </div>
      </div>

      {/* Activity Status */}
      <div className="px-4 pb-1">
        <span className="text-[10px] text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">
          &#x1F7E2; Active now
        </span>
      </div>

      {/* Achievement Badges */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-[#8B95A3] font-bold uppercase tracking-widest mb-2">
          Achievements
        </p>
        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
          {[
            {
              emoji: "\uD83C\uDF31",
              label: "First Upload",
              unlocked: myVideos.length >= 1,
            },
            {
              emoji: "\uD83D\uDD25",
              label: "Trending",
              unlocked: myVideos.length >= 5,
            },
            {
              emoji: "\uD83D\uDC8E",
              label: "100+ Followers",
              unlocked: Number(followerCount) >= 100,
            },
            {
              emoji: "\uD83C\uDFC6",
              label: "Super Creator",
              unlocked: myVideos.length >= 20,
            },
            { emoji: "\u2B50", label: "Verified Fan", unlocked: true },
          ].map((badge) => (
            <div
              key={badge.label}
              className={`flex flex-col items-center gap-1 shrink-0 px-2 py-2 rounded-xl border ${badge.unlocked ? "bg-[#1A1F26] border-[#2A3038]" : "bg-[#0F1216] border-[#1A1F26] opacity-40"}`}
            >
              <span className={`text-xl ${badge.unlocked ? "" : "grayscale"}`}>
                {badge.emoji}
              </span>
              <span className="text-[9px] text-[#8B95A3] font-semibold text-center w-16 truncate">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics section (owner only) */}
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setShowAnalytics((v) => !v)}
          className="w-full flex items-center justify-between bg-[#1A1F26] border border-[#2A3038] rounded-2xl px-4 py-3"
          data-ocid="profile.analytics.button"
        >
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-[#22D3EE]" />
            <span className="text-sm font-semibold text-[#E9EEF5]">
              Analytics
            </span>
          </div>
          <ChevronRight
            size={16}
            className={`text-[#8B95A3] transition-transform ${showAnalytics ? "rotate-90" : ""}`}
          />
        </button>
        {showAnalytics && (
          <div className="mt-2 bg-[#1A1F26] border border-[#2A3038] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="flex-1 text-center">
                <p className="text-[#E9EEF5] font-black text-xl">
                  {myVideos.length}
                </p>
                <p className="text-[#8B95A3] text-[10px] uppercase tracking-widest">
                  Posts
                </p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[#22D3EE] font-black text-xl">
                  {myVideos
                    .reduce((a, v) => a + Number(v.views), 0)
                    .toLocaleString()}
                </p>
                <p className="text-[#8B95A3] text-[10px] uppercase tracking-widest">
                  Views
                </p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[#FF3B5C] font-black text-xl">
                  {Number(totalLikes).toLocaleString()}
                </p>
                <p className="text-[#8B95A3] text-[10px] uppercase tracking-widest">
                  Likes
                </p>
              </div>
            </div>
            {/* CSS sparkline bars */}
            <div>
              <p className="text-[#8B95A3] text-[10px] mb-2 font-semibold">
                Views this week
              </p>
              <div className="flex items-end gap-1 h-10">
                {([40, 65, 35, 80, 55, 90, 70] as const).map((h, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: sparkline bars
                    key={`bar-${i}`}
                    className="flex-1 bg-[#22D3EE]/60 rounded-sm"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {(["M", "T", "W", "T", "F", "S", "S"] as const).map((d, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: day labels
                    key={`day-${i}`}
                    className="flex-1 text-center text-[8px] text-[#8B95A3]"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Share */}
      {showQRCard && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
          data-ocid="profile.qr.modal"
        >
          <div className="bg-[#151920] rounded-3xl p-6 w-full max-w-xs border border-[#2A3038]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#E9EEF5] font-bold">Share Profile</h3>
              <button
                type="button"
                onClick={() => setShowQRCard(false)}
                className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center"
                data-ocid="profile.qr.close_button"
              >
                <X size={14} className="text-[#8B95A3]" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 mb-4">
              <img
                src={profile.avatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-[#22D3EE]"
              />
              <p className="text-[#E9EEF5] font-bold">@{profile.username}</p>
            </div>
            {/* CSS QR code simulation */}
            <div className="grid grid-cols-10 gap-[2px] mb-4 mx-auto w-fit">
              {Array.from({ length: 100 }).map((_, i) => {
                const isCorner =
                  (i < 30 && (i % 10 < 3 || i % 10 > 6)) ||
                  (i >= 70 && i % 10 < 3);
                const isData = Math.abs(Math.sin(i * 137.508)) > 0.5;
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: qr grid
                    key={`qr-${i}`}
                    className={`w-3 h-3 rounded-[1px] ${isCorner ? "bg-[#22D3EE]" : isData ? "bg-[#E9EEF5]" : "bg-transparent"}`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}?profile=${identity?.getPrincipal().toString()}`;
                navigator.clipboard.writeText(url).catch(() => {});
                setShowQRCard(false);
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] text-black font-bold text-sm"
              data-ocid="profile.qr.download.button"
            >
              Copy Profile Link
            </button>
          </div>
        </div>
      )}

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
        onSave={async (p) => {
          setProfile((prev) => ({ ...prev, ...p }));
          if (backend) {
            try {
              await backend.updateProfile(
                p.username,
                p.bio,
                profile.avatarKey || "",
              );
            } catch {}
          }
          setShowEdit(false);
        }}
      />

      {/* Premium sheet */}
      <PremiumSheet
        open={showPremium}
        onClose={() => setShowPremium(false)}
        userTier={userTier}
        onUpgrade={(tier) => setUserTier(tier)}
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
