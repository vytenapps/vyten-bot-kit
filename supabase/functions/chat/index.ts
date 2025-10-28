import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Lovable Cloud AI Chat Edge Function
 * 
 * Implements streaming chat using Lovable AI Gateway with:
 * - JWT authentication
 * - Rate limiting (20 requests per minute)
 * - Conversation history management
 * - Proper SSE streaming with line buffering
 * - Message persistence to database
 * 
 * Follows Lovable AI best practices:
 * - Uses agent-centric approach (complete conversation history)
 * - Proper error handling for 429/402 rate limits
 * - Server-side system prompt management
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header on request");
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing Supabase env vars in function context", {
        hasUrl: !!SUPABASE_URL,
        hasAnon: !!SUPABASE_ANON_KEY,
      });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY } } }
    );

    // Extract raw JWT (removing the Bearer prefix if present) and validate it
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Auth.getUser failed", { hasUser: !!user, userError });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, message, system, model } = await req.json();

    // Rate limiting check
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentRequests, error: rateLimitError } = await supabaseClient
      .from("rate_limit_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("event", "chat_request")
      .gte("at", oneMinuteAgo);

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (recentRequests && recentRequests.length >= 20) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        }
      );
    }

    // Log rate limit event
    await supabaseClient.from("rate_limit_events").insert({
      user_id: user.id,
      event: "chat_request",
    });

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const { data: newConv, error: convError } = await supabaseClient
        .from("conversations")
        .insert({
          user_id: user.id,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .select()
        .single();

      if (convError) throw convError;
      currentConversationId = newConv.id;
    }

    // Insert user message
    const { error: userMsgError } = await supabaseClient
      .from("messages")
      .insert({
        conversation_id: currentConversationId,
        user_id: user.id,
        role: "user",
        content: message,
      });

    if (userMsgError) throw userMsgError;

    // Get conversation history (last 10 messages for context)
    const { data: history, error: historyError } = await supabaseClient
      .from("messages")
      .select("role, content")
      .eq("conversation_id", currentConversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (historyError) throw historyError;

    // Build complete conversation context (agent-centric approach)
    const messages = [
      { role: "system", content: system || "You are a helpful AI assistant. Keep answers clear and concise." },
      ...(history || []).reverse(),
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Call Lovable AI Gateway with streaming enabled
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "openai/gpt-5-mini",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required. Please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream response with proper SSE line buffering
    // Critical: Buffer incomplete lines across chunks to prevent data loss
    let fullResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        let lineBuffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            lineBuffer += chunk;

            // Process complete lines only
            let newlineIndex: number;
            while ((newlineIndex = lineBuffer.indexOf("\n")) !== -1) {
              let line = lineBuffer.slice(0, newlineIndex);
              lineBuffer = lineBuffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.startsWith(":") || line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  console.log("Received content token:", JSON.stringify(content));
                  fullResponse += content;
                  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
                console.warn("Failed to parse SSE chunk:", e);
              }
            }
          }

          // Process any remaining buffered line
          if (lineBuffer.trim() && lineBuffer.startsWith("data: ")) {
            const data = lineBuffer.slice(6).trim();
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                }
              } catch (e) {
                console.warn("Failed to parse final buffered chunk:", e);
              }
            }
          }

          // Save assistant message to database
          console.log("Saving assistant message to database, length:", fullResponse.length);
          console.log("Full response preview:", fullResponse.substring(0, 200));
          await supabaseClient.from("messages").insert({
            conversation_id: currentConversationId,
            user_id: user.id,
            role: "assistant",
            content: fullResponse,
            tokens: fullResponse.split(/\s+/).length,
          });

          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          console.error("Streaming error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": currentConversationId,
      },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
