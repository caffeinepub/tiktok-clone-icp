# TikTok Clone ICP

## Current State
New project — no existing application files.

## Requested Changes (Diff)

### Add
- Vertical snap-scrolling video feed (mobile-first)
- Video upload with title, description, hashtags
- User profiles with avatar, follower/following counts, bio
- Like, comment, share on videos
- Follow / unfollow other users
- Search videos and users by hashtag or keyword
- Notifications (likes, comments, follows)
- Bottom tab navigation: Home, Discover, Upload, Inbox, Profile
- Internet Identity authentication
- Blob storage integration for video and image uploads

### Modify
- N/A

### Remove
- N/A

## Implementation Plan
1. Backend (Motoko):
   - Users: register, getProfile, updateProfile, follow, unfollow, getFollowers, getFollowing
   - Videos: uploadVideo (metadata), getVideoFeed, getUserVideos, getVideoById, deleteVideo
   - Interactions: likeVideo, unlikeVideo, addComment, getComments, getNotifications
   - Search: searchVideos, searchUsers
   - Blob storage for video files and profile pictures
2. Frontend:
   - Mobile-first layout with bottom tab bar
   - Vertical snap-scroll feed with full-screen video cards
   - Right action rail: like, comment, share, follow
   - Upload flow: file picker, metadata form, progress
   - Profile page: user's videos grid, stats
   - Discover/Search page
   - Notifications list
   - Auth with Internet Identity
