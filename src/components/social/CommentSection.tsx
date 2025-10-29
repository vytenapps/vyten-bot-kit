import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Loader2, Send, Trash2, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CommentLike {
  user_id: string;
  user_profiles: {
    avatar_url: string | null;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  user_profiles: {
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  comment_likes: CommentLike[];
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  onUpdate: () => void;
}

const CommentItem = ({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onLike,
  depth = 0
}: {
  comment: Comment;
  currentUserId: string;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  onLike: (commentId: string, isLiked: boolean) => void;
  depth?: number;
}) => {
  const displayName = comment.user_profiles
    ? `${comment.user_profiles.first_name || ""} ${comment.user_profiles.last_name || ""}`.trim() ||
      comment.user_profiles.username
    : "Unknown User";

  const isOwnComment = comment.user_id === currentUserId;
  const isLiked = comment.comment_likes.some((like) => like.user_id === currentUserId);
  const likeCount = comment.comment_likes.length;

  return (
    <div className={depth > 0 ? "ml-8 sm:ml-11" : ""}>
      <div className="flex gap-2 sm:gap-3 py-2">
        <UserAvatar
          className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
          avatarUrl={comment.user_profiles?.avatar_url}
          email={comment.user_profiles?.email}
          username={comment.user_profiles?.username}
          firstName={comment.user_profiles?.first_name}
          lastName={comment.user_profiles?.last_name}
          fallbackClassName="bg-secondary text-secondary-foreground text-xs"
        />
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <p className="text-xs sm:text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
              <p className="text-xs sm:text-sm mt-1 break-words">{comment.content}</p>
              <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLike(comment.id, isLiked)}
                  className="h-auto p-0 hover:bg-transparent text-xs font-semibold"
                >
                  <Heart
                    className={`h-3 w-3 mr-1 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? 'Like' : 'Likes'}` : 'Like'}
                </Button>
                {depth < 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(comment.id)}
                    className="h-auto p-0 hover:bg-transparent text-xs font-semibold"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
              </div>
            </div>
            {isOwnComment && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-destructive">
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(comment.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1 sm:mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              onLike={onLike}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentSection = ({ postId, currentUserId, onUpdate }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      // First fetch comments with user profiles
      const { data: commentsData, error: commentsError } = await supabase
        .from("post_comments")
        .select(`
          *,
          user_profiles!post_comments_user_id_fkey (
            username,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Then fetch likes for each comment with user profiles
      const commentIds = (commentsData || []).map((c: any) => c.id);
      let likesData: any[] = [];
      
      if (commentIds.length > 0) {
        const { data: fetchedLikes, error: likesError } = await supabase
          .from("comment_likes")
          .select(`
            comment_id,
            user_id,
            user_profiles!comment_likes_user_id_fkey (
              avatar_url,
              username,
              first_name,
              last_name,
              email
            )
          `)
          .in("comment_id", commentIds);

        if (!likesError && fetchedLikes) {
          likesData = fetchedLikes;
        }
      }

      // Merge likes into comments
      const data = (commentsData || []).map((comment: any) => ({
        ...comment,
        comment_likes: likesData.filter((like) => like.comment_id === comment.id)
      }));
      
      // Organize comments into a tree structure
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      (data || []).forEach((comment: any) => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      commentsMap.forEach((comment) => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_likes",
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      setError("Please enter a comment");
      return;
    }
    
    if (trimmedComment.length > 2000) {
      setError("Comment must be less than 2000 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: trimmedComment,
          parent_comment_id: replyToId,
        });

      if (insertError) throw insertError;

      setNewComment("");
      setReplyToId(null);
      setError(null);
      fetchComments();
      onUpdate();
      toast.success(replyToId ? "Reply posted!" : "Comment posted!");
    } catch (error) {
      console.error("Error creating comment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to post comment";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("Comment deleted");
      fetchComments();
      onUpdate();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleLike = async (commentId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_likes")
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
          });

        if (error) throw error;
      }
      fetchComments();
    } catch (error) {
      console.error("Error toggling comment like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleReply = (parentId: string) => {
    setReplyToId(parentId);
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          {replyToId && (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Replying to comment</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyToId(null)}
                className="h-auto p-0 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            maxLength={2000}
            className="text-sm sm:text-base"
          />
        </div>
        <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting} className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div className="space-y-1">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            onReply={handleReply}
            onLike={handleLike}
          />
        ))}
      </div>
    </div>
  );
};