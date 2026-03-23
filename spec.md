# VibeFlow v10

## Current State
VibeFlow is a full TikTok+Instagram+Tinder combo app with duet recording, match page with candidate details, DMs, stories, full feed, explore, and profile. Backend has all needed APIs. Frontend has DuetPage, MatchPage, ProfilePage, CameraPage, etc.

## Requested Changes (Diff)

### Add
- Video upload modal with multiple source options: Record with camera, Upload from gallery, with quality/resolution selector (720p, 1080p, 4K label), trim option toggle, and visibility (public/private)
- Profile page: avatar change (tap avatar to pick new photo from camera or gallery and upload as blob), cover photo upload, website/link field, pronouns field, pinned video section, highlights row, social links section, "Edit Profile" sheet with all fields
- Profile page: tabs for Videos, Photos/Posts, Liked, Saved, Duets

### Modify
- CameraPage: extend to show the new multi-option upload flow when opened (record vs upload from file, quality selector)
- ProfilePage: add avatar change tap interaction, more edit fields (pronouns, website, cover photo), more tabs including Duets
- MatchPage: tapping a matched user's avatar shows their full profile overlay before opening chat (already partially done, ensure it works fully)

### Remove
- Nothing removed

## Implementation Plan
1. Create VideoUploadModal component with multiple source options, quality selector, visibility toggle
2. Update CameraPage to integrate VideoUploadModal for video-specific uploads
3. Update ProfilePage: tappable avatar that opens image picker and calls updateProfile with new avatarKey, cover photo, add pronouns/website fields to edit sheet, add Duets tab showing user's duets
4. Ensure EditProfileSheet has full fields: username, bio, pronouns, website, avatar change
5. MatchPage: tapping matched user avatar shows UserProfilePage overlay before opening chat
