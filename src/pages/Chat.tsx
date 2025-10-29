import { useState, useEffect, type FormEventHandler } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { AI_MODELS } from "@/lib/ai-config";
import { useAIChat } from "@/hooks/use-ai-chat";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { NotificationMenu } from "@/components/NotificationMenu";
import { Separator } from "@/components/ui/separator";
import { ChatInputBox } from "@/components/chat/ChatInputBox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Suggestions, Suggestion } from "@/components/ui/shadcn-io/ai/suggestion";

const Chat = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxFile, setLightboxFile] = useState<{ file: File; index: number; content?: string; preview?: string } | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { model, setModel, status } = useAIChat();

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

      // Prepare files parameter for URL
      let filesParam = "";
      if (attachedFiles.length > 0) {
        const filesData = await Promise.all(
          attachedFiles.map(async (file) => {
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
        filesParam = `&files=${encodeURIComponent(JSON.stringify(filesData))}`;
      }

      // Navigate to conversation page with message, model, and files
      navigate(`/c/${conversation.id}?message=${encodeURIComponent(text)}&model=${model}${filesParam}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      setLightboxFile({ file, index, content });
    } else if (isImage) {
      setLightboxFile({ file, index });
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
          <div className="ml-auto flex items-center gap-2">
            <NotificationMenu />
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
              <ChatInputBox
                text={text}
                onTextChange={setText}
                model={model}
                onModelChange={setModel}
                status={status}
                onSubmit={handleSubmit}
                attachedFiles={attachedFiles}
                filePreviews={filePreviews}
                onFilesSelected={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                onFileClick={handleFileClick}
                hoveredIndex={hoveredIndex}
                onMouseEnter={setHoveredIndex}
                onMouseLeave={() => setHoveredIndex(null)}
                placeholder="Type your message..."
              />
              <p className="text-xs text-center text-muted-foreground mt-2 mb-2">
                AI Chatbot can make mistakes. Check important info.
              </p>
            </div>

            {/* Lightbox Dialog */}
            <Dialog open={!!lightboxFile} onOpenChange={() => setLightboxFile(null)}>
              <DialogContent className="max-w-4xl">
                {lightboxFile && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-sm font-normal flex items-center justify-between">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="truncate font-medium">{lightboxFile.file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {lightboxFile.file.type.split('/')[1]?.toUpperCase() || 'FILE'}
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
                      onClick={() => handleDownload(lightboxFile.file)}
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
                    alt={lightboxFile.file.name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              )}
                    <p className="text-xs text-muted-foreground text-center">
                      {lightboxFile.content ? 'Text File' : 'Image'} • {(lightboxFile.file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Chat;
