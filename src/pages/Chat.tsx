import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        
        // If we arrived here from a magic link, broadcast to the original window
        const loginState = searchParams.get('login_state');
        if (loginState) {
          console.debug('[Chat] broadcasting signed_in for loginState', loginState);
          const channel = supabase.channel(`auth-sync:${loginState}`, { config: { broadcast: { self: true } } });
          channel.subscribe((status) => {
            console.debug('[Chat] Realtime subscribe status', status);
            if (status === 'SUBSCRIBED') {
              supabase.auth.getSession().then(({ data: { session } }) => {
                const access_token = session?.access_token;
                const refresh_token = session?.refresh_token;
                if (access_token && refresh_token) {
                  channel.send({
                    type: 'broadcast',
                    event: 'session_tokens',
                    payload: { access_token, refresh_token }
                  }).then(() => console.debug('[Chat] session_tokens broadcast sent'));
                } else {
                  console.warn('[Chat] no tokens found to broadcast');
                }
                channel.send({
                  type: 'broadcast',
                  event: 'signed_in',
                  payload: { success: true }
                }).then(() => {
                  console.debug('[Chat] signed_in broadcast sent successfully');
                  // Clean up the URL
                  setSearchParams({});
                  // Unsubscribe after a short delay
                  setTimeout(() => channel.unsubscribe(), 1000);
                });
              });
            }
          });
        }
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
  }, [navigate, searchParams, setSearchParams]);

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
