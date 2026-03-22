import { X } from "lucide-react";
import { useState } from "react";

interface Profile {
  username: string;
  bio: string;
  avatar: string;
}

export default function EditProfileModal({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSave: (p: Profile) => void;
}) {
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      data-ocid="edit_profile.modal"
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
          data-ocid="edit_profile.close_button"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold mb-5">Edit Profile</h2>
        <div className="space-y-3 mb-5">
          <div>
            <label
              htmlFor="edit-username"
              className="text-xs text-[#A6B0BC] mb-1 block"
            >
              Username
            </label>
            <input
              id="edit-username"
              className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-ocid="edit_profile.username.input"
            />
          </div>
          <div>
            <label
              htmlFor="edit-bio"
              className="text-xs text-[#A6B0BC] mb-1 block"
            >
              Bio
            </label>
            <textarea
              id="edit-bio"
              rows={3}
              className="w-full bg-[#0F1216] border border-[#2A3038] rounded-xl px-4 py-3 text-sm text-[#E9EEF5] outline-none focus:border-[#22D3EE] transition-colors resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              data-ocid="edit_profile.bio.textarea"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSave({ ...profile, username, bio })}
          className="w-full py-3 rounded-2xl bg-[#22D3EE] text-black font-bold"
          data-ocid="edit_profile.save.submit_button"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
