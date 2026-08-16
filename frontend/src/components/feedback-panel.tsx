"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import type { Feedback } from "@/lib/types";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/priority-badge";
import { Skeleton } from "@/components/ui/skeleton";

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score} / 5</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function FeedbackPanel({ incidentId }: { incidentId: number }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const data = await api.getFeedback(incidentId);
        if (!cancelled) {
          setFeedback(data);
          setLoading(false);
        }
      } catch {
        attempts += 1;
        if (attempts > 10) {
          if (!cancelled) {
            setError("Feedback isn't available yet. It's generated automatically when an incident is resolved.");
            setLoading(false);
          }
          return;
        }
        setTimeout(poll, 1500);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coaching Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error || !feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coaching Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Coaching Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-4 rounded-md border bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Your priority</p>
            <PriorityBadge priority={feedback.assigned_priority} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">True priority</p>
            <PriorityBadge priority={feedback.true_priority} />
          </div>
          <div className="flex flex-col justify-center">
            {feedback.prioritization_correct ? (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Correct
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" /> Mismatch
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <ScoreBar label="Clarity" score={feedback.clarity_score} />
          <ScoreBar label="Empathy" score={feedback.empathy_score} />
          <ScoreBar label="Technical accuracy" score={feedback.technical_accuracy_score} />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Coach&rsquo;s notes</p>
          <p className="text-sm leading-relaxed">{feedback.notes}</p>
        </div>
      </CardContent>
    </Card>
  );
}
