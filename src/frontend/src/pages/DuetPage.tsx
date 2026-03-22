import { Camera, Loader2, Mic, Square, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

interface DuetPageProps {
  originalVideoUrl: string;
  originalVideoId: string;
  onDone: () => void;
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function DuetPage({
  originalVideoUrl,
  originalVideoId,
  onDone,
}: DuetPageProps) {
  const { backend, isLoggedIn } = useBackend();
  const videoStorageClient = useStorageClient("videos");
  const thumbStorageClient = useStorageClient("thumbnails");

  const [caption, setCaption] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);

  // Start camera on mount
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setCameraStream(s);
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = s;
        }
      })
      .catch(() => setCameraError(true));
    return () => {
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
    };
  }, []);

  // Attach stream to video element when ref is ready
  useEffect(() => {
    if (cameraStream && cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const startRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(cameraStream, {
      mimeType: "video/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setRecordingTime(0);

    // Auto-stop after 30 seconds
    timerRef.current = setInterval(() => {
      setRecordingTime((t) => {
        if (t >= 29) {
          stopRecording();
          return 30;
        }
        return t + 1;
      });
    }, 1000);

    // Play original video too
    originalVideoRef.current?.play().catch(() => {});
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    originalVideoRef.current?.pause();
  };

  const handleUpload = async () => {
    if (!recordedBlob || !videoStorageClient || !backend || !isLoggedIn) return;
    setUploading(true);
    try {
      const videoBytes = new Uint8Array(await recordedBlob.arrayBuffer());
      const { hash: videoKey } = await videoStorageClient.putFile(videoBytes);
      let thumbnailKey = "";
      try {
        // Try to grab a frame from original video as thumbnail
        const canvas = document.createElement("canvas");
        const vid = originalVideoRef.current;
        if (vid) {
          canvas.width = 320;
          canvas.height = 568;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(vid, 0, 0, 320, 568);
          await new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
              if (blob && thumbStorageClient) {
                const thumbBytes = new Uint8Array(await blob.arrayBuffer());
                const { hash: tKey } =
                  await thumbStorageClient.putFile(thumbBytes);
                thumbnailKey = tKey;
              }
              resolve();
            }, "image/jpeg");
          });
        }
      } catch {}
      await backend.createDuet(
        originalVideoId,
        videoKey,
        thumbnailKey,
        caption,
      );
      setUploadDone(true);
      setTimeout(() => onDone(), 1000);
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#0F1216] flex flex-col"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      data-ocid="duet.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 shrink-0 border-b border-[#2A3038]">
        <button
          type="button"
          onClick={onDone}
          className="w-9 h-9 rounded-full bg-[#1A1F26] flex items-center justify-center"
          data-ocid="duet.close_button"
        >
          <X size={18} className="text-[#E9EEF5]" />
        </button>
        <h1 className="text-[#E9EEF5] font-black text-base tracking-tight">
          Create Duet
        </h1>
        <div className="w-9" />
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: original */}
        <div className="flex-1 relative bg-black border-r border-[#2A3038]">
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-white/80 text-[10px] font-semibold bg-black/50 px-2 py-0.5 rounded-full">
            Original
          </span>
          <video
            ref={originalVideoRef}
            src={originalVideoUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
          />
        </div>

        {/* Right: camera */}
        <div className="flex-1 relative bg-[#0A0D10]">
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-white/80 text-[10px] font-semibold bg-black/50 px-2 py-0.5 rounded-full">
            You
          </span>
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0A0D10]">
              <Camera size={36} className="text-[#8B95A3]" />
              <p className="text-[#8B95A3] text-xs text-center px-4">
                Camera access denied
              </p>
            </div>
          ) : (
            <video
              ref={cameraPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}

          {/* Recording indicator */}
          {recording && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#FF3B5C] px-2 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-[10px] font-bold">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-4 py-4 space-y-3 border-t border-[#2A3038]">
        {uploadDone ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <div className="w-12 h-12 rounded-full bg-[#22D3EE]/20 flex items-center justify-center">
              <Upload size={24} className="text-[#22D3EE]" />
            </div>
            <p className="text-[#22D3EE] font-semibold text-sm">
              Duet uploaded!
            </p>
          </div>
        ) : (
          <>
            <input
              className="w-full bg-[#1A1F26] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] transition-colors"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              data-ocid="duet.caption.input"
            />

            <div className="flex items-center gap-3">
              {recordedBlob ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordedBlob(null);
                      setRecordingTime(0);
                    }}
                    className="flex-1 py-3 rounded-2xl border border-[#2A3038] text-[#E9EEF5] font-semibold text-sm"
                    data-ocid="duet.cancel_button"
                  >
                    Re-record
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !videoStorageClient}
                    className="flex-1 py-3 rounded-2xl bg-[#22D3EE] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                    data-ocid="duet.upload_button"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />{" "}
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} /> Post Duet
                      </>
                    )}
                  </button>
                </>
              ) : recording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="mx-auto w-16 h-16 rounded-full bg-[#FF3B5C] flex items-center justify-center shadow-xl shadow-[#FF3B5C]/30"
                  data-ocid="duet.stop_button"
                >
                  <Square size={24} className="text-white fill-white" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onDone}
                    className="flex-1 py-3 rounded-2xl border border-[#2A3038] text-[#8B95A3] font-semibold text-sm"
                    data-ocid="duet.cancel_button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={!!cameraError || !cameraStream}
                    className="flex-1 py-3 rounded-2xl bg-[#FF3B5C] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#FF3B5C]/30 disabled:opacity-40"
                    data-ocid="duet.record.primary_button"
                  >
                    <Mic size={16} /> Record
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
