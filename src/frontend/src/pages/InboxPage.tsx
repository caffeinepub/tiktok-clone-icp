import {
  Bell,
  Heart,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Phone,
  Search,
  UserPlus,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import AuthModal from "../components/AuthModal";
import CallOverlay from "../components/CallOverlay";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";
import { timeAgo } from "../types/app";

type InboxTab = "notifications" | "messages";

interface NotifItem {
  id: string;
  type: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  text: string;
  timeMs: number;
  read: boolean;
}

interface ConversationItem {
  otherPrincipal: string;
  username: string;
  avatarUrl: string;
  lastMessageText: string;
  lastMessageAt: number;
}

// Love-theme accent colors by notification type
const typeRingColor = (t: string) => {
  if (t === "like") return "oklch(0.65 0.22 10)";
  if (t === "comment" || t === "story_comment") return "oklch(0.78 0.14 75)";
  if (t === "match") return "oklch(0.65 0.22 10)";
  if (t === "follow_request" || t === "follow_request_accepted")
    return "oklch(0.60 0.18 240)";
  return "oklch(0.60 0.18 240)";
};

const typeIconBg = (t: string) => {
  if (t === "like") return "oklch(0.20 0.04 10)";
  if (t === "comment" || t === "story_comment") return "oklch(0.20 0.03 75)";
  if (t === "match") return "oklch(0.20 0.04 10)";
  return "oklch(0.18 0.03 240)";
};

const typeIcon = (t: string) => {
  if (t === "like")
    return (
      <Heart
        size={12}
        style={{ color: "oklch(0.65 0.22 10)" }}
        className="fill-current"
      />
    );
  if (t === "comment" || t === "story_comment")
    return <MessageCircle size={12} style={{ color: "oklch(0.78 0.14 75)" }} />;
  if (t === "match")
    return (
      <Heart
        size={12}
        style={{ color: "oklch(0.65 0.22 10)" }}
        className="fill-current"
      />
    );
  if (t === "follow_request" || t === "follow_request_accepted")
    return <UserPlus size={12} style={{ color: "oklch(0.60 0.18 240)" }} />;
  if (t === "story_reaction") return <span className="text-[10px]">😊</span>;
  return <UserPlus size={12} style={{ color: "oklch(0.60 0.18 240)" }} />;
};

const typeText = (t: string, videoId: string | null) => {
  if (t === "like") return videoId ? "liked your video" : "liked something";
  if (t === "comment") return "commented on your video";
  if (t === "match") return "You matched! 🎉";
  if (t === "follow_request") return "sent you a follow request";
  if (t === "follow_request_accepted") return "accepted your follow request";
  if (t === "story_reaction") return "reacted to your story";
  if (t === "story_comment") return "commented on your story";
  return "started following you";
};

function dayLabel(timeMs: number): string {
  const now = new Date();
  const d = new Date(timeMs);
  const dayDiff = Math.floor(
    (now.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (dayDiff === 0) return "New";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff <= 7) return "This Week";
  return "Earlier";
}

export default function InboxPage({
  onOpenChat,
}: {
  onOpenChat: (principal: string, username: string, avatarUrl: string) => void;
}) {
  const { isLoggedIn, backend } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const [showAuth, setShowAuth] = useState(!isLoggedIn);
  const [activeTab, setActiveTab] = useState<InboxTab>("notifications");
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [convsLoading, setConvsLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(
    null,
  );
  const [msgSearch, setMsgSearch] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<{
    username: string;
    avatarUrl: string;
    type: "video" | "voice";
  } | null>(null);

  const handleAcceptFollowRequest = async (senderId: string) => {
    if (!backend) return;
    setProcessingRequest(senderId);
    try {
      const requests = await (backend as any).getPendingFollowRequests();
      const req = (requests as any[]).find(
        (r: any) => r.from.toString() === senderId,
      );
      if (req) {
        await (backend as any).acceptFollowRequest(req.id);
        await loadNotifications();
      }
    } catch {}
    setProcessingRequest(null);
  };

  const handleDeclineFollowRequest = async (senderId: string) => {
    if (!backend) return;
    setProcessingRequest(senderId);
    try {
      const requests = await (backend as any).getPendingFollowRequests();
      const req = (requests as any[]).find(
        (r: any) => r.from.toString() === senderId,
      );
      if (req) {
        await (backend as any).declineFollowRequest(req.id);
        await loadNotifications();
      }
    } catch {}
    setProcessingRequest(null);
  };

  const handleFollowBack = async (senderId: string) => {
    if (!backend) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      await backend.followUser(Principal.fromText(senderId));
    } catch {}
  };

  const loadNotifications = useCallback(async () => {
    if (!backend || !isLoggedIn) return;
    try {
      const raw = await backend.getNotifications();
      const resolved: NotifItem[] = await Promise.all(
        raw.map(async (n: any) => {
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
            n.videoId.__kind__ === "Some" ? n.videoId.value : null;
          return {
            id: n.id,
            type: n.notifType,
            senderId,
            senderUsername,
            senderAvatar,
            text: typeText(n.notifType, videoId),
            timeMs: Number(n.createdAt) / 1_000_000,
            read: n.read,
          };
        }),
      );
      setNotifs(resolved);
      await backend.markNotificationsRead().catch(() => {});
    } catch {}
  }, [backend, isLoggedIn, thumbStorageClient]);

  const loadConversations = useCallback(async () => {
    if (!backend || !isLoggedIn) return;
    setConvsLoading(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const raw = await backend.getConversations();
      const resolved: ConversationItem[] = await Promise.all(
        (raw as any[]).map(async (c) => {
          const pStr =
            typeof c.otherPrincipal === "object"
              ? c.otherPrincipal.toString()
              : String(c.otherPrincipal);
          let username = pStr.slice(0, 8);
          let avatarUrl = `https://i.pravatar.cc/100?u=${pStr}`;
          try {
            const opt = await backend.getProfile(Principal.fromText(pStr));
            if (opt.__kind__ === "Some") {
              username = opt.value.username;
              let av = opt.value.avatarKey || avatarUrl;
              if (thumbStorageClient && av.startsWith("sha256:")) {
                try {
                  av = await thumbStorageClient.getDirectURL(av);
                } catch {}
              }
              avatarUrl = av;
            }
          } catch {}
          return {
            otherPrincipal: pStr,
            username,
            avatarUrl,
            lastMessageText: c.lastMessageText,
            lastMessageAt: Number(c.lastMessageAt) / 1_000_000,
          };
        }),
      );
      const unique = new Map<string, ConversationItem>();
      for (const conv of resolved) {
        if (!unique.has(conv.otherPrincipal))
          unique.set(conv.otherPrincipal, conv);
      }
      setConversations(Array.from(unique.values()));
    } catch {}
    setConvsLoading(false);
  }, [backend, isLoggedIn, thumbStorageClient]);

  useEffect(() => {
    if (!isLoggedIn) {
      setShowAuth(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadNotifications().finally(() => setLoading(false));
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, loadNotifications]);

  useEffect(() => {
    if (activeTab === "messages" && isLoggedIn) {
      loadConversations();
    }
  }, [activeTab, isLoggedIn, loadConversations]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const groupedNotifs = (() => {
    const groups: { label: string; items: NotifItem[] }[] = [];
    const labelMap = new Map<string, NotifItem[]>();
    for (const n of notifs) {
      const label = dayLabel(n.timeMs);
      if (!labelMap.has(label)) labelMap.set(label, []);
      labelMap.get(label)!.push(n);
    }
    const order = ["New", "Yesterday", "This Week", "Earlier"];
    for (const label of order) {
      if (labelMap.has(label)) {
        groups.push({ label, items: labelMap.get(label)! });
      }
    }
    return groups;
  })();

  const filteredConvs = conversations.filter(
    (c) =>
      !msgSearch.trim() ||
      c.username.toLowerCase().includes(msgSearch.toLowerCase()),
  );

  const openCall = (
    username: string,
    avatarUrl: string,
    type: "video" | "voice",
  ) => {
    setCallTarget({ username, avatarUrl, type });
    setCallOpen(true);
  };

  if (showAuth) {
    return (
      <>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <div
          className="h-full flex flex-col items-center justify-center gap-4 p-8"
          style={{ color: "oklch(0.60 0.010 15)" }}
        >
          <Bell size={36} />
          <p
            className="font-semibold"
            style={{ color: "oklch(0.94 0.008 60)" }}
          >
            Your Inbox
          </p>
          <p className="text-center text-sm">
            Sign in to see your notifications and messages
          </p>
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
              color: "oklch(0.98 0 0)",
            }}
            data-ocid="inbox.login.primary_button"
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "oklch(0.10 0.012 15)" }}
      data-ocid="inbox.panel"
    >
      {/* Tabs */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: "oklch(0.22 0.018 15)" }}
      >
        {(["notifications", "messages"] as InboxTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-colors"
            style={{
              borderBottomColor:
                activeTab === tab ? "oklch(0.65 0.22 10)" : "transparent",
              color:
                activeTab === tab
                  ? "oklch(0.65 0.22 10)"
                  : "oklch(0.60 0.010 15)",
            }}
            data-ocid={`inbox.${tab}.tab`}
          >
            {tab === "notifications" ? (
              <Bell size={15} />
            ) : (
              <MessagesSquare size={15} />
            )}
            {tab === "notifications" ? "Notifications" : "Messages"}
            {tab === "notifications" && unreadCount > 0 && (
              <span
                className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: "oklch(0.65 0.22 10)" }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === NOTIFICATIONS TAB === */}
      {activeTab === "notifications" && (
        <div className="flex-1 overflow-y-auto" data-ocid="inbox.list">
          {/* Mark all read */}
          {unreadCount > 0 && (
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button
                type="button"
                onClick={() => {
                  setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
                  backend?.markNotificationsRead().catch(() => {});
                }}
                className="text-xs font-semibold"
                style={{ color: "oklch(0.65 0.22 10)" }}
                data-ocid="inbox.mark_read.button"
              >
                Mark all read
              </button>
            </div>
          )}

          {loading ? (
            <div
              className="px-4 pt-3 space-y-4"
              data-ocid="inbox.loading_state"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div
                    className="w-14 h-14 rounded-full animate-pulse shrink-0"
                    style={{ background: "oklch(0.22 0.015 15)" }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-3 animate-pulse rounded w-32"
                      style={{ background: "oklch(0.22 0.015 15)" }}
                    />
                    <div
                      className="h-3 animate-pulse rounded w-48"
                      style={{ background: "oklch(0.22 0.015 15)" }}
                    />
                    <div
                      className="h-2 animate-pulse rounded w-20"
                      style={{ background: "oklch(0.22 0.015 15)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : groupedNotifs.length === 0 ? (
            <div className="text-center py-16" data-ocid="inbox.empty_state">
              <div className="text-5xl mb-3">❤️</div>
              <p style={{ color: "oklch(0.60 0.010 15)" }}>
                No notifications yet
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "oklch(0.45 0.008 15)" }}
              >
                Activity will appear here
              </p>
            </div>
          ) : (
            <div className="pb-4">
              {groupedNotifs.map(({ label, items }) => (
                <div key={label}>
                  {/* Section header */}
                  <div
                    className="sticky top-0 px-4 py-2 z-10"
                    style={{
                      background: "oklch(0.10 0.012 15 / 0.95)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <span
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "oklch(0.55 0.010 15)" }}
                    >
                      {label}
                    </span>
                  </div>

                  <div
                    className="divide-y"
                    style={{ borderColor: "oklch(0.18 0.012 15)" }}
                  >
                    {items.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 px-4 py-4"
                        style={{
                          background: !n.read
                            ? "oklch(0.14 0.015 15)"
                            : "transparent",
                        }}
                        data-ocid={`inbox.item.${i + 1}`}
                      >
                        {/* Avatar with ring */}
                        <div className="relative shrink-0">
                          <div
                            className="rounded-full p-0.5"
                            style={{
                              background: `linear-gradient(135deg, ${typeRingColor(n.type)}, oklch(0.22 0.018 15))`,
                            }}
                          >
                            <img
                              src={n.senderAvatar}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover block"
                              style={{
                                border: "2px solid oklch(0.10 0.012 15)",
                              }}
                            />
                          </div>
                          {/* Type icon badge */}
                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border"
                            style={{
                              background: typeIconBg(n.type),
                              borderColor: "oklch(0.10 0.012 15)",
                            }}
                          >
                            {typeIcon(n.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm leading-snug"
                            style={{ color: "oklch(0.94 0.008 60)" }}
                          >
                            <span className="font-bold">
                              @{n.senderUsername}
                            </span>{" "}
                            {n.text}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "oklch(0.55 0.010 15)" }}
                          >
                            {timeAgo(n.timeMs)}
                          </p>

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {n.type === "follow_request" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAcceptFollowRequest(n.senderId)
                                  }
                                  disabled={processingRequest === n.senderId}
                                  className="px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                                    color: "oklch(0.98 0 0)",
                                  }}
                                  data-ocid={`inbox.follow_request.accept.${n.id}`}
                                >
                                  {processingRequest === n.senderId
                                    ? "..."
                                    : "Accept"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeclineFollowRequest(n.senderId)
                                  }
                                  disabled={processingRequest === n.senderId}
                                  className="px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
                                  style={{
                                    border: "1px solid oklch(0.28 0.020 15)",
                                    color: "oklch(0.94 0.008 60)",
                                  }}
                                  data-ocid={`inbox.follow_request.decline.${n.id}`}
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
                                className="px-3 py-1 rounded-full text-xs font-bold active:scale-95 transition-transform"
                                style={{
                                  border: "1px solid oklch(0.65 0.22 10 / 0.5)",
                                  color: "oklch(0.65 0.22 10)",
                                  background: "oklch(0.65 0.22 10 / 0.08)",
                                }}
                                data-ocid="inbox.follow_back.button"
                              >
                                Follow Back
                              </button>
                            )}
                            {n.type === "match" && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenChat(
                                    n.senderId,
                                    n.senderUsername,
                                    n.senderAvatar,
                                  );
                                }}
                                className="px-3 py-1 rounded-full text-xs font-bold active:scale-95 transition-transform"
                                style={{
                                  background:
                                    "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                                  color: "oklch(0.98 0 0)",
                                }}
                                data-ocid="inbox.match.message.button"
                              >
                                💌 Message
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Unread dot */}
                        {!n.read && (
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                            style={{ background: "oklch(0.65 0.22 10)" }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === MESSAGES TAB === */}
      {activeTab === "messages" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="px-4 pt-3 pb-2 shrink-0">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-2"
              style={{ background: "oklch(0.18 0.018 15)" }}
            >
              <Search size={15} style={{ color: "oklch(0.55 0.010 15)" }} />
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "oklch(0.94 0.008 60)" }}
                placeholder="Search messages..."
                value={msgSearch}
                onChange={(e) => setMsgSearch(e.target.value)}
                data-ocid="inbox.search_input"
              />
            </div>
          </div>

          {/* New Message FAB + header */}
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
            <h3
              className="font-bold text-base"
              style={{ color: "oklch(0.94 0.008 60)" }}
            >
              Messages
            </h3>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                color: "oklch(0.98 0 0)",
              }}
              data-ocid="inbox.new_message.button"
            >
              <Pencil size={12} /> New
            </button>
          </div>

          {/* Conversation list */}
          <div
            className="flex-1 overflow-y-auto"
            data-ocid="inbox.messages.list"
          >
            {convsLoading ? (
              <div
                className="px-4 space-y-3 pt-2"
                data-ocid="inbox.messages.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div
                      className="w-12 h-12 rounded-full animate-pulse shrink-0"
                      style={{ background: "oklch(0.22 0.015 15)" }}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-3 animate-pulse rounded w-24"
                        style={{ background: "oklch(0.22 0.015 15)" }}
                      />
                      <div
                        className="h-2.5 animate-pulse rounded w-36"
                        style={{ background: "oklch(0.22 0.015 15)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="inbox.messages.empty_state"
              >
                <div className="text-5xl mb-3">💬</div>
                <p style={{ color: "oklch(0.60 0.010 15)" }}>No messages yet</p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "oklch(0.45 0.008 15)" }}
                >
                  Match with someone and start chatting
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "oklch(0.18 0.012 15)" }}
              >
                {filteredConvs.map((conv, i) => {
                  const isOnline = (() => {
                    const hash = conv.otherPrincipal
                      .split("")
                      .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
                    return hash % 5 === 0;
                  })();
                  const isUnread = i < 2; // First two are "unread" for demo appearance

                  return (
                    <motion.button
                      key={conv.otherPrincipal}
                      type="button"
                      onClick={() =>
                        onOpenChat(
                          conv.otherPrincipal,
                          conv.username,
                          conv.avatarUrl,
                        )
                      }
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 active:scale-[0.98] transition-transform text-left"
                      style={{
                        background: isUnread
                          ? "oklch(0.13 0.015 15)"
                          : "transparent",
                      }}
                      data-ocid={`inbox.conv.item.${i + 1}`}
                    >
                      {/* Avatar with online indicator */}
                      <div className="relative shrink-0">
                        <img
                          src={conv.avatarUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                          style={{
                            border: isUnread
                              ? "2px solid oklch(0.65 0.22 10)"
                              : "2px solid oklch(0.22 0.018 15)",
                          }}
                        />
                        {isOnline && (
                          <div
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                            style={{
                              background: "oklch(0.72 0.20 145)",
                              borderColor: "oklch(0.10 0.012 15)",
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className="text-sm truncate"
                            style={{
                              fontWeight: isUnread ? 700 : 500,
                              color: "oklch(0.94 0.008 60)",
                            }}
                          >
                            @{conv.username}
                          </p>
                          <span
                            className="text-[10px] shrink-0 ml-2"
                            style={{
                              color: isUnread
                                ? "oklch(0.65 0.22 10)"
                                : "oklch(0.55 0.010 15)",
                            }}
                          >
                            {timeAgo(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{
                            fontWeight: isUnread ? 600 : 400,
                            color: isUnread
                              ? "oklch(0.80 0.008 60)"
                              : "oklch(0.55 0.010 15)",
                          }}
                        >
                          {conv.lastMessageText}
                        </p>
                      </div>

                      {/* Unread / call icons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: "oklch(0.65 0.22 10)" }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCall(conv.username, conv.avatarUrl, "video");
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: "oklch(0.20 0.018 15)" }}
                          aria-label="Video call"
                          data-ocid="inbox.conv.video_call.button"
                        >
                          <Video
                            size={13}
                            style={{ color: "oklch(0.65 0.22 10)" }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCall(conv.username, conv.avatarUrl, "voice");
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: "oklch(0.20 0.018 15)" }}
                          aria-label="Voice call"
                          data-ocid="inbox.conv.voice_call.button"
                        >
                          <Phone
                            size={13}
                            style={{ color: "oklch(0.65 0.22 10)" }}
                          />
                        </button>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call overlay */}
      {callTarget && (
        <CallOverlay
          open={callOpen}
          username={callTarget.username}
          avatarUrl={callTarget.avatarUrl}
          callType={callTarget.type}
          onDecline={() => {
            setCallOpen(false);
            setCallTarget(null);
          }}
          onAccept={() => {
            setCallOpen(false);
            setCallTarget(null);
          }}
        />
      )}
    </div>
  );
}
