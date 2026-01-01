import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckIn {
  id: string;
  mood: string;
  journal: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

interface PatternAlert {
  alert_type: string;
  message: string;
  severity: string;
  suggested_action?: string;
}

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

    console.log(`Analyzing patterns for user ${user.id}`);

    // Rate limiting check - more lenient for pattern analysis
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      _user_id: user.id,
      _action: 'analyze_patterns',
      _max_requests: 10,
      _window_minutes: 60
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue without rate limiting if check fails
    } else if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for pattern analysis: user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Pattern analysis rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get check-ins from the last 14 days for better pattern analysis
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(100) as { data: CheckIn[] | null };

    // Get recent chat messages for symptom detection
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(100) as { data: ChatMessage[] | null };

    // Get existing alerts to avoid duplicates
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: existingAlerts } = await supabase
      .from("alerts")
      .select("alert_type, message")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    const existingAlertTypes = new Set(existingAlerts?.map(a => `${a.alert_type}:${a.message.substring(0, 50)}`) || []);

    const alerts: PatternAlert[] = [];

    // ============ MOOD PATTERN DETECTION ============
    if (checkIns && checkIns.length >= 3) {
      // Group check-ins by day
      const checkInsByDay = new Map<string, CheckIn[]>();
      checkIns.forEach(checkIn => {
        const day = checkIn.created_at.split('T')[0];
        if (!checkInsByDay.has(day)) {
          checkInsByDay.set(day, []);
        }
        checkInsByDay.get(day)!.push(checkIn);
      });

      // Get the most recent mood per day
      const dailyMoods: { date: string; mood: string }[] = [];
      checkInsByDay.forEach((dayCheckIns, date) => {
        const latestMood = dayCheckIns[0].mood;
        dailyMoods.push({ date, mood: latestMood });
      });

      // Sort by date descending
      dailyMoods.sort((a, b) => b.date.localeCompare(a.date));

      // Pattern 1: Continuous low mood (3+ consecutive days)
      const lowMoods = ['sad', 'anxious', 'stressed', 'overwhelmed'];
      let consecutiveLowDays = 0;
      
      for (const { mood } of dailyMoods) {
        if (lowMoods.includes(mood.toLowerCase())) {
          consecutiveLowDays++;
        } else {
          break;
        }
      }

      if (consecutiveLowDays >= 3) {
        alerts.push({
          alert_type: "wellness_check",
          message: `We've noticed you've been feeling a bit down for ${consecutiveLowDays} days in a row. That's completely okay – everyone goes through tough patches. Taking small steps like a short walk, talking to a friend, or doing something you enjoy might help lift your spirits.`,
          severity: consecutiveLowDays >= 5 ? "medium" : "low",
          suggested_action: "Consider journaling about what's on your mind, or reaching out to someone you trust."
        });
      }

      // Pattern 2: Stress/anxiety spikes (sudden increase)
      const stressMoods = ['stressed', 'anxious', 'overwhelmed', 'angry'];
      const recentStressCount = dailyMoods.slice(0, 5).filter(m => stressMoods.includes(m.mood.toLowerCase())).length;
      const olderStressCount = dailyMoods.slice(5, 10).filter(m => stressMoods.includes(m.mood.toLowerCase())).length;

      if (recentStressCount >= 3 && recentStressCount > olderStressCount + 1) {
        alerts.push({
          alert_type: "stress_pattern",
          message: "It looks like stress levels have been higher than usual lately. This is your body's way of telling you it needs some extra care. Deep breathing, taking breaks, or stepping away from stressors when possible can make a real difference.",
          severity: "medium",
          suggested_action: "Try a 5-minute breathing exercise or a short meditation session."
        });
      }

      // Pattern 3: Mood volatility (frequent mood swings)
      if (dailyMoods.length >= 5) {
        let moodChanges = 0;
        for (let i = 1; i < Math.min(7, dailyMoods.length); i++) {
          if (dailyMoods[i].mood !== dailyMoods[i - 1].mood) {
            moodChanges++;
          }
        }
        if (moodChanges >= 5) {
          alerts.push({
            alert_type: "mood_variability",
            message: "Your moods seem to be changing quite a bit lately. This can sometimes happen during stressful periods or life transitions. Keeping a regular routine with consistent sleep and meal times might help bring some stability.",
            severity: "low",
            suggested_action: "Consider establishing a calming evening routine."
          });
        }
      }
    }

    // ============ SYMPTOM PATTERN DETECTION ============
    if (messages && messages.length > 0) {
      const symptomCategories = {
        headache: { keywords: ['headache', 'migraine', 'head pain', 'head hurts'], count: 0, dates: new Set<string>() },
        fatigue: { keywords: ['tired', 'fatigue', 'exhausted', 'no energy', 'drained', 'worn out'], count: 0, dates: new Set<string>() },
        sleep: { keywords: ['sleep', 'insomnia', 'can\'t sleep', 'trouble sleeping', 'waking up', 'sleepless'], count: 0, dates: new Set<string>() },
        digestive: { keywords: ['stomach', 'nausea', 'digestion', 'bloating', 'appetite'], count: 0, dates: new Set<string>() },
        pain: { keywords: ['pain', 'ache', 'sore', 'hurts', 'discomfort'], count: 0, dates: new Set<string>() },
        anxiety: { keywords: ['anxious', 'anxiety', 'worried', 'panic', 'nervous', 'racing thoughts'], count: 0, dates: new Set<string>() },
      };

      messages.forEach(msg => {
        const content = msg.content.toLowerCase();
        const date = msg.created_at.split('T')[0];
        
        Object.entries(symptomCategories).forEach(([_, category]) => {
          if (category.keywords.some(kw => content.includes(kw))) {
            category.count++;
            category.dates.add(date);
          }
        });
      });

      // Repeated headaches
      if (symptomCategories.headache.dates.size >= 3) {
        alerts.push({
          alert_type: "recurring_symptom",
          message: "You've mentioned headaches on several different days. While occasional headaches are common, recurring ones might be worth discussing with a healthcare provider to rule out any underlying causes and find relief.",
          severity: "medium",
          suggested_action: "Consider keeping a headache diary and consulting a healthcare professional."
        });
      }

      // Sleep issues
      if (symptomCategories.sleep.dates.size >= 3) {
        alerts.push({
          alert_type: "sleep_pattern",
          message: "Sleep seems to be on your mind lately. Good rest is so important for how we feel. Small changes like limiting screen time before bed, keeping a consistent schedule, or creating a relaxing bedtime routine might help improve your sleep quality.",
          severity: "low",
          suggested_action: "Try reducing caffeine after noon and dimming lights an hour before bed."
        });
      }

      // Chronic fatigue pattern
      if (symptomCategories.fatigue.dates.size >= 4) {
        alerts.push({
          alert_type: "energy_pattern",
          message: "Feeling tired often can be frustrating. While there are many everyday causes like sleep, diet, or stress, persistent fatigue is something a doctor can help investigate. You deserve to feel your best!",
          severity: "medium",
          suggested_action: "Consider consulting a healthcare professional if fatigue persists."
        });
      }

      // Anxiety mentions
      if (symptomCategories.anxiety.dates.size >= 3) {
        alerts.push({
          alert_type: "mental_wellness",
          message: "Managing anxious feelings can be challenging, but you're not alone. Many people experience this, and there are wonderful tools and support available. Breathing exercises, gentle movement, and talking to someone you trust can all help.",
          severity: "medium",
          suggested_action: "Consider speaking with a mental wellness professional for personalized support."
        });
      }
    }

    // ============ LIFESTYLE INDICATOR DETECTION ============
    if (checkIns && checkIns.length >= 5) {
      // Analyze journal entries for lifestyle patterns
      const journalEntries = checkIns
        .filter(c => c.journal)
        .map(c => c.journal!.toLowerCase());

      const lifestylePatterns = {
        poor_diet: ['junk food', 'skipped meals', 'didn\'t eat', 'fast food', 'unhealthy', 'no appetite'],
        lack_of_exercise: ['no exercise', 'sedentary', 'didn\'t move', 'no activity', 'sat all day'],
        social_isolation: ['alone', 'lonely', 'isolated', 'no one', 'by myself', 'didn\'t see anyone'],
        work_stress: ['overwork', 'deadline', 'too much work', 'burnout', 'exhausted from work'],
      };

      const patternCounts: Record<string, number> = {};
      
      journalEntries.forEach(entry => {
        Object.entries(lifestylePatterns).forEach(([pattern, keywords]) => {
          if (keywords.some(kw => entry.includes(kw))) {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
          }
        });
      });

      if (patternCounts.social_isolation >= 3) {
        alerts.push({
          alert_type: "social_wellness",
          message: "Spending time alone can be restorative, but we've noticed you've mentioned feeling isolated a few times. Human connection is important for our wellbeing. Even a quick call with a friend or joining an online community can make a difference.",
          severity: "low",
          suggested_action: "Try reaching out to a friend or family member today."
        });
      }

      if (patternCounts.work_stress >= 3) {
        alerts.push({
          alert_type: "work_life_balance",
          message: "Work has been intense lately. Remember, taking breaks isn't just okay – it's necessary for doing your best work. Your wellbeing matters more than any deadline.",
          severity: "medium",
          suggested_action: "Consider setting boundaries around work hours and taking regular breaks."
        });
      }
    }

    // ============ INACTIVITY DETECTION ============
    if (checkIns) {
      const daysSinceLastCheckIn = checkIns.length > 0
        ? Math.floor((Date.now() - new Date(checkIns[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastCheckIn >= 5 && daysSinceLastCheckIn < 14) {
        alerts.push({
          alert_type: "check_in_reminder",
          message: `It's been ${daysSinceLastCheckIn} days since your last check-in. Regular check-ins help us understand how you're doing and provide better support. We'd love to hear from you when you have a moment!`,
          severity: "low",
          suggested_action: "Take a moment to log how you're feeling today."
        });
      }
    }

    // Filter out duplicate alerts and save new ones
    const newAlerts = alerts.filter(alert => {
      const key = `${alert.alert_type}:${alert.message.substring(0, 50)}`;
      return !existingAlertTypes.has(key);
    });

    if (newAlerts.length > 0) {
      const alertsToInsert = newAlerts.map(alert => ({
        alert_type: alert.alert_type,
        message: alert.suggested_action 
          ? `${alert.message}\n\n💡 Suggestion: ${alert.suggested_action}`
          : alert.message,
        severity: alert.severity,
        user_id: user.id,
      }));

      await supabase.from("alerts").insert(alertsToInsert);
    }

    console.log(`Pattern analysis complete: ${newAlerts.length} new alerts generated`);

    return new Response(
      JSON.stringify({ 
        alertsGenerated: newAlerts.length,
        patterns: {
          moodTrend: checkIns && checkIns.length > 0 ? 'analyzed' : 'insufficient_data',
          symptomPatterns: messages && messages.length > 0 ? 'analyzed' : 'insufficient_data',
          lifestyleIndicators: checkIns && checkIns.length >= 5 ? 'analyzed' : 'insufficient_data',
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
