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

const typeIcon = (t: string) => {
  if (t === "like")
    return <Heart size={14} className="text-[#FF3B5C] fill-[#FF3B5C]" />;
  if (t === "comment" || t === "story_comment")
    return <MessageCircle size={14} className="text-[#22D3EE]" />;
  if (t === "match")
    return <Heart size={14} className="text-[#FF8C69] fill-[#FF8C69]" />;
  if (t === "follow_request" || t === "follow_request_accepted")
    return <UserPlus size={14} className="text-[#22D3EE]" />;
  if (t === "story_reaction")
    return <span className="text-xs">\uD83D\uDE0A</span>;
  return <UserPlus size={14} className="text-[#3B82F6]" />;
};

const typeAccentColor = (t: string) => {
  if (t === "like") return "bg-[#FF3B5C]";
  if (t === "comment" || t === "story_comment") return "bg-[#22D3EE]";
  if (t === "match") return "bg-[#FF8C69]";
  if (t === "follow_request" || t === "follow_request_accepted")
    return "bg-[#3B82F6]";
  return "bg-[#3B82F6]";
};

const typeBg = (t: string) => {
  if (t === "like") return "bg-[#FF3B5C]/20";
  if (t === "comment" || t === "story_comment") return "bg-[#22D3EE]/20";
  if (t === "match") return "bg-[#FF8C69]/20";
  if (t === "follow_request" || t === "follow_request_accepted")
    return "bg-[#22D3EE]/20";
  return "bg-[#3B82F6]/20";
};

const typeText = (t: string, videoId: string | null) => {
  if (t === "like") return videoId ? "liked your video" : "liked something";
  if (t === "comment") return "commented on your video";
  if (t === "match") return "You matched! \uD83C\uDF89";
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
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
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
      // Deduplicate by otherPrincipal
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

  // Group notifications by day
  const groupedNotifs = (() => {
    const groups: { label: string; items: NotifItem[] }[] = [];
    const labelMap = new Map<string, NotifItem[]>();
    for (const n of notifs) {
      const label = dayLabel(n.timeMs);
      if (!labelMap.has(label)) labelMap.set(label, []);
      labelMap.get(label)!.push(n);
    }
    const order = ["Today", "Yesterday", "Earlier"];
    for (const label of order) {
      if (labelMap.has(label)) {
        groups.push({ label, items: labelMap.get(label)! });
      }
    }
    return groups;
  })();

  // Filtered conversations
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
        <div className="h-full flex flex-col items-center justify-center text-[#8B95A3] gap-4 p-8">
          <Bell size={36} />
          <p className="font-semibold text-[#E9EEF5]">Your Inbox</p>
          <p className="text-center text-sm">
            Sign in to see your notifications and messages
          </p>
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="bg-[#22D3EE] text-black font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
            data-ocid="inbox.login.primary_button"
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0F1216]" data-ocid="inbox.panel">
      {/* Tabs */}
      <div className="flex border-b border-[#2A3038] shrink-0">
        {(["notifications", "messages"] as InboxTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#22D3EE] text-[#22D3EE]"
                : "border-transparent text-[#8B95A3]"
            }`}
            data-ocid={`inbox.${tab}.tab`}
          >
            {tab === "notifications" ? (
              <Bell size={15} />
            ) : (
              <MessagesSquare size={15} />
            )}
            {tab === "notifications" ? "Notifications" : "Messages"}
            {tab === "notifications" && unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF3B5C] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications tab */}
      {activeTab === "notifications" && (
        <div className="flex-1 overflow-y-auto" data-ocid="inbox.list">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
                  backend?.markNotificationsRead().catch(() => {});
                }}
                className="ml-auto text-xs text-[#22D3EE] font-semibold"
                data-ocid="inbox.mark_read.button"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-4 space-y-3" data-ocid="inbox.loading_state">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-14 h-14 rounded-full bg-[#2A3038] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#2A3038] animate-pulse rounded w-32" />
                    <div className="h-3 bg-[#2A3038] animate-pulse rounded w-48" />
                    <div className="h-2 bg-[#2A3038] animate-pulse rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : groupedNotifs.length === 0 ? (
            <div className="text-center py-16" data-ocid="inbox.empty_state">
              <Bell size={48} className="text-[#2A3038] mx-auto mb-3" />
              <p className="text-[#8B95A3]">No notifications yet</p>
            </div>
          ) : (
            <div>
              {groupedNotifs.map(({ label, items }) => (
                <div key={label}>
                  {/* Sticky day header */}
                  <div className="sticky top-0 bg-[#0F1216]/95 backdrop-blur px-4 py-2 z-10">
                    <span className="text-[10px] font-bold text-[#8B95A3] uppercase tracking-widest">
                      {label}
                    </span>
                  </div>

                  <div className="divide-y divide-[#2A3038]">
                    {items.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`relative flex items-start gap-3 px-4 py-4 overflow-hidden ${
                          !n.read ? "bg-[#1A1F26]/80" : ""
                        }`}
                        data-ocid={`inbox.item.${i + 1}`}
                      >
                        {/* Left accent bar */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${typeAccentColor(
                            n.type,
                          )}`}
                        />

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={n.senderAvatar}
                            alt=""
                            className="w-14 h-14 rounded-full object-cover"
                          />
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full ${typeBg(n.type)} flex items-center justify-center border border-[#0F1216]`}
                          >
                            {typeIcon(n.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#E9EEF5] leading-snug">
                            <span className="font-bold">
                              @{n.senderUsername}
                            </span>{" "}
                            {n.text}
                          </p>
                          <p className="text-xs text-[#8B95A3] mt-1">
                            {timeAgo(n.timeMs)}
                          </p>

                          {/* Inline action buttons per type */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {n.type === "follow_request" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAcceptFollowRequest(n.senderId)
                                  }
                                  disabled={processingRequest === n.senderId}
                                  className="px-3 py-1 rounded-full bg-[#22D3EE] text-black text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
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
                                  className="px-3 py-1 rounded-full border border-[#2A3038] text-[#E9EEF5] text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
                                  data-ocid={`inbox.follow_request.decline.${n.id}`}
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {n.type === "follow" && (
                              <button
                                type="button"
                                onClick={() => handleFollowBack(n.senderId)}
                                className="px-3 py-1 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] text-xs font-bold active:scale-95 transition-transform"
                                data-ocid="inbox.follow_back.button"
                              >
                                Follow Back
                              </button>
                            )}
                            {n.type === "match" && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenChat(
                                    n.senderId,
                                    n.senderUsername,
                                    n.senderAvatar,
                                  )
                                }
                                className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF3B5C] to-[#FF8C69] text-white text-xs font-bold active:scale-95 transition-transform"
                                data-ocid="inbox.message.button"
                              >
                                Message
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Thumbnail for like/comment */}
                        {(n.type === "like" || n.type === "comment") && (
                          <div className="w-10 h-10 rounded-lg bg-[#2A3038] shrink-0 overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-[#22D3EE]/20 to-[#FF3B5C]/20" />
                          </div>
                        )}

                        {!n.read && n.type !== "follow_request" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shrink-0 mt-1 absolute right-4 top-4" />
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

      {/* Messages tab */}
      {activeTab === "messages" && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          data-ocid="inbox.messages.list"
        >
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-[#2A3038] shrink-0">
            <div className="flex items-center gap-2 bg-[#1A1F26] rounded-2xl px-3 py-2.5 border border-[#2A3038]">
              <Search size={15} className="text-[#8B95A3] shrink-0" />
              <input
                className="flex-1 bg-transparent text-[#E9EEF5] placeholder-[#8B95A3] outline-none text-sm"
                placeholder="Search messages..."
                value={msgSearch}
                onChange={(e) => setMsgSearch(e.target.value)}
                data-ocid="inbox.search_input"
              />
              {msgSearch && (
                <button
                  type="button"
                  onClick={() => setMsgSearch("")}
                  className="text-[#8B95A3] text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div
                className="px-4 py-3 space-y-3"
                data-ocid="inbox.messages.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[#2A3038] animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#2A3038] animate-pulse rounded w-28" />
                      <div className="h-2 bg-[#2A3038] animate-pulse rounded w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="inbox.messages.empty_state"
              >
                <MessagesSquare
                  size={48}
                  className="text-[#2A3038] mx-auto mb-3"
                />
                <p className="text-[#8B95A3]">
                  {msgSearch
                    ? `No results for \"${msgSearch}\"`
                    : "No messages yet"}
                </p>
                <p className="text-[#8B95A3] text-xs mt-1">
                  {!msgSearch && "Match with someone to start chatting!"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A3038]">
                {filteredConvs.map((conv, i) => {
                  const isOnline = i % 3 === 0;
                  const unread = i % 4 === 0 ? 2 : 0;
                  return (
                    <motion.div
                      key={conv.otherPrincipal}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3.5 select-none"
                      data-ocid={`inbox.conversation.item.${i + 1}`}
                    >
                      {/* Avatar with online dot */}
                      <button
                        type="button"
                        className="relative shrink-0 active:scale-95 transition-transform"
                        onClick={() =>
                          onOpenChat(
                            conv.otherPrincipal,
                            conv.username,
                            conv.avatarUrl,
                          )
                        }
                      >
                        <img
                          src={conv.avatarUrl}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover border border-[#2A3038]"
                        />
                        {isOnline && (
                          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0F1216]" />
                        )}
                      </button>

                      {/* Text */}
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() =>
                          onOpenChat(
                            conv.otherPrincipal,
                            conv.username,
                            conv.avatarUrl,
                          )
                        }
                      >
                        <p className="font-semibold text-sm text-[#E9EEF5]">
                          @{conv.username}
                        </p>
                        <p className="text-xs text-[#8B95A3] truncate mt-0.5">
                          {conv.lastMessageText || "Say hello \uD83D\uDC4B"}
                        </p>
                        <p className="text-[10px] text-[#4A5568] mt-0.5">
                          {timeAgo(conv.lastMessageAt)}
                        </p>
                      </button>

                      {/* Right side: unread + call buttons */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#22D3EE] text-black text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCall(conv.username, conv.avatarUrl, "voice");
                            }}
                            className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center active:scale-90 transition-transform"
                            aria-label="Voice call"
                            data-ocid={`inbox.voice_call.button.${i + 1}`}
                          >
                            <Phone size={14} className="text-[#22D3EE]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCall(conv.username, conv.avatarUrl, "video");
                            }}
                            className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center active:scale-90 transition-transform"
                            aria-label="Video call"
                            data-ocid={`inbox.video_call.button.${i + 1}`}
                          >
                            <Video size={14} className="text-[#22D3EE]" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Message FAB */}
          <button
            type="button"
            className="fixed bottom-20 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-30"
            style={{
              background: "linear-gradient(135deg, #22D3EE, #3B82F6)",
              boxShadow: "0 8px 30px rgba(34,211,238,0.35)",
            }}
            aria-label="New message"
            data-ocid="inbox.new_message.button"
          >
            <Pencil size={18} className="text-black" />
          </button>
        </div>
      )}

      {/* Call Overlay */}
      {callTarget && (
        <CallOverlay
          open={callOpen}
          username={callTarget.username}
          avatarUrl={callTarget.avatarUrl}
          callType={callTarget.type}
          onDecline={() => setCallOpen(false)}
          onAccept={() => setCallOpen(false)}
        />
      )}
    </div>
  );
}
