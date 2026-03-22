import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Principal } from "@icp-sdk/core/principal";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  principals: Principal[];
  currentUserPrincipal: Principal | null;
  backend: any;
}

export default function FollowListModal({
  open,
  onClose,
  title,
  principals,
  currentUserPrincipal,
  backend,
}: Props) {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !backend) return;
    setProfiles({});

    // Load profiles for all principals
    const loadProfiles = async () => {
      for (const p of principals) {
        try {
          const opt = await backend.getProfile(p);
          if (opt.__kind__ === "Some") {
            setProfiles((prev) => ({
              ...prev,
              [p.toString()]: opt.value,
            }));
          }
        } catch {
          // ignore
        }
      }
    };
    loadProfiles();

    // Load current following list
    if (currentUserPrincipal) {
      backend
        .getFollowing(currentUserPrincipal)
        .then((following: Principal[]) => {
          setFollowingSet(new Set(following.map((f) => f.toString())));
        })
        .catch(() => {});
    }
  }, [open, principals, backend, currentUserPrincipal]);

  const toggleFollow = async (p: Principal) => {
    const pStr = p.toString();
    if (followingSet.has(pStr)) {
      await backend.unfollowUser(p);
      setFollowingSet((prev) => {
        const s = new Set(prev);
        s.delete(pStr);
        return s;
      });
    } else {
      await backend.followUser(p);
      setFollowingSet((prev) => new Set([...prev, pStr]));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[#0F1216] border-[#2A3038] text-[#E9EEF5] h-[70vh]"
        data-ocid="follow_list.sheet"
      >
        <SheetHeader>
          <SheetTitle className="text-[#E9EEF5]">{title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto mt-4 space-y-3 pb-8">
          {principals.map((p) => {
            const pStr = p.toString();
            const profile = profiles[pStr];
            const isFollowing = followingSet.has(pStr);
            const isMe = pStr === currentUserPrincipal?.toString();
            return (
              <div key={pStr} className="flex items-center gap-3 px-1">
                <img
                  src={
                    profile?.avatarKey || `https://i.pravatar.cc/100?u=${pStr}`
                  }
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border border-[#2A3038]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    @{profile?.username || `${pStr.slice(0, 8)}...`}
                  </p>
                  {profile?.bio && (
                    <p className="text-xs text-[#8B95A3] line-clamp-1">
                      {profile.bio}
                    </p>
                  )}
                </div>
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => toggleFollow(p)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-bold ${
                      isFollowing
                        ? "border border-[#2A3038] text-[#E9EEF5]"
                        : "bg-[#22D3EE] text-black"
                    }`}
                    data-ocid="follow_list.toggle"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            );
          })}
          {principals.length === 0 && (
            <p className="text-center text-[#8B95A3] py-8">No users yet</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
