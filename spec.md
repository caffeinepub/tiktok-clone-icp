# TikTok Clone ICP

## Current State
New project. No existing application code.

## Requested Changes (Diff)

### Add
- Internet Identity authentication
- Vertical snap-scroll video feed with auto-play/pause
- Video upload with title, description, hashtags (blob-storage)
- User profiles: username, bio, avatar, follower/following counts, total likes
- Follow / unfollow users
- Like videos (with total like counts)
- Comments on videos (nested replies, like a comment, edit/delete own comment)
- Save/bookmark videos
- Share video (copy link)
- Discover/search page: search by title, description, hashtag; trending hashtags
- Notifications inbox: likes, comments, follows
- Camera support: open front/back camera, take photo or long-press to record video
- Default video unmuted
- Mobile-first responsive dark theme UI

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Select components: authorization, blob-storage, camera
2. Generate Motoko backend with:
   - User profiles (create, update, get, follow/unfollow, followers/following)
   - Videos (upload metadata, list feed, like, save, getByUser, getByHashtag, search)
   - Comments (add, reply, edit, delete, like)
   - Notifications (list, mark read)
3. Build React frontend:
   - Bottom nav: Home, Discover, Camera, Inbox, Profile
   - Home: vertical snap-scroll feed, video player (unmuted default), like/comment/share/save buttons
   - Discover: search bar, trending hashtags, search results
   - Camera: front/back toggle, photo snap / long-press record, upload flow
   - Inbox: notifications list
   - Profile: own and other users' profiles, follow button, video grid
   - Comments sheet: nested replies, like/edit/delete
