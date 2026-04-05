import { Phone, PhoneOff, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface CallOverlayProps {
  open: boolean;
  username: string;
  avatarUrl: string;
  callType: "video" | "voice";
  onDecline: () => void;
  onAccept: () => void;
}

export default function CallOverlay({
  open,
  username,
  avatarUrl,
  callType,
  onDecline,
  onAccept,
}: CallOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between py-16 px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background:
              "linear-gradient(180deg, #0d1117 0%, #1a0a1e 50%, #0d1117 100%)",
          }}
          data-ocid="call.modal"
        >
          {/* Blurred background circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl"
              style={{
                background: "radial-gradient(circle, #22D3EE, transparent)",
                top: "-40px",
                left: "-40px",
              }}
            />
            <div
              className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl"
              style={{
                background: "radial-gradient(circle, #FF3B5C, transparent)",
                bottom: "-40px",
                right: "-40px",
              }}
            />
          </div>

          {/* Top info */}
          <div className="flex flex-col items-center gap-3 z-10">
            <p className="text-[#A6B0BC] text-sm font-medium">
              {callType === "video" ? "Video Call" : "Voice Call"}
            </p>
            <p className="text-[#E9EEF5] text-2xl font-black">@{username}</p>

            {/* Pulsing ring avatar */}
            <div className="relative mt-4">
              {/* Outer pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#22D3EE]/40"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                style={{ margin: "-16px" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#22D3EE]/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: 0.4,
                }}
                style={{ margin: "-28px" }}
              />

              <img
                src={avatarUrl}
                alt=""
                className="w-28 h-28 rounded-full object-cover border-4 border-[#22D3EE] shadow-2xl"
                style={{ boxShadow: "0 0 40px rgba(34,211,238,0.3)" }}
              />
            </div>

            <motion.p
              className="text-[#8B95A3] text-sm mt-2"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              Calling...
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
              className="w-18 h-18 flex flex-col items-center gap-2"
              data-ocid="call.decline.button"
            >
              <div
                className="w-16 h-16 rounded-full bg-[#FF3B5C] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                style={{ boxShadow: "0 8px 30px rgba(255,59,92,0.4)" }}
              >
                <PhoneOff size={26} className="text-white" />
              </div>
              <span className="text-xs text-[#8B95A3]">Decline</span>
            </button>

            {/* Accept */}
            <button
              type="button"
              onClick={onAccept}
              className="w-18 h-18 flex flex-col items-center gap-2"
              data-ocid="call.accept.button"
            >
              <div
                className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                style={{ boxShadow: "0 8px 30px rgba(34,197,94,0.4)" }}
              >
                {callType === "video" ? (
                  <Video size={26} className="text-white" />
                ) : (
                  <Phone size={26} className="text-white" />
                )}
              </div>
              <span className="text-xs text-[#8B95A3]">Accept</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
