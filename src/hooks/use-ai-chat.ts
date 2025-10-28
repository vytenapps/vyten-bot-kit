import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredModel, setStoredModel } from "@/lib/ai-config";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ChatStatus = "ready" | "streaming" | "error";

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [model, setModelState] = useState<string>(getStoredModel());

  const setModel = useCallback((newModel: string) => {
    setModelState(newModel);
    setStoredModel(newModel);
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

  const sendMessage = useCallback(async (content: string, conversationId: string) => {
    if (!content.trim()) return;

    setStatus("streaming");

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Prepare messages for API
    const apiMessages = [...messages, { role: "user", content: content.trim() }];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            conversationId,
            model,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get AI response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let assistantMessageId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantContent += content;
                
                // Update or add assistant message
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === "assistant" && lastMsg.id === assistantMessageId) {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, content: assistantContent }
                    ];
                  }
                  return [
                    ...prev,
                    { id: assistantMessageId, role: "assistant", content: assistantContent }
                  ];
                });
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }

      setStatus("ready");
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      
      // Remove the user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
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
  };
};
