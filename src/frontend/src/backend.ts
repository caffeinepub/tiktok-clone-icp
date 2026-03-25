/* eslint-disable */

// @ts-nocheck

import { Actor, HttpAgent, type HttpAgentOptions, type ActorConfig, type Agent, type ActorSubclass } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { idlFactory, type _SERVICE } from "./declarations/backend.did";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
function some<T>(value: T): Some<T> {
    return { __kind__: "Some", value };
}
function none(): None {
    return { __kind__: "None" };
}
function isNone<T>(option: Option<T>): option is None {
    return option.__kind__ === "None";
}
function isSome<T>(option: Option<T>): option is Some<T> {
    return option.__kind__ === "Some";
}
function unwrap<T>(option: Option<T>): T {
    if (isNone(option)) throw new Error("unwrap: none");
    return option.value;
}
function candid_some<T>(value: T): [T] { return [value]; }
function candid_none<T>(): [] { return []; }
function record_opt_to_undefined<T>(arg: T | null): T | undefined {
    return arg == null ? undefined : arg;
}
export class ExternalBlob {
    _blob?: Uint8Array<ArrayBuffer> | null;
    directURL: string;
    onProgress?: (percentage: number) => void = undefined;
    private constructor(directURL: string, blob: Uint8Array<ArrayBuffer> | null) {
        if (blob) this._blob = blob;
        this.directURL = directURL;
    }
    static fromURL(url: string): ExternalBlob {
        return new ExternalBlob(url, null);
    }
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob {
        const url = URL.createObjectURL(new Blob([new Uint8Array(blob)], { type: 'application/octet-stream' }));
        return new ExternalBlob(url, blob);
    }
    public async getBytes(): Promise<Uint8Array<ArrayBuffer>> {
        if (this._blob) return this._blob;
        const response = await fetch(this.directURL);
        const blob = await response.blob();
        this._blob = new Uint8Array(await blob.arrayBuffer());
        return this._blob;
    }
    public getDirectURL(): string { return this.directURL; }
    public withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
        this.onProgress = onProgress;
        return this;
    }
}
export interface backendInterface {
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
    registerUser(username: string, bio: string, avatarKey: string): Promise<void>;
    getProfile(p: Principal): Promise<any>;
    updateProfile(username: string, bio: string, avatarKey: string): Promise<void>;
    updateCoverPhoto(coverPhotoKey: string): Promise<void>;
    getCoverPhoto(p: Principal): Promise<any>;
    followUser(target: Principal): Promise<void>;
    unfollowUser(target: Principal): Promise<void>;
    getFollowing(p: Principal): Promise<Principal[]>;
    getFollowers(p: Principal): Promise<Principal[]>;
    getUserStats(p: Principal): Promise<any>;
    getAllUsers(): Promise<any[]>;
    sendFollowRequest(target: Principal): Promise<void>;
    acceptFollowRequest(requestId: string): Promise<boolean>;
    declineFollowRequest(requestId: string): Promise<boolean>;
    cancelFollowRequest(target: Principal): Promise<void>;
    getPendingFollowRequests(): Promise<any[]>;
    hasPendingFollowRequest(target: Principal): Promise<boolean>;
    getUserSettings(): Promise<any>;
    updateUserSettings(isPrivate: boolean, notificationsEnabled: boolean): Promise<void>;
    postVideo(title: string, description: string, hashtags: string[], videoKey: string, thumbnailKey: string): Promise<string>;
    getFeed(offset: bigint, limit: bigint): Promise<any[]>;
    getFollowingFeed(p: Principal, offset: bigint, limit: bigint): Promise<any[]>;
    getTrendingFeed(offset: bigint, limit: bigint): Promise<any[]>;
    getPopularFeed(offset: bigint, limit: bigint): Promise<any[]>;
    getUserVideos(p: Principal): Promise<any[]>;
    getVideoById(id: string): Promise<any>;
    deleteVideo(id: string): Promise<boolean>;
    updateVideo(id: string, title: string, description: string, hashtags: string[]): Promise<boolean>;
    incrementView(id: string): Promise<void>;
    likeVideo(id: string): Promise<void>;
    unlikeVideo(id: string): Promise<void>;
    getLikeCount(id: string): Promise<bigint>;
    didCallerLike(id: string): Promise<boolean>;
    saveVideo(id: string): Promise<void>;
    unsaveVideo(id: string): Promise<void>;
    getSavedVideos(): Promise<any[]>;
    isVideoSaved(id: string): Promise<boolean>;
    getLikedVideos(): Promise<any[]>;
    hideVideo(id: string): Promise<void>;
    unhideVideo(id: string): Promise<void>;
    pinVideo(id: string): Promise<boolean>;
    unpinVideo(): Promise<void>;
    getPinnedVideo(p: Principal): Promise<any>;
    reportVideo(id: string, reason: string): Promise<void>;
    addComment(videoId: string, text: string): Promise<string>;
    getComments(videoId: string): Promise<any[]>;
    deleteComment(commentId: string): Promise<boolean>;
    searchVideos(term: string): Promise<any[]>;
    searchUsers(term: string): Promise<any[]>;
    getNotifications(): Promise<any[]>;
    markNotificationsRead(): Promise<void>;
    createStory(mediaKey: string, mediaType: string, caption: string): Promise<string>;
    getActiveStories(): Promise<any[]>;
    getStoriesByUser(p: Principal): Promise<any[]>;
    deleteStory(id: string): Promise<boolean>;
    viewStory(id: string): Promise<void>;
    getViewedStoryIds(): Promise<string[]>;
    hasUnviewedStories(p: Principal): Promise<boolean>;
    addStoryReaction(storyId: string, emoji: string): Promise<void>;
    removeStoryReaction(storyId: string): Promise<void>;
    getStoryReactions(storyId: string): Promise<any[]>;
    getMyStoryReaction(storyId: string): Promise<any>;
    addStoryComment(storyId: string, text: string): Promise<string>;
    getStoryComments(storyId: string): Promise<any[]>;
    deleteStoryComment(commentId: string): Promise<boolean>;
    postPhoto(imageKey: string, caption: string, hashtags: string[]): Promise<string>;
    getPhotoPosts(offset: bigint, limit: bigint): Promise<any[]>;
    getUserPhotos(p: Principal): Promise<any[]>;
    getPostById(id: string): Promise<any>;
    deletePost(id: string): Promise<boolean>;
    likePost(id: string): Promise<void>;
    unlikePost(id: string): Promise<void>;
    getPostLikeCount(id: string): Promise<bigint>;
    didCallerLikePost(id: string): Promise<boolean>;
    addPostComment(postId: string, text: string): Promise<string>;
    getPostComments(postId: string): Promise<any[]>;
    searchPosts(term: string): Promise<any[]>;
    swipeRight(target: Principal): Promise<boolean>;
    swipeLeft(target: Principal): Promise<void>;
    getMatches(): Promise<any[]>;
    getPotentialMatches(): Promise<any[]>;
    isMatch(other: Principal): Promise<boolean>;
    getMutualFollowCount(other: Principal): Promise<bigint>;
    getMutualFollowProfiles(other: Principal): Promise<any[]>;
    getCandidateDetails(target: Principal): Promise<any>;
    sendMessage(recipient: Principal, text: string): Promise<boolean>;
    getMessages(other: Principal): Promise<any[]>;
    getConversations(): Promise<any[]>;
    createDuet(originalVideoId: string, videoKey: string, thumbnailKey: string, caption: string): Promise<string>;
    getDuetsByVideo(videoId: string): Promise<any[]>;
    getUserDuets(p: Principal): Promise<any[]>;
    deleteDuet(id: string): Promise<boolean>;
    getCallerUserRole(): Promise<any>;
    isCallerAdmin(): Promise<boolean>;
}
export class Backend implements backendInterface {
    constructor(private actor: ActorSubclass<_SERVICE>, private _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, private _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, private processError?: (error: unknown) => never) {}

    async _initializeAccessControlWithSecret(secret: string): Promise<void> {
        await this.actor._initializeAccessControlWithSecret(secret);
    }
    async registerUser(username: string, bio: string, avatarKey: string): Promise<void> {
        await this.actor.registerUser(username, bio, avatarKey);
    }
    async getProfile(p: Principal): Promise<any> {
        const r = await this.actor.getProfile(p);
        return r.length > 0 ? r[0] : null;
    }
    async updateProfile(username: string, bio: string, avatarKey: string): Promise<void> {
        await this.actor.updateProfile(username, bio, avatarKey);
    }
    async updateCoverPhoto(coverPhotoKey: string): Promise<void> {
        await this.actor.updateCoverPhoto(coverPhotoKey);
    }
    async getCoverPhoto(p: Principal): Promise<any> {
        const r = await this.actor.getCoverPhoto(p);
        return r.length > 0 ? r[0] : null;
    }
    async followUser(target: Principal): Promise<void> {
        await this.actor.followUser(target);
    }
    async unfollowUser(target: Principal): Promise<void> {
        await this.actor.unfollowUser(target);
    }
    async getFollowing(p: Principal): Promise<Principal[]> {
        return await this.actor.getFollowing(p);
    }
    async getFollowers(p: Principal): Promise<Principal[]> {
        return await this.actor.getFollowers(p);
    }
    async getUserStats(p: Principal): Promise<any> {
        return await this.actor.getUserStats(p);
    }
    async getAllUsers(): Promise<any[]> {
        return await this.actor.getAllUsers();
    }
    async sendFollowRequest(target: Principal): Promise<void> {
        await this.actor.sendFollowRequest(target);
    }
    async acceptFollowRequest(requestId: string): Promise<boolean> {
        return await this.actor.acceptFollowRequest(requestId);
    }
    async declineFollowRequest(requestId: string): Promise<boolean> {
        return await this.actor.declineFollowRequest(requestId);
    }
    async cancelFollowRequest(target: Principal): Promise<void> {
        await this.actor.cancelFollowRequest(target);
    }
    async getPendingFollowRequests(): Promise<any[]> {
        return await this.actor.getPendingFollowRequests();
    }
    async hasPendingFollowRequest(target: Principal): Promise<boolean> {
        return await this.actor.hasPendingFollowRequest(target);
    }
    async getUserSettings(): Promise<any> {
        return await this.actor.getUserSettings();
    }
    async updateUserSettings(isPrivate: boolean, notificationsEnabled: boolean): Promise<void> {
        await this.actor.updateUserSettings(isPrivate, notificationsEnabled);
    }
    async postVideo(title: string, description: string, hashtags: string[], videoKey: string, thumbnailKey: string): Promise<string> {
        return await this.actor.postVideo(title, description, hashtags, videoKey, thumbnailKey);
    }
    async getFeed(offset: bigint, limit: bigint): Promise<any[]> {
        return await this.actor.getFeed(offset, limit);
    }
    async getFollowingFeed(p: Principal, offset: bigint, limit: bigint): Promise<any[]> {
        return await this.actor.getFollowingFeed(p, offset, limit);
    }
    async getTrendingFeed(offset: bigint, limit: bigint): Promise<any[]> {
        return await this.actor.getTrendingFeed(offset, limit);
    }
    async getPopularFeed(offset: bigint, limit: bigint): Promise<any[]> {
        return await this.actor.getPopularFeed(offset, limit);
    }
    async getUserVideos(p: Principal): Promise<any[]> {
        return await this.actor.getUserVideos(p);
    }
    async getVideoById(id: string): Promise<any> {
        const r = await this.actor.getVideoById(id);
        return r.length > 0 ? r[0] : null;
    }
    async deleteVideo(id: string): Promise<boolean> {
        return await this.actor.deleteVideo(id);
    }
    async updateVideo(id: string, title: string, description: string, hashtags: string[]): Promise<boolean> {
        return await this.actor.updateVideo(id, title, description, hashtags);
    }
    async incrementView(id: string): Promise<void> {
        await this.actor.incrementView(id);
    }
    async likeVideo(id: string): Promise<void> {
        await this.actor.likeVideo(id);
    }
    async unlikeVideo(id: string): Promise<void> {
        await this.actor.unlikeVideo(id);
    }
    async getLikeCount(id: string): Promise<bigint> {
        return await this.actor.getLikeCount(id);
    }
    async didCallerLike(id: string): Promise<boolean> {
        return await this.actor.didCallerLike(id);
    }
    async saveVideo(id: string): Promise<void> {
        await this.actor.saveVideo(id);
    }
    async unsaveVideo(id: string): Promise<void> {
        await this.actor.unsaveVideo(id);
    }
    async getSavedVideos(): Promise<any[]> {
        return await this.actor.getSavedVideos();
    }
    async isVideoSaved(id: string): Promise<boolean> {
        return await this.actor.isVideoSaved(id);
    }
    async getLikedVideos(): Promise<any[]> {
        return await this.actor.getLikedVideos();
    }
    async hideVideo(id: string): Promise<void> {
        await this.actor.hideVideo(id);
    }
    async unhideVideo(id: string): Promise<void> {
        await this.actor.unhideVideo(id);
    }
    async pinVideo(id: string): Promise<boolean> {
        return await this.actor.pinVideo(id);
    }
    async unpinVideo(): Promise<void> {
        await this.actor.unpinVideo();
    }
    async getPinnedVideo(p: Principal): Promise<any> {
        const r = await this.actor.getPinnedVideo(p);
        return r.length > 0 ? r[0] : null;
    }
    async reportVideo(id: string, reason: string): Promise<void> {
        await this.actor.reportVideo(id, reason);
    }
    async addComment(videoId: string, text: string): Promise<string> {
        return await this.actor.addComment(videoId, text);
    }
    async getComments(videoId: string): Promise<any[]> {
        return await this.actor.getComments(videoId);
    }
    async deleteComment(commentId: string): Promise<boolean> {
        return await this.actor.deleteComment(commentId);
    }
    async searchVideos(term: string): Promise<any[]> {
        return await this.actor.searchVideos(term);
    }
    async searchUsers(term: string): Promise<any[]> {
        return await this.actor.searchUsers(term);
    }
    async getNotifications(): Promise<any[]> {
        return await this.actor.getNotifications();
    }
    async markNotificationsRead(): Promise<void> {
        await this.actor.markNotificationsRead();
    }
    async createStory(mediaKey: string, mediaType: string, caption: string): Promise<string> {
        return await this.actor.createStory(mediaKey, mediaType, caption);
    }
    async getActiveStories(): Promise<any[]> {
        return await this.actor.getActiveStories();
    }
    async getStoriesByUser(p: Principal): Promise<any[]> {
        return await this.actor.getStoriesByUser(p);
    }
    async deleteStory(id: string): Promise<boolean> {
        return await this.actor.deleteStory(id);
    }
    async viewStory(id: string): Promise<void> {
        await this.actor.viewStory(id);
    }
    async getViewedStoryIds(): Promise<string[]> {
        return await this.actor.getViewedStoryIds();
    }
    async hasUnviewedStories(p: Principal): Promise<boolean> {
        return await this.actor.hasUnviewedStories(p);
    }
    async addStoryReaction(storyId: string, emoji: string): Promise<void> {
        await this.actor.addStoryReaction(storyId, emoji);
    }
    async removeStoryReaction(storyId: string): Promise<void> {
        await this.actor.removeStoryReaction(storyId);
    }
    async getStoryReactions(storyId: string): Promise<any[]> {
        return await this.actor.getStoryReactions(storyId);
    }
    async getMyStoryReaction(storyId: string): Promise<any> {
        const r = await this.actor.getMyStoryReaction(storyId);
        return r.length > 0 ? r[0] : null;
    }
    async addStoryComment(storyId: string, text: string): Promise<string> {
        return await this.actor.addStoryComment(storyId, text);
    }
    async getStoryComments(storyId: string): Promise<any[]> {
        return await this.actor.getStoryComments(storyId);
    }
    async deleteStoryComment(commentId: string): Promise<boolean> {
        return await this.actor.deleteStoryComment(commentId);
    }
    async postPhoto(imageKey: string, caption: string, hashtags: string[]): Promise<string> {
        return await this.actor.postPhoto(imageKey, caption, hashtags);
    }
    async getPhotoPosts(offset: bigint, limit: bigint): Promise<any[]> {
        return await this.actor.getPhotoPosts(offset, limit);
    }
    async getUserPhotos(p: Principal): Promise<any[]> {
        return await this.actor.getUserPhotos(p);
    }
    async getPostById(id: string): Promise<any> {
        const r = await this.actor.getPostById(id);
        return r.length > 0 ? r[0] : null;
    }
    async deletePost(id: string): Promise<boolean> {
        return await this.actor.deletePost(id);
    }
    async likePost(id: string): Promise<void> {
        await this.actor.likePost(id);
    }
    async unlikePost(id: string): Promise<void> {
        await this.actor.unlikePost(id);
    }
    async getPostLikeCount(id: string): Promise<bigint> {
        return await this.actor.getPostLikeCount(id);
    }
    async didCallerLikePost(id: string): Promise<boolean> {
        return await this.actor.didCallerLikePost(id);
    }
    async addPostComment(postId: string, text: string): Promise<string> {
        return await this.actor.addPostComment(postId, text);
    }
    async getPostComments(postId: string): Promise<any[]> {
        return await this.actor.getPostComments(postId);
    }
    async searchPosts(term: string): Promise<any[]> {
        return await this.actor.searchPosts(term);
    }
    async swipeRight(target: Principal): Promise<boolean> {
        return await this.actor.swipeRight(target);
    }
    async swipeLeft(target: Principal): Promise<void> {
        await this.actor.swipeLeft(target);
    }
    async getMatches(): Promise<any[]> {
        return await this.actor.getMatches();
    }
    async getPotentialMatches(): Promise<any[]> {
        return await this.actor.getPotentialMatches();
    }
    async isMatch(other: Principal): Promise<boolean> {
        return await this.actor.isMatch(other);
    }
    async getMutualFollowCount(other: Principal): Promise<bigint> {
        return await this.actor.getMutualFollowCount(other);
    }
    async getMutualFollowProfiles(other: Principal): Promise<any[]> {
        return await this.actor.getMutualFollowProfiles(other);
    }
    async getCandidateDetails(target: Principal): Promise<any> {
        return await this.actor.getCandidateDetails(target);
    }
    async sendMessage(recipient: Principal, text: string): Promise<boolean> {
        return await this.actor.sendMessage(recipient, text);
    }
    async getMessages(other: Principal): Promise<any[]> {
        return await this.actor.getMessages(other);
    }
    async getConversations(): Promise<any[]> {
        return await this.actor.getConversations();
    }
    async createDuet(originalVideoId: string, videoKey: string, thumbnailKey: string, caption: string): Promise<string> {
        return await this.actor.createDuet(originalVideoId, videoKey, thumbnailKey, caption);
    }
    async getDuetsByVideo(videoId: string): Promise<any[]> {
        return await this.actor.getDuetsByVideo(videoId);
    }
    async getUserDuets(p: Principal): Promise<any[]> {
        return await this.actor.getUserDuets(p);
    }
    async deleteDuet(id: string): Promise<boolean> {
        return await this.actor.deleteDuet(id);
    }
    async getCallerUserRole(): Promise<any> {
        return await this.actor.getCallerUserRole();
    }
    async isCallerAdmin(): Promise<boolean> {
        return await this.actor.isCallerAdmin();
    }
}
export interface CreateActorOptions {
    agent?: Agent;
    agentOptions?: HttpAgentOptions;
    actorOptions?: ActorConfig;
    processError?: (error: unknown) => never;
}
export function createActor(canisterId: string, _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, options: CreateActorOptions = {}): Backend {
    const agent = options.agent || HttpAgent.createSync({ ...options.agentOptions });
    if (options.agent && options.agentOptions) {
        console.warn("Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.");
    }
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId,
        ...options.actorOptions
    });
    return new Backend(actor, _uploadFile, _downloadFile, options.processError);
}
