import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Edit3,
  AlertTriangle,
  Flag,
  User,
  Clock,
  X,
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

interface CaseReviewCardProps {
  caseData: SubmittedCase;
  onUpdate: () => void;
  roleLabel: string;
}

export function CaseReviewCard({ caseData, onUpdate, roleLabel }: CaseReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (newStatus: string) => {
    if ((newStatus === "modified" || newStatus === "flagged") && !notes.trim()) {
      toast.error("Please add notes explaining your changes or concerns");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("submitted_cases")
        .update({
          status: newStatus,
          reviewer_id: user?.id,
          reviewer_notes: notes.trim() || `${roleLabel} ${newStatus} this case.`,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", caseData.id);

      if (error) throw error;

      toast.success(`Case ${newStatus} successfully`);
      setIsExpanded(false);
      setNotes("");
      onUpdate();
    } catch (error) {
      console.error("Error updating case:", error);
      toast.error("Failed to update case");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Approved</Badge>;
      case "modified":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Modified</Badge>;
      case "flagged":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Flagged</Badge>;
      case "in_review":
        return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">In Review</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Case ID: {caseData.id.slice(0, 8)}...
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(caseData.status)}
            <Badge variant="outline" className="capitalize">
              {caseData.category}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock className="w-3 h-3" />
          {new Date(caseData.created_at).toLocaleString()}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">User's Issue</h4>
            <p className="text-foreground bg-muted/50 p-3 rounded-lg text-sm">{caseData.user_issue}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">AI Suggestion</h4>
            <p className="text-foreground bg-primary/5 border border-primary/20 p-3 rounded-lg text-sm whitespace-pre-wrap">
              {caseData.ai_response}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">User-Selected Solution(s)</h4>
            <ul className="space-y-1">
              {caseData.selected_remedies.map((remedy, idx) => (
                <li 
                  key={idx} 
                  className="bg-secondary/10 border border-secondary/30 p-2 rounded-lg text-sm flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <span>{remedy}</span>
                </li>
              ))}
            </ul>
          </div>

          {isExpanded ? (
            <div className="space-y-3 pt-2 border-t border-border">
              <Textarea
                placeholder={`Add your professional notes, modifications, or warnings...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleAction("approved")}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleAction("modified")}
                  disabled={submitting}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-500/10"
                  size="sm"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Modify
                </Button>
                <Button
                  onClick={() => handleAction("flagged")}
                  disabled={submitting}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-500/10"
                  size="sm"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Flag Critical
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsExpanded(false);
                    setNotes("");
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsExpanded(true)}
              className="w-full"
              variant="outline"
            >
              Review This Case
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}