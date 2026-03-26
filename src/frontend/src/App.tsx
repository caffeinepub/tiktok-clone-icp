import {
  Bell,
  CloudUpload,
  Compass,
  Heart,
  Home,
  Plus,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import VideoUploadModal from "./components/VideoUploadModal";
import { useBackend } from "./hooks/useBackend";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
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

interface NotifItem {
  id: string;
  type: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  text: string;
  timeMs: number;
  read: boolean;
  videoId?: string | null;
}

/** Wait up to `timeoutMs` for a value supplier to return non-null/undefined. */
function waitForValue<T>(
  getValue: () => T | null | undefined,
  timeoutMs = 15000,
  intervalMs = 100,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const v = getValue();
    if (v != null) {
      resolve(v);
      return;
    }
    const interval = setInterval(() => {
      const v2 = getValue();
      if (v2 != null) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve(v2);
      }
    }, intervalMs);
    const timer = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Upload service not ready. Please try again."));
    }, timeoutMs);
  });
}

const typeText = (t: string, videoId: string | null | undefined) => {
  if (t === "like") return videoId ? "liked your video" : "liked something";
  if (t === "comment") return "commented on your video";
  if (t === "match") return "You matched! 🎉";
  if (t === "follow_request") return "sent you a follow request";
  if (t === "follow_request_accepted") return "accepted your follow request";
  if (t === "story_reaction") return "reacted to your story";
  if (t === "story_comment") return "commented on your story";
  return "started following you";
};

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
  const [uploadProgress, setUploadProgress] = useState<{
    filename: string;
    percent: number;
  } | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const { backend, isLoggedIn, login } = useBackend();
  const { isLoginError, loginError } = useInternetIdentity();
  const imageStorageClient = useStorageClient("images");
  const videoStorageClient = useStorageClient("videos");
  const thumbStorageClient = useStorageClient("thumbnails");
  const _uploadPhotoRef = useRef<((file: File) => Promise<void>) | null>(null);

  // Keep refs so waitForValue closures always see latest values
  const backendRef = useRef(backend);
  const imageStorageClientRef = useRef(imageStorageClient);
  const videoStorageClientRef = useRef(videoStorageClient);
  useEffect(() => {
    backendRef.current = backend;
  }, [backend]);
  useEffect(() => {
    imageStorageClientRef.current = imageStorageClient;
  }, [imageStorageClient]);
  useEffect(() => {
    videoStorageClientRef.current = videoStorageClient;
  }, [videoStorageClient]);

  // Auto-dismiss upload errors after 4 seconds
  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(null), 4000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const loadNotifs = useCallback(async () => {
    if (!isLoggedIn || !backend) return;
    try {
      const raw = await backend.getNotifications();
      const resolved: NotifItem[] = await Promise.all(
        (raw as any[]).map(async (n: any) => {
          const senderId =
            typeof n.sender === "object"
              ? n.sender.toString()
              : String(n.sender);
          let senderUsername = `${senderId.slice(0, 8)}...`;
          let senderAvatar = `https://i.pravatar.cc/100?u=${senderId}`;
          try {
            const profileOpt = await backend.getProfile(n.sender);
            if (profileOpt.__kind__ === "Some") {
              senderUsername = profileOpt.value.username;
              let av = profileOpt.value.avatarKey || senderAvatar;
              if (thumbStorageClient && av.startsWith("sha256:")) {
                try {
                  av = await thumbStorageClient.getDirectURL(av);
                } catch {}
              }
              senderAvatar = av;
            }
          } catch {}
          const videoId =
            Array.isArray(n.videoId) && n.videoId.length > 0
              ? n.videoId[0]
              : null;
          return {
            id: n.id,
            type: n.notifType,
            senderId,
            senderUsername,
            senderAvatar,
            text: typeText(n.notifType, videoId),
            timeMs: Number(n.createdAt) / 1_000_000,
            read: n.read,
            videoId,
          };
        }),
      );
      setNotifs(resolved);
      setUnreadCount(resolved.filter((n) => !n.read).length);
    } catch {}
  }, [backend, isLoggedIn, thumbStorageClient]);

  useEffect(() => {
    if (!isLoggedIn || !backend) return;
    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, backend, loadNotifs]);

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
    if (!isLoggedIn) {
      login();
      return;
    }
    setShowUploadModal(false);
    setActiveTab("home");
    setUploadProgress({ filename: "Connecting...", percent: 0 });
    setUploadError(null);
    try {
      let be = backendRef.current;
      let vc = videoStorageClientRef.current;
      if (be == null || vc == null) {
        [be, vc] = await Promise.all([
          waitForValue(() => backendRef.current),
          waitForValue(() => videoStorageClientRef.current),
        ]);
      }
      setUploadProgress({ filename: file.name, percent: 0 });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: videoKey } = await vc.putFile(bytes, (pct: number) =>
        setUploadProgress({ filename: file.name, percent: pct }),
      );
      const title = `${file.name.replace(/\.[^.]+$/, "")} [${quality}] [${visibility}]`;
      await be.postVideo(title, "", [], videoKey, "");
      setFeedRefreshKey((k) => k + 1);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Video upload failed. Please try again.";
      setUploadError(msg);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleGalleryPhoto = async (file: File) => {
    if (!isLoggedIn) {
      login();
      return;
    }
    setShowUploadModal(false);
    setActiveTab("home");
    setUploadProgress({ filename: "Connecting...", percent: 0 });
    setUploadError(null);
    try {
      let be = backendRef.current;
      let ic = imageStorageClientRef.current;
      if (be == null || ic == null) {
        [be, ic] = await Promise.all([
          waitForValue(() => backendRef.current),
          waitForValue(() => imageStorageClientRef.current),
        ]);
      }
      setUploadProgress({ filename: file.name, percent: 0 });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: imageKey } = await ic.putFile(bytes, (pct: number) =>
        setUploadProgress({ filename: file.name, percent: pct }),
      );
      await be.postPhoto(imageKey, file.name.replace(/\.[^.]+$/, ""), []);
      setFeedRefreshKey((k) => k + 1);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Photo upload failed. Please try again.";
      setUploadError(msg);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleNotifClick = (notif: NotifItem) => {
    setShowNotifPanel(false);
    if (notif.videoId) {
      setViewingPost(notif.videoId);
    } else if (
      notif.type === "follow_request" ||
      notif.type === "follow_request_accepted" ||
      notif.type === "follow"
    ) {
      setViewingCreator(notif.senderId);
    } else {
      // navigate to inbox for messages/other
      setActiveTab("inbox");
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
          <AnimatePresence>
            {isLoginError && (
              <motion.div
                key="auth-error"
                data-ocid="auth.error_state"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full p-4 rounded-2xl bg-[#FF3B5C]/10 border border-[#FF3B5C]/30"
              >
                <p className="text-[#FF3B5C] text-sm font-semibold text-center">
                  Authentication failed
                </p>
                <p className="text-[#FF3B5C]/80 text-xs text-center mt-1">
                  {loginError?.message?.includes("already authenticated")
                    ? "Session conflict. Please try again."
                    : "Please try again — tap Get Started below."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
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
      {/* Header — only visible on Home tab */}
      <AnimatePresence>
        {activeTab === "home" && (
          <motion.header
            key="home-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between px-4 py-3 bg-[#0F1216] border-b border-[#2A3038] shrink-0"
          >
            {/* Left: Logo + VibeFlow text */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#FF3B5C] flex items-center justify-center">
                <span className="text-white font-black text-base">V</span>
              </div>
              <span className="text-xl font-bold tracking-tight">VibeFlow</span>
            </div>

            {/* Right: Heart (notifications) + Plus (create) */}
            <div className="flex items-center gap-2">
              {/* Heart notification icon */}
              <button
                type="button"
                onClick={() => {
                  setShowNotifPanel(true);
                  setNotifsLoading(true);
                  loadNotifs().finally(() => setNotifsLoading(false));
                }}
                className="relative w-9 h-9 flex items-center justify-center"
                aria-label="Notifications"
              >
                <Heart size={22} className="text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FF3B5C] text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Plus / Create button */}
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                data-ocid="header.primary_button"
                className="w-9 h-9 rounded-full bg-[#22D3EE] flex items-center justify-center"
                aria-label="Create"
              >
                <Plus size={20} className="text-black" />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Upload error banner */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            key="upload-error"
            data-ocid="upload.error_state"
            className="shrink-0 flex items-center justify-between gap-2 bg-[#FF3B5C]/15 border-b border-[#FF3B5C]/30 px-4 py-2.5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-[#FF3B5C] text-xs font-semibold flex-1">
              {uploadError}
            </span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-[#FF3B5C] shrink-0"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="flex-1 overflow-hidden relative">
        <div className={activeTab === "home" ? "block h-full" : "hidden"}>
          <FeedPage
            onViewProfile={handleViewProfile}
            isActive={activeTab === "home"}
            onDuet={(videoId, videoUrl) => setDuetState({ videoId, videoUrl })}
            refreshKey={feedRefreshKey}
          />
        </div>
        <div className={activeTab === "explore" ? "block h-full" : "hidden"}>
          <ExplorePage
            onViewProfile={handleViewProfile}
            onViewPost={handleViewPost}
            refreshKey={feedRefreshKey}
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

      {/* Upload Progress Bar */}
      <AnimatePresence>
        {uploadProgress && (
          <motion.div
            key="upload-progress"
            data-ocid="upload.loading_state"
            className="fixed bottom-[72px] left-0 right-0 z-[60] px-3 pb-1"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="bg-[#151920] border border-[#2A3038] rounded-2xl px-4 py-3 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-[#22D3EE]/10 flex items-center justify-center">
                  <CloudUpload size={16} className="text-[#22D3EE]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#E9EEF5] text-xs font-semibold truncate max-w-[180px]">
                      {uploadProgress.filename}
                    </span>
                    <span className="text-[#22D3EE] text-xs font-bold ml-2 shrink-0">
                      {uploadProgress.filename === "Connecting..."
                        ? "..."
                        : `${uploadProgress.percent}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#2A3038] overflow-hidden">
                    {uploadProgress.filename === "Connecting..." ? (
                      <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] animate-pulse" />
                    ) : (
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${uploadProgress.percent}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifPanel && (
          <motion.div
            key="notif-panel"
            className="fixed inset-0 z-[70] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowNotifPanel(false)}
              aria-label="Close notifications"
            />
            {/* Panel */}
            <motion.div
              className="absolute top-0 left-0 right-0 max-h-[80vh] bg-[#151920] rounded-b-3xl border-b border-x border-[#2A3038] flex flex-col overflow-hidden"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <h3 className="text-[#E9EEF5] font-bold text-base">
                  Notifications
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNotifPanel(false)}
                  className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center"
                >
                  <X size={16} className="text-[#8B95A3]" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1">
                {notifsLoading && notifs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart size={32} className="text-[#2A3038] mx-auto mb-2" />
                    <p className="text-[#8B95A3] text-sm">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  <div className="px-4 pb-6 space-y-1">
                    {notifs.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotifClick(n)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${
                          n.read ? "bg-transparent" : "bg-[#1A1F26]"
                        }`}
                      >
                        <img
                          src={n.senderAvatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#E9EEF5] text-sm font-semibold truncate">
                            @{n.senderUsername}
                          </p>
                          <p className="text-[#8B95A3] text-xs truncate">
                            {n.text}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full bg-[#FF3B5C] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
