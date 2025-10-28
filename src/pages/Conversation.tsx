import { useState, useEffect, useRef, type FormEventHandler } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai/reasoning";
import { Actions } from "@/components/ai/actions";

import { MicIcon, PaperclipIcon } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ConversationPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
  const [model, setModel] = useState<string>("google/gemini-2.5-flash");
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [hasTriggeredAI, setHasTriggeredAI] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const models = [
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "openai/gpt-5", name: "GPT-5" },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini" },
    { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        loadConversation(session.user.id);
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

  // Auto-trigger AI response for new conversations from URL params
  useEffect(() => {
    const messageFromUrl = searchParams.get("message");
    const modelFromUrl = searchParams.get("model");
    
    if (messageFromUrl && !hasTriggeredAI && session?.user?.id && chatId) {
      console.log("Auto-triggering AI response from URL params");
      setHasTriggeredAI(true);
      
      if (modelFromUrl) {
        setModel(modelFromUrl);
      }
      
      // Add user message to UI immediately
      const userMsgId = crypto.randomUUID();
      setMessages([{ id: userMsgId, role: "user", content: messageFromUrl }]);
      
      setStatus("streaming");
      streamChat(messageFromUrl).then(() => {
        setStatus("ready");
        // Clear URL params
        navigate(`/c/${chatId}`, { replace: true });
      }).catch((error) => {
        console.error("Auto-trigger AI error:", {
          error,
          message: error.message,
          stack: error.stack
        });
        setStatus("error");
        toast.error(error instanceof Error ? error.message : "Failed to get AI response");
      });
    }
  }, [searchParams, hasTriggeredAI, session, chatId]);

  const loadConversation = async (userId: string) => {
    if (!chatId) return;

    // Load conversation details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle();

    if (convError) {
      console.error("Error loading conversation:", convError);
      toast.error("Failed to load conversation");
      navigate("/chat");
      return;
    }

    if (!conversation) {
      toast.error("Conversation not found");
      navigate("/chat");
      return;
    }

    setConversationTitle(conversation.title);

    // Load messages
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error loading messages:", messagesError);
      return;
    }

    setMessages(
      messagesData.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }))
    );
  };

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    // Message saving is now handled by the edge function
    // This function is kept for potential future use
    return;
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

    console.log("Calling chat edge function:", {
      url: CHAT_URL,
      conversationId: chatId,
      model,
      messageLength: userMessage.length
    });

    // Get the current session token
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !currentSession) {
      console.error("Failed to get session for edge function call:", sessionError);
      throw new Error("Authentication required. Please sign in again.");
    }

    console.log("Using access token for edge function authentication");

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({ 
        conversationId: chatId,
        message: userMessage,
        model 
      }),
    });

    console.log("Chat response status:", resp.status);

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
      console.error("Chat error response:", {
        status: resp.status,
        statusText: resp.statusText,
        error: errorData,
        headers: Object.fromEntries(resp.headers.entries())
      });
      
      // More specific error messages
      if (resp.status === 401) {
        throw new Error("Authentication failed. Please refresh the page and try again.");
      } else if (resp.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      } else if (resp.status === 402) {
        throw new Error("AI service payment required. Please check your Lovable workspace credits.");
      }
      
      throw new Error(errorData.error || `Failed to get AI response (${resp.status})`);
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let assistantContent = "";

    // Add assistant message placeholder
    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    console.log("Starting to read AI stream...");

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          console.log("Stream completed, total characters:", assistantContent.length);
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: assistantContent } : m
              )
            );
          }
        } catch (e) {
          console.warn("Failed to parse SSE chunk:", e);
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    console.log("Reloading conversation to get saved messages from database...");
    // Reload conversation to get the saved message from DB
    if (session?.user?.id) {
      loadConversation(session.user.id);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;

    const userMessage = text.trim();
    setText("");
    setStatus("submitted");

    // Add user message to UI
    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: userMessage },
    ]);

    setStatus("streaming");

    try {
      await streamChat(userMessage);
      setStatus("ready");
    } catch (error) {
      console.error("Chat error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    }
  };

  const handleFeedback = async (messageId: string, feedbackType: 'positive' | 'negative') => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('message_feedback')
        .upsert({
          message_id: messageId,
          user_id: session.user.id,
          feedback_type: feedbackType
        }, {
          onConflict: 'message_id,user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error("Failed to save feedback:", error);
      throw error;
    }
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
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h2 className="text-sm font-medium text-muted-foreground truncate">
            {conversationTitle || "New Conversation"}
          </h2>
          <div className="ml-auto">
            <UserAvatarMenu 
              isLoggedIn={!!session} 
              userEmail={session?.user?.email}
            />
          </div>
        </header>
        <div className="flex flex-col flex-1 overflow-hidden">
          <Conversation>
            <ConversationContent className="max-w-screen-sm md:max-w-3xl mx-auto">
              {status === 'streaming' && messages.length === 0 && (
                <Reasoning isStreaming={true}>
                  <ReasoningTrigger title="Thinking" />
                  <ReasoningContent>Processing your request...</ReasoningContent>
                </Reasoning>
              )}
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  {message.role === "assistant" && (
                    <MessageAvatar name="AI">
                      <VytenIcon className="h-4 w-4 text-white" />
                    </MessageAvatar>
                  )}
                  <div className="flex flex-col flex-1">
                    <MessageContent className={message.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                      {message.role === "assistant" ? (
                        <Response parseIncompleteMarkdown={status === 'streaming'}>{message.content}</Response>
                      ) : (
                        message.content
                      )}
                    </MessageContent>
                    {message.role === "assistant" && (
                      <Actions 
                        messageId={message.id}
                        content={message.content}
                        onFeedback={handleFeedback}
                      />
                    )}
                  </div>
                  {message.role === "user" && (
                    <MessageAvatar 
                      name={getInitials(session?.user?.email)}
                    />
                  )}
                </Message>
              ))}
              <div ref={messagesEndRef} />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="sticky bottom-0 z-10 bg-background border-t px-4 sm:px-6 md:px-8 py-4">
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
                    <PromptInputModelSelect
                      value={model}
                      onValueChange={setModel}
                    >
                      <PromptInputModelSelectTrigger>
                        <PromptInputModelSelectValue />
                      </PromptInputModelSelectTrigger>
                      <PromptInputModelSelectContent>
                        {models.map((m) => (
                          <PromptInputModelSelectItem key={m.id} value={m.id}>
                            {m.name}
                          </PromptInputModelSelectItem>
                        ))}
                      </PromptInputModelSelectContent>
                    </PromptInputModelSelect>
                  </PromptInputTools>
                  <PromptInputSubmit disabled={!text.trim()} status={status} />
                </PromptInputToolbar>
              </PromptInput>
              <p className="text-xs text-center text-muted-foreground mt-2">
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
