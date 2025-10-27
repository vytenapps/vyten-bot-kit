import { useState, useEffect, useRef, type FormEventHandler } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import { Conversation, ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai/message";
import { Bot } from "lucide-react";

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
      navigate("/chat");
      return;
    }

    if (!conversation) {
      toast({
        title: "Not Found",
        description: "Conversation not found",
        variant: "destructive",
      });
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

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        conversationId: chatId,
        message: userMessage,
        model 
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Failed to start stream");
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
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

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
      console.error("Chat error:", error);
      setStatus("error");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    }
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
            {conversationTitle || "New Conversation"}
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
              <ConversationContent>
                {messages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    {message.role === "assistant" && (
                      <MessageAvatar name="AI">
                        <Bot className="h-4 w-4" />
                      </MessageAvatar>
                    )}
                    <MessageContent>{message.content}</MessageContent>
                    {message.role === "user" && (
                      <MessageAvatar 
                        name={session?.user?.email?.split("@")[0] || "You"} 
                      />
                    )}
                  </Message>
                ))}
                <div ref={messagesEndRef} />
              </ConversationContent>
            </Conversation>
          </div>
          <div className="border-t p-4 bg-background">
            <div className="max-w-3xl mx-auto">
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputTextarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                />
                <PromptInputToolbar>
                  <PromptInputTools />
                  <PromptInputSubmit disabled={!text.trim()} status={status} />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ConversationPage;
