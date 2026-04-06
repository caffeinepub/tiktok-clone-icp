import { createContext, useContext } from "react";
import {
  type UseWebRTCCallReturn,
  useWebRTCCall,
} from "../hooks/useWebRTCCall";
import CallOverlay from "./CallOverlay";

export const WebRTCCallContext = createContext<UseWebRTCCallReturn | null>(
  null,
);

export function WebRTCCallProvider({
  children,
}: { children: React.ReactNode }) {
  const callHook = useWebRTCCall();

  return (
    <WebRTCCallContext.Provider value={callHook}>
      {children}
      <CallOverlay
        callState={callHook.callState}
        localVideoRef={callHook.localVideoRef}
        remoteVideoRef={callHook.remoteVideoRef}
        onAnswer={callHook.answerCall}
        onDecline={callHook.declineCall}
        onHangup={callHook.hangup}
        onToggleMute={callHook.toggleMute}
        onToggleCamera={callHook.toggleCamera}
      />
    </WebRTCCallContext.Provider>
  );
}

export function useCallContext(): UseWebRTCCallReturn {
  const ctx = useContext(WebRTCCallContext);
  if (!ctx) {
    throw new Error("useCallContext must be used within WebRTCCallProvider");
  }
  return ctx;
}
