import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/** Floating hearts burst - shown on match/like events */
export function FloatingHearts({ trigger }: { trigger: boolean }) {
  const [hearts, setHearts] = useState<
    { id: number; x: number; delay: number }[]
  >([]);

  useEffect(() => {
    if (!trigger) return;
    const newHearts = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100,
      delay: i * 0.08,
    }));
    setHearts(newHearts);
    const t = setTimeout(() => setHearts([]), 2000);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            className="absolute text-3xl"
            initial={{ opacity: 1, y: 0, x: h.x, scale: 0.5 }}
            animate={{ opacity: 0, y: -200, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, delay: h.delay, ease: "easeOut" }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Tap heart animation - at a specific position */
export function TapHeart({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  return (
    <motion.div
      className="pointer-events-none fixed z-[90] text-5xl"
      style={{ left: x - 24, top: y - 24 }}
      initial={{ opacity: 1, scale: 0.5 }}
      animate={{ opacity: 0, scale: 2.5 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      ❤️
    </motion.div>
  );
}

/** Pulsing heart icon */
export function PulseHeart({
  size = 24,
  className = "",
}: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block animate-heartbeat ${className}`}
      style={{ fontSize: size }}
    >
      ❤️
    </span>
  );
}

/** Animated gradient ring for avatars */
export function GradientRing({
  size = 80,
  children,
  className = "",
  gold = false,
}: {
  size?: number;
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`relative rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Animated gradient ring */}
      <div
        className="absolute inset-0 rounded-full animate-ring-rotate"
        style={{
          background: gold
            ? "conic-gradient(from 0deg, oklch(0.78 0.14 75), oklch(0.65 0.22 10), oklch(0.55 0.20 340), oklch(0.78 0.14 75))"
            : "conic-gradient(from 0deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340), oklch(0.65 0.22 10))",
          padding: 2,
        }}
      />
      {/* Inner content */}
      <div
        className="absolute rounded-full overflow-hidden bg-[#1A0808]"
        style={{ inset: 3 }}
      >
        {children}
      </div>
    </div>
  );
}

/** "It's a Match!" overlay */
export function MatchOverlay({
  show,
  username,
  avatarUrl,
  myAvatar,
  onMessage,
  onClose,
}: {
  show: boolean;
  username: string;
  avatarUrl: string;
  myAvatar: string;
  onMessage: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.10 0.025 10), oklch(0.10 0.020 340))",
          }}
        >
          {/* Floating hearts bg */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 12 }, (_, i) => `heart-${i}`).map(
              (heartId) => (
                <motion.div
                  key={heartId}
                  className="absolute text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{ y: [-10, -30, -10], opacity: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: Math.random() * 2,
                  }}
                >
                  ❤️
                </motion.div>
              ),
            )}
          </div>

          {/* Avatars */}
          <motion.div
            className="flex items-center justify-center gap-6 mb-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <GradientRing size={80}>
              <img
                src={myAvatar}
                alt=""
                className="w-full h-full object-cover"
              />
            </GradientRing>
            <span className="text-4xl">💘</span>
            <GradientRing size={80}>
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </GradientRing>
          </motion.div>

          <motion.div
            className="text-center mb-8 px-6"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="font-display text-4xl font-bold text-white italic mb-2">
              It's a Match!
            </h2>
            <p className="text-white/70 text-base">
              You and{" "}
              <span className="text-white font-semibold">@{username}</span>{" "}
              liked each other
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col gap-3 w-full max-w-xs px-6"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              type="button"
              onClick={onMessage}
              className="w-full py-4 rounded-2xl text-white font-bold text-base active:scale-95 transition-transform"
              style={{ background: "var(--love-gradient)" }}
              data-ocid="match.overlay.message.primary_button"
            >
              💌 Send a Message
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 rounded-2xl border border-white/20 text-white/70 font-semibold text-base active:scale-95 transition-transform"
              data-ocid="match.overlay.close.button"
            >
              Keep Discovering
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
