import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

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
  hashtags: Array<string>;
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
  videoId: [] | [string];
  read: boolean;
  createdAt: bigint;
}

export interface UserStats {
  videoCount: bigint;
  followerCount: bigint;
  followingCount: bigint;
}

export interface _SERVICE {
  // Auth
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
  getCallerUserRole: ActorMethod<[], string>;
  isCallerAdmin: ActorMethod<[], boolean>;

  // Users
  registerUser: ActorMethod<[string, string, string], undefined>;
  getProfile: ActorMethod<[Principal], [] | [UserProfile]>;
  updateProfile: ActorMethod<[string, string, string], undefined>;
  followUser: ActorMethod<[Principal], undefined>;
  unfollowUser: ActorMethod<[Principal], undefined>;
  getFollowing: ActorMethod<[Principal], Array<Principal>>;
  getFollowers: ActorMethod<[Principal], Array<Principal>>;
  getUserStats: ActorMethod<[Principal], UserStats>;

  // Videos
  postVideo: ActorMethod<[string, string, Array<string>, string, string], string>;
  getFeed: ActorMethod<[bigint, bigint], Array<Video>>;
  getUserVideos: ActorMethod<[Principal], Array<Video>>;
  getVideoById: ActorMethod<[string], [] | [Video]>;
  deleteVideo: ActorMethod<[string], boolean>;
  incrementView: ActorMethod<[string], undefined>;

  // Likes
  likeVideo: ActorMethod<[string], undefined>;
  unlikeVideo: ActorMethod<[string], undefined>;
  getLikeCount: ActorMethod<[string], bigint>;
  didCallerLike: ActorMethod<[string], boolean>;

  // Comments
  addComment: ActorMethod<[string, string], string>;
  getComments: ActorMethod<[string], Array<Comment>>;
  deleteComment: ActorMethod<[string], boolean>;

  // Search
  searchVideos: ActorMethod<[string], Array<Video>>;
  searchUsers: ActorMethod<[string], Array<UserProfile>>;

  // Notifications
  getNotifications: ActorMethod<[], Array<Notification>>;
  markNotificationsRead: ActorMethod<[], undefined>;
}

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
