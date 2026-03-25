# VibeFlow v27 — Auth, Upload, and Persistence Fixes

## Current State
VibeFlow is a full-featured TikTok/Instagram/Tinder-inspired mobile social app on ICP. Three critical bugs are blocking normal usage:
1. Clicking "Get Started" shows "Authentication failed" when user already has a valid session
2. Video uploads fail with "Expected v3 response body" error
3. Profile data (username, bio, avatar) disappears on page reload

## Requested Changes (Diff)

### Add
- Auto-register user profile on first login when backend returns None for getProfile
- Faster video/story upload: increase chunk concurrency and add optimistic UI

### Modify
- `useInternetIdentity.ts` login(): when user already has a valid delegation, call `setIdentity(currentIdentity); setStatus("success")` instead of `setErrorMessage("User is already authenticated")`
- `StorageClient.ts` getCertificate(): add fallback for non-v3 responses — decode candid Blob from v2 reply.arg if isV3ResponseBody returns false
- `ProfilePage.tsx` profile load: when backend returns None for getProfile, call `backend.registerUser()` with default values to ensure profile exists in backend
- `StoriesBar.tsx` / `StoryCreator.tsx`: ensure story uploads use the correct storage bucket and save to backend with proper error handling

### Remove
- Nothing removed

## Implementation Plan
1. Fix `useInternetIdentity.ts`: in `login()`, replace `setErrorMessage("User is already authenticated")` with `setIdentity(currentIdentity); setStatus("success")`
2. Fix `StorageClient.ts`: in `getCertificate()`, after the v3 check fails, try to decode as v2 candid response using `IDL.decode([IDL.Vec(IDL.Nat8)], reply.arg)` fallback
3. Fix `ProfilePage.tsx`: when `getProfile` returns None, auto-call `registerUser` with a generated username from principal to persist profile in backend
4. Increase `MAXIMUM_CONCURRENT_UPLOADS` in StorageClient from 10 to 20 for faster uploads
5. Validate build compiles cleanly
