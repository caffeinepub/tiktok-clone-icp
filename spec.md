# VibeFlow v4

## Current State
VibeFlow is a TikTok-style app with: vertical snap-scroll feed, For You / Following tabs, upload, camera, nested comments (like/reply/edit/delete), search/discover, notifications, user profiles, follow/unfollow, total likes, video save/share/edit.

## Requested Changes (Diff)

### Add
- **Trending tab**: A third feed tab ranking videos by total view count (descending). Show alongside For You and Following.
- **Popular tab**: A fourth feed tab ranking videos by like count (descending).
- **3-dot options menu** on every video (top-right corner) with 14 features:
  1. Edit Video (title, description, hashtags -- own videos only)
  2. Download Video
  3. Promote/Boost Video
  4. Share Video (copy link / native share)
  5. Copy Link
  6. Add to Favorites / Saved
  7. Add to Playlist
  8. Duet
  9. Stitch
  10. Report Video
  11. Not Interested
  12. Hide Video
  13. View Creator Profile
  14. Pin to Profile (own videos only)
- Backend: `getTrendingFeed`, `getPopularFeed`, `saveVideo`/`unsaveVideo`/`getSavedVideos`, `reportVideo`, `pinVideo`/`unpinVideo`, `hideVideo`/`unhideVideo`

### Modify
- Feed tab bar: extend from 2 tabs (For You, Following) to 4 tabs (For You, Following, Trending, Popular)

### Remove
- Nothing removed

## Implementation Plan
1. Backend: add getTrendingFeed (sort by views desc), getPopularFeed (sort by likes desc), saveVideo/unsaveVideo/getSavedVideos, reportVideo, pinVideo/unpinVideo, hideVideo/unhideVideo
2. Frontend: add Trending and Popular feed tabs wired to new backend queries
3. Frontend: add 3-dot icon (MoreVertical) on video cards; tapping opens a bottom-sheet/modal with all 14 actions
4. Actions routed correctly: owner-only items (Edit, Pin) shown conditionally; Download uses blob URL; Share uses Web Share API with clipboard fallback; Favorites/Saved calls backend; Report calls backend; Not Interested / Hide calls backend
