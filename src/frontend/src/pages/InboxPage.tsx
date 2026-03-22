import {
  Bell,
  Heart,
  MessageCircle,
  MessagesSquare,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import AuthModal from "../components/AuthModal";
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
  if (t === "comment")
    return <MessageCircle size={14} className="text-[#22D3EE]" />;
  if (t === "match")
    return <Heart size={14} className="text-[#FF8C69] fill-[#FF8C69]" />;
  return <UserPlus size={14} className="text-[#3B82F6]" />;
};

const typeBg = (t: string) => {
  if (t === "like") return "bg-[#FF3B5C]/20";
  if (t === "comment") return "bg-[#22D3EE]/20";
  if (t === "match") return "bg-[#FF8C69]/20";
  return "bg-[#3B82F6]/20";
};

const typeText = (t: string, videoId: string | null) => {
  if (t === "like") return videoId ? "liked your video" : "liked something";
  if (t === "comment") return "commented on your video";
  if (t === "match") return "You matched! 🎉";
  return "started following you";
};

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
      setConversations(resolved);
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
            className="bg-[#22D3EE] text-black font-bold px-6 py-3 rounded-2xl"
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
            <div
              className="flex justify-center py-12"
              data-ocid="inbox.loading_state"
            >
              <div className="w-8 h-8 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[#2A3038]">
              {notifs.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 px-4 py-3.5 ${!n.read ? "bg-[#1A1F26]/80" : ""}`}
                  data-ocid={`inbox.item.${i + 1}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={n.senderAvatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full ${typeBg(n.type)} flex items-center justify-center`}
                    >
                      {typeIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E9EEF5] leading-snug">
                      <span className="font-bold">@{n.senderUsername}</span>{" "}
                      {n.text}
                    </p>
                    <p className="text-xs text-[#8B95A3] mt-0.5">
                      {timeAgo(n.timeMs)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shrink-0" />
                  )}
                </motion.div>
              ))}
              {notifs.length === 0 && (
                <div
                  className="text-center py-16"
                  data-ocid="inbox.empty_state"
                >
                  <Bell size={48} className="text-[#2A3038] mx-auto mb-3" />
                  <p className="text-[#8B95A3]">No notifications yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {activeTab === "messages" && (
        <div className="flex-1 overflow-y-auto" data-ocid="inbox.messages.list">
          {convsLoading ? (
            <div
              className="flex justify-center py-12"
              data-ocid="inbox.messages.loading_state"
            >
              <div className="w-8 h-8 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="inbox.messages.empty_state"
            >
              <MessagesSquare
                size={48}
                className="text-[#2A3038] mx-auto mb-3"
              />
              <p className="text-[#8B95A3]">No messages yet</p>
              <p className="text-[#8B95A3] text-xs mt-1">
                Match with someone to start chatting!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A3038]">
              {conversations.map((conv, i) => (
                <motion.button
                  key={conv.otherPrincipal}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() =>
                    onOpenChat(
                      conv.otherPrincipal,
                      conv.username,
                      conv.avatarUrl,
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#1A1F26] transition-colors text-left"
                  data-ocid={`inbox.conversation.item.${i + 1}`}
                >
                  <img
                    src={conv.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-[#2A3038] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#E9EEF5]">
                      @{conv.username}
                    </p>
                    <p className="text-xs text-[#8B95A3] truncate mt-0.5">
                      {conv.lastMessageText}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#8B95A3] shrink-0">
                    {timeAgo(conv.lastMessageAt)}
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
