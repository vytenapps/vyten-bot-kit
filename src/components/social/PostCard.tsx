import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    title: string | null;
    content: string;
    created_at: string;
    user_id: string;
    media_url: string | null;
    media_type: string | null;
    user_profiles: {
      username: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
    post_likes: { 
      user_id: string;
      user_profiles: {
        avatar_url: string | null;
        username: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
    }[];
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
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            <UserAvatar
              avatarUrl={post.user_profiles?.avatar_url}
              email={post.user_profiles?.email}
              username={post.user_profiles?.username}
              firstName={post.user_profiles?.first_name}
              lastName={post.user_profiles?.last_name}
              className="h-10 w-10 sm:h-12 sm:w-12 shrink-0"
              fallbackClassName="bg-primary text-primary-foreground"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm sm:text-base truncate">{displayName}</p>
                {post.user_profiles?.username && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    template creator
                  </Badge>
                )}
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true }).replace('about ', '')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Posted in Ask the Community
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bookmark className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                {isOwnPost ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete post
                      </DropdownMenuItem>
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
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    No actions available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4 sm:px-6">
        <div className="space-y-2 sm:space-y-3">
          {post.title && (
            <h2 className="text-xl sm:text-2xl font-bold break-words">
              {post.title}
            </h2>
          )}
          <p className="whitespace-pre-wrap break-words text-sm sm:text-base">
            {post.content}
          </p>
          {post.media_url && post.media_type?.startsWith('image/') && (
            <img 
              src={post.media_url} 
              alt="Post image" 
              className="rounded-lg w-full h-auto max-h-[400px] sm:max-h-[500px] object-contain bg-muted"
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-0 px-0 pt-0 pb-0">
        <div className="flex items-center justify-between w-full px-4 sm:px-6 pb-2 border-b">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className="gap-1 sm:gap-2 hover:bg-transparent p-0 h-auto"
            >
              <Heart
                className={`h-4 w-4 sm:h-5 sm:w-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="gap-1 sm:gap-2 hover:bg-transparent p-0 h-auto"
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {likeCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {post.post_likes.slice(0, 3).map((like, index) => (
                    <UserAvatar
                      key={like.user_id}
                      avatarUrl={like.user_profiles?.avatar_url}
                      email={like.user_profiles?.email}
                      username={like.user_profiles?.username}
                      firstName={like.user_profiles?.first_name}
                      lastName={like.user_profiles?.last_name}
                      className="h-5 w-5 sm:h-6 sm:w-6 border-2 border-background"
                      fallbackClassName="bg-primary text-primary-foreground text-xs"
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </span>
              </div>
            )}
            {commentCount > 0 && (
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              </span>
            )}
          </div>
        </div>
        {showComments && (
          <div className="w-full px-4 sm:px-6 py-3 sm:py-4">
            <CommentSection
              postId={post.id}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
