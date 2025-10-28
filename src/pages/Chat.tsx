import { useState, useEffect, type FormEventHandler, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AI_MODELS } from "@/lib/ai-config";
import { useAIChat } from "@/hooks/use-ai-chat";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Separator } from "@/components/ui/separator";
import { AttachmentInput } from "@/components/chat/AttachmentInput";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import { Suggestions, Suggestion } from "@/components/ui/shadcn-io/ai/suggestion";
import { MicIcon, PaperclipIcon } from "lucide-react";

const Chat = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { model, setModel, status } = useAIChat();

  const suggestions = [
    "What is Vyten Apps?",
    "What are the latest trends in AI?",
    "Explain best practices for Lovable development?",
  ];

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        
        // Fetch user profile for first name
        if (session.user?.id) {
          supabase
            .from('user_profiles')
            .select('first_name')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data?.first_name) {
                setFirstName(data.first_name);
              }
            });
        }
        
        // Handle magic link login - broadcast tokens for cross-origin sync
        const loginState = searchParams.get('login_state');
        if (loginState && session) {
          console.debug('[Chat] Broadcasting session tokens for loginState', loginState);
          
          const channel = supabase.channel(`auth-sync:${loginState}`, { config: { broadcast: { self: true } } });
          
          channel.subscribe((status) => {
            console.debug('[Chat] Realtime subscribe status', status);
            if (status === 'SUBSCRIBED') {
              // Broadcast session tokens
              channel.send({
                type: 'broadcast',
                event: 'session_tokens',
                payload: { 
                  access_token: session.access_token, 
                  refresh_token: session.refresh_token 
                }
              }).then(() => {
                console.debug('[Chat] Session tokens broadcasted successfully');
                // Clean up URL
                setSearchParams({});
                // Unsubscribe after delay
                setTimeout(() => channel.unsubscribe(), 2000);
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

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!text.trim() || !session?.user?.id) {
      return;
    }

    try {
      // Create a new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: session.user.id,
          title: text.substring(0, 50),
        })
        .select()
        .single();

      if (convError) throw convError;

      // Navigate to conversation page with message and model
      navigate(`/c/${conversation.id}?message=${encodeURIComponent(text)}&model=${model}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
  };

  const handleFilesSelected = (files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
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
          <div className="ml-auto">
            <UserAvatarMenu 
              isLoggedIn={!!session} 
              userEmail={session?.user?.email}
            />
          </div>
        </header>
        <div className="flex w-full flex-1 flex-col items-center justify-center py-8 px-4 sm:px-6 md:px-8 overflow-x-hidden bg-background">
          <div className="w-full max-w-screen-sm md:max-w-3xl mx-auto space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-4xl font-bold text-foreground">
                {firstName ? `Hello ${firstName}!` : "Hello there!"}
              </h1>
              <p className="text-xl text-muted-foreground">
                How can I help you today?
              </p>
            </div>

            <Suggestions>
              {suggestions.map((suggestion, index) => (
                <Suggestion
                  key={index}
                  suggestion={suggestion}
                  onClick={handleSuggestionClick}
                />
              ))}
            </Suggestions>

            <div className="w-full">
              <AttachmentInput
                onFilesSelected={handleFilesSelected}
                files={attachedFiles}
                onRemoveFile={handleRemoveFile}
                maxFiles={10}
                maxSize={20 * 1024 * 1024}
              >
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputTextarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message..."
                  />
                  <PromptInputToolbar>
                    <PromptInputTools>
                      <PromptInputButton onClick={handleAttachClick}>
                        <PaperclipIcon size={16} />
                      </PromptInputButton>
                      <PromptInputButton>
                        <MicIcon size={16} />
                        <span>Voice</span>
                      </PromptInputButton>
                      <PromptInputModelSelect
                        value={model}
                        onValueChange={setModel}
                      >
                        <PromptInputModelSelectTrigger>
                          <PromptInputModelSelectValue />
                        </PromptInputModelSelectTrigger>
                        <PromptInputModelSelectContent>
                          {AI_MODELS.map((m) => (
                            <PromptInputModelSelectItem key={m.id} value={m.id}>
                              {m.name}
                            </PromptInputModelSelectItem>
                          ))}
                        </PromptInputModelSelectContent>
                      </PromptInputModelSelect>
                    </PromptInputTools>
                    <PromptInputSubmit disabled={!text} status={status} />
                  </PromptInputToolbar>
                </PromptInput>
              </AttachmentInput>
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

export default Chat;
