import { Bell, CloudUpload, Compass, Heart, Home, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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
  const { backend, isLoggedIn, login } = useBackend();
  const { isLoginError, loginError } = useInternetIdentity();
  const imageStorageClient = useStorageClient("images");
  const videoStorageClient = useStorageClient("videos");
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
    if (!isLoggedIn) {
      login();
      return;
    }
    // Close modal and navigate to Home so user sees the progress bar
    setShowUploadModal(false);
    setActiveTab("home");
    setUploadProgress({ filename: "Connecting...", percent: 0 });
    setUploadError(null);
    try {
      // Fast-path: skip polling if already ready
      let be = backendRef.current;
      let vc = videoStorageClientRef.current;
      if (be == null || vc == null) {
        // Show connecting state and wait
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
    // Close modal and navigate to Home so user sees the progress bar
    setShowUploadModal(false);
    setActiveTab("home");
    setUploadProgress({ filename: "Connecting...", percent: 0 });
    setUploadError(null);
    try {
      // Fast-path: skip polling if already ready
      let be = backendRef.current;
      let ic = imageStorageClientRef.current;
      if (be == null || ic == null) {
        // Show connecting state and wait
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
    </div>
  );
}
