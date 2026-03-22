import { X } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function AuthModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const { login, isLoggingIn } = useInternetIdentity();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      data-ocid="auth.modal"
    >
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close"
      />
      <div className="relative bg-[#1A1F26] rounded-3xl p-6 w-full max-w-sm border border-[#2A3038]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8B95A3]"
          data-ocid="auth.close_button"
        >
          <X size={20} />
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#22D3EE] flex items-center justify-center mx-auto mb-3">
            <span className="text-black font-black text-2xl">V</span>
          </div>
          <h2 className="text-xl font-bold">Sign in to VibeFlow</h2>
          <p className="text-[#A6B0BC] text-sm mt-1">
            Use Internet Identity for secure, private login
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            login();
            onClose();
          }}
          disabled={isLoggingIn}
          className="w-full py-4 rounded-2xl bg-[#22D3EE] text-black font-bold text-base disabled:opacity-60"
          data-ocid="auth.login.primary_button"
        >
          {isLoggingIn ? "Connecting..." : "Continue with Internet Identity"}
        </button>
        <p className="text-center text-xs text-[#8B95A3] mt-3">
          No password needed. Powered by ICP.
        </p>
      </div>
    </div>
  );
}
