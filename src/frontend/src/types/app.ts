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
    description: "A classic animated short. #funny #animation #cute",
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
    description: "Open source animation masterpiece. #art #film #creative",
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
    description: "Incredible fire visuals. #fire #epic #wow",
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
    description: "Action packed adventure. #action #adventure #thrill",
    hashtags: ["action", "adventure", "thrill"],
    videoKey:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailKey: "https://picsum.photos/seed/escape/400/700",
    createdAt: BigInt(Date.now() - 345600000),
    views: BigInt(270000),
  },
];

export const SAMPLE_PROFILES: Record<string, UserProfile> = {
  "creator-1": {
    principal: "creator-1",
    username: "bunny_vibes",
    bio: "Animation lover 🎨",
    avatarKey: "https://i.pravatar.cc/100?img=1",
    createdAt: BigInt(0),
  },
  "creator-2": {
    principal: "creator-2",
    username: "elephant.dreams",
    bio: "Filmmaker & artist",
    avatarKey: "https://i.pravatar.cc/100?img=2",
    createdAt: BigInt(0),
  },
  "creator-3": {
    principal: "creator-3",
    username: "fire_king99",
    bio: "Living for the heat 🔥",
    avatarKey: "https://i.pravatar.cc/100?img=3",
    createdAt: BigInt(0),
  },
  "creator-4": {
    principal: "creator-4",
    username: "escape.artist",
    bio: "Always on the run ⚡",
    avatarKey: "https://i.pravatar.cc/100?img=4",
    createdAt: BigInt(0),
  },
};

export function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}
