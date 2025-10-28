import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profiles: {
    username: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  onUpdate: () => void;
}

export const CommentSection = ({ postId, currentUserId, onUpdate }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          *,
          user_profiles!post_comments_user_id_fkey (
            username,
            first_name,
            last_name
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      onUpdate();
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("Failed to post comment");
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

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pt-4 border-t">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
        />
        <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div className="space-y-3">
        {comments.map((comment) => {
          const displayName = comment.user_profiles
            ? `${comment.user_profiles.first_name || ""} ${comment.user_profiles.last_name || ""}`.trim() ||
              comment.user_profiles.username
            : "Unknown User";

          const initials = comment.user_profiles
            ? `${comment.user_profiles.first_name?.[0] || ""}${comment.user_profiles.last_name?.[0] || ""}`.toUpperCase() ||
              comment.user_profiles.username[0].toUpperCase()
            : "?";

          const isOwnComment = comment.user_id === currentUserId;

          return (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="bg-muted rounded-lg px-3 py-2 flex-1">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                  {isOwnComment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground px-3">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
