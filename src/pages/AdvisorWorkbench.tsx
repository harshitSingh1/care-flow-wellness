import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { CaseReviewCard } from "@/components/CaseReviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Heart, 
  Clock, 
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Filter,
  Calendar,
  User,
  Settings,
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

type FilterStatus = "all" | "pending_review" | "approved" | "flagged" | "modified";
type SortOrder = "newest" | "oldest";

export default function AdvisorWorkbench() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<SubmittedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [dateFilter, setDateFilter] = useState("");

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

  // Apply filters
  const filteredCases = cases
    .filter(c => {
      if (filterStatus === "all") return true;
      return c.status === filterStatus;
    })
    .filter(c => {
      if (!dateFilter) return true;
      const caseDate = new Date(c.created_at).toISOString().split("T")[0];
      return caseDate === dateFilter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const pendingCases = cases.filter(c => c.status === "pending_review");
  const approvedCases = cases.filter(c => c.status === "approved");
  const flaggedCases = cases.filter(c => c.status === "flagged");
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
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-xl">
                <Heart className="w-6 h-6 text-secondary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Wellness Advisor Workbench</h1>
            </div>
            <Link to="/doctor-profile-setup">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Review and verify AI-generated wellness suggestions</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCases.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{approvedCases.length}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{flaggedCases.length}</p>
                <p className="text-xs text-muted-foreground">Flagged</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-secondary/20 to-secondary/10 border-secondary/30">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <MessageSquare className="w-8 h-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{cases.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={filterStatus} onValueChange={(v: FilterStatus) => setFilterStatus(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cases</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                  <SelectItem value="flagged">Flagged/Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(v: SortOrder) => setSortOrder(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1"
                />
                {dateFilter && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDateFilter("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Cases List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-secondary" />
            Cases ({filteredCases.length})
          </h2>
          
          {filteredCases.length > 0 ? (
            <div className="space-y-4">
              {filteredCases.map((caseData) => (
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
              <h3 className="text-lg font-semibold mb-2">
                {filterStatus === "all" ? "No Cases Yet" : "No Matching Cases"}
              </h3>
              <p className="text-muted-foreground">
                {filterStatus === "all" 
                  ? "No wellness cases have been submitted for review yet."
                  : "Try adjusting your filters to see more cases."}
              </p>
            </Card>
          )}
        </motion.div>

        {/* Quick Stats Summary */}
        {completedCases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Recent Activity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedCases.slice(0, 4).map((caseData) => (
                <Card key={caseData.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          caseData.status === "approved" 
                            ? "bg-green-500/10 text-green-600" 
                            : caseData.status === "flagged"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {caseData.status.replace("_", " ")}
                        </span>
                      </div>
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