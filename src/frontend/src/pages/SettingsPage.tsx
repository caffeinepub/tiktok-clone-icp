import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Globe,
  Lock,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useBackend } from "../hooks/useBackend";

interface Props {
  onBack: () => void;
  onEditProfile: () => void;
}

export default function SettingsPage({ onBack, onEditProfile }: Props) {
  const { backend, identity } = useBackend();
  const [isPrivate, setIsPrivate] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend) return;
    backend
      .getUserSettings()
      .then((s) => {
        setIsPrivate(s.isPrivate);
        setNotificationsEnabled(s.notificationsEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backend]);

  const saveSettings = async (priv: boolean, notif: boolean) => {
    if (!backend) return;
    await backend.updateUserSettings(priv, notif).catch(() => {});
  };

  const handlePrivateToggle = async (val: boolean) => {
    setIsPrivate(val);
    await saveSettings(val, notificationsEnabled);
  };

  const handleNotifToggle = async (val: boolean) => {
    setNotificationsEnabled(val);
    await saveSettings(isPrivate, val);
  };

  const handleLogout = () => {
    if (backend) backend.logout().catch(() => {});
    onBack();
  };

  const principal = identity?.getPrincipal().toString();

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#0F1216] flex flex-col overflow-y-auto"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      data-ocid="settings.page"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[#2A3038] sticky top-0 bg-[#0F1216] z-10">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1F26]"
          data-ocid="settings.close_button"
        >
          <ArrowLeft size={20} className="text-[#E9EEF5]" />
        </button>
        <h1 className="text-lg font-bold text-[#E9EEF5]">Settings</h1>
      </header>

      {loading ? (
        <div
          className="flex-1 flex items-center justify-center"
          data-ocid="settings.loading_state"
        >
          <div className="w-7 h-7 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 px-4 py-4 space-y-6">
          {/* Account */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <User size={12} /> Account
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <button
                type="button"
                onClick={onEditProfile}
                className="w-full flex items-center justify-between px-4 py-4 active:bg-[#2A3038] transition-colors"
                data-ocid="settings.edit_profile.button"
              >
                <span className="text-sm text-[#E9EEF5]">Edit Profile</span>
                <ChevronRight size={16} className="text-[#8B95A3]" />
              </button>
              <div className="border-t border-[#2A3038] px-4 py-3">
                <p className="text-xs text-[#8B95A3]">Principal ID</p>
                <p className="text-xs text-[#E9EEF5] font-mono mt-0.5 truncate">
                  {principal ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield size={12} /> Privacy
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-sm text-[#E9EEF5]">Private Account</p>
                  <p className="text-xs text-[#8B95A3] mt-0.5">
                    Only followers can see your videos
                  </p>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={handlePrivateToggle}
                  data-ocid="settings.private_account.switch"
                />
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Bell size={12} /> Notifications
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-sm text-[#E9EEF5]">Push Notifications</p>
                  <p className="text-xs text-[#8B95A3] mt-0.5">
                    Likes, comments, and follows
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotifToggle}
                  data-ocid="settings.notifications.switch"
                />
              </div>
            </div>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Lock size={12} /> Security
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="px-4 py-4">
                <p className="text-sm text-[#E9EEF5]">Authentication</p>
                <p className="text-xs text-[#8B95A3] mt-0.5">
                  Powered by Internet Identity on the Internet Computer
                </p>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={12} /> About
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="px-4 py-4 space-y-1">
                <div className="flex justify-between">
                  <p className="text-sm text-[#E9EEF5]">App Version</p>
                  <p className="text-sm text-[#8B95A3]">7.0.0</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#E9EEF5]">Platform</p>
                  <p className="text-sm text-[#8B95A3]">Internet Computer</p>
                </div>
              </div>
            </div>
          </section>

          {/* Logout */}
          <section>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-2xl px-4 py-4 flex items-center gap-3 text-red-400 active:bg-[#2A3038] transition-colors"
              data-ocid="settings.logout.button"
            >
              <LogOut size={18} />
              <span className="font-semibold">Log Out</span>
            </button>
          </section>
        </div>
      )}
    </motion.div>
  );
}
