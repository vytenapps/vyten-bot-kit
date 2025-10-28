import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getChatEndpoint, MODEL_PREFERENCE_KEY, DEFAULT_AI_MODEL } from "@/lib/ai-config";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export const useAIChat = (conversationId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [model, setModel] = useState<string>(() => {
    return localStorage.getItem(MODEL_PREFERENCE_KEY) || DEFAULT_AI_MODEL;
  });

  // Save model preference to localStorage when it changes
  const updateModel = useCallback((newModel: string) => {
    setModel(newModel);
    localStorage.setItem(MODEL_PREFERENCE_KEY, newModel);
  }, []);

  /**
   * Stream chat response from Lovable Cloud AI
   * Implements proper SSE parsing with line buffering
   */
  const streamChat = useCallback(async (userMessage: string): Promise<void> => {
    const CHAT_URL = getChatEndpoint();

    console.log("Calling chat edge function:", {
      url: CHAT_URL,
      conversationId,
      model,
      messageLength: userMessage.length
    });

    // Get current session for authentication
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !currentSession) {
      console.error("Failed to get session:", sessionError);
      throw new Error("Authentication required. Please sign in again.");
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({ 
        conversationId,
        message: userMessage,
        model 
      }),
    });

    console.log("Chat response status:", resp.status);

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
      console.error("Chat error:", {
        status: resp.status,
        error: errorData
      });
      
      if (resp.status === 401) {
        throw new Error("Authentication failed. Please refresh and try again.");
      } else if (resp.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      } else if (resp.status === 402) {
        throw new Error("AI service payment required. Check your workspace credits.");
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

    // Process SSE stream with proper line buffering
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
            // Update message content token-by-token
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: assistantContent } : m
              )
            );
          }
        } catch (e) {
          console.warn("Failed to parse SSE chunk:", e);
          // Put line back for next iteration (incomplete JSON)
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    console.log("AI stream completed successfully");
  }, [conversationId, model]);

  /**
   * Send a message and stream the AI response
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const userMessage = content.trim();
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
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    }
  }, [streamChat]);

  /**
   * Load conversation from database
   */
  const loadConversation = useCallback(async (userId: string, chatId: string) => {
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
  }, []);

  return {
    messages,
    status,
    model,
    setModel: updateModel,
    setMessages,
    sendMessage,
    loadConversation,
  };
};
