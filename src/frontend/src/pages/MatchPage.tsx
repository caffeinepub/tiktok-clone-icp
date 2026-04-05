import type { Principal } from "@icp-sdk/core/principal";
import { Heart, MessageCircle, Star, Users, Video, X, Zap } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GradientRing, MatchOverlay } from "../components/LoveThemeEffects";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";
import UserProfilePage from "./UserProfilePage";

function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

interface MatchUser {
  principal: string;
  principalObj: Principal;
  username: string;
  bio: string;
  avatarUrl: string;
  videoCount: number;
  photoCount: number;
  followerCount: bigint;
  followingCount: bigint;
  mutualCount: bigint;
}

interface MatchRecord {
  principal: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  followerCount?: bigint;
  mutualCount?: bigint;
  videoCount?: number;
  photoCount?: number;
}

function parseTags(bio: string): string[] {
  const m = bio.match(/\|\s*tags:([^|]+)/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function pseudoAge(principal: string): number {
  const hash = principal
    .split("")
    .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  return 18 + (hash % 18);
}

function pseudoDistance(principal: string): string {
  const hash = principal
    .split("")
    .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  return `${(hash % 15) + 1} km away`;
}

type MatchTab = "discover" | "requests" | "matches";

const NICHE_TAG_STYLES = [
  {
    bg: "oklch(0.65 0.22 10 / 0.2)",
    border: "oklch(0.65 0.22 10 / 0.4)",
    color: "oklch(0.65 0.22 10)",
  },
  {
    bg: "oklch(0.55 0.20 340 / 0.2)",
    border: "oklch(0.55 0.20 340 / 0.4)",
    color: "oklch(0.75 0.16 340)",
  },
  {
    bg: "oklch(0.78 0.14 75 / 0.2)",
    border: "oklch(0.78 0.14 75 / 0.4)",
    color: "oklch(0.78 0.14 75)",
  },
];

function SwipeCard({
  user,
  onSwipeLeft,
  onSwipeRight,
  isTop,
  index,
}: {
  user: MatchUser;
  onSwipeLeft: () => void;
  onSwipeRight: () => Promise<boolean>;
  isTop: boolean;
  index: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const handleDragEnd = async (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      await onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    } else {
      x.set(0);
    }
  };

  const nicheTags = parseTags(user.bio);
  const age = pseudoAge(user.principal);
  const distance = pseudoDistance(user.principal);
  const photoCount = Math.min(
    3,
    1 + (user.videoCount > 0 ? 1 : 0) + (user.photoCount > 0 ? 1 : 0),
  );

  return (
    <motion.div
      style={{
        x,
        rotate,
        zIndex: 10 - index,
        scale: isTop ? 1 : 0.95 - index * 0.025,
        y: isTop ? 0 : index * 10,
        boxShadow: isTop
          ? "0 20px 60px oklch(0.65 0.22 10 / 0.3)"
          : "0 10px 30px rgba(0,0,0,0.6)",
        border: isTop ? "1.5px solid oklch(0.65 0.22 10 / 0.4)" : "none",
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-3 top-0 h-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
      data-ocid={isTop ? "match.card" : undefined}
    >
      {/* Background photo */}
      <div className="absolute inset-0">
        <img
          src={user.avatarUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{
            filter:
              photoIndex > 0
                ? `hue-rotate(${photoIndex * 30}deg) saturate(1.2)`
                : "none",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, oklch(0.05 0.015 15) 0%, oklch(0.10 0.012 15 / 0.4) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* Photo gallery dots */}
      {isTop && photoCount > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {Array.from({ length: photoCount }).map((_, pi) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: static photo dots
              key={pi}
              type="button"
              onClick={() => setPhotoIndex(pi)}
              className="h-1 rounded-full transition-all"
              style={{
                width: photoIndex === pi ? 20 : 8,
                background:
                  photoIndex === pi
                    ? "oklch(0.98 0 0)"
                    : "oklch(0.98 0 0 / 0.4)",
              }}
            />
          ))}
        </div>
      )}

      {/* Video badge */}
      {user.videoCount > 0 && (
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2 py-1"
          style={{ background: "oklch(0.10 0.012 15 / 0.8)" }}
        >
          <Video size={10} className="text-white" />
          <span className="text-white text-[10px] font-semibold">
            {user.videoCount}
          </span>
        </div>
      )}

      {/* LIKE / NOPE stamps */}
      {isTop && (
        <>
          <motion.div
            style={{
              opacity: likeOpacity,
              border: "3px solid oklch(0.72 0.20 145)",
            }}
            className="absolute top-12 left-5 rounded-xl px-4 py-2 rotate-[-20deg] z-10"
          >
            <span
              className="font-black text-2xl tracking-widest"
              style={{ color: "oklch(0.72 0.20 145)" }}
            >
              LIKE
            </span>
          </motion.div>
          <motion.div
            style={{
              opacity: nopeOpacity,
              border: "3px solid oklch(0.65 0.22 10)",
            }}
            className="absolute top-12 right-5 rounded-xl px-4 py-2 rotate-[20deg] z-10"
          >
            <span
              className="font-black text-2xl tracking-widest"
              style={{ color: "oklch(0.65 0.22 10)" }}
            >
              NOPE
            </span>
          </motion.div>
        </>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {user.followerCount > 0n && (
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: "oklch(0.10 0.012 15 / 0.75)" }}
            >
              <Users size={11} style={{ color: "oklch(0.65 0.22 10)" }} />
              <span className="text-white text-[11px] font-semibold">
                {formatCount(user.followerCount)}
              </span>
            </div>
          )}
          {user.mutualCount > 0n && (
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{
                background: "oklch(0.65 0.22 10 / 0.15)",
                border: "1px solid oklch(0.65 0.22 10 / 0.4)",
              }}
            >
              <span
                className="text-[11px] font-semibold"
                style={{ color: "oklch(0.65 0.22 10)" }}
              >
                {Number(user.mutualCount)} mutual
              </span>
            </div>
          )}
        </div>

        <h2 className="text-white text-2xl font-black">
          @{user.username}, <span className="font-normal text-xl">{age}</span>
        </h2>
        <p className="text-white/70 text-sm mt-0.5">{distance}</p>

        {user.bio && (
          <p className="text-white/60 text-xs mt-1 line-clamp-2">
            {user.bio.replace(/\|[^|]+/g, "").trim()}
          </p>
        )}

        <div className="flex gap-1.5 mt-2 flex-wrap">
          {(nicheTags.length > 0
            ? nicheTags
            : ["Creator", "Vibes", "Music"]
          ).map((tag, ti) => {
            const s = NICHE_TAG_STYLES[ti % NICHE_TAG_STYLES.length];
            return (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.color,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function MatchPage({
  onOpenChat,
}: {
  onOpenChat: (principal: string, username: string, avatarUrl: string) => void;
}) {
  const { backend, identity, isLoggedIn } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const [activeTab, setActiveTab] = useState<MatchTab>("discover");
  const [candidates, setCandidates] = useState<MatchUser[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchOverlay, setMatchOverlay] = useState<MatchUser | null>(null);
  const [viewingMatchProfile, setViewingMatchProfile] =
    useState<MatchRecord | null>(null);
  const myAvatarRef = useRef("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: storage client is stable
  useEffect(() => {
    if (!backend || !identity) return;
    const myPrincipal = identity.getPrincipal();

    const loadAll = async () => {
      setLoading(true);
      try {
        const myProfileOpt = await backend
          .getProfile(myPrincipal)
          .catch(() => null);
        if (myProfileOpt?.__kind__ === "Some") {
          let av =
            myProfileOpt.value.avatarKey ||
            `https://i.pravatar.cc/100?u=${myPrincipal.toString()}`;
          if (thumbStorageClient && av.startsWith("sha256:")) {
            try {
              av = await thumbStorageClient.getDirectURL(av);
            } catch {}
          }
          myAvatarRef.current = av;
        }

        const [rawCandidates, rawMatches] = await Promise.all([
          backend.getPotentialMatches().catch(() => []),
          backend.getMatches().catch(() => []),
        ]);

        const resolvedMatches: MatchRecord[] = await Promise.all(
          (rawMatches as any[]).map(async (m) => {
            const myPStr = myPrincipal.toString();
            const otherPrincipal =
              m.user1.toString() === myPStr ? m.user2 : m.user1;
            const otherPStr = otherPrincipal.toString();
            const [profileOpt, videos, photos, details] = await Promise.all([
              backend.getProfile(otherPrincipal).catch(() => null),
              backend.getUserVideos(otherPrincipal).catch(() => []),
              backend.getUserPhotos(otherPrincipal).catch(() => []),
              backend.getCandidateDetails(otherPrincipal).catch(() => null),
            ]);
            let username = otherPStr.slice(0, 8);
            let avatarUrl = `https://i.pravatar.cc/100?u=${otherPStr}`;
            let bio = "";
            if (profileOpt?.__kind__ === "Some") {
              username = profileOpt.value.username;
              bio = profileOpt.value.bio;
              avatarUrl = profileOpt.value.avatarKey || avatarUrl;
              if (thumbStorageClient && avatarUrl.startsWith("sha256:")) {
                try {
                  avatarUrl = await thumbStorageClient.getDirectURL(avatarUrl);
                } catch {}
              }
            }
            return {
              principal: otherPStr,
              username,
              avatarUrl,
              bio,
              followerCount: details?.followerCount ?? 0n,
              mutualCount: details?.mutualCount ?? 0n,
              videoCount: (videos as any[]).length,
              photoCount: (photos as any[]).length,
            };
          }),
        );
        setMatches(resolvedMatches);

        const matchedSet = new Set(resolvedMatches.map((m) => m.principal));
        matchedSet.add(myPrincipal.toString());

        const resolved: MatchUser[] = await Promise.all(
          (rawCandidates as any[]).map(async (u: any) => {
            const pStr =
              typeof u.principal === "object"
                ? u.principal.toString()
                : String(u.principal);
            let avatarUrl = `https://i.pravatar.cc/100?u=${pStr}`;
            try {
              const profileOpt = await backend.getProfile(u.principal);
              if (profileOpt.__kind__ === "Some") {
                const av = profileOpt.value.avatarKey || avatarUrl;
                if (thumbStorageClient && av.startsWith("sha256:")) {
                  avatarUrl = await thumbStorageClient.getDirectURL(av);
                } else {
                  avatarUrl = av;
                }
              }
            } catch {}
            const [videos, photos, details] = await Promise.all([
              backend.getUserVideos(u.principal).catch(() => []),
              backend.getUserPhotos(u.principal).catch(() => []),
              backend.getCandidateDetails(u.principal).catch(() => null),
            ]);
            return {
              principal: pStr,
              principalObj: u.principal,
              username: u.username,
              bio: u.bio,
              avatarUrl,
              videoCount: (videos as any[]).length,
              photoCount: (photos as any[]).length,
              followerCount: details?.followerCount ?? 0n,
              followingCount: details?.followingCount ?? 0n,
              mutualCount: details?.mutualCount ?? 0n,
            };
          }),
        );

        setCandidates(resolved.filter((u) => !matchedSet.has(u.principal)));
      } catch {}
      setLoading(false);
    };

    loadAll();
  }, [backend, identity]);

  const handleSwipeLeft = () => {
    const top = candidates[candidates.length - 1];
    if (!top || !backend) return;
    backend.swipeLeft(top.principalObj).catch(() => {});
    setCandidates((prev) => prev.slice(0, -1));
  };

  const handleSwipeRight = async (): Promise<boolean> => {
    const top = candidates[candidates.length - 1];
    if (!top || !backend) return false;
    try {
      const isMatch = await backend.swipeRight(top.principalObj);
      setCandidates((prev) => prev.slice(0, -1));
      if (isMatch) {
        setMatches((prev) => [
          {
            principal: top.principal,
            username: top.username,
            avatarUrl: top.avatarUrl,
            bio: top.bio,
            followerCount: top.followerCount,
            mutualCount: top.mutualCount,
            videoCount: top.videoCount,
            photoCount: top.photoCount,
          },
          ...prev,
        ]);
        setMatchOverlay(top);
        return true;
      }
    } catch {}
    return false;
  };

  if (!isLoggedIn) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-4 p-8"
        style={{ background: "oklch(0.10 0.012 15)" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--love-gradient)" }}
        >
          <Heart size={36} className="text-white fill-white" />
        </div>
        <p
          className="font-display text-2xl font-bold italic"
          style={{ color: "oklch(0.94 0.008 60)" }}
        >
          Find Your Match
        </p>
        <p
          className="text-sm text-center"
          style={{ color: "oklch(0.60 0.010 15)" }}
        >
          Sign in to discover people and start connecting
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "oklch(0.10 0.012 15)" }}
      data-ocid="match.page"
    >
      {/* Header + tabs */}
      <div
        className="shrink-0 px-4 pt-3 pb-0 border-b"
        style={{ borderColor: "oklch(0.22 0.018 15)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl animate-heartbeat">❤️</span>
          <h2
            className="font-display text-xl font-bold italic"
            style={{ color: "oklch(0.94 0.008 60)" }}
          >
            Discover
          </h2>
          {matches.length > 0 && (
            <span
              className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: "oklch(0.65 0.22 10 / 0.15)",
                color: "oklch(0.65 0.22 10)",
              }}
            >
              {matches.length} match{matches.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>

        <div className="flex">
          {(["discover", "requests", "matches"] as MatchTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 text-sm font-semibold py-2.5 border-b-2 transition-colors capitalize"
              style={{
                borderBottomColor:
                  activeTab === tab ? "oklch(0.65 0.22 10)" : "transparent",
                color:
                  activeTab === tab
                    ? "oklch(0.65 0.22 10)"
                    : "oklch(0.55 0.010 15)",
              }}
              data-ocid={`match.${tab}.tab`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* DISCOVER */}
      {activeTab === "discover" && (
        <>
          <div
            className="flex-1 relative mx-3 my-3 overflow-hidden"
            style={{ minHeight: 0 }}
          >
            {loading ? (
              <div
                className="absolute inset-0 flex items-center justify-center"
                data-ocid="match.loading_state"
              >
                <div
                  className="w-16 h-16 rounded-2xl animate-pulse"
                  style={{ background: "oklch(0.20 0.018 15)" }}
                />
              </div>
            ) : candidates.length === 0 ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                data-ocid="match.empty_state"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.20 0.018 15)" }}
                >
                  <Zap size={36} style={{ color: "oklch(0.55 0.010 15)" }} />
                </div>
                <p
                  className="font-bold"
                  style={{ color: "oklch(0.94 0.008 60)" }}
                >
                  You've seen everyone!
                </p>
                <p
                  className="text-sm text-center"
                  style={{ color: "oklch(0.55 0.010 15)" }}
                >
                  Check back later for new people
                </p>
              </div>
            ) : (
              <div className="absolute inset-0">
                {candidates.slice(-3).map((user, i, arr) => (
                  <SwipeCard
                    key={user.principal}
                    user={user}
                    isTop={i === arr.length - 1}
                    index={arr.length - 1 - i}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                  />
                ))}
              </div>
            )}
          </div>

          {!loading && candidates.length > 0 && (
            <div className="shrink-0 flex items-center justify-center gap-6 py-4">
              <button
                type="button"
                onClick={handleSwipeLeft}
                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background: "oklch(0.15 0.018 15)",
                  border: "2px solid oklch(0.65 0.22 10 / 0.6)",
                  boxShadow: "0 8px 24px oklch(0.65 0.22 10 / 0.2)",
                }}
                data-ocid="match.nope.button"
              >
                <X size={26} style={{ color: "oklch(0.65 0.22 10)" }} />
              </button>

              <button
                type="button"
                onClick={handleSwipeRight}
                className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                  boxShadow: "0 8px 30px oklch(0.65 0.22 10 / 0.5)",
                }}
                data-ocid="match.request.button"
              >
                <Star
                  size={30}
                  style={{ color: "oklch(0.98 0 0)" }}
                  className="fill-current"
                />
              </button>

              <button
                type="button"
                onClick={handleSwipeRight}
                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background: "oklch(0.15 0.018 15)",
                  border: "2px solid oklch(0.72 0.20 145 / 0.6)",
                  boxShadow: "0 8px 24px oklch(0.72 0.20 145 / 0.2)",
                }}
                data-ocid="match.like.button"
              >
                <Heart
                  size={26}
                  style={{ color: "oklch(0.72 0.20 145)" }}
                  className="fill-current"
                />
              </button>
            </div>
          )}
        </>
      )}

      {/* REQUESTS */}
      {activeTab === "requests" && (
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          data-ocid="match.requests.list"
        >
          <p
            className="text-sm font-semibold mb-4"
            style={{ color: "oklch(0.60 0.010 15)" }}
          >
            Match Requests
          </p>
          {matches.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="match.requests.empty_state"
            >
              <div className="text-5xl mb-3">💌</div>
              <p style={{ color: "oklch(0.60 0.010 15)" }}>No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.slice(0, 5).map((m, i) => (
                <motion.div
                  key={m.principal}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{
                    background: "oklch(0.15 0.018 15)",
                    border: "1px solid oklch(0.22 0.018 15)",
                  }}
                  data-ocid={`match.request.item.${i + 1}`}
                >
                  <GradientRing size={52}>
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </GradientRing>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-sm"
                      style={{ color: "oklch(0.94 0.008 60)" }}
                    >
                      @{m.username}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.010 15)" }}
                    >
                      Wants to connect
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenChat(m.principal, m.username, m.avatarUrl)
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                        color: "oklch(0.98 0 0)",
                      }}
                      data-ocid={`match.request.accept.${i + 1}`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform"
                      style={{
                        border: "1px solid oklch(0.28 0.020 15)",
                        color: "oklch(0.60 0.010 15)",
                      }}
                      data-ocid={`match.request.decline.${i + 1}`}
                    >
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MATCHES */}
      {activeTab === "matches" && (
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          data-ocid="match.matches.list"
        >
          <p
            className="text-sm font-semibold mb-4"
            style={{ color: "oklch(0.60 0.010 15)" }}
          >
            {matches.length} Match{matches.length !== 1 ? "es" : ""}
          </p>
          {matches.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="match.matches.empty_state"
            >
              <div className="text-5xl mb-3">❤️</div>
              <p style={{ color: "oklch(0.60 0.010 15)" }}>No matches yet</p>
              <p
                className="text-sm mt-1"
                style={{ color: "oklch(0.45 0.008 15)" }}
              >
                Start swiping to find your match
              </p>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2 no-scrollbar"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {matches.map((m) => (
                <button
                  key={m.principal}
                  type="button"
                  onClick={() => setViewingMatchProfile(m)}
                  className="flex flex-col items-center gap-2 shrink-0 rounded-2xl p-3 w-[88px] active:scale-95 transition-transform"
                  style={{
                    background: "oklch(0.15 0.018 15)",
                    border: "1px solid oklch(0.22 0.018 15)",
                    scrollSnapAlign: "start",
                  }}
                  data-ocid="match.match.button"
                >
                  <GradientRing size={52}>
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </GradientRing>
                  <p
                    className="text-[10px] font-semibold text-center truncate w-full"
                    style={{ color: "oklch(0.94 0.008 60)" }}
                  >
                    @{m.username}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChat(m.principal, m.username, m.avatarUrl);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.65 0.22 10), oklch(0.55 0.20 340))",
                    }}
                    data-ocid="match.match.message.button"
                  >
                    <MessageCircle
                      size={13}
                      style={{ color: "oklch(0.98 0 0)" }}
                    />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match overlay */}
      <MatchOverlay
        show={!!matchOverlay}
        username={matchOverlay?.username ?? ""}
        avatarUrl={matchOverlay?.avatarUrl ?? ""}
        myAvatar={
          myAvatarRef.current ||
          `https://i.pravatar.cc/100?u=${identity?.getPrincipal().toString()}`
        }
        onMessage={() => {
          const m = matchOverlay;
          setMatchOverlay(null);
          if (m) onOpenChat(m.principal, m.username, m.avatarUrl);
        }}
        onClose={() => setMatchOverlay(null)}
      />

      {/* Full UserProfile overlay */}
      <AnimatePresence>
        {viewingMatchProfile && (
          <motion.div
            key="match-profile"
            className="fixed inset-0 z-[55]"
            style={{ background: "oklch(0.10 0.012 15)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <UserProfilePage
              creatorId={viewingMatchProfile.principal}
              onBack={() => setViewingMatchProfile(null)}
              onOpenChat={(principal, username, avatarUrl) => {
                setViewingMatchProfile(null);
                onOpenChat(principal, username, avatarUrl);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
