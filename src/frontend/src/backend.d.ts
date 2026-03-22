import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
  __kind__: "Some";
  value: T;
}
export interface None {
  __kind__: "None";
}
export type Option<T> = Some<T> | None;

export interface UserProfile {
  principal: Principal;
  username: string;
  bio: string;
  avatarKey: string;
  createdAt: bigint;
}

export interface Video {
  id: string;
  creator: Principal;
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
  author: Principal;
  text: string;
  createdAt: bigint;
}

export interface Notification {
  id: string;
  recipient: Principal;
  sender: Principal;
  notifType: string;
  videoId: Option<string>;
  read: boolean;
  createdAt: bigint;
}

export interface UserStats {
  videoCount: bigint;
  followerCount: bigint;
  followingCount: bigint;
}

export interface backendInterface {
  // Auth (from authorization component)
  login(): Promise<void>;
  logout(): Promise<void>;
  whoAmI(): Promise<Principal>;
  _initializeAccessControlWithSecret(secret: string): Promise<void>;

  // Users
  registerUser(username: string, bio: string, avatarKey: string): Promise<void>;
  getProfile(p: Principal): Promise<Option<UserProfile>>;
  updateProfile(username: string, bio: string, avatarKey: string): Promise<void>;
  followUser(target: Principal): Promise<void>;
  unfollowUser(target: Principal): Promise<void>;
  getFollowing(p: Principal): Promise<Principal[]>;
  getFollowers(p: Principal): Promise<Principal[]>;
  getUserStats(p: Principal): Promise<UserStats>;

  // Videos
  postVideo(title: string, description: string, hashtags: string[], videoKey: string, thumbnailKey: string): Promise<string>;
  getFeed(offset: bigint, limit: bigint): Promise<Video[]>;
  getUserVideos(p: Principal): Promise<Video[]>;
  getVideoById(id: string): Promise<Option<Video>>;
  deleteVideo(id: string): Promise<boolean>;
  incrementView(id: string): Promise<void>;

  // Likes
  likeVideo(videoId: string): Promise<void>;
  unlikeVideo(videoId: string): Promise<void>;
  getLikeCount(videoId: string): Promise<bigint>;
  didCallerLike(videoId: string): Promise<boolean>;

  // Comments
  addComment(videoId: string, text: string): Promise<string>;
  getComments(videoId: string): Promise<Comment[]>;
  deleteComment(commentId: string): Promise<boolean>;

  // Search
  searchVideos(term: string): Promise<Video[]>;
  searchUsers(term: string): Promise<UserProfile[]>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  markNotificationsRead(): Promise<void>;
}
