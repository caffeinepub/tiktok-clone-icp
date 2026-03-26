# VibeFlow v32

## Current State
VibeFlow is a full-featured TikTok/Instagram/Tinder app. Home screen (FeedPage) shows For You/Following/Trending/Popular tab bar. Explore screen (ExplorePage) has no feed tabs. Logout in SettingsPage does not clear auth state, so app stays logged in visually. Stories appear in other users' highlights but the user's own stories may not show as highlights in their profile. Data loading is slow due to sequential per-video profile API calls.

## Requested Changes (Diff)

### Add
- For You / Following / Trending / Popular tabs in ExplorePage (at top, above search bar or below it)
- followedIds loading in ExplorePage for Following tab filtering

### Modify
- FeedPage: Remove the For You/Following/Trending/Popular tab bar UI entirely. Always show the full "for-you" feed (all videos, no tab filtering). Keep stories bar, keep all other functionality.
- SettingsPage: Fix logout - import `useInternetIdentity` and call `clear()` so auth state is cleared and app returns to login screen.
- FeedPage performance: Batch all `getProfile` calls for video creators into a single `Promise.all` before resolving video URLs, to avoid N sequential calls. Load followedIds in parallel with video fetch.
- StoriesBar: Own stories should also appear in the bar (remove the `if (cid === currentPrincipal) continue` skip so user's story appears). Profile page highlights already load `myStories` from backend so those should display.

### Remove
- Tab switcher UI (TAB_CONFIG, activeTab state) from FeedPage
- `showFollowingEmpty` empty state from FeedPage (no longer needed)

## Implementation Plan
1. FeedPage.tsx: Remove TAB_CONFIG, activeTab, tab switcher JSX, and all tab-related filtering logic. Just use `visibleVideos` directly in VideoScrollFeed.
2. FeedPage.tsx: Performance - batch creator profile fetches: collect all unique creatorIds from rawVideos, call getProfile for all in parallel, build a map, then resolve video URLs + assign usernames from map simultaneously.
3. ExplorePage.tsx: Add `type ExploreTab = "for-you" | "following" | "trending" | "popular"` with tab UI below the search bar. Load followedIds from backend when logged in. Filter/sort items based on active tab.
4. SettingsPage.tsx: Import `useInternetIdentity`, destructure `clear`, call `clear()` in handleLogout.
5. StoriesBar.tsx: Remove `if (cid === currentPrincipal) continue` so own stories show in bar.
