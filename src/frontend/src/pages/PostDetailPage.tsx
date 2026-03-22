import { ArrowLeft, Heart, MessageCircle, Send } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useBackend } from "../hooks/useBackend";
import { useStorageClient } from "../hooks/useStorageClient";
import { formatCount, timeAgo } from "../types/app";

interface PostComment {
  id: string;
  author: string;
  authorUsername: string;
  text: string;
  createdAt: bigint;
}

export default function PostDetailPage({
  postId,
  onBack,
  onViewProfile,
}: {
  postId: string;
  onBack: () => void;
  onViewProfile: (id: string) => void;
}) {
  const { backend, isLoggedIn } = useBackend();
  const imageStorageClient = useStorageClient("images");
  const thumbStorageClient = useStorageClient("thumbnails");

  const [post, setPost] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [creatorAvatar, setCreatorAvatar] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0n);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: storage clients are stable refs
  useEffect(() => {
    if (!backend || !postId) return;
    setLoading(true);

    const load = async () => {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const [postOpt, likeCountRaw, didLike] = await Promise.all([
          backend.getPostById(postId),
          backend.getPostLikeCount(postId).catch(() => 0n),
          isLoggedIn
            ? backend.didCallerLikePost(postId).catch(() => false)
            : Promise.resolve(false),
        ]);

        if (postOpt.__kind__ !== "Some") return;
        const p = postOpt.value;
        setPost(p);
        setLikeCount(likeCountRaw as bigint);
        setLiked(didLike as boolean);

        // Resolve image
        let img = p.imageKey || `https://picsum.photos/seed/${postId}/800/800`;
        if (imageStorageClient && img.startsWith("sha256:")) {
          try {
            img = await imageStorageClient.getDirectURL(img);
          } catch {}
        } else if (thumbStorageClient && img.startsWith("sha256:")) {
          try {
            img = await thumbStorageClient.getDirectURL(img);
          } catch {}
        }
        setImageUrl(img);

        // Resolve creator
        const creatorPStr =
          typeof p.creator === "object"
            ? p.creator.toString()
            : String(p.creator);
        const profileOpt = await backend
          .getProfile(Principal.fromText(creatorPStr))
          .catch(() => null);
        if (profileOpt?.__kind__ === "Some") {
          setCreatorUsername(profileOpt.value.username);
          let av =
            profileOpt.value.avatarKey ||
            `https://i.pravatar.cc/100?u=${creatorPStr}`;
          if (thumbStorageClient && av.startsWith("sha256:")) {
            try {
              av = await thumbStorageClient.getDirectURL(av);
            } catch {}
          }
          setCreatorAvatar(av);
        } else {
          setCreatorUsername(creatorPStr.slice(0, 8));
          setCreatorAvatar(`https://i.pravatar.cc/100?u=${creatorPStr}`);
        }

        // Load comments
        const rawComments = await backend
          .getPostComments(postId)
          .catch(() => []);
        const resolvedComments: PostComment[] = await Promise.all(
          (rawComments as any[]).map(async (c) => {
            const authorStr =
              typeof c.author === "object"
                ? c.author.toString()
                : String(c.author);
            let authorUsername = authorStr.slice(0, 8);
            try {
              const authProfileOpt = await backend.getProfile(
                Principal.fromText(authorStr),
              );
              if (authProfileOpt.__kind__ === "Some")
                authorUsername = authProfileOpt.value.username;
            } catch {}
            return {
              id: c.id,
              author: authorStr,
              authorUsername,
              text: c.text,
              createdAt: c.createdAt,
            };
          }),
        );
        setComments(resolvedComments);
      } catch {}
      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, postId, isLoggedIn]);

  const handleLike = async () => {
    if (!backend || !isLoggedIn) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1n);
      backend.unlikePost(postId).catch(() => {
        setLiked(true);
        setLikeCount((c) => c + 1n);
      });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1n);
      backend.likePost(postId).catch(() => {
        setLiked(false);
        setLikeCount((c) => c - 1n);
      });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !backend || !isLoggedIn || sending) return;
    setSending(true);
    try {
      await backend.addPostComment(postId, commentText.trim());
      setCommentText("");
      // Reload comments
      const { Principal } = await import("@icp-sdk/core/principal");
      const rawComments = await backend.getPostComments(postId).catch(() => []);
      const resolvedComments: PostComment[] = await Promise.all(
        (rawComments as any[]).map(async (c) => {
          const authorStr =
            typeof c.author === "object"
              ? c.author.toString()
              : String(c.author);
          let authorUsername = authorStr.slice(0, 8);
          try {
            const opt = await backend.getProfile(Principal.fromText(authorStr));
            if (opt.__kind__ === "Some") authorUsername = opt.value.username;
          } catch {}
          return {
            id: c.id,
            author: authorStr,
            authorUsername,
            text: c.text,
            createdAt: c.createdAt,
          };
        }),
      );
      setComments(resolvedComments);
    } catch {}
    setSending(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#0F1216]"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      data-ocid="post.panel"
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#2A3038] shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          data-ocid="post.back.button"
        >
          <ArrowLeft size={20} className="text-[#E9EEF5]" />
        </button>
        <button
          type="button"
          onClick={() =>
            post &&
            onViewProfile(
              typeof post.creator === "object"
                ? post.creator.toString()
                : String(post.creator),
            )
          }
          className="flex items-center gap-2"
          data-ocid="post.creator.button"
        >
          <img
            src={creatorAvatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-semibold text-sm">@{creatorUsername}</span>
        </button>
      </header>

      {loading ? (
        <div
          className="flex-1 flex items-center justify-center"
          data-ocid="post.loading_state"
        >
          <div className="w-8 h-8 rounded-full border-2 border-[#22D3EE] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          <div className="w-full aspect-square bg-[#1A1F26]">
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 flex items-center gap-4 border-b border-[#2A3038]">
            <button
              type="button"
              onClick={handleLike}
              className="flex items-center gap-1.5 active:scale-90 transition-transform"
              data-ocid="post.like.button"
            >
              <Heart
                size={24}
                className={
                  liked ? "text-[#FF3B5C] fill-[#FF3B5C]" : "text-[#E9EEF5]"
                }
              />
              <span className="text-sm font-semibold">
                {formatCount(likeCount)}
              </span>
            </button>
            <div className="flex items-center gap-1.5">
              <MessageCircle size={22} className="text-[#E9EEF5]" />
              <span className="text-sm font-semibold">{comments.length}</span>
            </div>
          </div>

          {/* Caption */}
          {post?.caption && (
            <div className="px-4 py-3">
              <p className="text-sm text-[#E9EEF5]">
                <span className="font-bold">@{creatorUsername}</span>{" "}
                {post.caption}
              </p>
              {post?.hashtags?.length > 0 && (
                <p className="mt-1 text-sm text-[#22D3EE]">
                  {(post.hashtags as string[]).map((h) => `#${h}`).join(" ")}
                </p>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="px-4 pb-4 space-y-3">
            {comments.map((c, i) => (
              <div
                key={c.id}
                className="flex gap-2"
                data-ocid={`post.comment.item.${i + 1}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#1A1F26] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#8B95A3]">
                    {c.authorUsername.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-bold text-[#E9EEF5]">
                    @{c.authorUsername}
                  </span>{" "}
                  <span className="text-sm text-[#A6B0BC]">{c.text}</span>
                  <p className="text-[10px] text-[#8B95A3] mt-0.5">
                    {timeAgo(Number(c.createdAt) / 1_000_000)}
                  </p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p
                className="text-[#8B95A3] text-sm text-center py-4"
                data-ocid="post.comments.empty_state"
              >
                No comments yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Comment input */}
      {isLoggedIn && (
        <div className="shrink-0 px-4 py-3 border-t border-[#2A3038] flex items-center gap-2">
          <input
            className="flex-1 bg-[#1A1F26] border border-[#2A3038] rounded-2xl px-4 py-2.5 text-sm text-[#E9EEF5] placeholder-[#8B95A3] outline-none focus:border-[#22D3EE] transition-colors"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleComment();
            }}
            data-ocid="post.comment.input"
          />
          <button
            type="button"
            onClick={handleComment}
            disabled={!commentText.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#22D3EE] flex items-center justify-center disabled:opacity-40"
            data-ocid="post.comment.submit_button"
          >
            <Send size={15} className="text-black" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
