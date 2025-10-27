import { useState, useEffect, type FormEventHandler } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Separator } from "@/components/ui/separator";
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
  const [status, setStatus] = useState<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.5-flash");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const models = [
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "openai/gpt-5", name: "GPT-5" },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini" },
    { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  ];

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

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!text) {
      return;
    }
    setStatus('submitted');
    // TODO: Implement actual chat logic
    setTimeout(() => {
      setStatus('streaming');
    }, 200);
    setTimeout(() => {
      setStatus('ready');
      setText('');
    }, 2000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
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
                    <PromptInputModelSelect
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                    >
                      <PromptInputModelSelectTrigger>
                        <PromptInputModelSelectValue />
                      </PromptInputModelSelectTrigger>
                      <PromptInputModelSelectContent>
                        {models.map((model) => (
                          <PromptInputModelSelectItem key={model.id} value={model.id}>
                            {model.name}
                          </PromptInputModelSelectItem>
                        ))}
                      </PromptInputModelSelectContent>
                    </PromptInputModelSelect>
                  </PromptInputTools>
                  <PromptInputSubmit disabled={!text} status={status} />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Chat;
