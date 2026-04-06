# VibeFlow

## Current State
VibeFlow v37 is a full-featured mobile social app with TikTok-style video feed, Instagram chat/notifications, Tinder swipe/match, and comprehensive profile/settings. The app has:
- Auth via Internet Identity (useActor.ts + useInternetIdentity hook)
- Chat (ChatPage.tsx) with voice/video call buttons that open a static CallOverlay (no real WebRTC)
- InboxPage with CallOverlay for outgoing calls from conversation list
- FeedPage with VideoCard - right sidebar action buttons (like/comment/share/save) + 3-dot menu at top-right
- Home header rendered inside the feed area
- ProfilePage with full settings
- SettingsPage with backend-persisted privacy/notifications

## Requested Changes (Diff)

### Add
- Real WebRTC peer-to-peer calling (video + voice) using RTCPeerConnection, getUserMedia, ICE negotiation
- Backend call signaling: storeCallSignal, getCallSignals, clearCallSignals methods in main.mo to exchange SDP offers/answers and ICE candidates
- WebRTCCallManager component - a context/hook managing the entire call lifecycle: initiate, receive, accept, decline, hangup
- Incoming call overlay on receiver side: when someone calls you, a full-screen animated overlay appears with Accept/Decline buttons
- Active call screen: once accepted, shows live video/audio streams with mute/camera/hangup controls
- Home header transparent: overlays on top of the video feed with transparent background (not solid), logo on left, plus/heart icons on right
- Notification polling for incoming calls (every 3 seconds)

### Modify
- useActor.ts: wrap _initializeAccessControlWithSecret in try/catch (already done but ensure it never throws)
- CallOverlay.tsx: extend to support incoming vs outgoing states, real stream refs, mute/camera toggle controls
- FeedPage.tsx: fix action button layout - 3-dot at top-right, then vertical rail on right (like > comment > save > share > others) - ensure no overlap with caption/hashtag area; make header transparent overlay
- ProfilePage.tsx: ensure all settings (pronouns, website, display name, location, gender, birthday, social links, niche tags) properly persist via updateProfile with encoded bio string
- SettingsPage.tsx: ensure isPrivate and notificationsEnabled always loaded fresh from backend on mount
- backend.d.ts: add CallSignal type and storeCallSignal, getCallSignals, clearCallSignals methods
- main.mo: add CallSignal type + call signaling methods

### Remove
- Nothing removed

## Implementation Plan
1. Update main.mo to add call signaling (CallSignal type, storeCallSignal, getCallSignals, clearCallSignals)
2. Update backend.d.ts with CallSignal and new methods
3. Create src/frontend/src/hooks/useWebRTCCall.ts - WebRTC call manager hook with:
   - State: callState (idle/calling/incoming/active), remoteStream, localStream, callType, callerInfo
   - Functions: startCall(principalStr, callType), answerCall(), declineCall(), hangup(), toggleMute(), toggleCamera()
   - Polling: every 3s poll getCallSignals to detect incoming calls and ICE candidates
   - WebRTC: RTCPeerConnection with Google STUN servers, offer/answer/ICE via backend signals
4. Update CallOverlay.tsx to handle all states (incoming/outgoing/active) with real video elements
5. Update ChatPage.tsx to use useWebRTCCall hook for call buttons
6. Update InboxPage.tsx to wire call buttons through useWebRTCCall
7. Fix FeedPage header: make it position:absolute transparent overlay on the snap-scroll container
8. Fix FeedPage action rail: ensure right sidebar items (like/comment/save/share/gift) are properly spaced with no overlap with 3-dot menu or caption
9. Fix ProfilePage: ensure parseBioExtras/buildBioString round-trip is correct and updateProfile is always awaited
10. Fix SettingsPage: load settings fresh on mount
