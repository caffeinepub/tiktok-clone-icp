import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import AuthModal from "../components/AuthModal";
import { useBackend } from "../hooks/useBackend";

const MOCK_NOTIFS = [
  {
    id: "1",
    type: "like",
    user: "bunny_vibes",
    avatar: "https://i.pravatar.cc/100?img=1",
    text: 'liked your video "Big Buck Bunny 🐇"',
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "comment",
    user: "elephant.dreams",
    avatar: "https://i.pravatar.cc/100?img=2",
    text: 'commented: "Love this animation style! 🔥"',
    time: "15m ago",
    read: false,
  },
  {
    id: "3",
    type: "follow",
    user: "fire_king99",
    avatar: "https://i.pravatar.cc/100?img=3",
    text: "started following you",
    time: "1h ago",
    read: true,
  },
  {
    id: "4",
    type: "like",
    user: "escape.artist",
    avatar: "https://i.pravatar.cc/100?img=4",
    text: 'liked your video "For Bigger Blazes 🔥"',
    time: "3h ago",
    read: true,
  },
  {
    id: "5",
    type: "comment",
    user: "bunny_vibes",
    avatar: "https://i.pravatar.cc/100?img=1",
    text: 'commented: "Amazing content, keep it up!"',
    time: "1d ago",
    read: true,
  },
  {
    id: "6",
    type: "follow",
    user: "elephant.dreams",
    avatar: "https://i.pravatar.cc/100?img=2",
    text: "started following you",
    time: "2d ago",
    read: true,
  },
];

const typeIcon = (t: string) => {
  if (t === "like")
    return <Heart size={14} className="text-[#FF3B5C] fill-[#FF3B5C]" />;
  if (t === "comment")
    return <MessageCircle size={14} className="text-[#22D3EE]" />;
  return <UserPlus size={14} className="text-[#3B82F6]" />;
};

const typeBg = (t: string) => {
  if (t === "like") return "bg-[#FF3B5C]/20";
  if (t === "comment") return "bg-[#22D3EE]/20";
  return "bg-[#3B82F6]/20";
};

export default function InboxPage() {
  const { isLoggedIn } = useBackend();
  const [showAuth, setShowAuth] = useState(!isLoggedIn);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  if (showAuth) {
    return (
      <>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <div className="h-full flex flex-col items-center justify-center text-[#8B95A3] gap-4 p-8">
          <div className="w-20 h-20 rounded-full bg-[#1A1F26] flex items-center justify-center">
            <Bell size={36} className="text-[#8B95A3]" />
          </div>
          <p className="font-semibold text-[#E9EEF5] text-lg">Your Inbox</p>
          <p className="text-center text-sm">
            Sign in to see your notifications
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
    <div className="h-full overflow-y-auto bg-[#0F1216]" data-ocid="inbox.list">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-lg font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-[#8B95A3]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-[#22D3EE] font-semibold"
            data-ocid="inbox.mark_read.button"
          >
            Mark all read
          </button>
        )}
      </div>

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
                src={n.avatar}
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
                <span className="font-bold">@{n.user}</span> {n.text}
              </p>
              <p className="text-xs text-[#8B95A3] mt-0.5">{n.time}</p>
            </div>
            {!n.read && (
              <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      {notifs.length === 0 && (
        <div className="text-center py-16" data-ocid="inbox.empty_state">
          <Bell size={48} className="text-[#2A3038] mx-auto mb-3" />
          <p className="text-[#8B95A3]">No notifications yet</p>
        </div>
      )}
    </div>
  );
}
