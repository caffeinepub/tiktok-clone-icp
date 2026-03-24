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

export interface Post {
  id: string;
  creator: Principal;
  imageKey: string;
  caption: string;
  hashtags: string[];
  createdAt: bigint;
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

export interface Story {
  id: string;
  creator: Principal;
  mediaKey: string;
  mediaType: string;
  caption: string;
  createdAt: bigint;
  expiresAt: bigint;
}

export interface StoryReaction {
  id: string;
  storyId: string;
  user: Principal;
  emoji: string;
  createdAt: bigint;
}

export interface StoryComment {
  id: string;
  storyId: string;
  author: Principal;
  text: string;
  createdAt: bigint;
}

export interface FollowRequest {
  id: string;
  from: Principal;
  to: Principal;
  createdAt: bigint;
}

export interface UserSettings {
  isPrivate: boolean;
  notificationsEnabled: boolean;
}

export interface Match {
  id: string;
  user1: Principal;
  user2: Principal;
  createdAt: bigint;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: Principal;
  text: string;
  createdAt: bigint;
}

export interface Conversation {
  otherPrincipal: Principal;
  lastMessageText: string;
  lastMessageAt: bigint;
}

export interface Duet {
  id: string;
  originalVideoId: string;
  creator: Principal;
  videoKey: string;
  thumbnailKey: string;
  caption: string;
  createdAt: bigint;
}

export interface CandidateDetails {
  followerCount: bigint;
  followingCount: bigint;
  videoCount: bigint;
  postCount: bigint;
  mutualCount: bigint;
}

export interface backendInterface {
  // Auth
  login(): Promise<void>;
  logout(): Promise<void>;
  whoAmI(): Promise<Principal>;
  _initializeAccessControlWithSecret(secret: string): Promise<void>;

  // Users
  registerUser(username: string, bio: string, avatarKey: string): Promise<void>;
  getProfile(p: Principal): Promise<Option<UserProfile>>;
  updateProfile(username: string, bio: string, avatarKey: string): Promise<void>;
  updateCoverPhoto(coverPhotoKey: string): Promise<void>;
  getCoverPhoto(p: Principal): Promise<Option<string>>;
  followUser(target: Principal): Promise<void>;
  unfollowUser(target: Principal): Promise<void>;
  getFollowing(p: Principal): Promise<Principal[]>;
  getFollowers(p: Principal): Promise<Principal[]>;
  getUserStats(p: Principal): Promise<UserStats>;
  getAllUsers(): Promise<UserProfile[]>;

  // User Settings
  getUserSettings(): Promise<UserSettings>;
  updateUserSettings(isPrivate: boolean, notificationsEnabled: boolean): Promise<void>;

  // Follow Requests
  sendFollowRequest(target: Principal): Promise<void>;
  acceptFollowRequest(requestId: string): Promise<boolean>;
  declineFollowRequest(requestId: string): Promise<boolean>;
  cancelFollowRequest(target: Principal): Promise<void>;
  getPendingFollowRequests(): Promise<FollowRequest[]>;
  hasPendingFollowRequest(target: Principal): Promise<boolean>;

  // Videos
  postVideo(title: string, description: string, hashtags: string[], videoKey: string, thumbnailKey: string): Promise<string>;
  getFeed(offset: bigint, limit: bigint): Promise<Video[]>;
  getFollowingFeed(p: Principal, offset: bigint, limit: bigint): Promise<Video[]>;
  getTrendingFeed(offset: bigint, limit: bigint): Promise<Video[]>;
  getPopularFeed(offset: bigint, limit: bigint): Promise<Video[]>;
  getUserVideos(p: Principal): Promise<Video[]>;
  getVideoById(id: string): Promise<Option<Video>>;
  deleteVideo(id: string): Promise<boolean>;
  updateVideo(id: string, title: string, description: string, hashtags: string[]): Promise<boolean>;
  incrementView(id: string): Promise<void>;

  // Video Likes
  likeVideo(videoId: string): Promise<void>;
  unlikeVideo(videoId: string): Promise<void>;
  getLikeCount(videoId: string): Promise<bigint>;
  didCallerLike(videoId: string): Promise<boolean>;

  // Saved / Liked Videos
  saveVideo(videoId: string): Promise<void>;
  unsaveVideo(videoId: string): Promise<void>;
  getSavedVideos(): Promise<Video[]>;
  isVideoSaved(videoId: string): Promise<boolean>;
  getLikedVideos(): Promise<Video[]>;

  // Hide / Pin / Report
  hideVideo(videoId: string): Promise<void>;
  unhideVideo(videoId: string): Promise<void>;
  pinVideo(videoId: string): Promise<boolean>;
  unpinVideo(): Promise<void>;
  getPinnedVideo(p: Principal): Promise<Option<Video>>;
  reportVideo(videoId: string, reason: string): Promise<void>;

  // Comments (video)
  addComment(videoId: string, text: string): Promise<string>;
  getComments(videoId: string): Promise<Comment[]>;
  deleteComment(commentId: string): Promise<boolean>;

  // Search
  searchVideos(term: string): Promise<Video[]>;
  searchUsers(term: string): Promise<UserProfile[]>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  markNotificationsRead(): Promise<void>;

  // Stories
  createStory(mediaKey: string, mediaType: string, caption: string): Promise<string>;
  getActiveStories(): Promise<Story[]>;
  getStoriesByUser(p: Principal): Promise<Story[]>;
  deleteStory(id: string): Promise<boolean>;
  viewStory(id: string): Promise<void>;
  getViewedStoryIds(): Promise<string[]>;
  hasUnviewedStories(p: Principal): Promise<boolean>;

  // Story Reactions
  addStoryReaction(storyId: string, emoji: string): Promise<void>;
  removeStoryReaction(storyId: string): Promise<void>;
  getStoryReactions(storyId: string): Promise<StoryReaction[]>;
  getMyStoryReaction(storyId: string): Promise<Option<StoryReaction>>;

  // Story Comments
  addStoryComment(storyId: string, text: string): Promise<string>;
  getStoryComments(storyId: string): Promise<StoryComment[]>;
  deleteStoryComment(commentId: string): Promise<boolean>;

  // Photo Posts (Instagram)
  postPhoto(imageKey: string, caption: string, hashtags: string[]): Promise<string>;
  getPhotoPosts(offset: bigint, limit: bigint): Promise<Post[]>;
  getUserPhotos(p: Principal): Promise<Post[]>;
  getPostById(id: string): Promise<Option<Post>>;
  deletePost(id: string): Promise<boolean>;
  likePost(postId: string): Promise<void>;
  unlikePost(postId: string): Promise<void>;
  getPostLikeCount(postId: string): Promise<bigint>;
  didCallerLikePost(postId: string): Promise<boolean>;
  addPostComment(postId: string, text: string): Promise<string>;
  getPostComments(postId: string): Promise<Comment[]>;
  searchPosts(term: string): Promise<Post[]>;

  // Tinder Swipe / Match
  swipeRight(target: Principal): Promise<boolean>;
  swipeLeft(target: Principal): Promise<void>;
  getMatches(): Promise<Match[]>;
  getPotentialMatches(): Promise<UserProfile[]>;
  isMatch(other: Principal): Promise<boolean>;

  // Mutual Follows
  getMutualFollowCount(other: Principal): Promise<bigint>;
  getMutualFollowProfiles(other: Principal): Promise<UserProfile[]>;
  getCandidateDetails(target: Principal): Promise<CandidateDetails>;

  // Direct Messages
  sendMessage(recipient: Principal, text: string): Promise<boolean>;
  getMessages(other: Principal): Promise<Message[]>;
  getConversations(): Promise<Conversation[]>;

  // Duets
  createDuet(originalVideoId: string, videoKey: string, thumbnailKey: string, caption: string): Promise<string>;
  getDuetsByVideo(videoId: string): Promise<Duet[]>;
  getUserDuets(p: Principal): Promise<Duet[]>;
  deleteDuet(id: string): Promise<boolean>;
}
