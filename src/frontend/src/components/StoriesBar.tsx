import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Story } from "../backend.d";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";

interface Props {
  onOpenViewer: (stories: Story[], creatorId: string) => void;
  onOpenCreator: () => void;
  refreshKey?: number;
}

interface GroupedCreator {
  creatorId: string;
  stories: Story[];
  avatarUrl: string;
  username: string;
  hasUnviewed: boolean;
}

export default function StoriesBar({
  onOpenViewer,
  onOpenCreator,
  refreshKey,
}: Props) {
  const { backend, identity, isLoggedIn } = useBackend();
  const photoClient = useStorageClient("photos");
  const avatarClient = useStorageClient("thumbnails");
  const [groups, setGroups] = useState<GroupedCreator[]>([]);
  const [_viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey prop is intentionally included
  useEffect(() => {
    if (!backend) return;
    const load = async () => {
      try {
        const [stories, viewed, allUsers] = await Promise.all([
          backend.getActiveStories(),
          isLoggedIn ? backend.getViewedStoryIds() : Promise.resolve([]),
          backend.getAllUsers(),
        ]);
        const viewedSet = new Set(viewed as string[]);
        setViewedIds(viewedSet);

        // Group by creator
        const map = new Map<string, Story[]>();
        for (const s of stories as Story[]) {
          const cid =
            typeof s.creator === "object"
              ? s.creator.toString()
              : String(s.creator);
          if (!map.has(cid)) map.set(cid, []);
          map.get(cid)!.push(s);
        }

        // Build principal -> profile map
        const userMap = new Map<string, any>();
        for (const u of allUsers as any[]) {
          const pid =
            typeof u.principal === "object"
              ? u.principal.toString()
              : String(u.principal);
          userMap.set(pid, u);
        }

        const currentPrincipal = identity?.getPrincipal().toString();
        const groupsArr: GroupedCreator[] = [];

        for (const [cid, sts] of map.entries()) {
          // Include own story — no longer skip current principal
          const isOwn = cid === currentPrincipal;
          const profile = userMap.get(cid);
          const username = isOwn
            ? "Your Story"
            : (profile?.username ?? `${cid.slice(0, 6)}...`);

          let avatarUrl = `https://i.pravatar.cc/100?u=${cid}`;
          const avatarKey = profile?.avatarKey;
          if (avatarKey && avatarClient && avatarKey.startsWith("sha256:")) {
            try {
              avatarUrl = await avatarClient.getDirectURL(avatarKey);
            } catch {}
          } else {
            // fallback to first story media from photos bucket
            const firstKey = sts[0]?.mediaKey;
            if (
              firstKey?.startsWith("sha256:") &&
              !sts[0]?.mediaType?.startsWith("video")
            ) {
              if (photoClient) {
                try {
                  avatarUrl = await photoClient.getDirectURL(firstKey);
                } catch {}
              }
            }
          }

          const hasUnviewed = sts.some((s) => !viewedSet.has(s.id));
          groupsArr.push({
            creatorId: cid,
            stories: sts,
            avatarUrl,
            username,
            hasUnviewed,
          });
        }

        setGroups(groupsArr);
      } catch {}
    };
    load();
  }, [backend, identity, isLoggedIn, photoClient, avatarClient, refreshKey]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 px-3 py-3 overflow-x-auto scrollbar-hide shrink-0"
      style={{ WebkitOverflowScrolling: "touch" }}
      data-ocid="stories.list"
    >
      {/* Your Story — add new */}
      {isLoggedIn && (
        <button
          type="button"
          onClick={onOpenCreator}
          className="flex flex-col items-center gap-1 shrink-0"
          data-ocid="stories.add_button"
        >
          <div className="relative w-16 h-16">
            <div className="w-full h-full rounded-full border-2 border-dashed border-[#22D3EE] bg-[#1A1F26] flex items-center justify-center">
              <Plus size={20} className="text-[#22D3EE]" />
            </div>
          </div>
          <span className="text-[10px] text-[#8B95A3] w-16 text-center truncate">
            Add Story
          </span>
        </button>
      )}

      {/* All creators including own posted stories */}
      {groups.map((g) => (
        <button
          key={g.creatorId}
          type="button"
          onClick={() => onOpenViewer(g.stories, g.creatorId)}
          className="flex flex-col items-center gap-1 shrink-0"
          data-ocid="stories.item.1"
        >
          <div className="relative w-16 h-16">
            <div
              className="w-full h-full rounded-full p-[2px]"
              style={{
                background: g.hasUnviewed
                  ? "linear-gradient(135deg, #f093fb, #f5576c, #fda085)"
                  : "#2A3038",
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#1A1F26]">
                <img
                  src={g.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <span className="text-[10px] text-[#8B95A3] w-16 text-center truncate">
            {g.username}
          </span>
        </button>
      ))}
    </div>
  );
}
