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

    // Construct system prompt to return structured JSON
    const systemPrompts = {
      health: `You are a health advisor for CareForAll. You MUST respond with a valid JSON object in this exact format:

{
  "summary": "A brief 1-2 sentence summary of the health concern and general advice",
  "remedies": [
    "First specific remedy or solution",
    "Second remedy or solution",
    "Third remedy or solution"
  ],
  "precautions": "Important precautions to keep in mind (1-2 sentences)",
  "consultDoctor": "When the user should see a doctor (1-2 sentences)"
}

Rules:
- Keep each remedy to ONE clear sentence
- Provide 3-5 remedies maximum
- Be practical and actionable
- Include home remedies and lifestyle tips
- ONLY output the JSON object, nothing else`,
      wellness: `You are a mental wellness companion for CareForAll. You MUST respond with a valid JSON object in this exact format:

{
  "summary": "A brief empathetic 1-2 sentence acknowledgment and overview",
  "remedies": [
    "First coping strategy or technique",
    "Second coping strategy",
    "Third technique"
  ],
  "precautions": "Important self-care reminders (1-2 sentences)",
  "consultDoctor": "When professional help may be beneficial (1-2 sentences)"
}

Rules:
- Keep each strategy to ONE clear sentence
- Provide 3-5 strategies maximum
- Be warm and supportive
- Include practical techniques they can try now
- ONLY output the JSON object, nothing else`
    };

    // Call Lovable AI with tool calling for structured output
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
        tools: [
          {
            type: "function",
            function: {
              name: "provide_health_guidance",
              description: "Provide structured health guidance with summary, remedies, precautions, and when to consult a doctor",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief 1-2 sentence summary" },
                  remedies: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List of 3-5 specific remedies or solutions"
                  },
                  precautions: { type: "string", description: "Important precautions" },
                  consultDoctor: { type: "string", description: "When to see a doctor" }
                },
                required: ["summary", "remedies", "precautions", "consultDoctor"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_health_guidance" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));
    
    let structuredResponse;
    
    // Check if response has tool calls
    if (aiData.choices[0].message.tool_calls) {
      const toolCall = aiData.choices[0].message.tool_calls[0];
      structuredResponse = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse content as JSON
      const content = aiData.choices[0].message.content;
      try {
        structuredResponse = JSON.parse(content);
      } catch {
        // If parsing fails, create a simple structured response
        structuredResponse = {
          summary: content,
          remedies: [],
          precautions: "Please consult a healthcare provider for personalized advice.",
          consultDoctor: "If symptoms persist or worsen, please see a doctor."
        };
      }
    }

    // Save messages to database (store structured response as JSON string)
    const userMessage = messages[messages.length - 1].content;
    const assistantContent = JSON.stringify(structuredResponse);
    
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
        content: assistantContent,
      },
    ]);

    return new Response(JSON.stringify({ message: assistantContent, structured: structuredResponse }), {
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