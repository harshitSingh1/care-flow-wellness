import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Brain, 
  Activity,
  Calendar,
  AlertTriangle,
  Smile,
  Meh,
  Frown
} from "lucide-react";

interface CheckIn {
  id: string;
  mood: string;
  journal: string | null;
  created_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

const moodIcons: Record<string, React.ReactNode> = {
  happy: <Smile className="w-5 h-5 text-green-500" />,
  calm: <Smile className="w-5 h-5 text-blue-500" />,
  neutral: <Meh className="w-5 h-5 text-yellow-500" />,
  anxious: <Frown className="w-5 h-5 text-orange-500" />,
  sad: <Frown className="w-5 h-5 text-red-500" />,
};

const moodScores: Record<string, number> = {
  happy: 100,
  calm: 80,
  neutral: 60,
  anxious: 40,
  sad: 20,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      loadData();
    };
    checkAuth();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [checkInsRes, alertsRes] = await Promise.all([
        supabase.from("check_ins").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      if (checkInsRes.data) setCheckIns(checkInsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMoodTrend = () => {
    if (checkIns.length < 2) return { trend: "neutral", change: 0 };
    
    const recent = checkIns.slice(0, 7);
    const older = checkIns.slice(7, 14);
    
    const recentAvg = recent.reduce((sum, c) => sum + (moodScores[c.mood] || 50), 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, c) => sum + (moodScores[c.mood] || 50), 0) / older.length 
      : recentAvg;
    
    const change = Math.round(recentAvg - olderAvg);
    return {
      trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      change: Math.abs(change),
      average: Math.round(recentAvg),
    };
  };

  const getMoodDistribution = () => {
    const distribution: Record<string, number> = {};
    checkIns.forEach(c => {
      distribution[c.mood] = (distribution[c.mood] || 0) + 1;
    });
    return distribution;
  };

  const getStreakDays = () => {
    if (checkIns.length === 0) return 0;
    
    let streak = 1;
    const today = new Date();
    const lastCheckIn = new Date(checkIns[0].created_at);
    
    // Check if last check-in was today or yesterday
    const diffDays = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 0;
    
    for (let i = 1; i < checkIns.length; i++) {
      const current = new Date(checkIns[i - 1].created_at);
      const prev = new Date(checkIns[i].created_at);
      const diff = Math.floor((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff <= 1) streak++;
      else break;
    }
    
    return streak;
  };

  const moodTrend = calculateMoodTrend();
  const moodDistribution = getMoodDistribution();
  const streakDays = getStreakDays();
  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Wellness Dashboard</h1>
          <p className="text-muted-foreground">Track your emotional and health patterns</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Wellness Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">{moodTrend.average || 0}%</span>
                  {moodTrend.trend === "up" ? (
                    <TrendingUp className="w-5 h-5 text-green-500 mb-1" />
                  ) : moodTrend.trend === "down" ? (
                    <TrendingDown className="w-5 h-5 text-red-500 mb-1" />
                  ) : null}
                </div>
                <Progress value={moodTrend.average || 0} className="mt-2" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Check-in Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">{streakDays}</span>
                  <span className="text-muted-foreground mb-1">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Keep it up! Consistency matters.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-accent/30 to-accent/10 border-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Total Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">{checkIns.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Building self-awareness</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className={`bg-gradient-to-br ${unreadAlerts > 0 ? 'from-destructive/20 to-destructive/5 border-destructive/30' : 'from-muted to-muted/50 border-muted'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">{unreadAlerts}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {unreadAlerts > 0 ? "Needs attention" : "All clear!"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Mood Distribution & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Mood Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(moodDistribution).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(moodDistribution).map(([mood, count]) => (
                      <div key={mood} className="flex items-center gap-3">
                        {moodIcons[mood] || <Meh className="w-5 h-5" />}
                        <span className="capitalize w-20 text-sm">{mood}</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div 
                            className="bg-primary rounded-full h-3 transition-all"
                            style={{ width: `${(count / checkIns.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {Math.round((count / checkIns.length) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Start checking in to see your mood patterns
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Recent Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checkIns.length > 0 ? (
                  <div className="space-y-3">
                    {checkIns.slice(0, 5).map((checkIn) => (
                      <div key={checkIn.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        {moodIcons[checkIn.mood] || <Meh className="w-5 h-5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium text-sm">{checkIn.mood}</span>
                            <Badge variant="outline" className="text-xs">
                              {new Date(checkIn.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                          {checkIn.journal && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {checkIn.journal}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No check-ins yet. Start your wellness journey today!
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alerts Preview */}
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'high' 
                          ? 'bg-destructive/10 border-destructive/30' 
                          : alert.severity === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-muted border-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'} className="mb-2">
                            {alert.alert_type}
                          </Badge>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}