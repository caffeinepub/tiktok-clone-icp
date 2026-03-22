import { Toaster } from "@/components/ui/sonner";
import { Bell, Compass, Home, PlusSquare, User } from "lucide-react";
import { useState } from "react";
import CameraPage from "./pages/CameraPage";
import DiscoverPage from "./pages/DiscoverPage";
import FeedPage from "./pages/FeedPage";
import InboxPage from "./pages/InboxPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";

type Tab = "home" | "discover" | "camera" | "inbox" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [viewingCreator, setViewingCreator] = useState<string | null>(null);
  const [unreadCount] = useState(2);

  const handleViewProfile = (creatorId: string) => {
    setViewingCreator(creatorId);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0F1216] text-[#E9EEF5] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0F1216] border-b border-[#2A3038] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#22D3EE] flex items-center justify-center">
            <span className="text-black font-black text-base">V</span>
          </div>
          <span className="text-xl font-bold tracking-tight">VibeFlow</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab("camera")}
          data-ocid="header.primary_button"
          className="flex items-center gap-1.5 bg-[#22D3EE] text-black px-3 py-1.5 rounded-full text-sm font-bold"
        >
          + Create
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden relative">
        <div className={activeTab === "home" ? "block h-full" : "hidden"}>
          <FeedPage onViewProfile={handleViewProfile} />
        </div>
        <div className={activeTab === "discover" ? "block h-full" : "hidden"}>
          <DiscoverPage onViewProfile={handleViewProfile} />
        </div>
        <div className={activeTab === "camera" ? "block h-full" : "hidden"}>
          <CameraPage onDone={() => setActiveTab("home")} />
        </div>
        <div className={activeTab === "inbox" ? "block h-full" : "hidden"}>
          <InboxPage />
        </div>
        <div className={activeTab === "profile" ? "block h-full" : "hidden"}>
          <ProfilePage onViewProfile={handleViewProfile} />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 flex items-center bg-[#0F1216] border-t border-[#2A3038] pb-safe">
        {(
          [
            { id: "home", icon: Home, label: "Home", badge: 0 },
            { id: "discover", icon: Compass, label: "Discover", badge: 0 },
            { id: "camera", icon: PlusSquare, label: "", badge: 0 },
            { id: "inbox", icon: Bell, label: "Inbox", badge: unreadCount },
            { id: "profile", icon: User, label: "Profile", badge: 0 },
          ] as const
        ).map(({ id, icon: Icon, label, badge }) => {
          const isActive = activeTab === id;
          const isCenter = id === "camera";
          return (
            <button
              type="button"
              key={id}
              data-ocid={`nav.${id}.link`}
              onClick={() => setActiveTab(id as Tab)}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] ${isCenter ? "relative" : ""}`}
            >
              {isCenter ? (
                <div className="w-11 h-11 rounded-2xl bg-[#22D3EE] flex items-center justify-center shadow-lg">
                  <Icon size={22} className="text-black" />
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  <Icon
                    size={22}
                    className={isActive ? "text-[#22D3EE]" : "text-[#8B95A3]"}
                  />
                  {badge && badge > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#FF3B5C] text-white text-[9px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
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

      {/* User Profile Overlay */}
      {viewingCreator && (
        <div className="fixed inset-0 z-50 bg-[#0F1216]">
          <UserProfilePage
            creatorId={viewingCreator}
            onBack={() => setViewingCreator(null)}
          />
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
