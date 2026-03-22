export interface UserProfile {
  principal: string;
  username: string;
  bio: string;
  avatarKey: string;
  createdAt: bigint;
}

export interface Video {
  id: string;
  creator: string;
  title: string;
  description: string;
  hashtags: string[];
  videoKey: string;
  thumbnailKey: string;
  createdAt: bigint;
  views: bigint;
}

export interface Comment {
  id: string;
  videoId: string;
  author: string;
  text: string;
  createdAt: bigint;
  likes?: number;
  likedByMe?: boolean;
}

export interface AppNotification {
  id: string;
  recipient: string;
  sender: string;
  notifType: string;
  videoId: string | null;
  read: boolean;
  createdAt: bigint;
}

export interface UserStats {
  videoCount: bigint;
  followerCount: bigint;
  followingCount: bigint;
}

export const SAMPLE_VIDEOS: Video[] = [
  {
    id: "sample-1",
    creator: "creator-1",
    title: "Big Buck Bunny 🐇",
    description:
      "A classic animated short that has warmed hearts worldwide. #funny #animation #cute",
    hashtags: ["funny", "animation", "cute"],
    videoKey:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailKey: "https://picsum.photos/seed/bbb/400/700",
    createdAt: BigInt(Date.now() - 86400000),
    views: BigInt(1200000),
  },
  {
    id: "sample-2",
    creator: "creator-2",
    title: "Elephant Dream 🐘",
    description:
      "Open source animation masterpiece. An unforgettable journey. #art #film #creative",
    hashtags: ["art", "film", "creative"],
    videoKey:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailKey: "https://picsum.photos/seed/elephant/400/700",
    createdAt: BigInt(Date.now() - 172800000),
    views: BigInt(850000),
  },
  {
    id: "sample-3",
    creator: "creator-3",
    title: "For Bigger Blazes 🔥",
    description:
      "Incredible fire visuals that take your breath away. #fire #epic #wow",
    hashtags: ["fire", "epic", "wow"],
    videoKey:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailKey: "https://picsum.photos/seed/blaze/400/700",
    createdAt: BigInt(Date.now() - 259200000),
    views: BigInt(430000),
  },
  {
    id: "sample-4",
    creator: "creator-4",
    title: "For Bigger Escapes ⚡",
    description:
      "Action packed adventure that keeps you on the edge. #action #adventure #thrill",
    hashtags: ["action", "adventure", "thrill"],
    videoKey:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailKey: "https://picsum.photos/seed/escape/400/700",
    createdAt: BigInt(Date.now() - 345600000),
    views: BigInt(270000),
  },
  {
    id: "sample-5",
    creator: "creator-1",
    title: "Subaru Outback 🚗",
    description:
      "Take the road less traveled. Adventure awaits around every corner. #car #travel #adventure",
    hashtags: ["car", "travel", "adventure"],
    videoKey:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailKey: "https://picsum.photos/seed/subaru/400/700",
    createdAt: BigInt(Date.now() - 432000000),
    views: BigInt(180000),
  },
];

export const SAMPLE_PROFILES: Record<string, UserProfile> = {
  "creator-1": {
    principal: "creator-1",
    username: "bunny_vibes",
    bio: "Animation lover 🎨 | Making magic frame by frame",
    avatarKey: "https://i.pravatar.cc/100?img=1",
    createdAt: BigInt(0),
  },
  "creator-2": {
    principal: "creator-2",
    username: "elephant.dreams",
    bio: "Filmmaker & visual artist ✨ Turning dreams into reality",
    avatarKey: "https://i.pravatar.cc/100?img=2",
    createdAt: BigInt(0),
  },
  "creator-3": {
    principal: "creator-3",
    username: "fire_king99",
    bio: "Living for the heat 🔥 | Chasing epic moments",
    avatarKey: "https://i.pravatar.cc/100?img=3",
    createdAt: BigInt(0),
  },
  "creator-4": {
    principal: "creator-4",
    username: "escape.artist",
    bio: "Always on the run ⚡ | Adventure photographer",
    avatarKey: "https://i.pravatar.cc/100?img=4",
    createdAt: BigInt(0),
  },
};

export const SAMPLE_COMMENTS: Comment[] = [
  {
    id: "c1",
    videoId: "sample-1",
    author: "creator-2",
    text: "This is absolutely amazing! 🔥 Love the animation style",
    createdAt: BigInt(Date.now() - 3600000),
    likes: 142,
    likedByMe: false,
  },
  {
    id: "c2",
    videoId: "sample-1",
    author: "creator-3",
    text: "Can't stop watching this on repeat 🔄",
    createdAt: BigInt(Date.now() - 7200000),
    likes: 89,
    likedByMe: false,
  },
  {
    id: "c3",
    videoId: "sample-1",
    author: "creator-4",
    text: "The color grading is insane! How did you do this?",
    createdAt: BigInt(Date.now() - 10800000),
    likes: 56,
    likedByMe: false,
  },
  {
    id: "c4",
    videoId: "sample-1",
    author: "creator-1",
    text: "@escape.artist Thanks! Spent weeks on this one 🙏",
    createdAt: BigInt(Date.now() - 9000000),
    likes: 34,
    likedByMe: false,
  },
];

export function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function timeAgo(ts: bigint | number): string {
  const ms = typeof ts === "bigint" ? Number(ts) : ts;
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
