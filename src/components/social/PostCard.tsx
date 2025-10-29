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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <UserAvatar
              avatarUrl={post.user_profiles?.avatar_url}
              email={post.user_profiles?.email}
              username={post.user_profiles?.username}
              firstName={post.user_profiles?.first_name}
              lastName={post.user_profiles?.last_name}
              className="h-12 w-12"
              fallbackClassName="bg-primary text-primary-foreground"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-base">{displayName}</p>
                {post.user_profiles?.username && (
                  <Badge variant="secondary" className="text-xs">
                    template creator
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true }).replace('about ', '')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Posted in Ask the Community
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bookmark className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">
            {post.content.split('\n')[0]}
          </h2>
          {post.content.split('\n').slice(1).join('\n').trim() && (
            <p className="whitespace-pre-wrap break-words text-base">
              {post.content.split('\n').slice(1).join('\n')}
            </p>
          )}
          {post.media_url && post.media_type?.startsWith('image/') && (
            <img 
              src={post.media_url} 
              alt="Post image" 
              className="rounded-lg max-h-96 w-full object-cover"
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-0 px-0 pt-0 pb-0">
        <div className="flex items-center gap-1 w-full px-6 pb-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className="gap-2 hover:bg-transparent"
          >
            <Heart
              className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
            />
            {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-2 hover:bg-transparent"
          >
            <MessageCircle className="h-5 w-5" />
            {commentCount > 0 && <span className="text-sm">{commentCount}</span>}
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </div>
        </div>
        {showComments && (
          <div className="w-full px-6 py-4">
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
