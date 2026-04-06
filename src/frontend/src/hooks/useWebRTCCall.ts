import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "./useBackend";

export interface CallState {
  phase: "idle" | "calling" | "incoming" | "active";
  callType: "video" | "voice";
  remoteUsername: string;
  remoteAvatar: string;
  remotePrincipal: string;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number; // seconds
}

export interface UseWebRTCCallReturn {
  callState: CallState;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  startCall: (
    principalStr: string,
    username: string,
    avatarUrl: string,
    callType: "video" | "voice",
  ) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const DEFAULT_CALL_STATE: CallState = {
  phase: "idle",
  callType: "video",
  remoteUsername: "",
  remoteAvatar: "",
  remotePrincipal: "",
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,
};

export function useWebRTCCall(): UseWebRTCCallReturn {
  const { backend, identity } = useBackend();
  const [callState, setCallState] = useState<CallState>(DEFAULT_CALL_STATE);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC internals
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const callerPrincipalRef = useRef<string>("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Store signals using backend messages as signaling channel
  // Signal format: WEBRTC_SIGNAL::<type>::<callType>::<payload>
  const storeSignal = useCallback(
    async (
      recipientPrincipal: string,
      signalType: string,
      callType: string,
      payload: string,
    ) => {
      if (!backend) return;
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const signalMsg = `WEBRTC_SIGNAL::${signalType}::${callType}::${payload}`;
        await backend.sendMessage(
          Principal.fromText(recipientPrincipal),
          signalMsg,
        );
      } catch {
        // ignore
      }
    },
    [backend],
  );

  // Get local media stream
  const getLocalStream = useCallback(async (callType: "video" | "voice") => {
    try {
      const constraints =
        callType === "video"
          ? { audio: true, video: { facingMode: "user" } }
          : { audio: true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch {
      // Fallback: try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        return stream;
      } catch {
        return null;
      }
    }
  }, []);

  // Clean up peer connection and streams
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    pendingOfferRef.current = null;
    callerPrincipalRef.current = "";
  }, []);

  // Poll for incoming WebRTC signals via messages
  useEffect(() => {
    if (!backend || !identity) return;

    const myPrincipal = identity.getPrincipal().toString();

    const pollSignals = async () => {
      try {
        // Get all conversations to find any signal messages
        const convs = await backend.getConversations();
        for (const conv of convs as any[]) {
          const otherPrincipalStr =
            typeof conv.otherPrincipal === "object"
              ? conv.otherPrincipal.toString()
              : String(conv.otherPrincipal);

          if (!conv.lastMessageText?.startsWith("WEBRTC_SIGNAL::")) continue;

          const { Principal } = await import("@icp-sdk/core/principal");
          const msgs = await backend.getMessages(
            Principal.fromText(otherPrincipalStr),
          );

          // Process signals from messages (signals sent TO me)
          for (const msg of (msgs as any[]).slice(-10)) {
            const senderStr =
              typeof msg.sender === "object"
                ? msg.sender.toString()
                : String(msg.sender);
            if (senderStr === myPrincipal) continue; // skip my own
            if (!msg.text?.startsWith("WEBRTC_SIGNAL::")) continue;

            const parts = msg.text.split("::");
            if (parts.length < 4) continue;
            const [, signalType, callType, ...payloadParts] = parts;
            const payload = payloadParts.join("::");

            if (signalType === "offer" && callState.phase === "idle") {
              // Incoming call!
              let remoteUsername = senderStr.slice(0, 8);
              let remoteAvatar = `https://i.pravatar.cc/100?u=${senderStr}`;
              try {
                const profileOpt = await backend.getProfile(
                  Principal.fromText(senderStr),
                );
                if (profileOpt.__kind__ === "Some") {
                  remoteUsername = profileOpt.value.username;
                  if (profileOpt.value.avatarKey) {
                    remoteAvatar = profileOpt.value.avatarKey;
                  }
                }
              } catch {
                // ignore
              }

              try {
                pendingOfferRef.current = JSON.parse(payload);
              } catch {
                continue;
              }
              callerPrincipalRef.current = senderStr;

              setCallState({
                phase: "incoming",
                callType: (callType as "video" | "voice") || "video",
                remoteUsername,
                remoteAvatar,
                remotePrincipal: senderStr,
                isMuted: false,
                isCameraOff: false,
                callDuration: 0,
              });
            } else if (
              signalType === "answer" &&
              callState.phase === "calling" &&
              senderStr === callState.remotePrincipal
            ) {
              // Call answered
              try {
                const answer = JSON.parse(payload);
                if (pcRef.current) {
                  await pcRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer),
                  );
                }
                setCallState((prev) => ({ ...prev, phase: "active" }));
                // Start duration timer
                if (durationIntervalRef.current)
                  clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = setInterval(() => {
                  setCallState((prev) => ({
                    ...prev,
                    callDuration: prev.callDuration + 1,
                  }));
                }, 1000);
              } catch {
                // ignore
              }
            } else if (
              signalType === "ice" &&
              (callState.phase === "calling" || callState.phase === "active") &&
              senderStr === callState.remotePrincipal
            ) {
              try {
                const candidate = JSON.parse(payload);
                if (pcRef.current) {
                  await pcRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate),
                  );
                }
              } catch {
                // ignore
              }
            } else if (
              (signalType === "hangup" || signalType === "decline") &&
              callState.phase !== "idle"
            ) {
              setCallState(DEFAULT_CALL_STATE);
              cleanup();
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    pollIntervalRef.current = setInterval(pollSignals, 3000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [backend, identity, callState.phase, callState.remotePrincipal, cleanup]);

  const startCall = useCallback(
    async (
      principalStr: string,
      username: string,
      avatarUrl: string,
      callType: "video" | "voice",
    ) => {
      cleanup();

      const stream = await getLocalStream(callType);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          storeSignal(
            principalStr,
            "ice",
            callType,
            JSON.stringify(event.candidate.toJSON()),
          );
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setCallState(DEFAULT_CALL_STATE);
          cleanup();
        }
      };

      pcRef.current = pc;

      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await storeSignal(principalStr, "offer", callType, JSON.stringify(offer));

      setCallState({
        phase: "calling",
        callType,
        remoteUsername: username,
        remoteAvatar: avatarUrl,
        remotePrincipal: principalStr,
        isMuted: false,
        isCameraOff: false,
        callDuration: 0,
      });
    },
    [cleanup, getLocalStream, storeSignal],
  );

  const answerCall = useCallback(async () => {
    if (!pendingOfferRef.current || !callerPrincipalRef.current) return;

    const callerPrincipal = callerPrincipalRef.current;
    const callType = callState.callType;
    const stream = await getLocalStream(callType);

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        storeSignal(
          callerPrincipal,
          "ice",
          callType,
          JSON.stringify(event.candidate.toJSON()),
        );
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setCallState(DEFAULT_CALL_STATE);
        cleanup();
      }
    };

    pcRef.current = pc;

    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    await pc.setRemoteDescription(
      new RTCSessionDescription(pendingOfferRef.current),
    );
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await storeSignal(
      callerPrincipal,
      "answer",
      callType,
      JSON.stringify(answer),
    );

    pendingOfferRef.current = null;

    setCallState((prev) => ({ ...prev, phase: "active" }));

    // Start duration timer
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        callDuration: prev.callDuration + 1,
      }));
    }, 1000);
  }, [callState.callType, getLocalStream, storeSignal, cleanup]);

  const declineCall = useCallback(async () => {
    if (callerPrincipalRef.current) {
      await storeSignal(
        callerPrincipalRef.current,
        "decline",
        callState.callType,
        "",
      );
    }
    cleanup();
    setCallState(DEFAULT_CALL_STATE);
  }, [callState.callType, storeSignal, cleanup]);

  const hangup = useCallback(async () => {
    if (callState.remotePrincipal) {
      await storeSignal(
        callState.remotePrincipal,
        "hangup",
        callState.callType,
        "",
      );
    }
    cleanup();
    setCallState(DEFAULT_CALL_STATE);
  }, [callState.remotePrincipal, callState.callType, storeSignal, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getAudioTracks()) {
        track.enabled = !track.enabled;
      }
    }
    setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getVideoTracks()) {
        track.enabled = !track.enabled;
      }
    }
    setCallState((prev) => ({ ...prev, isCameraOff: !prev.isCameraOff }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    declineCall,
    hangup,
    toggleMute,
    toggleCamera,
  };
}
