import { Grid, Play, Settings } from "lucide-react";
import { useState } from "react";
import AuthModal from "../components/AuthModal";
import EditProfileModal from "../components/EditProfileModal";
import { useBackend } from "../hooks/useBackend";
import { SAMPLE_VIDEOS } from "../types/app";

export default function ProfilePage() {
  const { isLoggedIn, identity } = useBackend();
  const [showAuth, setShowAuth] = useState(!isLoggedIn);
  const [showEdit, setShowEdit] = useState(false);
  const [profile, setProfile] = useState({
    username: "you",
    bio: 'Tap "Edit profile" to set up your account',
    avatar: `https://i.pravatar.cc/100?u=${identity?.getPrincipal().toString() ?? "anon"}`,
  });

  if (showAuth) {
    return (
      <>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <div className="h-full flex flex-col items-center justify-center text-[#8B95A3] gap-4 p-8">
          <div className="w-20 h-20 rounded-full bg-[#1A1F26] flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
          <p className="text-center font-semibold text-[#E9EEF5]">
            Sign in to view your profile
          </p>
        </div>
      </>
    );
  }

  const myVideos = SAMPLE_VIDEOS.slice(0, 2);

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216]">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between mb-4">
          <img
            src={profile.avatar}
            alt=""
            className="w-20 h-20 rounded-full border-2 border-[#22D3EE] object-cover"
          />
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 border border-[#2A3038] px-4 py-2 rounded-xl text-sm text-[#E9EEF5]"
          >
            <Settings size={14} /> Edit profile
          </button>
        </div>
        <h2 className="font-bold text-lg">@{profile.username}</h2>
        <p className="text-[#A6B0BC] text-sm mb-3">{profile.bio}</p>
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="font-bold text-lg">{myVideos.length}</p>
            <p className="text-xs text-[#8B95A3]">Videos</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">0</p>
            <p className="text-xs text-[#8B95A3]">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">0</p>
            <p className="text-xs text-[#8B95A3]">Following</p>
          </div>
        </div>
      </div>

      <div className="px-3">
        <div className="flex items-center gap-2 mb-3">
          <Grid size={16} className="text-[#22D3EE]" />
          <span className="text-sm font-semibold text-[#22D3EE]">Videos</span>
        </div>
        {myVideos.length === 0 ? (
          <p className="text-center text-[#8B95A3] py-12">No videos yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {myVideos.map((v) => (
              <div
                key={v.id}
                className="relative aspect-[9/16] rounded-lg overflow-hidden bg-[#1A1F26]"
              >
                <img
                  src={v.thumbnailKey}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1 flex items-center gap-1">
                  <Play size={10} className="text-white fill-white" />
                  <span className="text-white text-[10px]">
                    {Number(v.views / 1000n)}K
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
