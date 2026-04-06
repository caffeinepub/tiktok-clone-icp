import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { CallState } from "../hooks/useWebRTCCall";

export interface CallOverlayProps {
  callState: CallState;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAnswer: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function CallOverlay({
  callState,
  localVideoRef,
  remoteVideoRef,
  onAnswer,
  onDecline,
  onHangup,
  onToggleMute,
  onToggleCamera,
}: CallOverlayProps) {
  const {
    phase,
    callType,
    remoteUsername,
    remoteAvatar,
    isMuted,
    isCameraOff,
    callDuration,
  } = callState;

  if (phase === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-ocid="call.modal"
        style={{
          background: "oklch(0.10 0.012 15)",
        }}
      >
        {/* === INCOMING CALL === */}
        {phase === "incoming" && (
          <div className="flex flex-col items-center justify-between h-full py-16 px-8">
            {/* Background glow effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.65 0.22 10), transparent)",
                  top: "-40px",
                  left: "-40px",
                }}
              />
              <div
                className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.60 0.18 300), transparent)",
                  bottom: "-40px",
                  right: "-40px",
                }}
              />
            </div>

            {/* Top info */}
            <div className="flex flex-col items-center gap-3 z-10">
              <p
                className="text-sm font-medium"
                style={{ color: "oklch(0.70 0.010 15)" }}
              >
                Incoming {callType === "video" ? "Video" : "Voice"} Call
              </p>
              <p
                className="text-2xl font-black"
                style={{ color: "oklch(0.94 0.008 60)" }}
              >
                @{remoteUsername}
              </p>

              {/* Pulsing avatar */}
              <div className="relative mt-4">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  style={{
                    background: "oklch(0.65 0.22 10 / 0.4)",
                    margin: "-16px",
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.4,
                  }}
                  style={{
                    background: "oklch(0.65 0.22 10 / 0.2)",
                    margin: "-28px",
                  }}
                />
                <img
                  src={remoteAvatar}
                  alt=""
                  className="w-28 h-28 rounded-full object-cover"
                  style={{
                    border: "4px solid oklch(0.65 0.22 10)",
                    boxShadow: "0 0 40px oklch(0.65 0.22 10 / 0.3)",
                  }}
                />
              </div>

              <motion.p
                className="text-sm mt-2"
                style={{ color: "oklch(0.60 0.010 15)" }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                {callType === "video" ? "📹" : "📞"} Incoming call...
              </motion.p>
            </div>

            {/* Action buttons */}
            <motion.div
              className="flex items-center gap-16 z-10"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 20 }}
            >
              {/* Decline */}
              <button
                type="button"
                onClick={onDecline}
                className="flex flex-col items-center gap-2"
                data-ocid="call.decline.button"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  style={{
                    background: "oklch(0.55 0.22 25)",
                    boxShadow: "0 8px 30px oklch(0.55 0.22 25 / 0.4)",
                  }}
                >
                  <PhoneOff size={26} className="text-white" />
                </div>
                <span
                  className="text-xs"
                  style={{ color: "oklch(0.60 0.010 15)" }}
                >
                  Decline
                </span>
              </button>

              {/* Accept */}
              <button
                type="button"
                onClick={onAnswer}
                className="flex flex-col items-center gap-2"
                data-ocid="call.accept.button"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  style={{
                    background: "oklch(0.60 0.18 145)",
                    boxShadow: "0 8px 30px oklch(0.60 0.18 145 / 0.4)",
                  }}
                >
                  {callType === "video" ? (
                    <Video size={26} className="text-white" />
                  ) : (
                    <Phone size={26} className="text-white" />
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{ color: "oklch(0.60 0.010 15)" }}
                >
                  Accept
                </span>
              </button>
            </motion.div>
          </div>
        )}

        {/* === OUTGOING CALL === */}
        {phase === "calling" && (
          <div className="flex flex-col items-center justify-between h-full py-16 px-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.65 0.22 10), transparent)",
                  top: "-40px",
                  right: "-40px",
                }}
              />
            </div>

            <div className="flex flex-col items-center gap-3 z-10">
              <p
                className="text-sm font-medium"
                style={{ color: "oklch(0.70 0.010 15)" }}
              >
                {callType === "video" ? "Video Call" : "Voice Call"}
              </p>
              <p
                className="text-2xl font-black"
                style={{ color: "oklch(0.94 0.008 60)" }}
              >
                @{remoteUsername}
              </p>

              <div className="relative mt-4">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{
                    duration: 2.5,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                  style={{
                    background: "oklch(0.65 0.22 10 / 0.3)",
                    margin: "-20px",
                  }}
                />
                <img
                  src={remoteAvatar}
                  alt=""
                  className="w-28 h-28 rounded-full object-cover"
                  style={{
                    border: "4px solid oklch(0.65 0.22 10 / 0.6)",
                    boxShadow: "0 0 40px oklch(0.65 0.22 10 / 0.2)",
                  }}
                />
              </div>

              <motion.p
                className="text-sm mt-2"
                style={{ color: "oklch(0.60 0.010 15)" }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                Calling...
              </motion.p>
            </div>

            {/* Cancel button */}
            <motion.div
              className="z-10"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 20 }}
            >
              <button
                type="button"
                onClick={onHangup}
                className="flex flex-col items-center gap-2"
                data-ocid="call.cancel.button"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  style={{
                    background: "oklch(0.55 0.22 25)",
                    boxShadow: "0 8px 30px oklch(0.55 0.22 25 / 0.4)",
                  }}
                >
                  <PhoneOff size={26} className="text-white" />
                </div>
                <span
                  className="text-xs"
                  style={{ color: "oklch(0.60 0.010 15)" }}
                >
                  Cancel
                </span>
              </button>
            </motion.div>
          </div>
        )}

        {/* === ACTIVE CALL === */}
        {phase === "active" && (
          <div className="relative w-full h-full">
            {/* Remote video fills the screen */}
            {/* biome-ignore lint/a11y/useMediaCaption: WebRTC live stream */}
            <video
              ref={remoteVideoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
            />

            {/* Fallback background when no remote video */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, oklch(0.10 0.012 15) 0%, oklch(0.14 0.015 10) 100%)",
              }}
            />

            {/* Gradient overlay for readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%)",
              }}
            />

            {/* Local video PiP (top-left) */}
            {callType === "video" && (
              <div className="absolute top-12 left-3 z-20 rounded-2xl overflow-hidden shadow-2xl">
                {/* biome-ignore lint/a11y/useMediaCaption: local preview */}
                <video
                  ref={localVideoRef}
                  className="w-24 h-36 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ border: "2px solid oklch(0.65 0.22 10 / 0.6)" }}
                />
              </div>
            )}

            {/* Duration timer (top center) */}
            <div className="absolute top-16 left-0 right-0 flex justify-center z-20">
              <div
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  background: "oklch(0.10 0.012 15 / 0.7)",
                  backdropFilter: "blur(8px)",
                  color: "oklch(0.94 0.008 60)",
                }}
                data-ocid="call.duration"
              >
                {formatDuration(callDuration)}
              </div>
            </div>

            {/* Remote username (below timer) */}
            <div className="absolute top-28 left-0 right-0 flex justify-center z-20">
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.80 0.008 60)" }}
              >
                @{remoteUsername}
              </p>
            </div>

            {/* Bottom action row */}
            <div className="absolute bottom-12 left-0 right-0 z-20 flex justify-center">
              <motion.div
                className="flex items-center gap-5 px-6 py-4 rounded-3xl"
                style={{
                  background: "oklch(0.10 0.012 15 / 0.85)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid oklch(0.25 0.018 15)",
                }}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
              >
                {/* Mute button */}
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                  data-ocid="call.mute.toggle"
                >
                  <div
                    className="w-13 h-13 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: isMuted
                        ? "oklch(0.55 0.22 25)"
                        : "oklch(0.22 0.018 15)",
                    }}
                  >
                    {isMuted ? (
                      <MicOff size={20} className="text-white" />
                    ) : (
                      <Mic
                        size={20}
                        style={{ color: "oklch(0.94 0.008 60)" }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "oklch(0.70 0.010 15)" }}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </button>

                {/* End call button */}
                <button
                  type="button"
                  onClick={onHangup}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                  data-ocid="call.hangup.button"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
                    style={{
                      background: "oklch(0.55 0.22 25)",
                      boxShadow: "0 4px 20px oklch(0.55 0.22 25 / 0.5)",
                    }}
                  >
                    <PhoneOff size={24} className="text-white" />
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "oklch(0.70 0.010 15)" }}
                  >
                    End
                  </span>
                </button>

                {/* Camera toggle (video calls only) */}
                {callType === "video" && (
                  <button
                    type="button"
                    onClick={onToggleCamera}
                    className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                    data-ocid="call.camera.toggle"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: isCameraOff
                          ? "oklch(0.55 0.22 25)"
                          : "oklch(0.22 0.018 15)",
                      }}
                    >
                      {isCameraOff ? (
                        <VideoOff size={20} className="text-white" />
                      ) : (
                        <Video
                          size={20}
                          style={{ color: "oklch(0.94 0.008 60)" }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "oklch(0.70 0.010 15)" }}
                    >
                      {isCameraOff ? "Show" : "Hide"}
                    </span>
                  </button>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
