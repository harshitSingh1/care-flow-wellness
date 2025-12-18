import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { messages, messageType } = await req.json();

    // Construct system prompt based on message type
    const systemPrompts = {
      health: `You are a concise health advisor for CareForAll. 

CRITICAL RULES:
1. Keep responses SHORT (max 3-5 bullet points)
2. Be direct and to-the-point
3. DO NOT use markdown formatting (no *, **, #, etc.)
4. Use plain text only with simple dashes (-) for lists
5. Each point should be one clear sentence

Provide:
- Home remedies
- Diet tips  
- When to see a doctor

End with a brief disclaimer that this is general guidance only.`,
      wellness: `You are a concise mental wellness companion for CareForAll.

CRITICAL RULES:
1. Keep responses SHORT (max 3-5 bullet points)
2. Be direct and empathetic
3. DO NOT use markdown formatting (no *, **, #, etc.)
4. Use plain text only with simple dashes (-) for lists
5. Each point should be one clear sentence

Provide:
- Coping strategies
- Quick techniques
- Self-care tips

Be warm but brief.`
    };

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompts[messageType as 'health' | 'wellness'] },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Save messages to database
    const userMessage = messages[messages.length - 1].content;
    
    await supabase.from("chat_messages").insert([
      {
        user_id: user.id,
        message_type: messageType,
        role: "user",
        content: userMessage,
      },
      {
        user_id: user.id,
        message_type: messageType,
        role: "assistant",
        content: assistantMessage,
      },
    ]);

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
