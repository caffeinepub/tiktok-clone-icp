import { Bookmark, Grid3x3, Heart, LogOut, Play, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import AuthModal from "../components/AuthModal";
import EditProfileModal from "../components/EditProfileModal";
import { useBackend } from "../hooks/useBackend";
import { SAMPLE_VIDEOS, formatCount } from "../types/app";

type ProfileTab = "videos" | "saved";

export default function ProfilePage({
  onViewProfile: _onViewProfile,
}: { onViewProfile: (id: string) => void }) {
  const { isLoggedIn, identity, login } = useBackend();
  const [showAuth, setShowAuth] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const [profile, setProfile] = useState({
    username: isLoggedIn ? "vibeflow_user" : "Guest",
    bio: isLoggedIn
      ? "Living life one vibe at a time ✨"
      : "Sign in to set up your profile",
    avatar: `https://i.pravatar.cc/100?u=${identity?.getPrincipal().toString() ?? "anon"}`,
  });

  const [savedVideos] = useState(SAMPLE_VIDEOS.slice(0, 2));
  const myVideos = SAMPLE_VIDEOS.slice(0, 3);

  const totalLikes = myVideos.reduce(
    (acc, _) => acc + Math.floor(Math.random() * 10000 + 1000),
    0,
  );
  const followerCount = 1247;
  const followingCount = 89;

  const initials = profile.username.slice(0, 2).toUpperCase();

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

  return (
    <div
      className="h-full overflow-y-auto bg-[#0F1216]"
      data-ocid="profile.page"
    >
      {/* Header area */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-start justify-between mb-4">
          {/* Avatar */}
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

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 border border-[#2A3038] px-4 py-2 rounded-xl text-sm text-[#E9EEF5] font-medium"
              data-ocid="profile.edit.button"
            >
              <Settings size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => {}}
              className="w-10 h-10 border border-[#2A3038] rounded-xl flex items-center justify-center"
              data-ocid="profile.logout.button"
              title="Logout"
            >
              <LogOut size={16} className="text-[#8B95A3]" />
            </button>
          </div>
        </div>

        <h2 className="font-bold text-xl">@{profile.username}</h2>
        <p className="text-[#A6B0BC] text-sm mb-4">{profile.bio}</p>

        {/* Stats */}
        <div className="flex gap-0 mb-4">
          {[
            { label: "Videos", value: myVideos.length },
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

      {/* Tabs */}
      <div className="flex border-b border-[#2A3038] px-4">
        <button
          type="button"
          onClick={() => setActiveTab("videos")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "videos"
              ? "border-[#22D3EE] text-[#22D3EE]"
              : "border-transparent text-[#8B95A3]"
          }`}
          data-ocid="profile.videos.tab"
        >
          <Grid3x3 size={16} /> Videos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "saved"
              ? "border-[#22D3EE] text-[#22D3EE]"
              : "border-transparent text-[#8B95A3]"
          }`}
          data-ocid="profile.saved.tab"
        >
          <Bookmark size={16} /> Saved
        </button>
        <button
          type="button"
          onClick={() => {}}
          className="flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors border-transparent text-[#8B95A3]"
          data-ocid="profile.likes.tab"
        >
          <Heart size={16} /> Liked
        </button>
      </div>

      {/* Content grid */}
      <div className="px-3 pt-3 pb-6">
        {activeTab === "videos" &&
          (myVideos.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="profile.videos.empty_state"
            >
              <p className="text-[#8B95A3]">No videos yet. Start creating!</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-3 gap-1"
              data-ocid="profile.videos.list"
            >
              {myVideos.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1F26]"
                  data-ocid={`profile.videos.item.${i + 1}`}
                >
                  <img
                    src={v.thumbnailKey}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
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
          ))}
        {activeTab === "saved" &&
          (savedVideos.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="profile.saved.empty_state"
            >
              <Bookmark size={40} className="text-[#2A3038] mx-auto mb-3" />
              <p className="text-[#8B95A3]">No saved videos yet</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-3 gap-1"
              data-ocid="profile.saved.list"
            >
              {savedVideos.map((v, i) => (
                <div
                  key={v.id}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1F26]"
                  data-ocid={`profile.saved.item.${i + 1}`}
                >
                  <img
                    src={v.thumbnailKey}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                    <Bookmark
                      size={9}
                      className="text-[#22D3EE] fill-[#22D3EE]"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>

      <EditProfileModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        profile={profile}
        onSave={(p) => {
          setProfile(p);
          setShowEdit(false);
        }}
      />
    </div>
  );
}
