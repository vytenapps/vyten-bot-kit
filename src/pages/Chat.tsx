import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";

const Chat = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <Sidebar
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onSignOut={handleSignOut}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          <ChatPanel
            conversationId={currentConversationId}
            onConversationCreated={setCurrentConversationId}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Chat;
