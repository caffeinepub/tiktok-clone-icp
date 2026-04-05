import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Database,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Monitor,
  Send,
  Shield,
  Unlock,
  User,
  UserX,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onBack: () => void;
  onEditProfile: () => void;
}

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Espa\u00f1ol", flag: "🇪🇸" },
  { code: "fr", label: "Fran\u00e7ais", flag: "🇫🇷" },
  { code: "hi", label: "\u0939\u093f\u0928\u094d\u0926\u0940", flag: "🇮🇳" },
  { code: "pt", label: "Portugu\u00eas", flag: "🇧🇷" },
  {
    code: "ar",
    label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    flag: "🇸🇦",
  },
];

type ThemeMode = "dark" | "light" | "auto";

export default function SettingsPage({ onBack, onEditProfile }: Props) {
  const { backend, identity } = useBackend();
  const { clear } = useInternetIdentity();
  const [isPrivate, setIsPrivate] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Appearance
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem("setting_theme") as ThemeMode) || "dark",
  );
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [language, setLanguage] = useState(
    () => localStorage.getItem("setting_language") || "en",
  );

  // Privacy extras
  const [showActivity, setShowActivity] = useState(
    () => localStorage.getItem("setting_showActivity") !== "false",
  );
  const [allowComments, setAllowComments] = useState(
    () => localStorage.getItem("setting_allowComments") !== "false",
  );
  const [allowDuets, setAllowDuets] = useState(
    () => localStorage.getItem("setting_allowDuets") !== "false",
  );

  // Content prefs
  const [autoplayVideos, setAutoplayVideos] = useState(
    () => localStorage.getItem("setting_autoplay") !== "false",
  );
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem("setting_reduceMotion") === "true",
  );
  const [showSensitive, setShowSensitive] = useState(
    () => localStorage.getItem("setting_showSensitive") === "true",
  );
  const [ageRestriction, setAgeRestriction] = useState(
    () => localStorage.getItem("setting_ageRestriction") === "true",
  );
  const [filterHashtags, setFilterHashtags] = useState(
    () => localStorage.getItem("setting_filterHashtags") || "",
  );
  const [restrictSensitive, setRestrictSensitive] = useState(
    () => localStorage.getItem("setting_restrictSensitive") === "true",
  );

  // Blocked accounts
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("setting_blockedUsers") || "[]");
    } catch {
      return [];
    }
  });
  const [blockInput, setBlockInput] = useState("");

  // Data & storage
  const [dataSaver, setDataSaver] = useState(
    () => localStorage.getItem("setting_dataSaver") === "true",
  );
  const [cacheCleared, setCacheCleared] = useState(false);

  // Help
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const reportRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!backend) {
      setLoading(false);
      return;
    }
    backend
      .getUserSettings()
      .then((s) => {
        setIsPrivate(s.isPrivate);
        setNotificationsEnabled(s.notificationsEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backend]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("setting_theme", theme);
  }, [theme]);

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

  const setLS = (key: string, val: boolean | string) =>
    localStorage.setItem(key, String(val));

  const handleLogout = () => {
    if (backend) (backend as any).logout?.().catch(() => {});
    clear();
  };

  const handleClearCache = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("cover:") || k.startsWith("setting_")))
        keysToRemove.push(k);
    }
    for (const k of keysToRemove) localStorage.removeItem(k);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const handleSendReport = () => {
    setReportSent(true);
    setReportText("");
    setTimeout(() => {
      setReportSent(false);
      setShowReportBox(false);
    }, 2000);
  };

  const handleBlockUser = () => {
    if (!blockInput.trim()) return;
    const updated = [...blockedUsers, blockInput.trim()];
    setBlockedUsers(updated);
    localStorage.setItem("setting_blockedUsers", JSON.stringify(updated));
    setBlockInput("");
  };

  const handleUnblockUser = (username: string) => {
    const updated = blockedUsers.filter((u) => u !== username);
    setBlockedUsers(updated);
    localStorage.setItem("setting_blockedUsers", JSON.stringify(updated));
  };

  const principal = identity?.getPrincipal().toString();
  const selectedLang = LANGUAGES.find((l) => l.code === language);

  const SettingRow = ({
    label,
    description,
    checked,
    onChange,
    ocid,
    disabled,
    note,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    ocid: string;
    disabled?: boolean;
    note?: string;
  }) => (
    <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#2A3038] first:border-t-0">
      <div className="flex-1 pr-3">
        <p className="text-sm text-[#E9EEF5]">{label}</p>
        {description && (
          <p className="text-xs text-[#8B95A3] mt-0.5">{description}</p>
        )}
        {note && <p className="text-xs text-[#22D3EE] mt-0.5">{note}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        data-ocid={ocid}
      />
    </div>
  );

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
        <div className="flex-1 px-4 py-4 space-y-5">
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
                  {principal ?? "\u2014"}
                </p>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Monitor size={12} /> Appearance
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="px-4 py-3.5">
                <p className="text-sm text-[#E9EEF5] mb-2">Theme</p>
                <div className="flex gap-2">
                  {(["dark", "light", "auto"] as ThemeMode[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        theme === t
                          ? "bg-[#22D3EE] text-black border-[#22D3EE]"
                          : "bg-[#0F1216] text-[#8B95A3] border-[#2A3038]"
                      }`}
                      data-ocid={`settings.theme_${t}.toggle`}
                    >
                      {t === "dark"
                        ? "🌙 Dark"
                        : t === "light"
                          ? "☀️ Light"
                          : "🔄 Auto"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Language */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={12} /> Language
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <button
                type="button"
                onClick={() => setShowLangPicker((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-4"
                data-ocid="settings.language.button"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{selectedLang?.flag}</span>
                  <span className="text-sm text-[#E9EEF5]">
                    {selectedLang?.label}
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-[#8B95A3] transition-transform ${
                    showLangPicker ? "rotate-90" : ""
                  }`}
                />
              </button>
              {showLangPicker && (
                <div className="border-t border-[#2A3038]">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setLS("setting_language", lang.code);
                        setShowLangPicker(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 border-t border-[#2A3038] first:border-t-0 active:bg-[#2A3038] transition-colors"
                      data-ocid={`settings.language_${lang.code}.button`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-sm text-[#E9EEF5]">
                          {lang.label}
                        </span>
                      </div>
                      {language === lang.code && (
                        <span className="text-[#22D3EE] text-sm font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield size={12} /> Privacy
            </h2>

            {/* Prominent Private Account Card */}
            <motion.button
              type="button"
              onClick={() => handlePrivateToggle(!isPrivate)}
              className={`w-full mb-3 rounded-2xl border-2 p-4 flex items-center gap-4 transition-all ${
                isPrivate
                  ? "bg-[#22D3EE]/10 border-[#22D3EE]/50"
                  : "bg-[#1A1F26] border-[#2A3038]"
              }`}
              whileTap={{ scale: 0.98 }}
              data-ocid="settings.private_account.toggle"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isPrivate ? "bg-[#22D3EE]/20" : "bg-[#2A3038]"
                }`}
              >
                {isPrivate ? (
                  <Lock size={22} className="text-[#22D3EE]" />
                ) : (
                  <Unlock size={22} className="text-[#8B95A3]" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-bold ${
                      isPrivate ? "text-[#22D3EE]" : "text-[#E9EEF5]"
                    }`}
                  >
                    {isPrivate ? "Private Account" : "Public Account"}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPrivate
                        ? "bg-[#22D3EE]/20 text-[#22D3EE]"
                        : "bg-[#2A3038] text-[#8B95A3]"
                    }`}
                  >
                    {isPrivate ? "ON" : "OFF"}
                  </span>
                </div>
                <p className="text-xs text-[#8B95A3] mt-0.5 leading-snug">
                  {isPrivate
                    ? "Only your followers can see your videos and posts"
                    : "Anyone can discover and view your content"}
                </p>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={handlePrivateToggle}
                data-ocid="settings.private_account.switch"
              />
            </motion.button>

            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <SettingRow
                label="Show Activity Status"
                description="Let others see when you're active"
                checked={showActivity}
                onChange={(v) => {
                  setShowActivity(v);
                  setLS("setting_showActivity", v);
                }}
                ocid="settings.show_activity.switch"
              />
              <SettingRow
                label="Allow Comments"
                description="Let others comment on your posts"
                checked={allowComments}
                onChange={(v) => {
                  setAllowComments(v);
                  setLS("setting_allowComments", v);
                }}
                ocid="settings.allow_comments.switch"
              />
              <SettingRow
                label="Allow Duets"
                description="Let others duet with your videos"
                checked={allowDuets}
                onChange={(v) => {
                  setAllowDuets(v);
                  setLS("setting_allowDuets", v);
                }}
                ocid="settings.allow_duets.switch"
              />
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Bell size={12} /> Notifications
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <SettingRow
                label="Push Notifications"
                description="Likes, comments, and follows"
                checked={notificationsEnabled}
                onChange={handleNotifToggle}
                ocid="settings.notifications.switch"
              />
            </div>
          </section>

          {/* Content Preferences */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={12} /> Content Preferences
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <SettingRow
                label="Autoplay Videos"
                description="Videos play automatically in feed"
                checked={autoplayVideos}
                onChange={(v) => {
                  setAutoplayVideos(v);
                  setLS("setting_autoplay", v);
                }}
                ocid="settings.autoplay.switch"
              />
              <SettingRow
                label="Reduce Motion"
                description="Minimize animations throughout the app"
                checked={reduceMotion}
                onChange={(v) => {
                  setReduceMotion(v);
                  setLS("setting_reduceMotion", v);
                }}
                ocid="settings.reduce_motion.switch"
              />
              <SettingRow
                label="Show Sensitive Content"
                description="Show mature or sensitive content in feed"
                checked={showSensitive}
                onChange={(v) => {
                  setShowSensitive(v);
                  setLS("setting_showSensitive", v);
                }}
                ocid="settings.show_sensitive.switch"
              />
              <SettingRow
                label="Age Restriction (18+)"
                description="Restrict content to 18+ only"
                checked={ageRestriction}
                onChange={(v) => {
                  setAgeRestriction(v);
                  setLS("setting_ageRestriction", v);
                }}
                ocid="settings.age_restriction.switch"
              />
              <SettingRow
                label="Restrict Sensitive Content"
                description="Filter mature or sensitive content from feed"
                checked={restrictSensitive}
                onChange={(v) => {
                  setRestrictSensitive(v);
                  setLS("setting_restrictSensitive", v);
                }}
                ocid="settings.restrict_sensitive.switch"
              />
              {/* Filter hashtags */}
              <div className="px-4 py-3.5 border-t border-[#2A3038]">
                <p className="text-sm text-[#E9EEF5] mb-1">Filter Hashtags</p>
                <p className="text-xs text-[#8B95A3] mb-2">
                  Comma-separated tags to block
                </p>
                <input
                  type="text"
                  value={filterHashtags}
                  onChange={(e) => {
                    setFilterHashtags(e.target.value);
                    setLS("setting_filterHashtags", e.target.value);
                  }}
                  placeholder="e.g. spam, nsfw, ads"
                  className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-3 py-2 text-xs text-[#E9EEF5] outline-none focus:border-[#22D3EE] placeholder:text-[#4A5568]"
                  data-ocid="settings.filter_hashtags.input"
                />
              </div>
            </div>
          </section>

          {/* Blocked Accounts */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <UserX size={12} /> Blocked Accounts
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              {/* Add block input */}
              <div className="px-4 py-3.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blockInput}
                    onChange={(e) => setBlockInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBlockUser()}
                    placeholder="@username to block"
                    className="flex-1 bg-[#0F1216] border border-[#2A3038] rounded-xl px-3 py-2 text-xs text-[#E9EEF5] outline-none focus:border-[#22D3EE] placeholder:text-[#4A5568]"
                    data-ocid="settings.block_user.input"
                  />
                  <button
                    type="button"
                    onClick={handleBlockUser}
                    className="px-3 py-2 rounded-xl bg-[#FF3B5C]/20 border border-[#FF3B5C]/30 text-[#FF3B5C] text-xs font-bold"
                    data-ocid="settings.block_user.button"
                  >
                    Block
                  </button>
                </div>
              </div>
              {blockedUsers.length > 0 && (
                <div className="border-t border-[#2A3038]">
                  {blockedUsers.map((u, i) => (
                    <div
                      key={u}
                      className={`flex items-center justify-between px-4 py-3 ${
                        i > 0 ? "border-t border-[#2A3038]" : ""
                      }`}
                      data-ocid={`settings.blocked.item.${i + 1}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#2A3038] flex items-center justify-center">
                          <User size={14} className="text-[#8B95A3]" />
                        </div>
                        <span className="text-sm text-[#E9EEF5]">@{u}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblockUser(u)}
                        className="text-xs text-[#22D3EE] font-semibold px-3 py-1 rounded-full border border-[#22D3EE]/30"
                        data-ocid={`settings.unblock.button.${i + 1}`}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {blockedUsers.length === 0 && (
                <div className="px-4 py-3 border-t border-[#2A3038] text-center">
                  <p className="text-[#8B95A3] text-xs">No blocked accounts</p>
                </div>
              )}
            </div>
          </section>

          {/* Data & Storage */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Database size={12} /> Data &amp; Storage
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm text-[#E9EEF5]">Clear Cache</p>
                  <p className="text-xs text-[#8B95A3] mt-0.5">
                    Remove cached covers and preferences
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#2A3038] text-[#E9EEF5] active:bg-[#2A3038] transition-colors"
                  data-ocid="settings.clear_cache.button"
                >
                  {cacheCleared ? (
                    <span className="text-[#22D3EE]">Cleared!</span>
                  ) : (
                    "Clear"
                  )}
                </button>
              </div>
              <SettingRow
                label="Data Saver"
                description="Load lower quality media to save data"
                checked={dataSaver}
                onChange={(v) => {
                  setDataSaver(v);
                  setLS("setting_dataSaver", v);
                }}
                ocid="settings.data_saver.switch"
              />
            </div>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Lock size={12} /> Security
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-[#E9EEF5]">
                      2-Factor Authentication
                    </p>
                    <p className="text-xs text-[#8B95A3] mt-0.5">
                      Your account is secured by Internet Identity
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-2.5 py-1 shrink-0">
                    <Shield size={10} className="text-green-400" />
                    <span className="text-green-400 text-[10px] font-bold">
                      Protected
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#2A3038] px-4 py-4">
                <p className="text-sm text-[#E9EEF5]">Authentication</p>
                <p className="text-xs text-[#8B95A3] mt-0.5">
                  Powered by Internet Identity on the Internet Computer
                </p>
              </div>
            </div>
          </section>

          {/* Help & Support */}
          <section>
            <h2 className="text-xs text-[#8B95A3] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <HelpCircle size={12} /> Help &amp; Support
            </h2>
            <div className="bg-[#1A1F26] rounded-2xl overflow-hidden border border-[#2A3038]">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-4 border-b border-[#2A3038] active:bg-[#2A3038] transition-colors"
                data-ocid="settings.help_center.link"
              >
                <span className="text-sm text-[#E9EEF5]">Help Center</span>
                <ChevronRight size={16} className="text-[#8B95A3]" />
              </button>
              <div className="border-b border-[#2A3038]">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportBox((v) => !v);
                    setReportSent(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-4 active:bg-[#2A3038] transition-colors"
                  data-ocid="settings.report_problem.button"
                >
                  <span className="text-sm text-[#E9EEF5]">
                    Report a Problem
                  </span>
                  <ChevronRight size={16} className="text-[#8B95A3]" />
                </button>
                {showReportBox && (
                  <div className="px-4 pb-4">
                    {reportSent ? (
                      <p className="text-[#22D3EE] text-sm text-center py-2">
                        Thanks for your report! \u2713
                      </p>
                    ) : (
                      <>
                        <textarea
                          ref={reportRef}
                          value={reportText}
                          onChange={(e) => setReportText(e.target.value)}
                          placeholder="Describe the problem..."
                          rows={3}
                          className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-3 py-2.5 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] resize-none placeholder:text-[#4A5568]"
                          data-ocid="settings.report.textarea"
                        />
                        <button
                          type="button"
                          onClick={handleSendReport}
                          disabled={!reportText.trim()}
                          className="mt-2 w-full py-2.5 rounded-xl bg-[#22D3EE] text-black font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                          data-ocid="settings.report.submit_button"
                        >
                          <Send size={14} /> Send Report
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-4 border-b border-[#2A3038] active:bg-[#2A3038] transition-colors"
                data-ocid="settings.terms.link"
              >
                <span className="text-sm text-[#E9EEF5]">Terms of Service</span>
                <ChevronRight size={16} className="text-[#8B95A3]" />
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-4 active:bg-[#2A3038] transition-colors"
                data-ocid="settings.privacy_policy.link"
              >
                <span className="text-sm text-[#E9EEF5]">Privacy Policy</span>
                <ChevronRight size={16} className="text-[#8B95A3]" />
              </button>
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
                  <p className="text-sm text-[#8B95A3]">35.0.0</p>
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

          <div className="pb-4" />
        </div>
      )}
    </motion.div>
  );
}
