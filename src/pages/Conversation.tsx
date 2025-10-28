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
import { AttachmentInput, AttachmentPreviews } from "@/components/chat/AttachmentInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Copy, File } from "lucide-react";
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxFile, setLightboxFile] = useState<{ fileName: string; fileType: string; index: number; content?: string; preview?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const { messages, status, model, setModel, sendMessage, loadConversation, setMessages, stopStreaming } = useAIChat();

  // Generate preview URLs for image files
  useEffect(() => {
    const previews = attachedFiles.map((file) => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
      }
      return "";
    });
    setFilePreviews(previews);

    // Cleanup preview URLs
    return () => {
      previews.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [attachedFiles]);

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
    const filesFromUrl = searchParams.get("files");
    
    if (messageFromUrl && !hasTriggeredAI && session?.user?.id && chatId) {
      console.log("Auto-triggering AI response from URL params");
      setHasTriggeredAI(true);
      
      if (modelFromUrl) {
        setModel(modelFromUrl);
      }
      
      // Parse files if present
      let filesData = null;
      if (filesFromUrl) {
        try {
          filesData = JSON.parse(decodeURIComponent(filesFromUrl));
        } catch (e) {
          console.error("Failed to parse files from URL", e);
        }
      }
      
      // Trigger AI response
      sendMessage(messageFromUrl, chatId, filesData).then(() => {
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
    const filesToSend = attachedFiles;
    setText("");
    setAttachedFiles([]);
    
    // Convert files to base64 for AI processing
    let filesData = null;
    if (filesToSend.length > 0) {
      filesData = await Promise.all(
        filesToSend.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            name: file.name,
            type: file.type.startsWith("image/") ? "image" : "file",
            mimeType: file.type,
            size: file.size,
            data: base64
          };
        })
      );
    }
    
    await sendMessage(userMessage, chatId, filesData);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

  const handleDownload = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("File downloaded");
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Text copied to clipboard");
  };

  const handleFileClick = async (file: File, index: number) => {
    const isImage = file.type.startsWith("image/");
    const isText = file.type.startsWith("text/") || 
                   file.name.endsWith(".json") || 
                   file.name.endsWith(".md") || 
                   file.name.endsWith(".txt") ||
                   file.name.endsWith(".js") ||
                   file.name.endsWith(".ts") ||
                   file.name.endsWith(".tsx") ||
                   file.name.endsWith(".jsx") ||
                   file.name.endsWith(".css") ||
                   file.name.endsWith(".html");

    if (isText) {
      // Read text file content
      const content = await file.text();
      setLightboxFile({ fileName: file.name, fileType: file.type, index, content });
    } else if (isImage) {
      setLightboxFile({ fileName: file.name, fileType: file.type, index, preview: filePreviews[index] });
    }
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
          <div className="max-w-screen-sm md:max-w-3xl mx-auto space-y-4 p-4 pb-5" data-chat-inner>
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
                        <svg height="14" strokeLinejoin="round" viewBox="0 0 16 16" width="14" style={{ color: 'currentcolor' }}>
                          <path d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z" fill="currentColor"></path>
                          <path d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z" fill="currentColor"></path>
                          <path d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z" fill="currentColor"></path>
                        </svg>
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
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {message.attachments.map((attachment, attIndex) => {
                                const isImage = attachment.type.startsWith("image/");
                                const isText = attachment.type.startsWith("text/") || 
                                              attachment.name.endsWith(".json") || 
                                              attachment.name.endsWith(".md") ||
                                              attachment.name.endsWith(".txt");
                                
                                return (
                                  <div
                                    key={attIndex}
                                    className="relative cursor-pointer"
                                    onClick={async () => {
                                      if (isText && attachment.data) {
                                        // Decode base64 data URL to get text content
                                        const base64Data = attachment.data.split(',')[1];
                                        const content = atob(base64Data);
                                        setLightboxFile({ 
                                          fileName: attachment.name,
                                          fileType: attachment.type,
                                          index: attIndex,
                                          content 
                                        });
                                      } else if (isImage && attachment.preview) {
                                        setLightboxFile({ 
                                          fileName: attachment.name,
                                          fileType: attachment.type,
                                          index: attIndex,
                                          preview: attachment.preview
                                        });
                                      }
                                    }}
                                  >
                                    {isImage ? (
                                      <img
                                        src={attachment.preview}
                                        alt={attachment.name}
                                        className="w-16 h-16 object-cover rounded-lg border"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2 rounded-lg border bg-background/10 px-2 py-1">
                                        <File className="h-4 w-4" />
                                        <span className="text-xs truncate max-w-[100px]">
                                          {attachment.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
            {showScrollButton && (
              <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <Button
                  onClick={() => scrollToBottom()}
                  size="icon"
                  variant="outline"
                  className="rounded-full shadow-md pointer-events-auto"
                  type="button"
                >
                  <ArrowDownIcon className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        
        {/* Input Area - sibling to Conversation */}
        <div className="shrink-0 bg-transparent px-4 pb-4" data-chat-input>
          <div className="w-full max-w-screen-sm md:max-w-3xl mx-auto">
            <AttachmentInput
              onFilesSelected={handleFilesSelected}
              files={attachedFiles}
              onRemoveFile={handleRemoveFile}
              maxFiles={10}
              maxSize={20 * 1024 * 1024}
            >
              <PromptInput onSubmit={handleSubmit}>
                <AttachmentPreviews
                  files={attachedFiles}
                  filePreviews={filePreviews}
                  onRemoveFile={handleRemoveFile}
                  onFileClick={handleFileClick}
                  hoveredIndex={hoveredIndex}
                  onMouseEnter={setHoveredIndex}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                <PromptInputTextarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    <PromptInputButton onClick={handleAttachClick} type="button">
                      <PaperclipIcon size={16} />
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
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="rounded-full h-6 w-6 min-w-6 shrink-0"
                    >
                      <MicIcon size={14} />
                    </Button>
                    {status === "streaming" ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="default"
                        className="rounded-full h-6 w-6 min-w-6 shrink-0"
                        onClick={stopStreaming}
                      >
                        <div className="w-2 h-2 bg-current" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        variant="default"
                        className="rounded-full h-6 w-6 min-w-6 shrink-0"
                        disabled={!text.trim()}
                      >
                        <svg width="10" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                          <path fill="currentColor" d="M11 19V7.415l-3.293 3.293a1 1 0 1 1-1.414-1.414l5-5 .074-.067a1 1 0 0 1 1.34.067l5 5a1 1 0 1 1-1.414 1.414L13 7.415V19a1 1 0 1 1-2 0"></path>
                        </svg>
                      </Button>
                    )}
                  </div>
                </PromptInputToolbar>
            </PromptInput>
          </AttachmentInput>
          <p className="text-xs text-center text-muted-foreground mt-2">
            AI Chatbot can make mistakes. Check important info.
          </p>
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxFile} onOpenChange={() => setLightboxFile(null)}>
        <DialogContent className="max-w-4xl">
          {lightboxFile && (
            <>
                    <DialogHeader>
                      <DialogTitle className="text-sm font-normal flex items-center justify-between">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="truncate font-medium">{lightboxFile.fileName}</span>
                          <span className="text-xs text-muted-foreground">
                            {lightboxFile.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {lightboxFile.content && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(lightboxFile.content!)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Text
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (lightboxFile.content) {
                                const blob = new Blob([lightboxFile.content], { type: lightboxFile.fileType });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = lightboxFile.fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } else if (lightboxFile.preview) {
                                const a = document.createElement("a");
                                a.href = lightboxFile.preview;
                                a.download = lightboxFile.fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }
                              toast.success("File downloaded");
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download File
                          </Button>
                        </div>
                      </DialogTitle>
                    </DialogHeader>
              {lightboxFile.content ? (
                <div className="bg-muted/30 rounded-lg p-4 max-h-[70vh] overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {lightboxFile.content}
                  </pre>
                </div>
                    ) : (
                      <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
                        <img
                          src={lightboxFile.preview || filePreviews[lightboxFile.index]}
                          alt={lightboxFile.fileName}
                          className="max-w-full max-h-[70vh] object-contain"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      {lightboxFile.content ? 'Text File' : 'Image'} • {lightboxFile.fileType}
                    </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ConversationPage;
