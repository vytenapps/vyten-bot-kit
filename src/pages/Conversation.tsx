import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Separator } from "@/components/ui/separator";
import { VytenIcon } from "@/components/VytenIcon";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import { Conversation, ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai/message";
import { Response } from "@/components/ai/response";

import { MicIcon, PaperclipIcon } from "lucide-react";

const ConversationPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState<string>("");
  const [conversationTitle] = useState<string>("New Conversation");
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
  }, [navigate, chatId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) return;

    // TODO: Implement chat functionality
    console.log("Message to send:", text);
    setText("");
  };

  const getInitials = (email?: string) => {
    if (!email) return "U";
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
  };

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h2 className="text-sm font-medium text-muted-foreground truncate">
            {conversationTitle}
          </h2>
          <div className="ml-auto">
            <UserAvatarMenu 
              isLoggedIn={!!session} 
              userEmail={session?.user?.email}
            />
          </div>
        </header>
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
          <div className="flex-1 overflow-hidden">
            <Conversation>
              <ConversationContent className="max-w-screen-sm md:max-w-3xl mx-auto">
                {/* Example messages showing the UI components */}
                <Message from="assistant">
                  <MessageAvatar name="AI">
                    <VytenIcon className="h-4 w-4 text-white" />
                  </MessageAvatar>
                  <Response>
                    {`# Welcome to Vyten Bot Kit

This is a clean slate ready for your AI chatbot implementation.

## Features Available
- **Markdown rendering** with syntax highlighting
- **Code blocks** with copy buttons
- **Tables, lists, and rich formatting**

\`\`\`javascript
// Example code block
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

Ready to implement your AI logic!`}
                  </Response>
                </Message>
                
                <Message from="user">
                  <MessageContent className="bg-primary text-primary-foreground">
                    Hello! This is an example user message.
                  </MessageContent>
                  <MessageAvatar 
                    name={getInitials(session?.user?.email)}
                  />
                </Message>
              </ConversationContent>
            </Conversation>
          </div>
          <div className="px-4 sm:px-6 md:px-8">
            <div className="w-full max-w-screen-sm md:max-w-3xl mx-auto">
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputTextarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    <PromptInputButton>
                      <PaperclipIcon size={16} />
                    </PromptInputButton>
                    <PromptInputButton>
                      <MicIcon size={16} />
                      <span>Voice</span>
                    </PromptInputButton>
                  </PromptInputTools>
                  <PromptInputSubmit disabled={!text.trim()} status="ready" />
                </PromptInputToolbar>
              </PromptInput>
              <p className="text-xs text-center text-muted-foreground mt-2 mb-2">
                AI Chatbot can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ConversationPage;
