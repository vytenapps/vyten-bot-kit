import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CommentSection } from "./CommentSection";
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

interface PostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user_profiles: {
      username: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
    post_likes: { user_id: string }[];
    post_comments: { id: string }[];
  };
  currentUserId: string;
  onUpdate: () => void;
}

export const PostCard = ({ post, currentUserId, onUpdate }: PostCardProps) => {
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLiked = post.post_likes.some((like) => like.user_id === currentUserId);
  const isOwnPost = post.user_id === currentUserId;
  const likeCount = post.post_likes.length;
  const commentCount = post.post_comments.length;

  const displayName = post.user_profiles
    ? `${post.user_profiles.first_name || ""} ${post.user_profiles.last_name || ""}`.trim() ||
      post.user_profiles.username
    : "Unknown User";

  const initials = post.user_profiles
    ? `${post.user_profiles.first_name?.[0] || ""}${post.user_profiles.last_name?.[0] || ""}`.toUpperCase() ||
      post.user_profiles.username[0].toUpperCase()
    : "?";

  const handleLike = async () => {
    setIsLiking(true);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          });

        if (error) throw error;
      }
      onUpdate();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
      
      toast.success("Post deleted successfully");
      onUpdate();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {isOwnPost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this post? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap break-words">{post.content}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="flex items-center gap-4 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className="gap-2"
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
            />
            <span>{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{commentCount}</span>
          </Button>
        </div>
        {showComments && (
          <CommentSection
            postId={post.id}
            currentUserId={currentUserId}
            onUpdate={onUpdate}
          />
        )}
      </CardFooter>
    </Card>
  );
};
