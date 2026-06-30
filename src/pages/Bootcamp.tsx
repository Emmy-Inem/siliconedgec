import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ExternalLink, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const db = supabase as any;

type Enrollment = {
  id: string;
  cohort_id: string;
  email: string;
  full_name: string;
  total_amount: number;
  installment_amount: number;
  installments_paid: number;
  total_installments: number;
  installment_due_dates: string[];
  next_due_date: string | null;
  payment_link: string;
  status: string;
  access_granted: boolean;
  last_payment_date: string | null;
  bootcamp_cohorts?: { name: string; start_date: string; end_date: string; course_id: string | null };
};

export default function Bootcamp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/sign-in?redirect=/bootcamp"); return; }
    (async () => {
      // Safety-net: link any pre-existing enrollments by email.
      await db.rpc("claim_bootcamp_enrollment").catch(() => {});
      const { data } = await db
        .from("bootcamp_enrollments")
        .select("*, bootcamp_cohorts:cohort_id(name, start_date, end_date, course_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEnrollments(data || []);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>Bootcamp Payments · Silicon Edge</title></Helmet>
      <Header />
      <main className="flex-1 container max-w-3xl py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">My Bootcamp</h1>
          <p className="text-muted-foreground">Track your installments and keep access throughout the program.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardHeader><CardTitle>No enrollment found</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                We couldn't find a bootcamp enrollment tied to your account. If you've already paid, make sure
                you're signed in with the same email used during signup.
              </p>
              <Button asChild variant="outline"><Link to="/contact">Contact admin</Link></Button>
            </CardContent>
          </Card>
        ) : (
          enrollments.map(e => <EnrollmentCard key={e.id} enrollment={e} />)
        )}
      </main>
      <Footer />
    </div>
  );
}

function EnrollmentCard({ enrollment: e }: { enrollment: Enrollment }) {
  const progress = (e.installments_paid / e.total_installments) * 100;
  const cohortName = e.bootcamp_cohorts?.name ?? "Bootcamp";

  if (!e.access_granted && e.status === "access_revoked") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access revoked — {cohortName}</AlertTitle>
        <AlertDescription>
          Payment was not completed by the bootcamp end date. Please contact admin about reinstatement.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span>{cohortName}</span>
          {e.status === "completed" && (
            <span className="text-sm font-normal text-green-600 inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Fully paid
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Payment progress</span>
            <span className="text-muted-foreground">{e.installments_paid}/{e.total_installments} installments</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {e.status === "overdue" && e.next_due_date && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment overdue</AlertTitle>
            <AlertDescription>
              Your installment due on {e.next_due_date} is past due. Pay now to keep your access.
            </AlertDescription>
          </Alert>
        )}

        {e.status === "active" && e.next_due_date && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
            Next payment due: <strong>{new Date(e.next_due_date).toLocaleDateString()}</strong>
          </div>
        )}

        {e.status !== "completed" && (
          <Button asChild className="w-full">
            <a href={e.payment_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Pay next installment (₦{Number(e.installment_amount).toLocaleString()})
            </a>
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>Total: ₦{Number(e.total_amount).toLocaleString()}</div>
          <div>Installment: ₦{Number(e.installment_amount).toLocaleString()}</div>
          <div>Schedule: {e.installment_due_dates?.length ?? 0} payments</div>
          {e.last_payment_date && <div>Last paid: {new Date(e.last_payment_date).toLocaleDateString()}</div>}
        </div>

        {e.access_granted && e.bootcamp_cohorts?.course_id && (
          <Button asChild variant="outline" className="w-full">
            <Link to={`/courses/${e.bootcamp_cohorts.course_id}/learn`}>Go to bootcamp content</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}