import { Image, Upload, Video, X } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function StoryCreator({ onClose, onCreated }: Props) {
  const { backend } = useBackend();
  const photoClient = useStorageClient("photos");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    if (!file || !backend || !photoClient) return;
    setUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash: key } = await photoClient.putFile(bytes);
      await backend.createStory(key, file.type, caption);
      onCreated();
      onClose();
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      data-ocid="story_creator.modal"
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-12 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/60"
        data-ocid="story_creator.close_button"
      >
        <X size={20} className="text-white" />
      </button>

      <h2 className="text-white text-xl font-bold mb-6">Create Story</h2>

      {/* Preview */}
      <button
        type="button"
        className="w-full max-w-xs aspect-[9/16] rounded-2xl overflow-hidden bg-[#1A1F26] border border-[#2A3038] flex items-center justify-center mb-4 relative cursor-pointer"
        onClick={() => fileRef.current?.click()}
        data-ocid="story_creator.dropzone"
      >
        {previewUrl && file ? (
          file.type.startsWith("video") ? (
            <video
              src={previewUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <img
              src={previewUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="flex flex-col items-center gap-3 text-[#8B95A3]">
            <div className="flex gap-3">
              <Image size={28} />
              <Video size={28} />
            </div>
            <p className="text-sm">Tap to select photo or video</p>
          </div>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFile}
        data-ocid="story_creator.upload_button"
      />

      {/* Caption */}
      <input
        type="text"
        placeholder="Add a caption..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="w-full max-w-xs bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] mb-4"
        data-ocid="story_creator.caption.input"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-[#22D3EE] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        data-ocid="story_creator.submit_button"
      >
        {uploading ? (
          <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
        ) : (
          <>
            <Upload size={18} />
            Share Story
          </>
        )}
      </button>
    </motion.div>
  );
}
