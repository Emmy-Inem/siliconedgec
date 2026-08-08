import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { GraduationCap, Handshake, User, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HubShell } from "./hubs/HubShell";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Admin-only "all dashboards in one place" view.
 *
 * Each role dashboard is a full-page experience with its own chrome (header,
 * sidebar, footer), so they are embedded as same-origin frames rather than
 * re-mounted inline — that keeps every dashboard pixel-identical to what the
 * role actually sees, with no duplicated layout or data logic.
 */
function DashboardFrame({ title, src }: { title: string; src: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground truncate">
          Live view of <span className="font-mono">{src}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setKey((k) => k + 1)}>
            <RefreshCw className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={src} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Open</span>
            </a>
          </Button>
        </div>
      </div>
      <iframe
        key={key}
        ref={ref}
        src={src}
        title={title}
        className="w-full h-[70vh] min-h-[520px] bg-background"
      />
    </Card>
  );
}

export default function AdminDashboards() {
  const { adminRole } = useAuth();

  // Only full admins get the combined view. Instructors, partners and students
  // continue to reach their own dashboard directly.
  if (adminRole !== "admin") return <Navigate to="/admin" replace />;

  return (
    <HubShell
      title="All Dashboards"
      description="Student, Instructor and Partner dashboards in one place"
      tabs={[
        {
          value: "student",
          label: "Student",
          content: (
            <div className="space-y-3">
              <Note icon={<User className="h-4 w-4" />} text="Exactly what a learner sees: enrolled courses, progress, certificates and mock interviews." />
              <DashboardFrame title="Student dashboard" src="/dashboard" />
            </div>
          ),
        },
        {
          value: "instructor",
          label: "Instructor",
          content: (
            <div className="space-y-3">
              <Note icon={<GraduationCap className="h-4 w-4" />} text="Cohort overview, grading queue, quizzes and Instructor Assist." />
              <DashboardFrame title="Instructor dashboard" src="/instructor" />
            </div>
          ),
        },
        {
          value: "partner",
          label: "Partner",
          content: (
            <div className="space-y-3">
              <Note icon={<Handshake className="h-4 w-4" />} text="Career partner view: referral links, clicks, conversions and payouts." />
              <DashboardFrame title="Partner dashboard" src="/career/dashboard" />
            </div>
          ),
        },
      ]}
    />
  );
}

function Note({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {text}
    </div>
  );
}
