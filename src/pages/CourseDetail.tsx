import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourse, useCourses } from "@/hooks/useCourses";
import { CourseCard } from "@/components/CourseCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReviews } from "@/hooks/useReviews";
import { supabase } from "@/integrations/supabase/client";
import { PaymentModal } from "@/components/PaymentModal";
import { RegistrationFormModal } from "@/components/RegistrationFormModal";
import { SyllabusDownloadModal } from "@/components/SyllabusDownloadModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, Star, Users, ArrowLeft, PlayCircle, Loader2, ShoppingCart,
  Lock, Award, FileText, MonitorPlay, Bookmark, BookmarkCheck,
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
import { CohortAccessButton } from "@/components/CohortAccessButton";
import { courseLearnHref, courseSectionHref } from "@/lib/course-url";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { CourseDetailHero } from "@/components/courses/CourseDetailHero";
import { CourseReviewsSection } from "@/components/courses/CourseReviewsSection";
import { COURSE_DETAIL_FAQS } from "@/components/courses/courseFaqs";

export default function CourseDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
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

  const { data: allCourses = [] } = useCourses();
  const relatedCourses = useMemo(() => {
    if (!course || !allCourses.length) return [];
    const configuredIds = new Set([
      ...((course as any).upsell_course_ids ?? []),
      ...((course as any).cross_sell_course_ids ?? []),
    ]);
    const matchedConfigured = allCourses.filter((c) => configuredIds.has(c.id));
    if (matchedConfigured.length >= 3) return matchedConfigured.slice(0, 3);

    const sameCat = allCourses.filter(
      (c) => c.id !== course.id && c.category === course.category
    );
    const pool = [...matchedConfigured, ...sameCat];
    const unique = Array.from(new Map(pool.map((item) => [item.id, item])).values());
    if (unique.length >= 3) return unique.slice(0, 3);

    const others = allCourses.filter(
      (c) => c.id !== course.id && !unique.some((u) => u.id === c.id)
    );
    return [...unique, ...others].slice(0, 3);
  }, [course, allCourses]);

  const { data: publicCurriculum = [] } = useQuery({
    queryKey: ["course-public-curriculum", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase.rpc("get_course_curriculum", { p_course_id: courseId });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });

  // Real cohort instructor (Fauziyah for the Azure bootcamp, etc.) — always
  // wins over the placeholder row on the `instructors` table.
  const { data: cohortInstructors = [] } = useQuery({
    queryKey: ["course-cohort-instructors", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase.rpc("get_course_instructors", { p_course_id: courseId });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
  const primaryInstructor = (cohortInstructors[0] as any) ?? null;
  const displayInstructor = primaryInstructor
    ? {
        id: primaryInstructor.user_id,
        name: primaryInstructor.full_name ?? course?.instructor?.name ?? "Silicon Edge Mentor",
        avatar_url: primaryInstructor.avatar_url ?? course?.instructor?.avatar_url ?? null,
        bio: course?.instructor?.bio ?? null,
        isReal: true,
      }
    : course?.instructor
      ? { ...course.instructor, isReal: false }
      : null;

  const curriculumModules = useMemo(() => {
    if (!courseId) return [];

    const sourceRows = publicCurriculum.length
      ? publicCurriculum
      : (course?.modules ?? []).flatMap((module: any) =>
          (module.lessons?.length
            ? module.lessons.map((lesson: any) => ({
                module_id: module.id,
                module_title: module.title,
                module_order_index: module.order_index,
                lesson_id: lesson.id,
                lesson_title: lesson.title,
                lesson_duration: lesson.duration,
                lesson_order_index: lesson.order_index,
              }))
            : [{
                module_id: module.id,
                module_title: module.title,
                module_order_index: module.order_index,
                lesson_id: null,
                lesson_title: null,
                lesson_duration: null,
                lesson_order_index: null,
              }])
        );

    const moduleMap = new Map<string, any>();
    sourceRows.forEach((row: any) => {
      const existing = moduleMap.get(row.module_id) ?? {
        id: row.module_id,
        title: row.module_title,
        order_index: row.module_order_index ?? 0,
        lessons: [],
      };

      if (row.lesson_id) {
        existing.lessons.push({
          id: row.lesson_id,
          title: row.lesson_title,
          duration: row.lesson_duration,
          order_index: row.lesson_order_index ?? 0,
        });
      }

      moduleMap.set(row.module_id, existing);
    });

    return Array.from(moduleMap.values())
      .sort((a, b) => a.order_index - b.order_index)
      .map((module) => ({
        ...module,
        lessons: module.lessons.sort((a: any, b: any) => a.order_index - b.order_index),
      }));
  }, [course?.modules, courseId, publicCurriculum]);

  // Flattened ordered lesson list for sequential unlock logic.
  const orderedLessons: { id: string; module_id: string }[] = curriculumModules
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

  // Authoritative unlock signal: a row in lesson_unlocks == this student can
  // access that lesson, regardless of whether earlier lessons are completed.
  // Keeps this page in lock-step with CourseLearning, the instructor approve
  // panel, and the enforce_lesson_unlock_order trigger.
  const { data: unlockRows = [] } = useQuery({
    queryKey: ["course-detail-unlocks", courseId, user?.id, orderedLessons.length],
    queryFn: async () => {
      if (!user || !orderedLessons.length) return [];
      const { data } = await (supabase as any)
        .from("lesson_unlocks")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", orderedLessons.map((l) => l.id));
      return data ?? [];
    },
    enabled: !!user && orderedLessons.length > 0,
  });

  // Assignment presence per lesson (public) + this user's submission status (auth).
  // Drives the purple (pending) / grey (done) glowing dot in the curriculum.
  const { data: assignmentDots = { pending: new Set<string>(), done: new Set<string>(), has: new Set<string>() } } = useQuery({
    queryKey: ["course-detail-assignment-dots", courseId, user?.id, orderedLessons.length],
    enabled: orderedLessons.length > 0,
    queryFn: async () => {
      const lessonIds = orderedLessons.map((l) => l.id);
      const { data: assigns } = await supabase
        .from("assignments")
        .select("id, lesson_id, is_visible")
        .in("lesson_id", lessonIds);
      const visible = (assigns ?? []).filter((a: any) => a.is_visible !== false);
      const has = new Set<string>(visible.map((a: any) => a.lesson_id));
      const byLesson: Record<string, string[]> = {};
      for (const a of visible) (byLesson[a.lesson_id] ??= []).push(a.id);
      let submitted = new Set<string>();
      if (user && visible.length) {
        const { data: subs } = await supabase
          .from("assignment_submissions")
          .select("assignment_id")
          .eq("user_id", user.id)
          .in("assignment_id", visible.map((a: any) => a.id));
        submitted = new Set((subs ?? []).map((s: any) => s.assignment_id));
      }
      const pending = new Set<string>();
      const done = new Set<string>();
      for (const [lessonId, ids] of Object.entries(byLesson)) {
        if (ids.some((id) => !submitted.has(id))) pending.add(lessonId);
        else done.add(lessonId);
      }
      return { pending, done, has };
    },
  });

  const AssignmentDot = ({ lessonId }: { lessonId: string }) => {
    if (!assignmentDots.has.has(lessonId)) return null;
    if (user && assignmentDots.done.has(lessonId)) {
      return (
        <span
          title="Assignment submitted"
          aria-label="Assignment submitted"
          className="inline-block h-2 w-2 rounded-full assignment-dot-done shrink-0"
        />
      );
    }
    return (
      <span
        title="Assignment pending"
        aria-label="Assignment pending"
        className="inline-block h-2 w-2 rounded-full assignment-dot-pending shrink-0"
      />
    );
  };
  const completedIds = new Set(
    (completedRows as any[]).filter((r) => r.is_completed).map((r) => r.lesson_id),
  );

  const unlockedIds = new Set<string>((unlockRows as any[]).map((r) => r.lesson_id));

  const isLessonUnlocked = (lessonId: string): boolean => {
    if (isAdmin) return true;
    if (!hasPaidAccess) return false;
    // Single source of truth — a lesson_unlocks row means "granted".
    if (unlockedIds.has(lessonId)) return true;
    // Sequential fallback for legacy students without any unlock rows yet:
    // first lesson is always open, everything else needs the previous one done.
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

  const handleSubmitReview = (rating: number, comment: string) => {
    if (!user) { requestSignup("review"); return; }
    submitReview.mutate({ rating, comment });
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
        type="website"
        canonical={siteUrl(`/courses/${courseSlug}`)}
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [{
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Courses", item: siteUrl("/courses") },
              { "@type": "ListItem", position: 3, name: course.title, item: siteUrl(`/courses/${courseSlug}`) },
            ],
          }, {
          "@type": "Course",
          url: siteUrl(`/courses/${courseSlug}`),
          name: course.title,
          description: course.description ?? undefined,
          provider: { "@type": "Organization", name: "Silicon Edge Consulting" },
          offers: {
            "@type": "Offer",
            price: (course as any).discount_price ?? course.price,
            priceCurrency: (course as any).currency ?? "NGN",
            availability: "https://schema.org/InStock",
          },
          educationalLevel: (course as any).difficulty ?? undefined,
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: course.duration_hours ? `PT${Math.round(course.duration_hours)}H` : undefined,
          },
          aggregateRating: (course.rating && (reviewCount ?? 0) > 0) ? {
            "@type": "AggregateRating",
            ratingValue: course.rating,
            ratingCount: reviewCount,
          } : undefined,
          }, {
            "@type": "FAQPage",
            mainEntity: COURSE_DETAIL_FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }],
        }}
      />
      <Header />

      {/* Hero Banner */}
      <CourseDetailHero
        course={course}
        hours={hours}
        minutes={minutes}
        avgRating={avgRating}
        reviewCount={reviewCount}
      />

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
                    {curriculumModules.length > 0 ? (
                      <Accordion type="multiple" defaultValue={[curriculumModules[0]?.id]} className="space-y-0">
                        {curriculumModules.map((module) => (
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
                                            <AssignmentDot lessonId={lesson.id} />
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
                                            <AssignmentDot lessonId={lesson.id} />
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

                    {curriculumModules.length > 0 && canOpenStudentArea && (
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
                          <h2 className="font-heading font-semibold text-foreground text-base mt-6">What You'll Learn</h2>
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
              <CourseReviewsSection
                isEnrolled={isEnrolled}
                reviews={reviews}
                reviewCount={reviewCount}
                userReview={userReview}
                isSubmittingReview={submitReview.isPending}
                onSubmitReview={handleSubmitReview}
              />
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
                        <div className="pt-2 mt-2 border-t">
                          <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                            My Cohort Space
                          </div>
                          <CohortAccessButton courseId={course.id} />
                        </div>
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

                  {!isEnrolled && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground mt-2"
                      onClick={() => setSyllabusOpen(true)}
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" /> Download Course Syllabus (PDF)
                    </Button>
                  )}
                </div>

                {/* What's Included */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <h2 className="font-heading font-semibold text-base">What's included</h2>
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
                {displayInstructor && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {displayInstructor.avatar_url ? (
                          <img src={displayInstructor.avatar_url} alt={displayInstructor.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-heading font-bold text-primary text-lg">
                            {displayInstructor.name.split(" ").map((n: string) => n[0]).join("")}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-sm">{displayInstructor.name}</h4>
                        {(avgRating || course.rating) ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-accent text-accent" />
                            <span>{(avgRating || course.rating || 0).toFixed(1)}</span>
                            <span className="ml-0.5">Instructor Rating</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                      <div className="text-center">
                        <p className="font-heading font-bold text-lg">{course.students_enrolled ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading font-bold text-lg">{course.modules.length}</p>
                        <p className="text-xs text-muted-foreground">Modules</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading font-bold text-lg">{reviewCount ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Reviews</p>
                      </div>
                    </div>
                    {!displayInstructor.isReal && course.instructor?.id && (
                      <Button asChild variant="outline" size="sm" className="w-full text-xs">
                        <Link to={`/instructors/${course.instructor.id}`}>View Details</Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Courses Section for Internal Linking & Topical Clustering */}
      {relatedCourses.length > 0 && (
        <section className="py-16 bg-muted/20 border-t border-border/60">
          <div className="container mx-auto px-5 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Related Courses
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Explore other programs to advance your career in cloud, DevOps, and AI.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                <Link to="/courses">View All Courses</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCourses.map((c, i) => (
                <CourseCard key={c.id} course={c} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

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
      {course && (
        <SyllabusDownloadModal
          isOpen={syllabusOpen}
          onClose={() => setSyllabusOpen(false)}
          courseTitle={course.title}
          courseId={course.id}
          modulesCount={curriculumModules.length || 6}
          duration={(course as any).duration || "8–12 Weeks"}
        />
      )}

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
