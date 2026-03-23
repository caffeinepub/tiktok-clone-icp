import { Bell, Compass, Heart, Home, PlusSquare, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import VideoUploadModal from "./components/VideoUploadModal";
import { useBackend } from "./hooks/useBackend";
import { useStorageClient } from "./hooks/useStorageClient";
import CameraPage from "./pages/CameraPage";
import ChatPage from "./pages/ChatPage";
import DuetPage from "./pages/DuetPage";
import ExplorePage from "./pages/ExplorePage";
import FeedPage from "./pages/FeedPage";
import InboxPage from "./pages/InboxPage";
import MatchPage from "./pages/MatchPage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";

type Tab = "home" | "explore" | "match" | "inbox" | "profile";

interface ChatState {
  principal: string;
  username: string;
  avatarUrl: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [viewingCreator, setViewingCreator] = useState<string | null>(null);
  const [viewingPost, setViewingPost] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [duetState, setDuetState] = useState<{
    videoUrl: string;
    videoId: string;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { backend, isLoggedIn, login } = useBackend();
  const imageStorageClient = useStorageClient("images");
  const videoStorageClient = useStorageClient("videos");
  const _uploadPhotoRef = useRef<((file: File) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !backend) return;
    const fetchNotifs = async () => {
      try {
        const notifs = await backend.getNotifications();
        setUnreadCount(notifs.filter((n: any) => !n.read).length);
      } catch {
        /* silent */
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, backend]);

  const handleViewProfile = (creatorId: string) => setViewingCreator(creatorId);
  const handleViewPost = (postId: string) => setViewingPost(postId);
  const handleOpenChat = (
    principal: string,
    username: string,
    avatarUrl: string,
  ) => setChatState({ principal, username, avatarUrl });

  const handleGalleryVideo = async (
    file: File,
    quality: string,
    visibility: string,
  ) => {
    if (!backend || !videoStorageClient) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: videoKey } = await videoStorageClient.putFile(bytes);
      const title = `${file.name.replace(/\.[^.]+$/, "")} [${quality}] [${visibility}]`;
      await backend.postVideo(title, "", [], videoKey, "");
    } catch {
      /* silent */
    }
  };

  const handleGalleryPhoto = async (file: File) => {
    if (!backend || !imageStorageClient) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: imageKey } = await imageStorageClient.putFile(bytes);
      await backend.postPhoto(imageKey, file.name.replace(/\.[^.]+$/, ""), []);
    } catch {
      /* silent */
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        className="fixed inset-0 bg-[#0F1216] flex flex-col items-center justify-center p-8"
        data-ocid="auth.page"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 mb-12"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#22D3EE] via-[#FF3B5C] to-[#FF8C69] flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-5xl">V</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-[#E9EEF5] tracking-tight">
              VibeFlow
            </h1>
            <p className="text-[#8B95A3] text-base mt-2">
              Create. Match. Vibe.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-xs flex flex-col gap-3"
        >
          <button
            type="button"
            onClick={login}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] text-black font-black text-lg tracking-tight shadow-lg active:scale-95 transition-transform"
            data-ocid="auth.login.primary_button"
          >
            Get Started
          </button>
          <button
            type="button"
            onClick={login}
            className="w-full py-4 rounded-2xl bg-[#1A1F26] text-[#E9EEF5] font-semibold text-base border border-[#2A3038] active:scale-95 transition-transform"
            data-ocid="auth.signin.secondary_button"
          >
            Sign In
          </button>
        </motion.div>

        <p className="absolute bottom-8 text-[#8B95A3] text-xs text-center">
          Powered by Internet Computer
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0F1216] text-[#E9EEF5] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0F1216] border-b border-[#2A3038] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#FF3B5C] flex items-center justify-center">
            <span className="text-white font-black text-base">V</span>
          </div>
          <span className="text-xl font-bold tracking-tight">VibeFlow</span>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          data-ocid="header.primary_button"
          className="flex items-center gap-1.5 bg-[#22D3EE] text-black px-3 py-1.5 rounded-full text-sm font-bold"
        >
          + Create
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden relative">
        <div className={activeTab === "home" ? "block h-full" : "hidden"}>
          <FeedPage
            onViewProfile={handleViewProfile}
            isActive={activeTab === "home"}
            onDuet={(videoId, videoUrl) => setDuetState({ videoId, videoUrl })}
          />
        </div>
        <div className={activeTab === "explore" ? "block h-full" : "hidden"}>
          <ExplorePage
            onViewProfile={handleViewProfile}
            onViewPost={handleViewPost}
          />
        </div>
        <div className={activeTab === "match" ? "block h-full" : "hidden"}>
          <MatchPage onOpenChat={handleOpenChat} />
        </div>
        <div className={activeTab === "inbox" ? "block h-full" : "hidden"}>
          <InboxPage onOpenChat={handleOpenChat} />
        </div>
        <div className={activeTab === "profile" ? "block h-full" : "hidden"}>
          <ProfilePage
            onViewProfile={handleViewProfile}
            onViewPost={handleViewPost}
          />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 flex items-center bg-[#0F1216] border-t border-[#2A3038] pb-safe">
        {(
          [
            { id: "home", icon: Home, label: "Home", badge: 0 },
            { id: "explore", icon: Compass, label: "Explore", badge: 0 },
            { id: "match", icon: Heart, label: "Match", badge: 0 },
            { id: "inbox", icon: Bell, label: "Inbox", badge: unreadCount },
            { id: "profile", icon: User, label: "Profile", badge: 0 },
          ] as const
        ).map(({ id, icon: Icon, label, badge }) => {
          const isActive = activeTab === id;
          const isCenter = id === "match";
          return (
            <button
              type="button"
              key={id}
              data-ocid={`nav.${id}.link`}
              onClick={() => setActiveTab(id as Tab)}
              className={
                "flex-1 flex flex-col items-center justify-center py-2 min-h-[56px]"
              }
            >
              {isCenter ? (
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-[#FF3B5C] to-[#FF8C69] shadow-[#FF3B5C]/30"
                      : "bg-[#1A1F26]"
                  }`}
                >
                  <Icon
                    size={22}
                    className={
                      isActive ? "text-white fill-white" : "text-[#8B95A3]"
                    }
                  />
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  <Icon
                    size={22}
                    className={isActive ? "text-[#22D3EE]" : "text-[#8B95A3]"}
                  />
                  {badge && badge > 0 ? (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#FF3B5C] text-white text-[9px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  ) : null}
                  {label && (
                    <span
                      className={`text-[10px] mt-0.5 ${isActive ? "text-[#22D3EE]" : "text-[#8B95A3]"}`}
                    >
                      {label}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Video Upload Modal */}
      <VideoUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onRecord={() => {
          setShowUploadModal(false);
          setShowCamera(true);
        }}
        onGalleryVideo={handleGalleryVideo}
        onGalleryPhoto={handleGalleryPhoto}
      />

      {/* Camera overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            key="camera"
            className="fixed inset-0 z-50 bg-[#0F1216]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <CameraPage onDone={() => setShowCamera(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duet Page Overlay */}
      <AnimatePresence>
        {duetState && (
          <DuetPage
            key="duet"
            originalVideoUrl={duetState.videoUrl}
            originalVideoId={duetState.videoId}
            onDone={() => setDuetState(null)}
          />
        )}
      </AnimatePresence>

      {/* User Profile Overlay */}
      <AnimatePresence>
        {viewingCreator && (
          <motion.div
            key="user-profile"
            className="fixed inset-0 z-50 bg-[#0F1216]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <UserProfilePage
              creatorId={viewingCreator}
              onBack={() => setViewingCreator(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Detail Overlay */}
      <AnimatePresence>
        {viewingPost && (
          <PostDetailPage
            key="post-detail"
            postId={viewingPost}
            onBack={() => setViewingPost(null)}
            onViewProfile={(id) => {
              setViewingPost(null);
              setViewingCreator(id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat Overlay */}
      <AnimatePresence>
        {chatState && (
          <ChatPage
            key="chat"
            otherPrincipal={chatState.principal}
            username={chatState.username}
            avatarUrl={chatState.avatarUrl}
            onBack={() => setChatState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
