# VibeFlow v9

## Current State
VibeFlow is a TikTok+Instagram+Tinder combo app with: vertical video feed, photo posts, Tinder-style swipe/match, DMs, stories, notifications, profile, explore, and settings. The Match page shows swipeable profile cards with basic info (username, bio, video/photo count) and a matches scroll bar.

## Requested Changes (Diff)

### Add
- **Duet/Collab feature**: Users can create a duet response to any video. A duet plays the original video side-by-side with the user's recorded response. Backend stores duets linked to original videos. Profile shows a "Duets" tab. Video detail/3-dot menu has a "Duet" option.
- **Match page - mutual friends**: Compute and display mutual followers between the current user and each candidate on swipe cards.
- **Match page - richer profile**: Show follower count, following count, total content count, and mutual connections on each swipe card.
- **Match page - profile expand**: Tap a match in the matches row to open a mini-profile modal showing their bio, stats, mutual friends, and a "Message" button.

### Modify
- Match page SwipeCard: Add stats bar showing follower count, mutual connections count, content count.
- Matches row: Each match avatar is tappable to show a mini-profile before opening chat.

### Remove
- Nothing removed.

## Implementation Plan
1. Backend: Add `Duet` type (id, originalVideoId, creatorPrincipal, videoKey, thumbnailKey, caption, createdAt). Add stable storage, counters, and functions: `createDuet`, `getDuetsByVideo`, `getUserDuets`, `deleteDuet`.
2. Backend: Add `getMutualFollowers(other: Principal)` which returns the count of principals both caller and other follow.
3. Frontend: Update `backend.d.ts` with new Duet type and API signatures.
4. Frontend: Enhance MatchPage SwipeCard to show follower count, mutual connections, content stats.
5. Frontend: Add MatchProfileModal component for tapping matches.
6. Frontend: Add DuetPage/DuetRecorder that opens when user taps "Duet" from video 3-dot menu -- shows split-screen with original video on left, camera capture on right, record and upload.
7. Frontend: Add "Duets" tab on ProfilePage showing user's duet recordings.
8. Frontend: Show duet count on video cards and duet list on VideoDetailPage.
