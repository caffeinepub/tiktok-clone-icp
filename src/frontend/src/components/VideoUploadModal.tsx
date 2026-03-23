import { Camera, Film, Image, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

type Quality = "720p" | "1080p" | "4K";
type Visibility = "Public" | "Friends Only";
type SourceType = "record" | "gallery" | "photo";

interface VideoUploadModalProps {
  open: boolean;
  onClose: () => void;
  onRecord: () => void;
  onGalleryVideo: (
    file: File,
    quality: Quality,
    visibility: Visibility,
  ) => void;
  onGalleryPhoto: (file: File) => void;
}

export default function VideoUploadModal({
  open,
  onClose,
  onRecord,
  onGalleryVideo,
  onGalleryPhoto,
}: VideoUploadModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<Quality>("1080p");
  const [selectedVisibility, setSelectedVisibility] =
    useState<Visibility>("Public");
  const [selectedSource, setSelectedSource] = useState<SourceType | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleContinue = () => {
    if (!selectedSource) return;
    if (selectedSource === "record") {
      onClose();
      onRecord();
    } else if (selectedSource === "gallery") {
      videoInputRef.current?.click();
    } else if (selectedSource === "photo") {
      photoInputRef.current?.click();
    }
  };

  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onClose();
    onGalleryVideo(file, selectedQuality, selectedVisibility);
    e.target.value = "";
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onClose();
    onGalleryPhoto(file);
    e.target.value = "";
  };

  const options = [
    {
      id: "record" as SourceType,
      icon: Camera,
      label: "Record Video",
      sub: "Use your camera",
      color: "#22D3EE",
    },
    {
      id: "gallery" as SourceType,
      icon: Film,
      label: "Upload from Gallery",
      sub: "Pick a video file",
      color: "#FF3B5C",
    },
    {
      id: "photo" as SourceType,
      icon: Image,
      label: "Upload Photo / Story",
      sub: "Share a photo",
      color: "#FF8C69",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="upload.modal"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 w-full"
            onClick={onClose}
            aria-label="Close"
          />
          <motion.div
            className="relative w-full rounded-t-3xl bg-[#151920] px-5 pt-4 pb-10 z-10"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Title row */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#E9EEF5] font-black text-lg tracking-tight">
                Create
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center"
                data-ocid="upload.close_button"
              >
                <X size={16} className="text-[#8B95A3]" />
              </button>
            </div>

            {/* Source options */}
            <div className="flex flex-col gap-2.5 mb-6">
              {options.map((opt) => {
                const Icon = opt.icon;
                const active = selectedSource === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedSource(opt.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      active
                        ? "border-[#22D3EE] bg-[#22D3EE]/10"
                        : "border-[#2A3038] bg-[#1A1F26]"
                    }`}
                    data-ocid={`upload.${opt.id}.button`}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: `${opt.color}20` }}
                    >
                      <Icon size={22} style={{ color: opt.color }} />
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-bold text-sm ${
                          active ? "text-[#22D3EE]" : "text-[#E9EEF5]"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[#8B95A3] text-xs mt-0.5">{opt.sub}</p>
                    </div>
                    {active && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-[#22D3EE] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quality selector (only for video sources) */}
            {(selectedSource === "record" || selectedSource === "gallery") && (
              <div className="mb-4">
                <p className="text-[#8B95A3] text-xs font-semibold uppercase tracking-widest mb-2">
                  Quality
                </p>
                <div className="flex gap-2">
                  {(["720p", "1080p", "4K"] as Quality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQuality(q)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                        selectedQuality === q
                          ? "bg-[#22D3EE] text-black border-[#22D3EE]"
                          : "bg-[#1A1F26] text-[#8B95A3] border-[#2A3038]"
                      }`}
                      data-ocid={`upload.quality.${q.toLowerCase()}.toggle`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Visibility (only for video) */}
            {(selectedSource === "record" || selectedSource === "gallery") && (
              <div className="mb-6">
                <p className="text-[#8B95A3] text-xs font-semibold uppercase tracking-widest mb-2">
                  Visibility
                </p>
                <div className="flex gap-2">
                  {(["Public", "Friends Only"] as Visibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVisibility(v)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                        selectedVisibility === v
                          ? "bg-[#FF3B5C] text-white border-[#FF3B5C]"
                          : "bg-[#1A1F26] text-[#8B95A3] border-[#2A3038]"
                      }`}
                      data-ocid={`upload.visibility.${v.toLowerCase().replace(" ", "_")}.toggle`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Continue button */}
            <button
              type="button"
              disabled={!selectedSource}
              onClick={handleContinue}
              className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-40 bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] text-black"
              data-ocid="upload.submit_button"
            >
              Continue
            </button>
          </motion.div>

          {/* Hidden file inputs */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelected}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelected}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
