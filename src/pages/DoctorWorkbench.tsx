import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Stethoscope, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  MessageSquare,
  User
} from "lucide-react";

interface DoctorReview {
  id: string;
  user_id: string;
  problem: string;
  ai_suggestion: string;
  doctor_reply: string | null;
  status: string;
  created_at: string;
}

export default function DoctorWorkbench() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [selectedReview, setSelectedReview] = useState<DoctorReview | null>(null);
  const [doctorReply, setDoctorReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkDoctorAccess();
  }, []);

  const checkDoctorAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/doctor-login");
      return;
    }

    // Check if user has doctor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasDocRole = roles?.some(r => r.role === "doctor" || r.role === "admin");
    
    if (!hasDocRole) {
      toast.error("Access denied. Doctor credentials required.");
      navigate("/");
      return;
    }

    setIsDoctor(true);
    loadReviews();
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("doctor_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (reviewId: string, status: "approved" | "refined" | "warned") => {
    if (!doctorReply.trim() && status !== "approved") {
      toast.error("Please provide feedback for this action");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("doctor_reviews")
        .update({
          status,
          doctor_reply: doctorReply.trim() || `AI suggestion ${status} by doctor.`,
        })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success(`Case ${status} successfully`);
      setSelectedReview(null);
      setDoctorReply("");
      loadReviews();
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error("Failed to update review");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Approved</Badge>;
      case "refined":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Refined</Badge>;
      case "warned":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Warned</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending</Badge>;
    }
  };

  const pendingReviews = reviews.filter(r => r.status === "pending");
  const completedReviews = reviews.filter(r => r.status !== "pending");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading workbench...</div>
      </div>
    );
  }

  if (!isDoctor) {
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
            <div className="p-2 bg-primary/10 rounded-xl">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Doctor Workbench</h1>
          </div>
          <p className="text-muted-foreground">Review and verify AI-generated health suggestions</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <Clock className="w-10 h-10 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingReviews.length}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedReviews.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <MessageSquare className="w-10 h-10 text-primary" />
              <div>
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-sm text-muted-foreground">Total Cases</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Reviews */}
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
          
          {pendingReviews.length > 0 ? (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleString()}
                        </span>
                      </div>
                      {getStatusBadge(review.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Patient's Problem</h4>
                        <p className="text-foreground bg-muted/50 p-3 rounded-lg">{review.problem}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">AI Suggestion</h4>
                        <p className="text-foreground bg-primary/5 border border-primary/20 p-3 rounded-lg">{review.ai_suggestion}</p>
                      </div>

                      {selectedReview?.id === review.id ? (
                        <div className="space-y-3 pt-2 border-t">
                          <Textarea
                            placeholder="Add your professional feedback, corrections, or warnings..."
                            value={doctorReply}
                            onChange={(e) => setDoctorReply(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleReviewAction(review.id, "approved")}
                              disabled={submitting}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReviewAction(review.id, "refined")}
                              disabled={submitting}
                              variant="outline"
                              className="border-blue-500 text-blue-600 hover:bg-blue-500/10"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Refine
                            </Button>
                            <Button
                              onClick={() => handleReviewAction(review.id, "warned")}
                              disabled={submitting}
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-500/10"
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Warn
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setSelectedReview(null);
                                setDoctorReply("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setSelectedReview(review)}
                          className="w-full"
                        >
                          Review This Case
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No pending reviews at the moment.</p>
            </Card>
          )}
        </motion.div>

        {/* Completed Reviews */}
        {completedReviews.length > 0 && (
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
              {completedReviews.slice(0, 5).map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{review.problem}</p>
                      {review.doctor_reply && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Your reply: {review.doctor_reply}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(review.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
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
