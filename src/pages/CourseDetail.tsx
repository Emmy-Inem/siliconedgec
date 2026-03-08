import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourse } from "@/hooks/useCourses";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PaymentModal } from "@/components/PaymentModal";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Clock, Star, Users, ArrowLeft, PlayCircle, Loader2, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Expert: "bg-red-100 text-red-700",
};

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { data: course, isLoading, error } = useCourse(id);

  // Check if already enrolled
  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, progress_percentage, is_completed")
        .eq("user_id", user!.id)
        .eq("course_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const enroll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({
        user_id: user!.id,
        course_id: id!,
        payment_status: "confirmed",
        progress_percentage: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment", id, user?.id] });
      toast({ title: "Enrolled successfully!", description: "You can now access this course from your dashboard." });
    },
    onError: (e) => toast({ title: "Enrollment failed", description: e.message, variant: "destructive" }),
  });

  const handleEnroll = () => {
    if (!user) {
      navigate("/sign-in");
      return;
    }
    if (course && course.price > 0) {
      setPaymentOpen(true);
      return;
    }
    enroll.mutate();
  };

  const handlePaymentSuccess = () => {
    enroll.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!course || error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Course Not Found</h1>
          <Button asChild><Link to="/courses">Browse Courses</Link></Button>
        </div>
        <Footer />
      </div>
    );
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const isEnrolled = !!enrollment;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero pt-28 pb-14">
        <div className="container mx-auto px-4">
          <Link to="/courses" className="inline-flex items-center text-hero-muted hover:text-primary text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Courses
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColor[course.difficulty] ?? ""}`}>
                {course.difficulty}
              </span>
              <span className="text-hero-muted text-sm">{course.category}</span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-4 max-w-3xl">{course.title}</h1>
            <p className="text-hero-muted text-lg max-w-2xl mb-6">{course.description}</p>
            <div className="flex flex-wrap items-center gap-6 text-hero-muted text-sm">
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-accent text-accent" /> {course.rating ?? 0} rating</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {(course.students_enrolled ?? 0).toLocaleString()} students</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {course.duration_hours} hours</span>
              <span className="flex items-center gap-1.5"><PlayCircle className="h-4 w-4" /> {totalLessons} lessons</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-12">
              {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                <div>
                  <h2 className="font-heading text-2xl font-bold mb-6">What You'll Learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.learning_outcomes.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {course.modules.length > 0 && (
                <div>
                  <h2 className="font-heading text-2xl font-bold mb-6">Course Syllabus</h2>
                  <Accordion type="multiple" className="space-y-3">
                    {course.modules.map((module) => (
                      <AccordionItem key={module.id} value={module.id} className="border border-border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <span className="font-heading font-semibold">{module.title}</span>
                            <span className="text-xs text-muted-foreground">{module.lessons.length} lessons</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 pb-2">
                            {module.lessons.map((lesson) => (
                              <li key={lesson.id} className="flex items-center justify-between text-sm text-muted-foreground py-2 border-t border-border first:border-0">
                                <span className="flex items-center gap-2">
                                  <PlayCircle className="h-4 w-4" />
                                  {lesson.title}
                                </span>
                                <span className="text-xs">{lesson.duration}</span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {course.instructor && (
                <div>
                  <h2 className="font-heading text-2xl font-bold mb-6">Your Instructor</h2>
                  <div className="bg-card rounded-xl border border-border p-6 flex gap-5">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {course.instructor.avatar_url ? (
                        <img src={course.instructor.avatar_url} alt={course.instructor.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="font-heading font-bold text-primary text-xl">
                          {course.instructor.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-lg">{course.instructor.name}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{course.instructor.bio}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card rounded-xl border border-border p-6 space-y-6 shadow-lg shadow-primary/5">
                <div className="text-center">
                  <p className="font-heading text-4xl font-bold text-primary">
                    {course.price === 0 ? "Free" : `$${course.price}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.price === 0 ? "No payment required" : "One-time payment"}
                  </p>
                </div>

                {isEnrolled ? (
                  <div className="space-y-3">
                    <Button size="lg" className="w-full" variant="secondary" asChild>
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      ✓ You're enrolled — {enrollment.progress_percentage ?? 0}% complete
                    </p>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleEnroll}
                    disabled={enroll.isPending}
                  >
                    {enroll.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {enroll.isPending ? "Enrolling..." : "Enroll Now"}
                  </Button>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{course.duration_hours} hours</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Level</span>
                    <span className="font-medium">{course.difficulty}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Modules</span>
                    <span className="font-medium">{course.modules.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Lessons</span>
                    <span className="font-medium">{totalLessons}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Certificate</span>
                    <span className="font-medium text-primary">Yes</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p>✓ Lifetime access to course materials</p>
                  <p>✓ Live instructor-led sessions</p>
                  <p>✓ Community & career support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {course && (
        <PaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          courseTitle={course.title}
          price={course.price}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
