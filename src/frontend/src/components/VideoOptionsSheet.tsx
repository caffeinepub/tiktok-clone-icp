import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Bookmark,
  BookmarkMinus,
  Copy,
  Download,
  Edit2,
  EyeOff,
  Flag,
  GitMerge,
  Link2,
  ListMusic,
  Pin,
  Scissors,
  Share2,
  UserCircle,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useBackend } from "../hooks/useBackend";
import type { Video } from "../types/app";

const REPORT_REASONS = [
  "Spam",
  "Inappropriate",
  "Misleading",
  "Harassment",
  "Other",
];

interface VideoOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  video: Video;
  isOwner: boolean;
  isSaved: boolean;
  isPinned: boolean;
  onViewProfile: (id: string) => void;
  onRemoveFromFeed: (id: string) => void;
  onSaveToggle: (id: string) => void;
  onEditSave: (id: string, title: string, desc: string, tags: string[]) => void;
  onPinToggle: (id: string) => void;
  onDuet?: (videoId: string) => void;
}

export default function VideoOptionsSheet({
  open,
  onClose,
  video,
  isOwner,
  isSaved,
  isPinned,
  onViewProfile,
  onRemoveFromFeed,
  onSaveToggle,
  onEditSave,
  onPinToggle,
  onDuet,
}: VideoOptionsSheetProps) {
  const { backend, isLoggedIn } = useBackend();
  const [panel, setPanel] = useState<"main" | "report" | "edit">("main");
  const [reportReason, setReportReason] = useState("");
  const [editTitle, setEditTitle] = useState(video.title);
  const [editDesc, setEditDesc] = useState(video.description);
  const [editTags, setEditTags] = useState(video.hashtags.join(" "));
  const [saving, setSaving] = useState(false);

  const close = () => {
    setPanel("main");
    onClose();
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = video.videoKey;
    a.download = `${video.title}.mp4`;
    a.target = "_blank";
    a.click();
    toast.success("Download started");
    close();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}?v=${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
    close();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}?v=${video.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
    close();
  };

  const handleSaveToggle = () => {
    onSaveToggle(video.id);
    toast.success(isSaved ? "Removed from saved" : "Saved to favorites!");
    if (backend && isLoggedIn) {
      if (isSaved) backend.unsaveVideo?.(video.id).catch(() => {});
      else backend.saveVideo?.(video.id).catch(() => {});
    }
    close();
  };

  const handleHide = () => {
    onRemoveFromFeed(video.id);
    if (backend && isLoggedIn) backend.hideVideo?.(video.id).catch(() => {});
    toast.success("Video removed from feed");
    close();
  };

  const handleReport = async () => {
    if (!reportReason) return;
    if (backend && isLoggedIn) {
      try {
        await backend.reportVideo?.(video.id, reportReason);
      } catch {}
    }
    toast.success("Report submitted. Thank you!");
    close();
  };

  const handleEditSave = async () => {
    setSaving(true);
    const tags = editTags
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#/, ""))
      .filter(Boolean);
    if (backend && isLoggedIn) {
      try {
        await backend.updateVideo?.(video.id, editTitle, editDesc, tags);
      } catch {}
    }
    onEditSave(video.id, editTitle, editDesc, tags);
    toast.success("Video updated!");
    setSaving(false);
    close();
  };

  const handlePinToggle = () => {
    onPinToggle(video.id);
    if (backend && isLoggedIn) {
      if (isPinned) backend.unpinVideo?.().catch(() => {});
      else backend.pinVideo?.(video.id).catch(() => {});
    }
    toast.success(isPinned ? "Unpinned from profile" : "Pinned to profile!");
    close();
  };

  const mainItems = [
    ...(isOwner
      ? [
          {
            icon: <Edit2 size={20} />,
            label: "Edit Video",
            action: () => setPanel("edit"),
            ocid: "video_options.edit_button",
          },
          {
            icon: <Pin size={20} />,
            label: isPinned ? "Unpin from Profile" : "Pin to Profile",
            action: handlePinToggle,
            ocid: "video_options.toggle",
          },
        ]
      : []),
    {
      icon: <Download size={20} />,
      label: "Download",
      action: handleDownload,
      ocid: "video_options.secondary_button",
    },
    {
      icon: <Zap size={20} />,
      label: "Promote / Boost",
      action: () => {
        toast.info("Promotion feature coming soon");
        close();
      },
      ocid: "video_options.promote_button",
    },
    {
      icon: <Share2 size={20} />,
      label: "Share",
      action: handleShare,
      ocid: "video_options.share_button",
    },
    {
      icon: <Copy size={20} />,
      label: "Copy Link",
      action: handleCopyLink,
      ocid: "video_options.copy_button",
    },
    {
      icon: isSaved ? <BookmarkMinus size={20} /> : <Bookmark size={20} />,
      label: isSaved ? "Unsave" : "Save to Favorites",
      action: handleSaveToggle,
      ocid: "video_options.save_button",
    },
    {
      icon: <ListMusic size={20} />,
      label: "Add to Playlist",
      action: () => {
        toast.info("Playlists coming soon");
        close();
      },
      ocid: "video_options.playlist_button",
    },
    {
      icon: <GitMerge size={20} />,
      label: "Duet",
      action: () => {
        if (onDuet) {
          onDuet(video.id);
        }
        close();
      },
      ocid: "video_options.duet_button",
    },
    {
      icon: <Scissors size={20} />,
      label: "Stitch",
      action: () => {
        toast.info("Stitch feature coming soon");
        close();
      },
      ocid: "video_options.stitch_button",
    },
    {
      icon: <UserCircle size={20} />,
      label: "View Creator Profile",
      action: () => {
        onViewProfile(video.creator);
        close();
      },
      ocid: "video_options.profile_button",
    },
    {
      icon: <EyeOff size={20} />,
      label: isOwner ? "Hide Video" : "Not Interested",
      action: handleHide,
      ocid: "video_options.hide_button",
    },
    {
      icon: <Flag size={20} />,
      label: "Report",
      action: () => setPanel("report"),
      ocid: "video_options.delete_button",
      danger: true,
    },
    {
      icon: <Link2 size={20} />,
      label: "Add to Story",
      action: () => {
        toast.info("Stories coming soon");
        close();
      },
      ocid: "video_options.story_button",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
            style={{
              background: "rgba(18, 18, 18, 0.97)",
              backdropFilter: "blur(20px)",
              maxHeight: "80vh",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            data-ocid="video_options.sheet"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-semibold text-base">
                {panel === "main"
                  ? "Options"
                  : panel === "report"
                    ? "Report Video"
                    : "Edit Video"}
              </h3>
              <button
                type="button"
                onClick={panel === "main" ? close : () => setPanel("main")}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                data-ocid="video_options.close_button"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Main list */}
            {panel === "main" && (
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "calc(80vh - 80px)" }}
              >
                {mainItems.map((item) => (
                  <button
                    key={item.ocid}
                    type="button"
                    onClick={item.action}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 active:bg-white/5 transition-colors ${
                      item.danger ? "text-red-400" : "text-white"
                    }`}
                    data-ocid={item.ocid}
                  >
                    <span
                      className={`shrink-0 ${
                        item.danger ? "text-red-400" : "text-white/70"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
                <div className="h-6" />
              </div>
            )}

            {/* Report panel */}
            {panel === "report" && (
              <div className="px-5 py-4 space-y-3">
                <p className="text-white/60 text-sm mb-4">
                  Why are you reporting this video?
                </p>
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      reportReason === reason
                        ? "border-[#FF3B5C] bg-[#FF3B5C]/10 text-[#FF3B5C]"
                        : "border-white/15 text-white active:bg-white/5"
                    }`}
                    data-ocid="video_options.radio"
                  >
                    {reason}
                  </button>
                ))}
                <Button
                  onClick={handleReport}
                  disabled={!reportReason}
                  className="w-full mt-4 bg-[#FF3B5C] hover:bg-[#FF3B5C]/80 text-white font-bold rounded-xl h-12"
                  data-ocid="video_options.submit_button"
                >
                  Submit Report
                </Button>
                <div className="h-4" />
              </div>
            )}

            {/* Edit panel */}
            {panel === "edit" && (
              <div
                className="px-5 py-4 space-y-4 overflow-y-auto"
                style={{ maxHeight: "calc(80vh - 80px)" }}
              >
                <div>
                  <label
                    htmlFor="edit-title"
                    className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5 block"
                  >
                    Title
                  </label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                    placeholder="Video title"
                    data-ocid="video_options.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-desc"
                    className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5 block"
                  >
                    Description
                  </label>
                  <Textarea
                    id="edit-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 resize-none"
                    placeholder="Describe your video..."
                    data-ocid="video_options.textarea"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-tags"
                    className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5 block"
                  >
                    Hashtags
                  </label>
                  <Input
                    id="edit-tags"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                    placeholder="#vibe #trending #fun"
                    data-ocid="video_options.tags_input"
                  />
                </div>
                <Button
                  onClick={handleEditSave}
                  disabled={saving || !editTitle.trim()}
                  className="w-full bg-white text-black font-bold rounded-xl h-12 hover:bg-white/90"
                  data-ocid="video_options.save_button"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <div className="h-4" />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
