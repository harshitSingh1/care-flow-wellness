import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { CaseReviewCard } from "@/components/CaseReviewCard";
import { toast } from "sonner";
import { 
  Heart, 
  Clock, 
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

interface SubmittedCase {
  id: string;
  user_id: string;
  message_id: string;
  user_issue: string;
  ai_response: string;
  selected_remedies: string[];
  category: string;
  status: string;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function AdvisorWorkbench() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<SubmittedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdvisor, setIsAdvisor] = useState(false);

  useEffect(() => {
    checkAdvisorAccess();
  }, []);

  const checkAdvisorAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAccess = roles?.some(r => r.role === "advisor" || r.role === "admin");
    
    if (!hasAccess) {
      toast.error("Access denied. Advisor credentials required.");
      navigate("/");
      return;
    }

    setIsAdvisor(true);
    loadCases();
  };

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from("submitted_cases")
        .select("*")
        .eq("category", "wellness")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error loading cases:", error);
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const pendingCases = cases.filter(c => c.status === "pending_review");
  const completedCases = cases.filter(c => c.status !== "pending_review");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading workbench...</div>
      </div>
    );
  }

  if (!isAdvisor) {
    return null;
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary/20 rounded-xl">
              <Heart className="w-6 h-6 text-secondary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Wellness Advisor Workbench</h1>
          </div>
          <p className="text-muted-foreground">Review and verify AI-generated wellness suggestions</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <Clock className="w-10 h-10 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCases.length}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedCases.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-secondary/20 to-secondary/10 border-secondary/30">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <MessageSquare className="w-10 h-10 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{cases.length}</p>
                <p className="text-sm text-muted-foreground">Total Cases</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Reviews
          </h2>
          
          {pendingCases.length > 0 ? (
            <div className="space-y-4">
              {pendingCases.map((caseData) => (
                <CaseReviewCard
                  key={caseData.id}
                  caseData={caseData}
                  onUpdate={loadCases}
                  roleLabel="Advisor"
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No pending wellness cases to review.</p>
            </Card>
          )}
        </motion.div>

        {/* Completed Cases */}
        {completedCases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Completed Reviews
            </h2>
            <div className="space-y-3">
              {completedCases.slice(0, 5).map((caseData) => (
                <Card key={caseData.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{caseData.user_issue}</p>
                      {caseData.reviewer_notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Notes: {caseData.reviewer_notes}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(caseData.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}