import { useState, useEffect, Fragment, type FormEventHandler } from "react";
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
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ui/shadcn-io/ai/reasoning";
import { Actions, Action } from "@/components/ui/shadcn-io/ai/actions";

import { MicIcon, PaperclipIcon, ThumbsUpIcon, ThumbsDownIcon, CopyIcon } from "lucide-react";
import { highlightScrollContainers } from "@/lib/debug-scroll";

const ConversationPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState<string>("");
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [hasTriggeredAI, setHasTriggeredAI] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'positive' | 'negative'>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const debugEnabled = import.meta.env.VITE_DEBUG_SCROLL === '1' || searchParams.get("debugScroll") === '1';
  const [gapPx, setGapPx] = useState(0);
  const [innerPaddingPx, setInnerPaddingPx] = useState(0);
  
  const { messages, status, model, setModel, sendMessage, loadConversation, setMessages } = useAIChat();

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

  // Debug: highlight unexpected scroll containers on this page when enabled
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const enabled = import.meta.env.VITE_DEBUG_SCROLL === '1' || qs.get('debugScroll') === '1';
    let cleanup: (() => void) | undefined;
    if (enabled) {
      cleanup = highlightScrollContainers({ allowedAttr: 'data-allowed-scroll', showOverlay: true });
    }
    return () => cleanup?.();
  }, [messages.length, status]);

  // Extra logs specifically for chat containers
  useEffect(() => {
    if (!debugEnabled) return;
    const outer = document.querySelector('[data-chat-outer]') as HTMLElement | null;
    const inner = document.querySelector('[data-chat-inner]') as HTMLElement | null;
    const messages = document.querySelectorAll('[data-debug-message]');
    const actions = document.querySelectorAll('[data-debug-actions]');
    const scrollBtn = document.querySelector('[data-debug-scroll-btn]') as HTMLElement | null;
    
    const logEl = (name: string, el: HTMLElement | null) => {
      if (!el) return;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      console.info(`[ChatDebug] ${name}`, {
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        offsetHeight: el.offsetHeight,
        boundingRect: { top: rect.top, bottom: rect.bottom, height: rect.height },
        overflow: cs.overflow,
        overflowY: cs.overflowY,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        display: cs.display,
        flexDirection: cs.flexDirection,
        gap: cs.gap,
      });
    };
    
    logEl('Conversation (GREEN outer)', outer);
    logEl('ConversationContent (RED inner)', inner);

    const inset = document.querySelector('[data-debug-inset]') as HTMLElement | null;
    const input = document.querySelector('[data-chat-input]') as HTMLElement | null;
    logEl('SidebarInset (PAGE wrapper)', inset);
    logEl('Chat Input (FOOTER sibling)', input);
    
    // Check if inner's bottom is far from outer's bottom
    if (outer && inner) {
      const outerRect = outer.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const gap = outerRect.bottom - innerRect.bottom;
      console.warn(`[ChatDebug] GAP below red box: ${gap}px (negative means inner extends beyond outer)`);
    }
    
    messages.forEach((msg, idx) => logEl(`Message ${idx} (PURPLE)`, msg as HTMLElement));
    actions.forEach((action, idx) => logEl(`Actions ${idx} (MAGENTA)`, action as HTMLElement));
    if (scrollBtn) logEl('Scroll Button (CYAN)', scrollBtn);
  }, [messages.length, status, debugEnabled]);

  // Compute and visualize gap between RED inner and GREEN outer
  useEffect(() => {
    if (!debugEnabled) return;
    const outer = document.querySelector('[data-chat-outer]') as HTMLElement | null;
    const inner = document.querySelector('[data-chat-inner]') as HTMLElement | null;
    if (!outer || !inner) return;

    const update = () => {
      const outerRect = outer.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const gap = Math.max(0, Math.round(outerRect.bottom - innerRect.bottom));
      setGapPx(gap);

      // Get inner's actual padding
      const innerCs = getComputedStyle(inner);
      const paddingBottom = parseFloat(innerCs.paddingBottom);
      setInnerPaddingPx(paddingBottom);

      // Check for sentinel elements or hidden spacing
      const outerChildren = Array.from(outer.children);
      console.warn('[ChatDebug] Outer children count:', outerChildren.length);
      outerChildren.forEach((child, idx) => {
        const childEl = child as HTMLElement;
        const childRect = childEl.getBoundingClientRect();
        console.info(`[ChatDebug] Child ${idx}:`, {
          tagName: childEl.tagName,
          className: childEl.className,
          height: childRect.height,
          bottom: childRect.bottom,
          isScrollButton: childEl.hasAttribute('data-debug-scroll-btn'),
        });
      });

      // Inspect last message margin collapse
      const msgNodes = inner.querySelectorAll('[data-debug-message]');
      const lastMsg = msgNodes[msgNodes.length - 1] as HTMLElement | undefined;
      if (lastMsg) {
        const cs = getComputedStyle(lastMsg);
        const parentCs = getComputedStyle(inner);
        // eslint-disable-next-line no-console
        console.warn('[ChatDebug] Last message margins', {
          marginBottom: cs.marginBottom,
          parentPaddingBottom: parentCs.paddingBottom,
          parentBorderBottomWidth: parentCs.borderBottomWidth,
          note: 'If parent padding/border is 0 and last child has mb-*, bottom-margin will collapse OUTSIDE (the blank area).',
        });
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [messages.length, status, debugEnabled]);

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
        
        {/* Conversation Area - flex-1 takes remaining space */}
        <Conversation className="flex-1 min-h-0" data-allowed-scroll data-chat-outer debug={debugEnabled}>
          <ConversationContent className="max-w-screen-sm md:max-w-3xl mx-auto space-y-4 pb-4" data-chat-inner debug={debugEnabled}>
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
                  <Message from={message.role} data-debug-message className={debugEnabled ? "bg-purple-500/10 outline outline-1 outline-purple-500/40" : ""}>
                    {message.role === "assistant" && (
                      <MessageAvatar name="AI">
                        <VytenIcon className="h-4 w-4 text-white" />
                      </MessageAvatar>
                    )}
                    {message.role === "assistant" ? (
                      <div className={cn("flex-1", debugEnabled && "bg-yellow-500/10 outline outline-1 outline-yellow-500/40")}>
                        <Response className={cn("mb-0", debugEnabled && "bg-blue-500/10 outline outline-1 outline-blue-500/40")}>{message.content}</Response>
                        <Actions 
                          className={cn("mt-2", debugEnabled && "bg-magenta-500/10 outline outline-2 outline-magenta-500/60")}
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
                      <MessageContent className="bg-primary text-primary-foreground">
                        {message.content}
                      </MessageContent>
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
          </ConversationContent>
          
          {/* Debug overlays to visualize all spacing sources */}
          {debugEnabled && gapPx > 0 && (
            <>
              {/* Overlay 1: Inner padding-bottom (should be 16px = pb-4) */}
              <div
                className="pointer-events-none absolute left-0 right-0"
                style={{
                  bottom: `${gapPx}px`,
                  height: `${innerPaddingPx}px`,
                  background: 'repeating-linear-gradient(45deg, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.3) 5px, rgba(0, 200, 255, 0.3) 5px, rgba(0, 200, 255, 0.3) 10px)',
                  border: '2px solid cyan',
                  zIndex: 40,
                }}
              >
                <div className="bg-cyan-600 text-white px-2 py-0.5 rounded text-xs font-bold inline-block">
                  Inner pb-4: {innerPaddingPx}px
                </div>
              </div>
              
              {/* Overlay 2: The mysterious gap (everything else) */}
              <div
                className="pointer-events-none"
                style={{
                  height: `${gapPx}px`,
                  background: 'repeating-linear-gradient(45deg, rgba(255, 165, 0, 0.5), rgba(255, 165, 0, 0.5) 10px, rgba(255, 200, 0, 0.5) 10px, rgba(255, 200, 0, 0.5) 20px)',
                  border: '3px solid orange',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 50,
                }}
              >
                <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  TOTAL GAP: {gapPx}px (RED bottom ↑ to GREEN bottom ↓)
                </div>
              </div>
            </>
          )}
          
          <ConversationScrollButton 
            className={debugEnabled ? "bg-cyan-500/20 outline outline-2 outline-cyan-500/60" : ""}
            data-debug-scroll-btn
          />
        </Conversation>
        
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
                <PromptInputSubmit disabled={!text.trim()} status={status} />
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
