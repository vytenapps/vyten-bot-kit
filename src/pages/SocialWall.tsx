import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CreatePost } from "@/components/social/CreatePost";
import { PostFeed } from "@/components/social/PostFeed";

const SocialWall = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base sm:text-lg font-semibold">Social Wall</h1>
          <div className="ml-auto flex items-center gap-2">
            <NotificationMenu />
            <UserAvatarMenu 
              isLoggedIn={!!session} 
              userEmail={session?.user?.email}
            />
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6">
            <CreatePost userId={session.user.id} />
            <PostFeed userId={session.user.id} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default SocialWall;
