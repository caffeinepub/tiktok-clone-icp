import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import AuthModal from "../components/AuthModal";
import { useBackend } from "../hooks/useBackend";

const MOCK_NOTIFS = [
  {
    id: "1",
    type: "like",
    user: "bunny_vibes",
    avatar: "https://i.pravatar.cc/100?img=1",
    text: "liked your video",
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "comment",
    user: "elephant.dreams",
    avatar: "https://i.pravatar.cc/100?img=2",
    text: 'commented: "Love this! 🔥"',
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
    text: "liked your video",
    time: "3h ago",
    read: true,
  },
  {
    id: "5",
    type: "comment",
    user: "bunny_vibes",
    avatar: "https://i.pravatar.cc/100?img=1",
    text: 'commented: "Amazing content!"',
    time: "1d ago",
    read: true,
  },
];

const typeIcon = (t: string) => {
  if (t === "like") return <Heart size={16} className="text-[#FF3B5C]" />;
  if (t === "comment")
    return <MessageCircle size={16} className="text-[#22D3EE]" />;
  return <UserPlus size={16} className="text-[#3B82F6]" />;
};

export default function InboxPage() {
  const { isLoggedIn } = useBackend();
  const [showAuth, setShowAuth] = useState(!isLoggedIn);

  if (showAuth) {
    return (
      <>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <div className="h-full flex flex-col items-center justify-center text-[#8B95A3] gap-4 p-8">
          <Bell size={48} />
          <p className="text-center">Sign in to see your notifications</p>
        </div>
      </>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216]">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold">Notifications</h2>
      </div>
      <div className="divide-y divide-[#2A3038]">
        {MOCK_NOTIFS.map((n) => (
          <div
            key={n.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              !n.read ? "bg-[#1A1F26]/60" : ""
            }`}
          >
            <div className="relative shrink-0">
              <img
                src={n.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#1A1F26] flex items-center justify-center">
                {typeIcon(n.type)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#E9EEF5]">
                <span className="font-semibold">@{n.user}</span> {n.text}
              </p>
              <p className="text-xs text-[#8B95A3]">{n.time}</p>
            </div>
            {!n.read && (
              <div className="w-2 h-2 rounded-full bg-[#22D3EE] shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
