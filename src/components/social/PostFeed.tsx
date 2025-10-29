import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Post {
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
  user_roles: { role: string }[];
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
}

interface PostFeedProps {
  userId: string;
}

export const PostFeed = ({ userId }: PostFeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);

  const fetchPosts = async () => {
    
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          user_profiles!inner (
            username,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          post_likes (
            user_id,
            user_profiles!inner (
              avatar_url,
              username,
              first_name,
              last_name,
              email
            )
          ),
          post_comments (id)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch user roles separately
      const userIds = [...new Set((data || []).map(post => post.user_id))];
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      
      // Merge roles into posts
      const postsWithRoles = (data || []).map(post => ({
        ...post,
        user_roles: (rolesData || []).filter(role => role.user_id === post.user_id)
      }));
      
      setPosts(postsWithRoles);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    
    // Fetch current user roles
    const fetchCurrentUserRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (data) {
        setCurrentUserRoles(data.map(r => r.role));
      }
    };
    
    fetchCurrentUserRoles();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("posts-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 p-6 border rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Posts</h2>

      {posts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={userId}
            currentUserRoles={currentUserRoles}
            onUpdate={fetchPosts}
          />
        ))
      )}
    </div>
  );
};
