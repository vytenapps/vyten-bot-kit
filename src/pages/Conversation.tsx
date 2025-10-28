import { useState, useEffect, useRef, type FormEventHandler } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AI_MODELS } from "@/lib/ai-config";
import { useAIChat } from "@/hooks/use-ai-chat";
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
import { Conversation, ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ui/shadcn-io/ai/reasoning";
import { Actions, Action } from "@/components/ui/shadcn-io/ai/actions";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { MicIcon, PaperclipIcon, CopyIcon, EditIcon, ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";

const ConversationPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState<string>("");
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [hasTriggeredAI, setHasTriggeredAI] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "up" | "down">>({});
  const { toast } = useToast();
  
  const { messages, status, model, setModel, sendMessage, loadConversation, setMessages } = useAIChat();

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
        // Only load conversation if we're not auto-triggering
        const messageFromUrl = searchParams.get("message");
        if (!messageFromUrl) {
          loadConversationData(session.user.id);
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
  }, [navigate, chatId, searchParams]);

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
      
      // Trigger AI response
      sendMessage(messageFromUrl, chatId).then(() => {
        console.log("Auto-trigger completed, reloading from DB");
        if (session?.user?.id && chatId) {
          loadConversation(session.user.id, chatId);
        }
        // Clear URL params
        navigate(`/c/${chatId}`, { replace: true });
      });
    }
  }, [searchParams, hasTriggeredAI, session, chatId, sendMessage, loadConversation, setModel, navigate]);

  const loadConversationData = async (userId: string) => {
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
      sonnerToast.error("Failed to load conversation");
      navigate("/chat");
      return;
    }

    if (!conversation) {
      sonnerToast.error("Conversation not found");
      navigate("/chat");
      return;
    }

    setConversationTitle(conversation.title);

    // Load messages using the hook
    if (chatId) {
      await loadConversation(userId, chatId);
      
      // Load feedback for assistant messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, role")
        .eq("conversation_id", chatId)
        .eq("user_id", userId);

      const assistantMessageIds = msgs?.filter(m => m.role === "assistant").map(m => m.id) || [];
      if (assistantMessageIds.length > 0) {
        const { data: feedbackData } = await (supabase as any)
          .from("message_feedback")
          .select("message_id, feedback_type")
          .eq("user_id", userId)
          .in("message_id", assistantMessageIds);

        if (feedbackData && Array.isArray(feedbackData)) {
          const feedbackMap: Record<string, "up" | "down"> = {};
          feedbackData.forEach((f: any) => {
            feedbackMap[f.message_id] = f.feedback_type as "up" | "down";
          });
          setMessageFeedback(feedbackMap);
        }
      }
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!text.trim() || !chatId) return;

    const userMessage = text.trim();
    setText("");
    
    await sendMessage(userMessage, chatId);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      duration: 2000,
    });
  };

  const handleEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditText(content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editText.trim() || !chatId) return;
    
    // Delete all messages after this one and resend
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Update the message content in the database
    const { error } = await supabase
      .from("messages")
      .update({ content: editText.trim() })
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Error updating message",
        variant: "destructive",
      });
      return;
    }

    // Delete subsequent messages
    const subsequentMessages = messages.slice(messageIndex + 1);
    if (subsequentMessages.length > 0) {
      await supabase
        .from("messages")
        .delete()
        .in("id", subsequentMessages.map(m => m.id));
    }

    setEditingMessageId(null);
    
    // Reload conversation and regenerate
    if (session?.user?.id && chatId) {
      await loadConversation(session.user.id, chatId);
      await sendMessage(editText.trim(), chatId);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleFeedback = async (messageId: string, feedbackType: "up" | "down") => {
    if (!session?.user?.id) return;

    const currentFeedback = messageFeedback[messageId];
    
    // If clicking the same feedback, remove it
    const newFeedbackType = currentFeedback === feedbackType ? null : feedbackType;

    if (newFeedbackType === null) {
      // Delete feedback
      await (supabase as any)
        .from("message_feedback")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", session.user.id);
      
      const newFeedback = { ...messageFeedback };
      delete newFeedback[messageId];
      setMessageFeedback(newFeedback);
    } else {
      // Upsert feedback
      await (supabase as any)
        .from("message_feedback")
        .upsert({
          message_id: messageId,
          user_id: session.user.id,
          feedback_type: newFeedbackType,
        });

      setMessageFeedback({
        ...messageFeedback,
        [messageId]: newFeedbackType,
      });
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
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="max-w-screen-sm md:max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isStreamingThisMessage = isLastMessage && message.role === "assistant" && status === "streaming";
                
                return (
                  <div key={message.id} className="space-y-4">
                    {isStreamingThisMessage && (
                      <Reasoning 
                        isStreaming={true}
                        defaultOpen={true}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>
                          Analyzing your question and generating a thoughtful response...
                        </ReasoningContent>
                      </Reasoning>
                    )}
                    <Message from={message.role}>
                      {message.role === "assistant" && (
                        <MessageAvatar name="AI">
                          <VytenIcon className="h-4 w-4 text-white" />
                        </MessageAvatar>
                      )}
                      <div className="flex-1">
                        {message.role === "assistant" ? (
                          <>
                            <Response className="flex-1">{message.content}</Response>
                            <Actions className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Action 
                                tooltip="Copy" 
                                onClick={() => handleCopy(message.content)}
                              >
                                <CopyIcon className="size-4" />
                              </Action>
                              <Action 
                                tooltip="Like" 
                                onClick={() => handleFeedback(message.id, "up")}
                                className={messageFeedback[message.id] === "up" ? "text-foreground" : ""}
                              >
                                <ThumbsUpIcon className="size-4" />
                              </Action>
                              <Action 
                                tooltip="Dislike" 
                                onClick={() => handleFeedback(message.id, "down")}
                                className={messageFeedback[message.id] === "down" ? "text-foreground" : ""}
                              >
                                <ThumbsDownIcon className="size-4" />
                              </Action>
                            </Actions>
                          </>
                        ) : editingMessageId === message.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[80px]"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(message.id)}
                                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
                              >
                                Save & Regenerate
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <MessageContent className="bg-primary text-primary-foreground">
                              {message.content}
                            </MessageContent>
                            <Actions className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Action 
                                tooltip="Copy" 
                                onClick={() => handleCopy(message.content)}
                              >
                                <CopyIcon className="size-4" />
                              </Action>
                              <Action 
                                tooltip="Edit" 
                                onClick={() => handleEdit(message.id, message.content)}
                              >
                                <EditIcon className="size-4" />
                              </Action>
                            </Actions>
                          </>
                        )}
                      </div>
                      {message.role === "user" && (
                        <MessageAvatar 
                          name={getInitials(session?.user?.email)}
                        />
                      )}
                    </Message>
                  </div>
                );
              })}
              {/* Show reasoning immediately when streaming starts, even before assistant message appears */}
              {status === "streaming" && messages[messages.length - 1]?.role === "user" && (
                <Reasoning 
                  isStreaming={true}
                  defaultOpen={true}
                >
                  <ReasoningTrigger />
                </Reasoning>
              )}
              <div ref={messagesEndRef} />
            </ConversationContent>
          </Conversation>
          <div className="px-4 sm:px-6 md:px-8 pb-4">
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
                        {AI_MODELS.map((m) => (
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
