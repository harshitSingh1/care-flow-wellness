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

    // Get recent check-ins (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    // Get recent chat messages for health keyword detection
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", sevenDaysAgo.toISOString());

    const alerts: Array<{
      alert_type: string;
      message: string;
      severity: string;
    }> = [];

    // Pattern 1: Mood patterns
    if (checkIns && checkIns.length >= 3) {
      const recentMoods = checkIns.slice(0, 5).map(c => c.mood);
      const sadCount = recentMoods.filter(m => m === 'sad').length;
      const angryCount = recentMoods.filter(m => m === 'angry').length;

      if (sadCount >= 3) {
        alerts.push({
          alert_type: "mood",
          message: "You've been feeling sad for several days. Consider reaching out to a mental health professional for support.",
          severity: "warning",
        });
      }

      if (angryCount >= 3) {
        alerts.push({
          alert_type: "stress",
          message: "High stress detected over multiple days. Try stress-reduction techniques or speak with a counselor.",
          severity: "warning",
        });
      }
    }

    // Pattern 2: Health keyword detection
    if (messages && messages.length > 0) {
      const healthKeywords = {
        headache: 0,
        pain: 0,
        tired: 0,
        sleep: 0,
      };

      messages.forEach(msg => {
        const content = msg.content.toLowerCase();
        if (content.includes('headache')) healthKeywords.headache++;
        if (content.includes('pain')) healthKeywords.pain++;
        if (content.includes('tired') || content.includes('fatigue')) healthKeywords.tired++;
        if (content.includes('sleep') || content.includes('insomnia')) healthKeywords.sleep++;
      });

      if (healthKeywords.headache >= 3) {
        alerts.push({
          alert_type: "health",
          message: "Recurring headaches detected. Consider consulting with a healthcare provider.",
          severity: "warning",
        });
      }

      if (healthKeywords.sleep >= 3) {
        alerts.push({
          alert_type: "health",
          message: "Sleep issues detected over multiple conversations. Good sleep hygiene is crucial for overall health.",
          severity: "info",
        });
      }
    }

    // Save new alerts
    if (alerts.length > 0) {
      const alertsToInsert = alerts.map(alert => ({
        ...alert,
        user_id: user.id,
      }));

      await supabase.from("alerts").insert(alertsToInsert);
    }

    return new Response(
      JSON.stringify({ 
        alertsGenerated: alerts.length,
        patterns: {
          moodTrend: checkIns && checkIns.length > 0 ? 'analyzed' : 'insufficient_data',
          healthKeywords: messages && messages.length > 0 ? 'analyzed' : 'insufficient_data',
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-patterns function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
