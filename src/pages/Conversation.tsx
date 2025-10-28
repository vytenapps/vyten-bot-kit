import { useState, useEffect, Fragment, useRef, useCallback, type FormEventHandler } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AI_MODELS } from "@/lib/ai-config";
import { useAIChat } from "@/hooks/use-ai-chat";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Separator } from "@/components/ui/separator";
import { VytenIcon } from "@/components/VytenIcon";
import { cn } from "@/lib/utils";
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
import { Message, MessageContent, MessageAvatar } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ui/shadcn-io/ai/reasoning";
import { Actions, Action } from "@/components/ui/shadcn-io/ai/actions";
import { Button } from "@/components/ui/button";

import { MicIcon, PaperclipIcon, ThumbsUpIcon, ThumbsDownIcon, CopyIcon, ArrowDownIcon, ArrowUpIcon, SquareIcon } from "lucide-react";

const ConversationPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState<string>("");
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [hasTriggeredAI, setHasTriggeredAI] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'positive' | 'negative'>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const { messages, status, model, setModel, sendMessage, loadConversation, setMessages, stopStreaming } = useAIChat();

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Check if user is at bottom to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Cleanup any leftover scroll-debug markers/overlays/outlines from previous sessions
  useEffect(() => {
    // Remove floating markers like "#1 DIV" and the overlay "[ScrollDebug] ..."
    const fixedDivs = Array.from(document.body.querySelectorAll('div')) as HTMLElement[];
    fixedDivs.forEach((el) => {
      const style = getComputedStyle(el);
      const text = (el.textContent || '').trim();
      if (style.position === 'fixed' && style.zIndex === '9999') {
        if (text.startsWith('[ScrollDebug]') || /^#\d+\s+[A-Z]+$/.test(text)) {
          el.remove();
        }
      }
    });
    // Remove inline outlines added by the debug util
    const allEls = Array.from(document.querySelectorAll('*')) as HTMLElement[];
    allEls.forEach((el) => {
      if (el.style && (el.style.outline || el.style.outlineOffset)) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
  }, []);

  // Lock page scroll so only the conversation area can scroll
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.height = '100%';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

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

    // Load messages using the hook
    if (chatId) {
      await loadConversation(userId, chatId);
    }

    // Load feedback for messages
    const { data: feedback } = await (supabase as any)
      .from("message_feedback")
      .select("message_id, feedback_type")
      .eq("user_id", userId);

    if (feedback) {
      const feedbackMap: Record<string, 'positive' | 'negative'> = {};
      feedback.forEach((f: any) => {
        feedbackMap[f.message_id] = f.feedback_type as 'positive' | 'negative';
      });
      setMessageFeedback(feedbackMap);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!text.trim() || !chatId) return;

    const userMessage = text.trim();
    setText("");
    
    await sendMessage(userMessage, chatId);
  };

  const getInitials = (email?: string) => {
    if (!email) return "U";
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleFeedback = async (messageId: string, feedbackType: 'positive' | 'negative') => {
    if (!session?.user?.id) return;

    const currentFeedback = messageFeedback[messageId];
    
    // If clicking the same feedback, remove it
    if (currentFeedback === feedbackType) {
      const { error } = await (supabase as any)
        .from("message_feedback")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", session.user.id);

      if (error) {
        toast.error("Failed to remove feedback");
        return;
      }

      setMessageFeedback(prev => {
        const updated = { ...prev };
        delete updated[messageId];
        return updated;
      });
      return;
    }

    // Otherwise, upsert the feedback
    const { error } = await (supabase as any)
      .from("message_feedback")
      .upsert({
        message_id: messageId,
        user_id: session.user.id,
        feedback_type: feedbackType,
      }, {
        onConflict: 'message_id,user_id'
      });

    if (error) {
      toast.error("Failed to save feedback");
      return;
    }

    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: feedbackType
    }));
    toast.success("Thanks for the feedback!");
  };

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-svh w-full flex-col bg-background overflow-hidden" data-debug-inset>
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
        
        {/* Conversation Area - simple overflow-y-auto scroll container */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative"
          data-allowed-scroll 
          data-chat-outer
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <div className="max-w-screen-sm md:max-w-3xl mx-auto space-y-4 p-4" data-chat-inner>
            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              const isStreamingThisMessage = isLastMessage && message.role === "assistant" && status === "streaming";
              
              return (
                <Fragment key={message.id}>
                  {isStreamingThisMessage && (
                    <Reasoning 
                      isStreaming={true}
                      defaultOpen={true}
                    >
                      <ReasoningTrigger />
                    </Reasoning>
                  )}
                  <Message from={message.role} data-debug-message className={message.role === "user" ? "group" : ""}>
                    {message.role === "assistant" && (
                      <MessageAvatar name="AI">
                        <VytenIcon className="h-4 w-4 text-white" />
                      </MessageAvatar>
                    )}
                    {message.role === "assistant" ? (
                      <div className="flex-1 flex flex-col">
                        <Response className="mb-0">{message.content}</Response>
                        <Actions 
                          className="mt-2"
                          data-debug-actions
                        >
                          <Action 
                            label="Copy" 
                            tooltip="Copy to clipboard"
                            onClick={() => handleCopy(message.content)}
                          >
                            <CopyIcon className="size-4" />
                          </Action>
                          <Action 
                            label="Like" 
                            tooltip="Like this response"
                            onClick={() => handleFeedback(message.id, 'positive')}
                            className={messageFeedback[message.id] === 'positive' ? 'text-foreground' : ''}
                          >
                            <ThumbsUpIcon 
                              className="size-4" 
                              strokeWidth={messageFeedback[message.id] === 'positive' ? 2.5 : 2}
                              fill={messageFeedback[message.id] === 'positive' ? 'currentColor' : 'none'}
                              fillOpacity={messageFeedback[message.id] === 'positive' ? 0.2 : 0}
                            />
                          </Action>
                          <Action 
                            label="Dislike" 
                            tooltip="Dislike this response"
                            onClick={() => handleFeedback(message.id, 'negative')}
                            className={messageFeedback[message.id] === 'negative' ? 'text-foreground' : ''}
                          >
                            <ThumbsDownIcon 
                              className="size-4"
                              strokeWidth={messageFeedback[message.id] === 'negative' ? 2.5 : 2}
                              fill={messageFeedback[message.id] === 'negative' ? 'currentColor' : 'none'}
                              fillOpacity={messageFeedback[message.id] === 'negative' ? 0.2 : 0}
                            />
                          </Action>
                        </Actions>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-end">
                        <MessageContent className="bg-primary text-primary-foreground">
                          {message.content}
                        </MessageContent>
                        <Actions 
                          className="mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                          data-debug-actions
                        >
                          <Action 
                            label="Copy" 
                            tooltip="Copy to clipboard"
                            onClick={() => handleCopy(message.content)}
                          >
                            <CopyIcon className="size-4" />
                          </Action>
                        </Actions>
                      </div>
                    )}
                    {message.role === "user" && (
                      <MessageAvatar 
                        name={getInitials(session?.user?.email)}
                      />
                    )}
                  </Message>
                </Fragment>
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
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              onClick={() => scrollToBottom()}
              size="icon"
              variant="outline"
              className="absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full shadow-lg"
            >
              <ArrowDownIcon className="size-4" />
            </Button>
          )}
        </div>
        
        {/* Input Area - sibling to Conversation */}
        <div className="shrink-0 border-t p-4" data-chat-input>
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
                {status === "streaming" ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="default"
                    className="rounded-full h-6 w-6 min-w-6 shrink-0 ml-2 mr-2"
                    onClick={stopStreaming}
                  >
                    <div className="w-2.5 h-2.5 bg-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    variant="default"
                    className="rounded-full h-6 w-6 min-w-6 shrink-0 ml-2 mr-2"
                    disabled={!text.trim()}
                  >
                    <svg width="10" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                      <path fill="currentColor" d="M11 19V7.415l-3.293 3.293a1 1 0 1 1-1.414-1.414l5-5 .074-.067a1 1 0 0 1 1.34.067l5 5a1 1 0 1 1-1.414 1.414L13 7.415V19a1 1 0 1 1-2 0"></path>
                    </svg>
                  </Button>
                )}
              </PromptInputToolbar>
            </PromptInput>
            <p className="text-xs text-center text-muted-foreground mt-2">
              AI Chatbot can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ConversationPage;
