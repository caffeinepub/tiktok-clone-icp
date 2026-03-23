# VibeFlow v12 — Stories, Video Upload & Profile Fixes

## Current State
VibeFlow v11 has multiple data flow bugs causing stories, video uploads, and profile data to not display properly:
- StoriesBar uses `"thumbnails"` bucket but story media is in `"photos"`; usernames show as truncated principal IDs
- StoryCreator uploads all media (video + photo) to `"photos"` bucket, but StoryViewer fetches videos from `"videos"` bucket — causing all video stories to fail
- StoryViewer shows truncated principal ID as creator name; story likes/saves don't work properly
- SettingsPage shows infinite spinner when `backend` is null at mount (loading never set to false)
- ProfilePage uses `"images"` bucket for photos, but photo posts are uploaded to `"photos"` bucket — causing all profile photos to fail to display
- No upload progress indicator for video uploads

## Requested Changes (Diff)

### Add
- Video upload progress indicator: a progress bar + percentage shown while a video is being uploaded in the feed
- Highlights/Reels row at top of profile page (horizontal scrollable row of the user's stories/highlights)

### Modify
- StoriesBar: change storage client from `"thumbnails"` to `"photos"`; fetch real usernames via `backend.getAllUsers()` and map principal → username/avatar
- StoryCreator: detect file type; use `useStorageClient("videos")` for video files and `useStorageClient("photos")` for image files
- StoryViewer: use `"photos"` for image stories and `"videos"` for video stories (aligned with fixed StoryCreator); fetch and display real creator username/avatar using `backend.getProfile()`
- SettingsPage: add `if (!backend) { setLoading(false); return; }` guard to prevent infinite spinner
- ProfilePage: change `useStorageClient("images")` to `useStorageClient("photos")` for photo tab
- FeedPage: add upload progress state; show progress overlay while video is uploading after file selection

### Remove
- Nothing removed

## Implementation Plan
1. Fix SettingsPage: add null-backend guard to resolve infinite spinner
2. Fix StoryCreator: conditional storage client (photos vs videos based on file.type)
3. Fix StoriesBar: switch to `"photos"` bucket; fetch all users once and map to real names/avatars
4. Fix StoryViewer: use correct buckets per media type; load creator profile for real name display
5. Fix ProfilePage: change photo storage bucket from `"images"` to `"photos"`; add highlights row using `backend.getStoriesByUser()`
6. Add upload progress to FeedPage: track upload progress percentage; show fixed overlay bar during upload
