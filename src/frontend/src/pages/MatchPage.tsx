import type { Principal } from "@icp-sdk/core/principal";
import { Heart, MessageCircle, Users, Video, X, Zap } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
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

// Parse niche tags from bio
function parseTags(bio: string): string[] {
  const m = bio.match(/\|\s*tags:([^|]+)/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}

const TAG_COLORS = [
  "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/30",
  "bg-[#FF3B5C]/20 text-[#FF3B5C] border-[#FF3B5C]/30",
  "bg-[#9333EA]/20 text-[#9333EA] border-[#9333EA]/30",
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
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = async (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      const isMatch = await onSwipeRight();
      if (!isMatch) x.set(0);
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    } else {
      x.set(0);
    }
  };

  const totalContent = user.videoCount + user.photoCount;
  const nicheTags = parseTags(user.bio);

  return (
    <motion.div
      style={{
        x,
        rotate,
        zIndex: 10 - index,
        scale: isTop ? 1 : 0.95 - index * 0.03,
        y: isTop ? 0 : index * 8,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={`absolute inset-x-4 top-0 h-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing ${
        isTop ? "shadow-[0_20px_60px_rgba(0,0,0,0.8)]" : "shadow-2xl"
      }`}
      data-ocid={isTop ? "match.card" : undefined}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={user.avatarUrl}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      {/* Video indicator badge */}
      {user.videoCount > 0 && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
          <Video size={10} className="text-white" />
          <span className="text-white text-[10px] font-semibold">
            {user.videoCount} video{user.videoCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Like / Nope stamps */}
      {isTop && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-10 left-6 border-4 border-[#22D3EE] rounded-xl px-4 py-2 rotate-[-20deg] z-10"
          >
            <span className="text-[#22D3EE] font-black text-2xl tracking-widest">
              LIKE
            </span>
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-10 right-6 border-4 border-[#FF3B5C] rounded-xl px-4 py-2 rotate-[20deg] z-10"
          >
            <span className="text-[#FF3B5C] font-black text-2xl tracking-widest">
              NOPE
            </span>
          </motion.div>
        </>
      )}

      {/* User info */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {/* Stats bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
            <Users size={12} className="text-[#22D3EE]" />
            <span className="text-white text-[11px] font-semibold">
              {formatCount(user.followerCount)} followers
            </span>
          </div>
          {totalContent > 0 && (
            <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
              <span className="text-white text-[11px] font-semibold">
                {totalContent} posts
              </span>
            </div>
          )}
          {user.mutualCount > 0n && (
            <div className="flex items-center gap-1.5 bg-[#22D3EE]/20 rounded-full px-3 py-1 border border-[#22D3EE]/40">
              <span className="text-[#22D3EE] text-[11px] font-semibold">
                {Number(user.mutualCount)} mutual
              </span>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-white text-2xl font-black">@{user.username}</h2>
            {user.bio && (
              <p className="text-white/80 text-sm mt-1 line-clamp-2">
                {user.bio.replace(/\|[^|]+/g, "").trim()}
              </p>
            )}

            {/* Niche tags */}
            {nicheTags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {nicheTags.map((tag, ti) => (
                  <span
                    key={tag}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                      TAG_COLORS[ti % TAG_COLORS.length]
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MatchProfileModal({
  match,
  onMessage,
  onClose,
}: {
  match: MatchRecord;
  onMessage: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-ocid="match.profile.modal"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/70 w-full"
          onClick={onClose}
          aria-label="Close modal"
        />
        <motion.div
          className="relative w-full rounded-t-3xl bg-[#151920] pt-4 pb-8 px-5 z-10"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex flex-col items-center gap-3 mb-5">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#FF3B5C] shadow-xl">
              <img
                src={match.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <h3 className="text-[#E9EEF5] font-black text-lg">
                @{match.username}
              </h3>
              {match.bio && (
                <p className="text-[#8B95A3] text-sm mt-1 line-clamp-2">
                  {match.bio.replace(/\|[^|]+/g, "").trim()}
                </p>
              )}
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-1">
              {match.followerCount !== undefined && (
                <div className="flex flex-col items-center">
                  <span className="text-[#E9EEF5] font-bold text-base">
                    {formatCount(match.followerCount)}
                  </span>
                  <span className="text-[#8B95A3] text-[10px]">Followers</span>
                </div>
              )}
              {(match.videoCount !== undefined ||
                match.photoCount !== undefined) && (
                <div className="flex flex-col items-center">
                  <span className="text-[#E9EEF5] font-bold text-base">
                    {(match.videoCount ?? 0) + (match.photoCount ?? 0)}
                  </span>
                  <span className="text-[#8B95A3] text-[10px]">Posts</span>
                </div>
              )}
              {match.mutualCount !== undefined && match.mutualCount > 0n && (
                <div className="flex flex-col items-center">
                  <span className="text-[#22D3EE] font-bold text-base">
                    {Number(match.mutualCount)}
                  </span>
                  <span className="text-[#8B95A3] text-[10px]">Mutual</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-[#2A3038] text-[#E9EEF5] font-semibold text-sm active:scale-95 transition-transform"
              data-ocid="match.profile.close_button"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onMessage}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF3B5C] to-[#22D3EE] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              data-ocid="match.profile.primary_button"
            >
              <MessageCircle size={16} /> Message
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function MatchPage({
  onOpenChat,
}: {
  onOpenChat: (principal: string, username: string, avatarUrl: string) => void;
}) {
  const { backend, identity, isLoggedIn } = useBackend();
  const thumbStorageClient = useStorageClient("thumbnails");
  const [candidates, setCandidates] = useState<MatchUser[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchOverlay, setMatchOverlay] = useState<MatchUser | null>(null);
  const [profileModalMatch, setProfileModalMatch] =
    useState<MatchRecord | null>(null);
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

        // Resolve matches first so we can deduplicate candidates
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

        // Build a set of already-matched principals
        const matchedSet = new Set(resolvedMatches.map((m) => m.principal));
        // Also exclude self
        matchedSet.add(myPrincipal.toString());

        // Resolve candidates with details
        const resolved: MatchUser[] = await Promise.all(
          (rawCandidates as any[]).map(async (u) => {
            const pStr =
              typeof u.principal === "object"
                ? u.principal.toString()
                : String(u.principal);
            let avatarUrl =
              u.avatarKey || `https://i.pravatar.cc/150?u=${pStr}`;
            if (thumbStorageClient && avatarUrl.startsWith("sha256:")) {
              try {
                avatarUrl = await thumbStorageClient.getDirectURL(avatarUrl);
              } catch {}
            }
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

        // Filter out already-matched users and self to avoid duplicates
        const filteredCandidates = resolved.filter(
          (u) => !matchedSet.has(u.principal),
        );
        setCandidates(filteredCandidates);
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
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 bg-[#0F1216]">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#FF8C69] flex items-center justify-center">
          <Heart size={36} className="text-white fill-white" />
        </div>
        <p className="font-bold text-xl text-[#E9EEF5]">Discover Matches</p>
        <p className="text-[#8B95A3] text-sm text-center">
          Sign in to start swiping and find your vibe
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-[#0F1216] overflow-hidden"
      data-ocid="match.page"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-[#FF3B5C] fill-[#FF3B5C]" />
          <h2 className="text-lg font-black text-[#E9EEF5]">Discover</h2>
          {matches.length > 0 && (
            <span className="ml-auto text-xs text-[#8B95A3]">
              {matches.length} match{matches.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Card stack */}
      <div
        className="flex-1 relative mx-4 my-2 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {loading ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            data-ocid="match.loading_state"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#1A1F26] animate-pulse" />
          </div>
        ) : candidates.length === 0 ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            data-ocid="match.empty_state"
          >
            <div className="w-20 h-20 rounded-full bg-[#1A1F26] flex items-center justify-center">
              <Zap size={36} className="text-[#8B95A3]" />
            </div>
            <p className="font-bold text-[#E9EEF5]">You've seen everyone!</p>
            <p className="text-[#8B95A3] text-sm text-center">
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

      {/* Action buttons — large round NOPE/LIKE below card */}
      {!loading && candidates.length > 0 && (
        <div className="shrink-0 flex items-center justify-center gap-10 py-4">
          <button
            type="button"
            onClick={handleSwipeLeft}
            className="w-16 h-16 rounded-full bg-[#1A1F26] border-2 border-[#FF3B5C] flex items-center justify-center shadow-xl active:scale-90 transition-transform select-none"
            style={{ boxShadow: "0 8px 24px rgba(255,59,92,0.25)" }}
            data-ocid="match.nope.button"
          >
            <X size={28} className="text-[#FF3B5C]" />
          </button>

          <button
            type="button"
            onClick={handleSwipeRight}
            className="w-16 h-16 rounded-full bg-[#1A1F26] border-2 border-[#22D3EE] flex items-center justify-center shadow-xl active:scale-90 transition-transform select-none"
            style={{ boxShadow: "0 8px 24px rgba(34,211,238,0.25)" }}
            data-ocid="match.like.button"
          >
            <Heart size={28} className="text-[#22D3EE] fill-[#22D3EE]" />
          </button>
        </div>
      )}

      {/* My Matches — horizontal card scroll */}
      {matches.length > 0 && (
        <div className="shrink-0 px-4 pb-4">
          <p className="text-xs text-[#8B95A3] uppercase tracking-widest font-semibold mb-3">
            Matches
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar [&::-webkit-scrollbar]:hidden">
            {matches.map((m) => (
              <button
                key={m.principal}
                type="button"
                onClick={() => setViewingMatchProfile(m)}
                className="flex flex-col items-center gap-2 shrink-0 bg-[#1A1F26] rounded-2xl p-3 w-[88px] border border-[#2A3038] active:scale-95 transition-transform"
                data-ocid="match.match.button"
              >
                <div
                  className="w-12 h-12 rounded-full overflow-hidden border-2 p-[2px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #FF3B5C, #FF8C69, #22D3EE)",
                  }}
                >
                  <img
                    src={m.avatarUrl}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="text-[10px] text-[#E9EEF5] font-semibold max-w-[72px] truncate">
                  @{m.username}
                </span>
                <span className="text-[9px] text-[#22D3EE] bg-[#22D3EE]/10 rounded-full px-2 py-0.5 font-semibold">
                  Message
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* It's a Match overlay */}
      <AnimatePresence>
        {matchOverlay && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                "linear-gradient(135deg, #1a0010 0%, #0f0a1e 50%, #001a1a 100%)",
            }}
            data-ocid="match.dialog"
          >
            {/* Confetti particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                // biome-ignore lint/suspicious/noArrayIndexKey: confetti
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background:
                    i % 3 === 0
                      ? "#FF3B5C"
                      : i % 3 === 1
                        ? "#22D3EE"
                        : "#FFD700",
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.5, 1, 0],
                  y: [-20, -80],
                }}
                transition={{
                  duration: 1.5,
                  delay: Math.random() * 0.5,
                  repeat: 2,
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="flex flex-col items-center gap-6 px-8"
            >
              <div className="text-6xl">\uD83D\uDCAB</div>
              <div className="text-center">
                <h2 className="text-4xl font-black bg-gradient-to-r from-[#FF3B5C] via-[#FF8C69] to-[#22D3EE] bg-clip-text text-transparent">
                  It's a Match!
                </h2>
                <p className="text-white/70 mt-2">
                  You and @{matchOverlay.username} liked each other
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#FF3B5C] shadow-xl">
                  <img
                    src={
                      myAvatarRef.current || "https://i.pravatar.cc/100?u=me"
                    }
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Heart size={28} className="text-[#FF3B5C] fill-[#FF3B5C]" />
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#22D3EE] shadow-xl">
                  <img
                    src={matchOverlay.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMatchOverlay(null)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-white/20 text-white font-semibold text-sm active:scale-95 transition-transform"
                    data-ocid="match.continue.button"
                  >
                    Keep Swiping
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchOverlay(null);
                      onOpenChat(
                        matchOverlay.principal,
                        matchOverlay.username,
                        matchOverlay.avatarUrl,
                      );
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF3B5C] to-[#22D3EE] text-white font-bold text-sm active:scale-95 transition-transform"
                    data-ocid="match.send_message.button"
                  >
                    Send Message
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchOverlay(null)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#22D3EE]/30 text-[#22D3EE] font-semibold text-sm active:scale-95 transition-transform"
                  data-ocid="match.view_profile.button"
                >
                  View Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Profile Modal */}
      {profileModalMatch && (
        <MatchProfileModal
          match={profileModalMatch}
          onMessage={() => {
            const m = profileModalMatch;
            setProfileModalMatch(null);
            onOpenChat(m.principal, m.username, m.avatarUrl);
          }}
          onClose={() => setProfileModalMatch(null)}
        />
      )}

      {/* Full UserProfile overlay from match list */}
      {viewingMatchProfile && (
        <motion.div
          className="fixed inset-0 z-[55] bg-[#0F1216]"
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
    </div>
  );
}
