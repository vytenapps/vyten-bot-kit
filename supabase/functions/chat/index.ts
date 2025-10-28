import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Chat function invoked ===");

  try {
    console.log("Step 1: Parsing request body");
    const body = await req.json();
    console.log("Step 2: Body parsed", { 
      hasMessages: !!body.messages, 
      hasConversationId: !!body.conversationId,
      messagesType: typeof body.messages,
      messagesLength: Array.isArray(body.messages) ? body.messages.length : "not array"
    });
    
    const { messages, conversationId, model } = body;

    console.log("Step 3: Extracted values", { conversationId, model, messageCount: messages?.length ?? 0 });

    // Validate input
    console.log("Step 4: Starting validation");
    if (!conversationId) {
      console.error("Validation failed: Missing conversationId");
      return new Response(
        JSON.stringify({ error: "Missing conversationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Validation failed: Invalid messages", { messages });
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    console.log("Step 5: Last message", { 
      hasContent: !!lastUserMessage?.content,
      contentType: typeof lastUserMessage?.content,
      content: lastUserMessage?.content
    });
    
    if (!lastUserMessage?.content || String(lastUserMessage.content).trim() === "") {
      console.error("Validation failed: Empty content");
      return new Response(
        JSON.stringify({ error: "Message content is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Step 6: User authenticated", { userId: user.id });

    // Rate limiting: Check recent requests (20 requests per minute)
    console.log("Step 7: Checking rate limit");
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentEvents, error: rateLimitError } = await supabaseClient
      .from('rate_limit_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('event', 'chat_request')
      .gte('at', oneMinuteAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentEvents && recentEvents.length >= 20) {
      console.log("Rate limit exceeded for user", user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait a moment before sending more messages.',
          retryAfter: 60 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this request for rate limiting (fire-and-forget)
    supabaseClient.from('rate_limit_events').insert({
      user_id: user.id,
      event: 'chat_request'
    }).then(({ error }) => {
      if (error) console.error('Error logging rate limit event:', error);
    });

    console.log("Step 8: Rate limit check passed");

    // Phase 2 Optimization: Parallelize user message save and AI Gateway call
    const saveUserMessagePromise = supabaseClient
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: lastUserMessage.content,
      });

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Provide clear, concise, and accurate responses."
          },
          ...messages
        ],
        stream: true,
      }),
    });

    // Wait for user message to be saved before proceeding with stream
    const { error: userMsgError } = await saveUserMessagePromise;
    if (userMsgError) {
      console.error("Error saving user message:", userMsgError);
      return new Response(
        JSON.stringify({ error: userMsgError.message || "Failed to save user message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Stream the response and collect full content with robust SSE parsing
    console.log("AI Gateway ok, starting stream");
    let fullResponse = "";
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          let streamDone = false;

          while (reader && !streamDone) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process line by line
            let nlIndex: number;
            while ((nlIndex = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nlIndex);
              buffer = buffer.slice(nlIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line === "" || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;

              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                streamDone = true;
                break;
              }

              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
                }
              } catch (e) {
                // Partial JSON - put line back and wait for more data
                buffer = line + "\n" + buffer;
                break;
              }
            }
          }

          // Final flush
          if (buffer.trim()) {
            for (let raw of buffer.split("\n")) {
              if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
              const dataStr = raw.slice(6).trim();
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
                }
              } catch {
                // Ignore leftover partial JSON
              }
            }
          }

          // Phase 3 Optimization: Save assistant message without blocking stream completion
          if (fullResponse && fullResponse.trim().length > 0) {
            console.log("Saving assistant message in background, length:", fullResponse.length);
            // Fire-and-forget - don't await to not block stream completion
            supabaseClient
              .from("messages")
              .insert({
                conversation_id: conversationId,
                user_id: user.id,
                role: "assistant",
                content: fullResponse.trim(),
              })
              .then(({ error }) => {
                if (error) {
                  console.error("Error saving assistant message:", error);
                }
              });
          } else {
            console.error("No assistant response content to save");
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("=== Chat function error ===");
    console.error("Error type:", typeof error);
    console.error("Error:", error);
    console.error("Error stringified:", JSON.stringify(error, null, 2));
    
    let errMsg = "Unknown error";
    if (error && typeof error === "object") {
      // Handle Supabase database errors
      if ("message" in error && error.message) {
        errMsg = String(error.message);
      } else if ("code" in error && "details" in error) {
        const dbErr = error as any;
        errMsg = `Database error ${dbErr.code}: ${dbErr.message || "Unknown"}`;
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
    }
    
    console.error("Final error message:", errMsg);
    
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
