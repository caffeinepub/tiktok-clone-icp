# VibeFlow

## Current State
VibeFlow is a full-featured TikTok/Instagram/Tinder-style mobile app on the Internet Computer (Version 34). Backend has comprehensive Motoko canister with all data types. Frontend has React + Framer Motion with dark theme. The app shows an empty feed and no data loads after login because:

1. **Root cause of "nothing shows any data":** The `useActor` hook calls `_initializeAccessControlWithSecret` with a possibly-empty `adminToken` every time the actor initializes. If this call fails or takes time, the actor may be partially initialized. More critically, the feed relies on `backend` being non-null — but anonymous users also get an actor, so `backend` is truthy even before login. The `getFeed` call resolves correctly but `resolvedVideos` may still be empty if `rawVideos` is empty (no videos uploaded yet).
2. **Profile data not persisting** between reloads due to `__kind__ === "Some"` check.
3. **25+ new features** need to be added.

## Requested Changes (Diff)

### Add
1. **Skeleton loading states** for feed, profile, explore, match cards
2. **Sample/demo data seeding UI** — show demo cards with placeholder content when feed is empty
3. **Live indicator** on videos currently being watched by many
4. **Video comments count** displayed on feed cards
5. **Share sheet** with copy link, share to social, embed options
6. **Speed playback control** (0.5x, 1x, 1.5x, 2x) in video overlay
7. **Video quality badge** (HD/SD indicator) on feed cards
8. **Creator verified badge** for premium accounts
9. **Hashtag pages** — tap a hashtag to see all videos with that tag
10. **Trending hashtags sidebar** in Explore
11. **Search bar with autocomplete** in Explore
12. **Creator leaderboard** in Explore (top creators by followers)
13. **Live room UI** placeholder in Explore ("Go Live" button)
14. **Gift/tip system UI** on video — send virtual coins to creator
15. **Sound/music library picker** in Upload flow
16. **Reaction bar** on video feed (extended emoji reactions beyond just like)
17. **Poll stickers** on stories
18. **Story countdown timer visual** more prominent
19. **Profile achievement badges** (milestone badges: 100 followers, first upload, etc.)
20. **QR code profile card** — share your profile as a QR code
21. **Dark/light theme toggle** in settings
22. **Language selector** in settings (UI only)
23. **Content preferences/filter** in settings (nsfw toggle, age filter)
24. **Activity status** — show "Active now" / "Active X min ago" on profile
25. **Video download button** (mobile-native share/download)
26. **Creator analytics dashboard** in Profile — views/likes/followers chart sparklines
27. **Blocked users management** in Settings
28. **Two-factor auth notice** in Security Settings section
29. **Subscription/fan tier** UI on creator profile (Subscribe button)
30. **Mini player** when navigating away from a video (picture-in-picture style)

### Modify
- Fix empty feed: add fallback empty state with clear CTA and sample demo content cards
- Fix profile data loading: ensure `__kind__` check works correctly with fresh `getProfile` response
- Improve `useActor`: wrap `_initializeAccessControlWithSecret` in try-catch so actor always returns
- Fix notification mark-as-read: call `markNotificationsRead` when panel opens
- Explore page: add creator leaderboard row + trending hashtags
- Inbox/notifications: add mark all read button
- Settings page: add new sections (privacy, security, content, appearance)
- Profile page: add analytics sparklines, achievement badges, subscribe button

### Remove
- Nothing removed

## Implementation Plan
1. Fix `useActor.ts` — wrap `_initializeAccessControlWithSecret` in try-catch (already partially done per history, verify)
2. Fix `FeedPage.tsx` — improve empty state with demo/sample video cards and clear CTA
3. Fix profile `__kind__` check in all components using `getProfile`
4. Add new UI features across all pages:
   - FeedPage: speed control, reaction bar, live indicator, comments count, share sheet, gift UI, quality badge
   - ExplorePage: creator leaderboard, trending hashtags, search autocomplete, live room, hashtag pages
   - ProfilePage: analytics dashboard, achievement badges, QR card, subscribe button, activity status
   - InboxPage: mark-all-read, enhanced conversation list
   - SettingsPage: dark/light theme, language, content prefs, blocked users, 2FA notice
   - App.tsx: mini player, download button support
5. Validate and deploy
