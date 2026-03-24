import { Film, Image, Upload } from "lucide-react";
import { useRef, useState } from "react";
import AuthModal from "../components/AuthModal";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

export default function UploadPage({ onDone }: { onDone: () => void }) {
  const { backend, isLoggedIn } = useBackend();
  const videoStorageClient = useStorageClient("videos");
  const thumbStorageClient = useStorageClient("thumbnails");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [showAuth, setShowAuth] = useState(!isLoggedIn);
  const [error, setError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Refs to always get latest values in async context
  const videoStorageClientRef = useRef(videoStorageClient);
  const thumbStorageClientRef = useRef(thumbStorageClient);
  const backendRef = useRef(backend);
  videoStorageClientRef.current = videoStorageClient;
  thumbStorageClientRef.current = thumbStorageClient;
  backendRef.current = backend;

  const waitReady = async () => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (videoStorageClientRef.current && backendRef.current) return true;
      await new Promise((r) => setTimeout(r, 300));
    }
    return false;
  };

  const handleUpload = async () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!videoFile || !title.trim()) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const ready = await waitReady();
      if (!ready) {
        setError("Upload service not ready. Please try again in a moment.");
        return;
      }
      const vc = videoStorageClientRef.current;
      const be = backendRef.current;
      if (!vc || !be) {
        setError("Upload service not ready. Please try again in a moment.");
        return;
      }

      const tags = hashtags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      // Upload video
      const videoBytes = new Uint8Array(await videoFile.arrayBuffer());
      const { hash: videoHash } = await vc.putFile(videoBytes, (pct) =>
        setProgress(Math.round(pct * 0.85)),
      );

      // Upload thumbnail if provided
      let thumbHash = "";
      const tc = thumbStorageClientRef.current;
      if (thumbFile && tc) {
        const thumbBytes = new Uint8Array(await thumbFile.arrayBuffer());
        const { hash } = await tc.putFile(thumbBytes, (pct) =>
          setProgress(85 + Math.round(pct * 0.1)),
        );
        thumbHash = hash;
      }

      setProgress(95);
      await be.postVideo(title, description, tags, videoHash, thumbHash);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));
      setDone(true);
      setTimeout(onDone, 1500);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (showAuth) {
    return (
      <>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <div className="h-full flex flex-col items-center justify-center text-[#8B95A3] gap-4 p-8">
          <Film size={48} />
          <p className="text-center">
            Sign in with Internet Identity to upload your videos
          </p>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[#22D3EE]/20 flex items-center justify-center">
          <Upload size={36} className="text-[#22D3EE]" />
        </div>
        <p className="text-xl font-bold">Uploaded!</p>
        <p className="text-[#8B95A3] text-sm">Your video is live</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0F1216] px-4 py-4">
      <h2 className="text-lg font-bold mb-4">Upload Video</h2>

      <button
        type="button"
        onClick={() => videoInputRef.current?.click()}
        className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#2A3038] flex flex-col items-center justify-center gap-2 mb-4 bg-[#1A1F26]"
      >
        {videoFile ? (
          <>
            <Film size={32} className="text-[#22D3EE]" />
            <p className="text-sm text-[#E9EEF5]">{videoFile.name}</p>
            <p className="text-xs text-[#8B95A3]">
              {(videoFile.size / 1_000_000).toFixed(1)} MB
            </p>
          </>
        ) : (
          <>
            <Upload size={32} className="text-[#8B95A3]" />
            <p className="text-sm text-[#A6B0BC]">Tap to select video</p>
            <p className="text-xs text-[#8B95A3]">MP4, MOV, AVI</p>
          </>
        )}
      </button>
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => thumbInputRef.current?.click()}
        className="w-full py-3 rounded-xl border border-[#2A3038] flex items-center gap-3 px-4 mb-4 bg-[#1A1F26]"
      >
        <Image size={20} className="text-[#8B95A3]" />
        <span className="text-sm text-[#A6B0BC]">
          {thumbFile ? thumbFile.name : "Select thumbnail (optional)"}
        </span>
      </button>
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
      />

      <div className="space-y-3 mb-6">
        <div>
          <label
            htmlFor="upload-title"
            className="text-xs text-[#A6B0BC] mb-1 block"
          >
            Title *
          </label>
          <input
            id="upload-title"
            data-ocid="upload.title.input"
            className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE]"
            placeholder="Add a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="upload-desc"
            className="text-xs text-[#A6B0BC] mb-1 block"
          >
            Description
          </label>
          <textarea
            id="upload-desc"
            data-ocid="upload.desc.textarea"
            rows={3}
            className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] resize-none"
            placeholder="Describe your video..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="upload-tags"
            className="text-xs text-[#A6B0BC] mb-1 block"
          >
            Hashtags (comma separated)
          </label>
          <input
            id="upload-tags"
            data-ocid="upload.tags.input"
            className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE]"
            placeholder="#fyp, #viral, #dance"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          data-ocid="upload.error_state"
        >
          {error}
        </div>
      )}

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#A6B0BC] mb-1">
            <span>
              {progress === 0
                ? "Connecting to upload service..."
                : "Uploading..."}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[#2A3038] rounded-full">
            <div
              className="h-full bg-[#22D3EE] rounded-full transition-all duration-300"
              style={{ width: progress === 0 ? "10%" : `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || !videoFile || !title.trim()}
        className="w-full py-4 rounded-2xl bg-[#22D3EE] text-black font-bold text-base disabled:opacity-40"
        data-ocid="upload.submit_button"
      >
        {uploading
          ? progress === 0
            ? "Connecting..."
            : "Uploading..."
          : "Post Video"}
      </button>
    </div>
  );
}
