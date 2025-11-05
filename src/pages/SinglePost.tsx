import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { PostCard } from "@/components/social/PostCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

export default function SinglePost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Fetch user roles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        if (rolesData) {
          setCurrentUserRoles(rolesData.map((r) => r.role));
        }
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            user_profiles!posts_user_id_fkey (
              username,
              first_name,
              last_name,
              email,
              avatar_url
            ),
            user_roles!inner (
              role
            ),
            post_likes (
              user_id,
              user_profiles (
                avatar_url,
                username,
                first_name,
                last_name,
                email
              )
            ),
            post_comments (
              id
            )
          `)
          .eq("id", postId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching post:", error);
          toast({
            title: "Error",
            description: "Failed to load post",
            variant: "destructive",
          });
          return;
        }

        if (!data) {
          toast({
            title: "Not Found",
            description: "This post doesn't exist",
            variant: "destructive",
          });
          return;
        }

        setPost(data);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "Something went wrong",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handlePostUpdate = () => {
    // Refresh the post data after update
    if (postId) {
      const fetchPost = async () => {
        const { data } = await supabase
          .from("posts")
          .select(`
            *,
            user_profiles!posts_user_id_fkey (
              username,
              first_name,
              last_name,
              email,
              avatar_url
            ),
            user_roles!inner (
              role
            ),
            post_likes (
              user_id,
              user_profiles (
                avatar_url,
                username,
                first_name,
                last_name,
                email
              )
            ),
            post_comments (
              id
            )
          `)
          .eq("id", postId)
          .maybeSingle();

        if (data) {
          setPost(data);
        } else {
          // Post was deleted, navigate back
          navigate("/social-wall");
        }
      };
      fetchPost();
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <Link to="/social-wall">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Social Wall
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationMenu />
              <UserAvatarMenu isLoggedIn={!!session} userEmail={user?.email} />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-3xl mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : post ? (
              <PostCard
                post={post}
                currentUserId={currentUserId}
                currentUserRoles={currentUserRoles}
                onUpdate={handlePostUpdate}
              />
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold mb-2">Post not found</h2>
                <p className="text-muted-foreground mb-4">
                  This post may have been deleted or doesn't exist.
                </p>
                <Link to="/social-wall">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Social Wall
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
