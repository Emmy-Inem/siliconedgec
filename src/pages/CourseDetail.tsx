import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourse } from "@/hooks/useCourses";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReviews } from "@/hooks/useReviews";
import { supabase } from "@/integrations/supabase/client";
import { PaymentModal } from "@/components/PaymentModal";
import { RegistrationFormModal } from "@/components/RegistrationFormModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, Star, Users, ArrowLeft, PlayCircle, Loader2, ShoppingCart,
  Lock, Award, FileText, MonitorPlay, Infinity, Bookmark, BookmarkCheck,
  CheckCircle2,
} from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { trackLead } from "@/lib/track-lead";
import { tikTokEvent, metaEvent, googleAdsConversion, setGoogleAdsUserData } from "@/lib/analytics";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { logUserActivity } from "@/lib/user-activity";
import { requestSignup } from "@/components/SignupPromptModal";
import { StudyPlanDialog } from "@/components/ai/StudyPlanDialog";
import { courseLearnHref, courseSectionHref } from "@/lib/course-url";
import { useCourseAccess } from "@/hooks/useCourseAccess";

const difficultyIcon: Record<string, string> = {
  Beginner: "▎",
  Intermediate: "▎▎",
  Expert: "▎▎▎",
};

export default function CourseDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: course, isLoading, error } = useCourse(id);
  const { addToCart, isInCart } = useCart();
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks();
  const { reviews, submitReview, userReview, avgRating, reviewCount } = useReviews(course?.id);
  const { format: formatPrice, isNgn } = useLocalizedPrice();
  const { canAccess: hasPaidAccess } = useCourseAccess(course?.id);

  // The URL param may be a UUID or a slug. The DB row id is always a UUID,
  // so use `courseId` for any database query. Use `courseSlug` (or fallback
  // to id) for any user-facing URL.
  const courseId = course?.id;
  const courseSlug = (course as any)?.slug ?? course?.id;

  // Flattened ordered lesson list for sequential unlock logic.
  const orderedLessons: { id: string; module_id: string }[] = (course?.modules ?? [])
    .flatMap((m: any) => m.lessons.map((l: any) => ({ id: l.id, module_id: m.id })));

  // Pull completed lessons for the current user (used to gate next lessons).
  const { data: completedRows = [] } = useQuery({
    queryKey: ["course-detail-progress", courseId, user?.id, orderedLessons.length],
    queryFn: async () => {
      if (!user || !orderedLessons.length) return [];
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", user.id)
        .in("lesson_id", orderedLessons.map((l) => l.id));
      return data ?? [];
    },
    enabled: !!user && orderedLessons.length > 0,
  });
  const completedIds = new Set(
    (completedRows as any[]).filter((r) => r.is_completed).map((r) => r.lesson_id),
  );

  const isLessonUnlocked = (lessonId: string): boolean => {
    if (isAdmin) return true;
    if (!hasPaidAccess) return false;
    const idx = orderedLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return true;
    return completedIds.has(orderedLessons[idx - 1].id);
  };

  // Canonicalize the URL: if the user landed via UUID but the course has a
  // slug, replace the URL with the slug version (no history entry).
  useEffect(() => {
    if (!course) return;
    const slug = (course as any).slug as string | null | undefined;
    if (slug && id !== slug) {
      navigate(`/courses/${slug}${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [course, id, navigate]);

  // Log course view once per page load
  useEffect(() => {
    if (id && course) {
      logUserActivity({
        user_id: user?.id ?? null,
        action: "course_view",
        entity_type: "course",
        entity_id: course.id,
        metadata: { title: course.title },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, course?.id]);

  // Verify Paystack payment after redirect callback
  useEffect(() => {
    const reference = searchParams.get("reference") ?? searchParams.get("trxref");
    if (reference && searchParams.get("verify") === "1") {
      supabase.functions.invoke("paystack-verify", { body: { reference } }).then(({ data }) => {
        if (data?.verified) {
          toast({ title: "Payment confirmed", description: "You're now enrolled. Welcome aboard!" });
          qc.invalidateQueries({ queryKey: ["enrollment", courseId] });
          // Internal attribution event so Marketing Analytics can credit the
          // originating UTM source for this paid conversion.
          void trackLead({
            formType: "paid_enrollment",
            formData: { course_id: courseId, order_ref: reference },
          }).catch(() => {});
        } else {
          toast({ title: "Payment not confirmed", description: data?.message ?? "Please contact support.", variant: "destructive" });
        }
        setSearchParams({});
      });
    }
  }, [searchParams, id, qc, setSearchParams, toast]);

  // Review form state
  const [reviewRating, setReviewRating] = useState(userReview?.rating ?? 5);
  const [reviewComment, setReviewComment] = useState(userReview?.comment ?? "");
  const [hoverRating, setHoverRating] = useState(0);

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, progress_percentage, is_completed")
        .eq("user_id", user!.id)
        .eq("course_id", courseId!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!courseId,
  });

  // For free webinars, also check course_registrations so the CTA reflects
  // "Registered" even if the enrollment row is somehow missing.
  const { data: webinarReg } = useQuery({
    queryKey: ["webinar-registration", courseId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("course_registrations") as any)
        .select("id")
        .eq("user_id", user!.id)
        .eq("course_id", courseId!)
        .eq("registration_type", "webinar")
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!courseId,
  });

  const enroll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({
        user_id: user!.id,
        course_id: courseId!,
        payment_status: "confirmed",
        progress_percentage: 0,
      });
      if (error) throw error;

      // Track lead with UTM attribution (standardized: course_id only, UTMs auto-attached)
      await trackLead({
        formType: "enrollment",
        formData: { course_id: courseId },
      });
      // TikTok conversion: free / direct enrollment counts as a CompleteRegistration.
      tikTokEvent("CompleteRegistration", {
        content_id: courseId,
        content_name: course?.title,
        content_type: "product",
        value: Number((course as any)?.discount_price ?? course?.price ?? 0),
        currency: "NGN",
      });
      // Meta Pixel: same conversion, mapped to the canonical event name.
      metaEvent("CompleteRegistration", {
        content_ids: [courseId],
        content_name: course?.title,
        content_type: "product",
        value: Number((course as any)?.discount_price ?? course?.price ?? 0),
        currency: "NGN",
      });
      // Google Ads: free enrollment counts as a sign_up / registration.
      // Enhanced conversions: hash the signed-in user's email/phone so
      // Google can match the conversion even when 3rd-party cookies are
      // blocked (iOS Safari, in-app browsers).
      void setGoogleAdsUserData({
        email: user?.email,
        phone: (user?.user_metadata as any)?.phone ?? null,
      });
      googleAdsConversion("CompleteRegistration", {
        value: Number((course as any)?.discount_price ?? course?.price ?? 0),
        currency: "NGN",
        items: [{ id: courseId, name: course?.title }],
      });
      await logUserActivity({
        user_id: user!.id,
        action: "course_enroll",
        entity_type: "course",
        entity_id: courseId!,
        metadata: { title: course?.title, price: course?.price ?? 0 },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment", courseId, user?.id] });
      toast({ title: "Enrolled successfully!", description: "You can now access this course from your dashboard." });
    },
    onError: (e) => toast({ title: "Enrollment failed", description: e.message, variant: "destructive" }),
  });

  const handleAddToCart = () => {
    if (!user) { requestSignup("cart"); return; }
    if (courseId) {
      addToCart(courseId);
      // TikTok intent signal — fires on the "Enroll Now / Add to cart" CTA.
      tikTokEvent("AddToCart", {
        content_id: courseId,
        content_name: course?.title,
        content_type: "product",
        value: Number((course as any)?.discount_price ?? course?.price ?? 0),
        currency: "NGN",
      });
      metaEvent("AddToCart", {
        content_ids: [courseId],
        content_name: course?.title,
        content_type: "product",
        value: Number((course as any)?.discount_price ?? course?.price ?? 0),
        currency: "NGN",
      });
      googleAdsConversion("AddToCart", {
        value: Number((course as any)?.discount_price ?? course?.price ?? 0),
        currency: "NGN",
        items: [{ id: courseId, name: course?.title }],
      });
    }
  };

  const handleBookmark = () => {
    if (!user) { requestSignup("bookmark"); return; }
    if (courseId) toggleBookmark(courseId);
  };

  const handlePaymentSuccess = () => { enroll.mutate(); };

  const handleSubmitReview = () => {
    if (!user) { requestSignup("review"); return; }
    submitReview.mutate({ rating: reviewRating, comment: reviewComment });
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
  const isFreeWebinar = course.price === 0 || course.title.toUpperCase().startsWith("FREE");
  const isEnrolled = !!enrollment || (isFreeWebinar && !!webinarReg);
  const bookmarked = isBookmarked(course.id);
  const inCart = isInCart(course.id);
  const originalPrice = Math.round(course.price * 1.2);
  const hours = Math.floor(course.duration_hours);
  const minutes = Math.round((course.duration_hours - hours) * 60);
  const canOpenStudentArea = isEnrolled || (!!user && isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${course.title} — Silicon Edge`}
        description={(course.description ?? `Master ${course.title} with live, instructor-led training.`).slice(0, 155)}
        image={course.thumbnail_url ?? undefined}
        type="article"
        canonical={siteUrl(`/courses/${courseSlug}`)}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.description ?? undefined,
          provider: { "@type": "Organization", name: "Silicon Edge Consulting" },
          offers: {
            "@type": "Offer",
            price: (course as any).discount_price ?? course.price,
            priceCurrency: (course as any).currency ?? "NGN",
            availability: "https://schema.org/InStock",
          },
          aggregateRating: course.rating ? {
            "@type": "AggregateRating",
            ratingValue: course.rating,
            ratingCount: Math.max(course.students_enrolled ?? 1, 1),
          } : undefined,
        }}
      />
      <Header />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-white pt-28 pb-14 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
          }}
        />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <Link to="/courses" className="inline-flex items-center text-muted-foreground hover:text-primary text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Courses
          </Link>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 60, damping: 18 }}>
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 max-w-3xl leading-[1.1] tracking-tight">
              {course.title}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mb-6">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {hours > 0 && `${hours} hours`} {minutes > 0 && `${minutes} minutes`}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {(course.students_enrolled ?? 0)} Enrolled
              </span>
              {(avgRating > 0 || (course.rating ?? 0) > 0) && (
                <span className="flex items-center gap-1.5">
                  <StarRating value={avgRating || course.rating || 0} size="md" />
                  <span>{(avgRating || course.rating || 0).toFixed(1)} ({reviewCount || 4})</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-mono">{difficultyIcon[course.difficulty] ?? "▎"}</span>
                {course.difficulty}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">

            {/* Left Column: Curriculum, Description & Reviews */}
            <div className="flex-1 min-w-0 order-2 lg:order-1 space-y-8">
              <Tabs defaultValue="curriculum" className="w-full">
                <TabsList className="w-full justify-start bg-muted/50 rounded-t-lg rounded-b-none border border-border border-b-0 px-1">
                  <TabsTrigger value="curriculum" className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-heading font-semibold">
                    Curriculum
                  </TabsTrigger>
                  <TabsTrigger value="description" className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-heading font-semibold">
                    Description
                  </TabsTrigger>
                </TabsList>
                <div className="border border-border rounded-b-lg p-4 md:p-6 bg-card">
                  <TabsContent value="curriculum" className="mt-0">
                    {course.modules.length > 0 ? (
                      <Accordion type="multiple" defaultValue={[course.modules[0]?.id]} className="space-y-0">
                        {course.modules.map((module) => (
                          <AccordionItem key={module.id} value={module.id} className="border-b border-border last:border-0">
                            <AccordionTrigger className="hover:no-underline py-3">
                              <span className="font-heading font-semibold text-sm md:text-base text-left">{module.title}</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="space-y-0">
                                {module.lessons.map((lesson) => {
                                  const unlocked = isLessonUnlocked(lesson.id);
                                  const completed = completedIds.has(lesson.id);
                                  return (
                                    <li key={lesson.id} className="border-t border-border/50">
                                      {unlocked ? (
                                        <Link
                                          to={`${courseLearnHref(course)}?lesson=${lesson.id}`}
                                          className="flex items-center justify-between text-sm text-foreground hover:text-primary py-2.5 transition-colors"
                                        >
                                          <span className="flex items-center gap-2">
                                            {completed ? (
                                              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                            ) : (
                                              <PlayCircle className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                            )}
                                            {lesson.title}
                                          </span>
                                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">{lesson.duration}</span>
                                        </Link>
                                      ) : (
                                        <div
                                          className="flex items-center justify-between text-sm text-muted-foreground py-2.5"
                                          title={
                                            hasPaidAccess
                                              ? "Complete the previous lesson to unlock"
                                              : "Enroll to unlock this lesson"
                                          }
                                        >
                                          <span className="flex items-center gap-2">
                                            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                                            {lesson.title}
                                          </span>
                                          <span className="text-xs flex-shrink-0 ml-4">{lesson.duration}</span>
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-muted-foreground text-sm py-6 text-center">Curriculum coming soon.</p>
                    )}

                    {course.modules.length > 0 && canOpenStudentArea && (
                      <div className="mt-6 border-t border-border pt-4">
                        <Button className="w-full sm:w-auto" asChild>
                          <Link to={courseLearnHref(course)}>Open course</Link>
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Each lesson opens with its quiz and assignments embedded.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="description" className="mt-0">
                    <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
                      <p>{course.description}</p>
                      {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                        <>
                          <h3 className="font-heading font-semibold text-foreground text-base mt-6">What You'll Learn</h3>
                          <ul className="space-y-2">
                            {course.learning_outcomes.map((outcome, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">✓</span>
                                <span>{outcome}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Reviews Section */}
              <div className="space-y-6">
                <h2 className="font-heading text-xl font-bold">Reviews ({reviewCount})</h2>

                {/* Write/Edit Review (only for enrolled users) */}
                {isEnrolled && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                    <h3 className="font-heading font-semibold text-sm">
                      {userReview ? "Update Your Review" : "Write a Review"}
                    </h3>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= (hoverRating || reviewRating)
                                ? "fill-accent text-accent"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">{reviewRating}/5</span>
                    </div>
                    <Textarea
                      placeholder="Share your experience with this course..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={submitReview.isPending}
                    >
                      {submitReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      {userReview ? "Update Review" : "Submit Review"}
                    </Button>
                  </div>
                )}

                {/* Review List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {review.profile?.avatar_url ? (
                              <img src={review.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-primary">
                                {(review.profile?.full_name ?? "U").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{review.profile?.full_name ?? "Student"}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/20"}`} />
                              ))}
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No reviews yet. Be the first to review this course!</p>
                )}
              </div>
            </div>

            {/* Right Column / Sidebar */}
            <div className="w-full lg:w-[360px] flex-shrink-0 order-1 lg:order-2">
              <div className="lg:sticky lg:top-24 space-y-6">

                {/* Thumbnail */}
                {course.thumbnail_url && (
                  <div className="rounded-xl overflow-hidden border border-border shadow-md">
                    <img src={course.thumbnail_url} alt={course.title} className="w-full aspect-video object-cover" />
                  </div>
                )}

                {/* Pricing & CTA */}
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                      {formatPrice(course.price)}
                    </span>
                    {course.price > 0 && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                  {!isNgn && course.price > 0 && (
                    <p className="text-[11px] text-muted-foreground">Charged in {formatNaira(course.price)} (NGN)</p>
                  )}

                  {isEnrolled ? (
                    isFreeWebinar ? (
                      <div className="space-y-2">
                        <Button size="lg" className="w-full gap-2" asChild>
                          <Link to={courseLearnHref(course)}>
                            <CheckCircle2 className="h-4 w-4" /> Enter webinar course
                          </Link>
                        </Button>
                        <Button size="sm" variant="link" className="w-full" asChild>
                          <Link to={courseSectionHref(course, "assignments")}>Assignments & quizzes →</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button size="lg" className="w-full gap-2" variant="secondary" asChild>
                          <Link to={courseLearnHref(course)}>
                            <CheckCircle2 className="h-4 w-4" /> Continue course
                          </Link>
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          ✓ You're enrolled — {enrollment?.progress_percentage ?? 0}% complete
                        </p>
                        <StudyPlanDialog courseId={course.id} />
                      </div>
                    )
                  ) : isFreeWebinar ? (
                    <div className="space-y-2">
                      <Button
                        size="lg"
                        className="w-full gap-2"
                        onClick={() => {
                          if (!user) {
                            requestSignup("register");
                            return;
                          }
                          setRegisterOpen(true);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Register for Free
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">No payment required</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        size="lg"
                        className="w-full gap-2"
                        onClick={handleAddToCart}
                        disabled={inCart}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {inCart ? "Already in Cart" : "Add to cart"}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleBookmark}
                        disabled={isToggling}
                      >
                        {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        {bookmarked ? "Bookmarked" : "Add to Bookmark"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* What's Included */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <h3 className="font-heading font-semibold text-base">What's included</h3>
                  {((course as any).whats_included?.length ?? 0) > 0 ? (
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {((course as any).whats_included as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      {hours > 0 ? `${hours} hours` : ""}{minutes > 0 ? ` ${minutes} minutes` : ""} video
                    </li>
                    <li className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-primary flex-shrink-0" />
                      Certificate
                    </li>
                    <li className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      {course.modules.length > 0 ? course.modules.length : 12} Article{course.modules.length !== 1 ? "s" : ""}
                    </li>
                    <li className="flex items-center gap-3">
                      <MonitorPlay className="h-4 w-4 text-primary flex-shrink-0" />
                      Watch Offline
                    </li>
                    <li className="flex items-center gap-3">
                      <Infinity className="h-4 w-4 text-primary flex-shrink-0" />
                      Lifetime access
                    </li>
                  </ul>
                  )}
                </div>

                {/* Instructor Card */}
                {course.instructor && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {course.instructor.avatar_url ? (
                          <img src={course.instructor.avatar_url} alt={course.instructor.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-heading font-bold text-primary text-lg">
                            {course.instructor.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-sm">{course.instructor.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <span>{avgRating || course.rating || 4.5}</span>
                          <span className="ml-0.5">Instructor Rating</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                      <div className="text-center">
                        <p className="font-heading font-bold text-lg">{course.students_enrolled ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading font-bold text-lg">{course.modules.length || 19}</p>
                        <p className="text-xs text-muted-foreground">Courses</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading font-bold text-lg">{reviewCount || 4}</p>
                        <p className="text-xs text-muted-foreground">Reviews</p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full text-xs">
                      <Link to={`/instructors/${course.instructor.id}`}>View Details</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {course && (
        <PaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          courseId={course.id}
          courseTitle={course.title}
          price={course.price}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      {course && (
        <RegistrationFormModal
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          courseId={course.id}
          courseTitle={course.title}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["enrollment", course.id] });
            qc.invalidateQueries({ queryKey: ["webinar-registration", course.id] });
          }}
        />
      )}

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
