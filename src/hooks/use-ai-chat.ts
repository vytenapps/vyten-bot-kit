import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredModel, setStoredModel } from "@/lib/ai-config";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: {
    name: string;
    type: string;
    size: number;
    preview?: string;
    data?: string;
  }[];
}

type ChatStatus = "ready" | "streaming" | "error";

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [model, setModelState] = useState<string>(getStoredModel());
  const abortControllerRef = useRef<AbortController | null>(null);

  const setModel = useCallback((newModel: string) => {
    setModelState(newModel);
    setStoredModel(newModel);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("ready");
      toast.info("Stopped generating response");
    }
  }, []);

  const loadConversation = useCallback(async (userId: string, conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Map database messages to ChatMessage type
      const mappedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      setMessages(mappedMessages);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    }
  }, []);

  const sendMessage = useCallback(async (content: string, conversationId: string, files?: any[] | null) => {
    if (!content.trim()) return;

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    setStatus("streaming");

    // Process files to create attachment data
    const attachments = files?.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      preview: f.data,
      data: f.data
    })) || [];

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Prepare messages for API
    const apiMessages = [...messages, { role: "user", content: content.trim() }];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      console.debug("[AIChat] POST", { chatUrl, conversationId, model, msgCount: apiMessages.length, hasFiles: !!files });
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          conversationId,
          model,
          files: files || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = "Unknown error";
        let bodyText = "";
        try {
          const data = await response.json();
          errMsg = data?.error || JSON.stringify(data);
        } catch {
          try { bodyText = await response.text(); errMsg = bodyText || errMsg; } catch { /* ignore */ }
        }
        console.error("[AIChat] Function error", { status: response.status, errMsg, bodyText });
        if (response.status === 429 || response.status === 402) {
          toast.error(errMsg);
        } else {
          toast.error(`Chat failed (${response.status}): ${errMsg}`);
        }
        throw new Error(errMsg);
      }

      if (!response.body) {
        console.error("[AIChat] No response body from function");
        throw new Error("No response body");
      }

      // Stream the response with robust SSE parsing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let assistantMessageId = crypto.randomUUID();
      let buffer = "";
      let doneStreaming = false;

      while (!doneStreaming) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIndex: number;
        while ((nlIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIndex);
          buffer = buffer.slice(nlIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line === "" || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;

          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") {
            doneStreaming = true;
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === assistantMessageId) {
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                }
                return [...prev, { id: assistantMessageId, role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            // Partial JSON, prepend back and wait for more
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush for any remaining buffered lines
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":")) continue;
          if (!raw.startsWith("data: ")) continue;
          const dataStr = raw.slice(6).trim();
          if (dataStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === assistantMessageId) {
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                }
                return [...prev, { id: assistantMessageId, role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            // Ignore leftovers
          }
        }
      }

      setStatus("ready");
      abortControllerRef.current = null;
    } catch (error) {
      // Don't show error toast if request was aborted by user
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request aborted by user");
        setStatus("ready");
        return;
      }
      
      console.error("Error sending message:", error);
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      
      // Remove the user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      abortControllerRef.current = null;
    }
  }, [messages, model]);

  return {
    messages,
    status,
    model,
    setModel,
    setMessages,
    sendMessage,
    loadConversation,
    stopStreaming,
  };
};
