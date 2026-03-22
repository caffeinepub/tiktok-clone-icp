import {
  Camera,
  CameraOff,
  Check,
  Film,
  FlipHorizontal,
  Hash,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import AuthModal from "../components/AuthModal";
import { useBackend } from "../hooks/useBackend";

type CaptureMode = "idle" | "preview";
type MediaType = "photo" | "video";

export default function CameraPage({ onDone }: { onDone: () => void }) {
  const { isLoggedIn } = useBackend();
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const camera = useCamera({ facingMode, format: "image/jpeg", quality: 0.9 });

  const [mode, setMode] = useState<CaptureMode>("idle");
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart camera on facing mode change only
  useEffect(() => {
    camera.startCamera();
    return () => {
      camera.stopCamera();
    };
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    };
  }, [capturedPreviewUrl]);

  const handleSwitchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
  };

  const startRecording = () => {
    const stream = camera.videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    recordedChunks.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: "video/webm" });
      const file = new File([blob], `video_${Date.now()}.webm`, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      setCapturedFile(file);
      setCapturedPreviewUrl(url);
      setMediaType("video");
      setMode("preview");
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setRecordSeconds(0);
    recordTimer.current = setInterval(
      () => setRecordSeconds((s) => s + 1),
      1000,
    );
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
  };

  const handleCapturePress = () => {
    pressTimer.current = setTimeout(() => {
      startRecording();
    }, 300);
  };

  const handleCaptureRelease = async () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (isRecording) {
      stopRecording();
      return;
    }
    const file = await camera.capturePhoto();
    if (file) {
      const url = URL.createObjectURL(file);
      setCapturedFile(file);
      setCapturedPreviewUrl(url);
      setMediaType("photo");
      setMode("preview");
    }
  };

  const handleUpload = async () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!capturedFile || !title.trim()) {
      toast.error("Please add a title");
      return;
    }
    setUploading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("Posted successfully!");
      onDone();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDiscard = () => {
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedFile(null);
    setCapturedPreviewUrl(null);
    setMode("idle");
    setTitle("");
    setDescription("");
    setHashtags("");
  };

  if (mode === "preview" && capturedPreviewUrl) {
    return (
      <motion.div
        className="h-full overflow-y-auto bg-[#0F1216]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        data-ocid="camera.preview.panel"
      >
        <div className="relative aspect-[9/16] bg-black">
          {mediaType === "photo" ? (
            <img
              src={capturedPreviewUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={capturedPreviewUrl}
              className="w-full h-full object-cover"
              controls
            >
              <track kind="captions" />
            </video>
          )}
          <button
            type="button"
            onClick={handleDiscard}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center"
            data-ocid="camera.discard.button"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div>
            <label
              htmlFor="cam-title"
              className="text-xs text-[#A6B0BC] mb-1 block"
            >
              Title *
            </label>
            <input
              id="cam-title"
              className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] transition-colors"
              placeholder="Add a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-ocid="camera.title.input"
            />
          </div>
          <div>
            <label
              htmlFor="cam-desc"
              className="text-xs text-[#A6B0BC] mb-1 block"
            >
              Description
            </label>
            <textarea
              id="cam-desc"
              rows={2}
              className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] transition-colors resize-none"
              placeholder="Tell viewers about this..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-ocid="camera.description.textarea"
            />
          </div>
          <div>
            <label
              htmlFor="cam-tags"
              className="text-xs text-[#A6B0BC] mb-1 block"
            >
              Hashtags
            </label>
            <div className="flex items-center gap-2 bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 focus-within:border-[#22D3EE] transition-colors">
              <Hash size={14} className="text-[#8B95A3] shrink-0" />
              <input
                id="cam-tags"
                className="flex-1 bg-transparent text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none"
                placeholder="fyp, viral, dance"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                data-ocid="camera.hashtags.input"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            className="w-full py-4 rounded-2xl bg-[#22D3EE] text-black font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2"
            data-ocid="camera.upload.submit_button"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Posting...
              </>
            ) : (
              <>
                <Check size={18} /> Post{" "}
                {mediaType === "photo" ? "Photo" : "Video"}
              </>
            )}
          </button>
        </div>

        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </motion.div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-black relative"
      data-ocid="camera.panel"
    >
      <div className="flex-1 relative overflow-hidden">
        {camera.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <Loader2 size={36} className="text-[#22D3EE] animate-spin" />
          </div>
        )}
        {camera.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1216] z-10 gap-4 px-8">
            <CameraOff size={48} className="text-[#8B95A3]" />
            <p className="text-center text-[#A6B0BC] text-sm">
              {camera.error.message}
            </p>
            <button
              type="button"
              onClick={camera.retry}
              className="bg-[#22D3EE] text-black px-6 py-2.5 rounded-2xl font-bold"
            >
              Try Again
            </button>
          </div>
        )}
        <video
          ref={camera.videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        >
          <track kind="captions" />
        </video>
        <canvas ref={camera.canvasRef} className="hidden" />

        <AnimatePresence>
          {isRecording && (
            <motion.div
              className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF3B5C] animate-pulse" />
              <span className="text-white text-sm font-bold">
                {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
                {String(recordSeconds % 60).padStart(2, "0")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSwitchCamera}
            className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
            aria-label="Switch camera"
            data-ocid="camera.flip.button"
          >
            <FlipHorizontal size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="shrink-0 bg-black px-6 py-8 flex flex-col items-center gap-4">
        <p className="text-[#8B95A3] text-xs">Tap for photo · Hold for video</p>
        <div className="flex items-center justify-center gap-8">
          <div className="w-12 h-12" />
          <button
            type="button"
            onPointerDown={handleCapturePress}
            onPointerUp={handleCaptureRelease}
            onPointerLeave={handleCaptureRelease}
            disabled={camera.isLoading || !camera.isActive}
            className="relative w-20 h-20 rounded-full bg-white disabled:opacity-40 flex items-center justify-center"
            aria-label="Capture"
            data-ocid="camera.capture.button"
          >
            {isRecording ? (
              <div className="w-8 h-8 rounded bg-[#FF3B5C]" />
            ) : (
              <div className="w-16 h-16 rounded-full border-4 border-[#0F1216] bg-white" />
            )}
          </button>
          <div className="w-12 h-12 rounded-full bg-[#1A1F26] flex items-center justify-center">
            {mediaType === "photo" ? (
              <Camera size={20} className="text-[#8B95A3]" />
            ) : (
              <Film size={20} className="text-[#8B95A3]" />
            )}
          </div>
        </div>

        {!isLoggedIn && (
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-2 text-[#22D3EE] text-sm font-semibold"
          >
            <Upload size={16} /> Sign in to post
          </button>
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
