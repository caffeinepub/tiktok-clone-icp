import { Bell, Compass, Home, PlusCircle, User } from "lucide-react";
import { useState } from "react";
import DiscoverPage from "./pages/DiscoverPage";
import FeedPage from "./pages/FeedPage";
import InboxPage from "./pages/InboxPage";
import ProfilePage from "./pages/ProfilePage";
import UploadPage from "./pages/UploadPage";

type Tab = "home" | "discover" | "upload" | "inbox" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0F1216] text-[#E9EEF5] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#1A1F26] border-b border-[#2A3038] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#22D3EE] flex items-center justify-center">
            <span className="text-black font-black text-sm">V</span>
          </div>
          <span className="text-xl font-bold tracking-tight">VibeFlow</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className="flex items-center gap-1.5 bg-[#22D3EE] text-black px-3 py-1.5 rounded-full text-sm font-semibold"
        >
          <span>+</span> Create
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "home" && <FeedPage />}
        {activeTab === "discover" && <DiscoverPage />}
        {activeTab === "upload" && (
          <UploadPage onDone={() => setActiveTab("home")} />
        )}
        {activeTab === "inbox" && <InboxPage />}
        {activeTab === "profile" && <ProfilePage />}
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 flex items-center bg-[#1A1F26] border-t border-[#2A3038]">
        {(
          [
            { id: "home", icon: Home, label: "Home" },
            { id: "discover", icon: Compass, label: "Discover" },
            { id: "upload", icon: PlusCircle, label: "" },
            { id: "inbox", icon: Bell, label: "Inbox" },
            { id: "profile", icon: User, label: "Profile" },
          ] as const
        ).map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          const isCenter = id === "upload";
          return (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 ${
                isCenter ? "relative" : ""
              }`}
            >
              {isCenter ? (
                <div className="w-12 h-12 rounded-2xl bg-[#22D3EE] flex items-center justify-center shadow-lg -mt-4">
                  <Icon size={24} className="text-black" />
                </div>
              ) : (
                <>
                  <Icon
                    size={22}
                    className={isActive ? "text-[#22D3EE]" : "text-[#8B95A3]"}
                  />
                  <span
                    className={`text-[11px] mt-0.5 ${
                      isActive ? "text-[#22D3EE]" : "text-[#8B95A3]"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
