import {
  Bell,
  CloudUpload,
  Compass,
  Heart,
  Home,
  MessageCircle,
  Pause,
  Play,
  Plus,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import VideoUploadModal from "./components/VideoUploadModal";
import { WebRTCCallProvider } from "./components/WebRTCCallProvider";
import { useBackend } from "./hooks/useBackend";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useStorageClient } from "./hooks/useStorageClient";
import CameraPage from "./pages/CameraPage";
import ChatPage from "./pages/ChatPage";
import DuetPage from "./pages/DuetPage";
import ExplorePage from "./pages/ExplorePage";
import FeedPage from "./pages/FeedPage";
import HashtagPage from "./pages/HashtagPage";
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

interface MiniPlayerState {
  videoUrl: string;
  title: string;
  creatorUsername: string;
  thumbUrl: string;
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
  if (t === "match") return "You matched! \uD83C\uDF89";
  if (t === "follow_request") return "sent you a follow request";
  if (t === "follow_request_accepted") return "accepted your follow request";
  if (t === "story_reaction") return "reacted to your story";
  if (t === "story_comment") return "commented on your story";
  return "started following you";
};

const notifBorderColor = (t: string) => {
  if (t === "like") return "border-l-rose-500";
  if (t === "comment" || t === "story_comment") return "border-l-amber-400";
  if (t === "follow" || t === "follow_request_accepted")
    return "border-l-blue-500";
  if (t === "match") return "border-l-pink-400";
  if (t === "story_reaction") return "border-l-purple-500";
  return "border-l-blue-500";
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [viewingCreator, setViewingCreator] = useState<string | null>(null);
  const [viewingPost, setViewingPost] = useState<string | null>(null);
  const [viewingHashtag, setViewingHashtag] = useState<string | null>(null);
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
  const [miniPlayer, setMiniPlayer] = useState<MiniPlayerState | null>(null);
  const [miniPlaying, setMiniPlaying] = useState(true);
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const prevTab = useRef<Tab>("home");
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

  // Mini player: when leaving home tab while there's a potential video playing
  useEffect(() => {
    if (prevTab.current === "home" && activeTab !== "home") {
      // Don't clear mini player if already set, just keep it
    }
    prevTab.current = activeTab;
  }, [activeTab]);

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
      setActiveTab("inbox");
    }
  };

  const handleFollowBack = (senderId: string) => {
    import("@icp-sdk/core/principal").then(({ Principal }) => {
      backend?.followUser(Principal.fromText(senderId)).catch(() => {});
    });
  };

  if (!isLoggedIn) {
    return (
      <div
        className="fixed inset-0 bg-background flex flex-col items-center justify-center p-8"
        data-ocid="auth.page"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 mb-12"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-600 via-pink-500 to-rose-400 flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-5xl">V</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-foreground tracking-tight">
              VibeFlow
            </h1>
            <p className="text-muted-foreground text-base mt-2">
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
                className="w-full p-4 rounded-2xl bg-primary/10 border border-primary/30"
              >
                <p className="text-primary text-sm font-semibold text-center">
                  Authentication failed
                </p>
                <p className="text-primary/80 text-xs text-center mt-1">
                  {loginError?.message?.includes("already authenticated")
                    ? "Session conflict. Please try again."
                    : "Please try again \u2014 tap Get Started below."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={login}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-lg tracking-tight shadow-lg active:scale-95 transition-transform"
            data-ocid="auth.login.primary_button"
          >
            Get Started
          </button>
          <button
            type="button"
            onClick={login}
            className="w-full py-4 rounded-2xl bg-card text-foreground font-semibold text-base border border-border active:scale-95 transition-transform"
            data-ocid="auth.signin.secondary_button"
          >
            Sign In
          </button>
        </motion.div>

        <p className="absolute bottom-8 text-muted-foreground text-xs text-center">
          Powered by Internet Computer
        </p>
      </div>
    );
  }

  return (
    <WebRTCCallProvider>
      <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
        {/* Header \u2014 only visible on Home tab */}
        <AnimatePresence>
          {activeTab === "home" && (
            <motion.header
              key="home-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)",
              }}
            >
              {/* Left: Logo + VibeFlow text */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <span className="text-white font-black text-base">V</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  VibeFlow
                </span>
              </div>

              {/* Right: Heart (notifications) + Plus (create) */}
              <div className="flex items-center gap-2">
                {/* Heart notification icon */}
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifPanel(true);
                    setNotifsLoading(true);
                    loadNotifs()
                      .then(() => {
                        // Mark as read when panel opens
                        backend?.markNotificationsRead().catch(() => {});
                        setNotifs((prev) =>
                          prev.map((n) => ({ ...n, read: true })),
                        );
                        setUnreadCount(0);
                      })
                      .finally(() => setNotifsLoading(false));
                  }}
                  className="relative w-9 h-9 flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <Heart size={22} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Plus / Create button */}
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  data-ocid="header.primary_button"
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                  aria-label="Create"
                >
                  <Plus size={20} className="text-white" />
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
              className="shrink-0 flex items-center justify-between gap-2 bg-primary/15 border-b border-primary/30 px-4 py-2.5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="text-primary text-xs font-semibold flex-1">
                {uploadError}
              </span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-primary shrink-0"
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page content */}
        <main
          className="flex-1 overflow-hidden relative"
          style={{ position: "relative" }}
        >
          <div className={activeTab === "home" ? "block h-full" : "hidden"}>
            <FeedPage
              onViewProfile={handleViewProfile}
              onViewHashtag={(tag) => setViewingHashtag(tag)}
              isActive={activeTab === "home"}
              onDuet={(videoId, videoUrl) =>
                setDuetState({ videoId, videoUrl })
              }
              refreshKey={feedRefreshKey}
            />
          </div>
          <div className={activeTab === "explore" ? "block h-full" : "hidden"}>
            <ExplorePage
              onViewProfile={handleViewProfile}
              onViewPost={handleViewPost}
              onViewHashtag={(tag) => setViewingHashtag(tag)}
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
        <nav
          className="shrink-0 flex items-center backdrop-blur-xl border-t pb-safe"
          style={{
            background: "oklch(0.10 0.012 15 / 0.95)",
            borderColor: "oklch(0.22 0.018 15)",
          }}
        >
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
                        ? "bg-gradient-to-br from-rose-500 to-pink-400"
                        : "bg-card"
                    }`}
                  >
                    <Icon
                      size={22}
                      className={
                        isActive
                          ? "text-white fill-white"
                          : "text-muted-foreground"
                      }
                    />
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center">
                    <Icon
                      size={22}
                      className={
                        isActive ? "text-primary" : "text-muted-foreground"
                      }
                    />
                    {badge && badge > 0 ? (
                      <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                        {badge}
                      </span>
                    ) : null}
                    {label && (
                      <span
                        className={`text-[10px] mt-0.5 ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
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
              className="fixed inset-0 z-50 bg-background"
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
              className="fixed inset-0 z-50 bg-background"
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

        {/* Hashtag Page Overlay */}
        <AnimatePresence>
          {viewingHashtag && (
            <motion.div
              key="hashtag-page"
              className="fixed inset-0 z-50 bg-background"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <HashtagPage
                hashtag={viewingHashtag}
                onBack={() => setViewingHashtag(null)}
                onViewVideo={(id) => {
                  setViewingHashtag(null);
                  setViewingPost(id);
                }}
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
              <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-2xl shadow-black/60">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CloudUpload size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-foreground text-xs font-semibold truncate max-w-[180px]">
                        {uploadProgress.filename}
                      </span>
                      <span className="text-primary text-xs font-bold ml-2 shrink-0">
                        {uploadProgress.filename === "Connecting..."
                          ? "..."
                          : `${uploadProgress.percent}%`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      {uploadProgress.filename === "Connecting..." ? (
                        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 animate-pulse" />
                      ) : (
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
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

        {/* Mini Player (Picture-in-Picture) - shows when leaving home */}
        <AnimatePresence>
          {miniPlayer && activeTab !== "home" && (
            <motion.div
              key="mini-player"
              className="fixed bottom-[72px] left-0 right-0 z-[55] px-3 pb-1"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              data-ocid="mini_player.panel"
            >
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-border shrink-0">
                    <img
                      src={miniPlayer.thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-semibold truncate">
                      {miniPlayer.title}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      @{miniPlayer.creatorUsername}
                    </p>
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMiniPlaying((p) => !p);
                        if (miniVideoRef.current) {
                          if (miniPlaying) miniVideoRef.current.pause();
                          else miniVideoRef.current.play();
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                      data-ocid="mini_player.toggle"
                    >
                      {miniPlaying ? (
                        <Pause size={14} className="text-primary" />
                      ) : (
                        <Play
                          size={14}
                          className="text-primary fill-current ml-0.5"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMiniPlayer(null)}
                      className="w-8 h-8 rounded-full bg-card flex items-center justify-center"
                      data-ocid="mini_player.close_button"
                    >
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {/* Hidden video element */}
                <video
                  ref={miniVideoRef}
                  src={miniPlayer.videoUrl}
                  className="hidden"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
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
                className="absolute top-0 left-0 right-0 max-h-[85vh] bg-card rounded-b-3xl border-b border-x border-border flex flex-col overflow-hidden"
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 240 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                  <h3 className="text-foreground font-bold text-base">
                    Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    {notifs.some((n) => !n.read) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotifs((prev) =>
                            prev.map((n) => ({ ...n, read: true })),
                          );
                          setUnreadCount(0);
                          backend?.markNotificationsRead().catch(() => {});
                        }}
                        className="text-[10px] text-primary font-semibold"
                        data-ocid="notif_panel.mark_read.button"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifPanel(false)}
                      className="w-8 h-8 rounded-full bg-card flex items-center justify-center"
                    >
                      <X size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1">
                  {notifsLoading && notifs.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : notifs.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart size={32} className="text-border mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 pb-6 space-y-2">
                      {notifs.map((n) => (
                        <div
                          key={n.id}
                          className={`w-full flex gap-3 px-3 py-3 rounded-2xl border-l-4 ${notifBorderColor(
                            n.type,
                          )} ${n.read ? "bg-card/40" : "bg-card"}`}
                        >
                          {/* Avatar */}
                          <button
                            type="button"
                            onClick={() => handleNotifClick(n)}
                            className="shrink-0"
                          >
                            <img
                              src={n.senderAvatar}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleNotifClick(n)}
                              className="text-left w-full"
                            >
                              <p className="text-foreground text-sm font-semibold truncate">
                                @{n.senderUsername}
                              </p>
                              <p className="text-muted-foreground text-xs leading-snug mt-0.5">
                                {n.type === "like" && (
                                  <span className="flex items-center gap-1">
                                    <Heart
                                      size={11}
                                      className="text-primary fill-rose-500 shrink-0"
                                    />
                                    liked your video
                                  </span>
                                )}
                                {n.type === "comment" && (
                                  <span className="flex items-center gap-1">
                                    <MessageCircle
                                      size={11}
                                      className="text-primary shrink-0"
                                    />
                                    commented on your video
                                  </span>
                                )}
                                {n.type === "story_comment" && (
                                  <span className="flex items-center gap-1">
                                    <MessageCircle
                                      size={11}
                                      className="text-primary shrink-0"
                                    />
                                    commented on your story
                                  </span>
                                )}
                                {(n.type === "follow" ||
                                  n.type === "follow_request_accepted") && (
                                  <span className="flex items-center gap-1">
                                    <UserPlus
                                      size={11}
                                      className="text-blue-400 shrink-0"
                                    />
                                    {n.type === "follow_request_accepted"
                                      ? "accepted your follow request"
                                      : "started following you"}
                                  </span>
                                )}
                                {n.type === "match" && (
                                  <span className="flex items-center gap-1">
                                    <Heart
                                      size={11}
                                      className="text-accent fill-current shrink-0"
                                    />
                                    You matched! \uD83C\uDF89
                                  </span>
                                )}
                                {n.type === "story_reaction" && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-xs">
                                      {n.text?.match(
                                        /[\u{1F300}-\u{1FAD6}]/u,
                                      )?.[0] || "\uD83D\uDE0A"}
                                    </span>
                                    reacted to your story
                                  </span>
                                )}
                                {n.type === "follow_request" && (
                                  <span className="flex items-center gap-1">
                                    <UserPlus
                                      size={11}
                                      className="text-primary shrink-0"
                                    />
                                    sent you a follow request
                                  </span>
                                )}
                              </p>
                            </button>

                            {/* Inline action buttons */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {n.type === "follow_request" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleFollowBack(n.senderId)}
                                    className="px-3 py-1 rounded-full bg-primary text-black text-xs font-bold"
                                    data-ocid="notif.accept.button"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleNotifClick(n)}
                                    className="px-3 py-1 rounded-full border border-border text-foreground text-xs font-bold"
                                    data-ocid="notif.decline.button"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {(n.type === "follow" ||
                                n.type === "follow_request_accepted") && (
                                <button
                                  type="button"
                                  onClick={() => handleFollowBack(n.senderId)}
                                  className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold"
                                  data-ocid="notif.follow_back.button"
                                >
                                  Follow Back
                                </button>
                              )}
                              {n.type === "match" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNotifPanel(false);
                                    handleOpenChat(
                                      n.senderId,
                                      n.senderUsername,
                                      n.senderAvatar,
                                    );
                                  }}
                                  className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-400 text-white text-xs font-bold"
                                  data-ocid="notif.message.button"
                                >
                                  Message
                                </button>
                              )}
                              {(n.type === "like" || n.type === "comment") && (
                                <button
                                  type="button"
                                  onClick={() => handleNotifClick(n)}
                                  className="px-3 py-1 rounded-full bg-card border border-border text-muted-foreground text-xs font-semibold"
                                  data-ocid="notif.view.button"
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </div>

                          {!n.read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WebRTCCallProvider>
  );
}
