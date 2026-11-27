import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RouteIndexing } from "@/components/RouteIndexing";
import { CartProvider } from "@/contexts/CartContext";
import { RequireAdmin } from "@/components/RequireAdmin";
import { UtmTracker } from "@/components/UtmTracker";
import { JourneyTracker } from "@/components/JourneyTracker";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { SignupPromptModal } from "@/components/SignupPromptModal";
import Index from "./pages/Index";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
// Public routes are code-split to keep the initial JS bundle small and the
// home page snappy. Only Index (LCP) loads eagerly.
const Courses = lazyWithRetry(() => import("./pages/Courses"));
const CourseDetail = lazyWithRetry(() => import("./pages/CourseDetail"));
const Cart = lazyWithRetry(() => import("./pages/Cart"));
const ForBusinesses = lazyWithRetry(() => import("./pages/ForBusinesses"));
const Certificates = lazyWithRetry(() => import("./pages/Certificates"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const Affiliates = lazyWithRetry(() => import("./pages/Affiliates"));
const AffiliateDashboard = lazyWithRetry(() => import("./pages/affiliate/AffiliateDashboard"));
const FlexiblePayments = lazyWithRetry(() => import("./pages/FlexiblePayments"));
const SignIn = lazyWithRetry(() => import("./pages/SignIn"));
const SignUp = lazyWithRetry(() => import("./pages/SignUp"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const CourseLearning = lazyWithRetry(() => import("./pages/CourseLearning"));
const VerifyCertificate = lazyWithRetry(() => import("./pages/VerifyCertificate"));
const VerifyCertificateLanding = lazyWithRetry(() => import("./pages/VerifyCertificateLanding"));
const VerifyReceipt = lazyWithRetry(() => import("./pages/VerifyReceipt"));
const Jobs = lazyWithRetry(() => import("./pages/Jobs"));
const JobDetail = lazyWithRetry(() => import("./pages/JobDetail"));
const RedirectInfluencer = lazyWithRetry(() => import("./pages/RedirectInfluencer"));
const CmsPagePublic = lazyWithRetry(() => import("./pages/CmsPage"));
const InstructorDetail = lazyWithRetry(() => import("./pages/InstructorDetail"));
const LearningPaths = lazyWithRetry(() => import("./pages/LearningPaths"));
const LearningPathDetail = lazyWithRetry(() => import("./pages/LearningPathDetail"));
const CourseQuizzes = lazyWithRetry(() => import("./pages/CourseQuizzes"));
const CourseAssignments = lazyWithRetry(() => import("./pages/CourseAssignments"));
const QuizAttempts = lazyWithRetry(() => import("./pages/QuizAttempts"));
const RelatedCourses = lazyWithRetry(() => import("./pages/RelatedCourses"));
const Help = lazyWithRetry(() => import("./pages/Help"));
const HelpArticle = lazyWithRetry(() => import("./pages/HelpArticle"));
const Trust = lazyWithRetry(() => import("./pages/Trust"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogPost = lazyWithRetry(() => import("./pages/BlogPost"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const About = lazyWithRetry(() => import("./pages/About"));
const Locations = lazyWithRetry(() => import("./pages/Locations"));
const Faq = lazyWithRetry(() => import("./pages/Faq"));
const InstructorsIndex = lazyWithRetry(() => import("./pages/Instructors"));
const TestimonialsPage = lazyWithRetry(() => import("./pages/Testimonials"));
const NewsletterAction = lazyWithRetry(() => import("./pages/NewsletterAction"));
const Bookmarks = lazyWithRetry(() => import("./pages/Bookmarks"));
const Account = lazyWithRetry(() => import("./pages/Account"));
const OrderDetail = lazyWithRetry(() => import("./pages/OrderDetail"));
const Refer = lazyWithRetry(() => import("./pages/Refer"));
const SearchPage = lazyWithRetry(() => import("./pages/Search"));
const CategoryCourses = lazyWithRetry(() => import("./pages/CategoryCourses"));
const Legal = lazyWithRetry(() => import("./pages/Legal"));
const Cohorts = lazyWithRetry(() => import("./pages/Cohorts"));
const CohortSpace = lazyWithRetry(() => import("./pages/CohortSpace"));
const InstructorLayout = lazyWithRetry(() => import("./pages/instructor/InstructorLayout"));
const InstructorOverview = lazyWithRetry(() => import("./pages/instructor/InstructorOverview"));
const InstructorStudents = lazyWithRetry(() => import("./pages/instructor/InstructorStudents"));
const InstructorStudentDetail = lazyWithRetry(() => import("./pages/instructor/InstructorStudentDetail"));
const InstructorCohort = lazyWithRetry(() => import("./pages/instructor/InstructorCohort"));
const InstructorAssignments = lazyWithRetry(() => import("./pages/instructor/InstructorAssignments"));
const InstructorAssignmentGrading = lazyWithRetry(() => import("./pages/instructor/InstructorAssignmentGrading"));
const InstructorQuizzes = lazyWithRetry(() => import("./pages/instructor/InstructorQuizzes"));
const AdminDashboards = lazyWithRetry(() => import("./pages/admin/AdminDashboards"));
const InstructorAssist = lazyWithRetry(() => import("./pages/admin/AdminInstructorAssist"));
import { AiCoach } from "./components/AiCoach";
import { CustomScripts } from "./components/CustomScripts";
import { CookieBanner } from "./components/CookieBanner";
import { SignupPrompt } from "./components/SignupPrompt";
import { MaintenanceBanner } from "./components/MaintenanceBanner";
import { GadsLabelsLoader } from "./components/GadsLabelsLoader";
import { NewAssessmentToast } from "./components/NewAssessmentToast";
import { HelmetProvider } from "react-helmet-async";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { ErrorPage } from "./components/ErrorPage";

// Code-split admin pages - they only load when an admin route is visited
const AdminLayout = lazyWithRetry(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazyWithRetry(() => import("./pages/admin/AdminOverview"));
const AdminCourseCreate = lazyWithRetry(() => import("./pages/admin/AdminCourseCreate"));
const AdminCourseModules = lazyWithRetry(() => import("./pages/admin/AdminCourseModules"));
const AdminLearnerDetail = lazyWithRetry(() => import("./pages/admin/AdminLearnerDetail"));
const AdminHelp = lazyWithRetry(() => import("./pages/admin/AdminHelp"));

// Hub pages (consolidated tabbed views)
const AdminAnalyticsHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminAnalyticsHub"));
const AdminCoursesHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminCoursesHub"));
const AdminPeopleHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminPeopleHub"));
const AdminAssessmentsHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminAssessmentsHub"));
const AdminCommunicationHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminCommunicationHub"));
const Support = lazyWithRetry(() => import("./pages/Support"));
const SupportTicket = lazyWithRetry(() => import("./pages/SupportTicket"));
const AdminCommerceHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminCommerceHub"));
const AdminJobsHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminJobsHub"));
const AdminContentHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminContentHub"));
const AdminSystemHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminSystemHub"));
const AdminFinanceHub = lazyWithRetry(() => import("./pages/admin/hubs/AdminFinanceHub"));
const AdminCohorts = lazyWithRetry(() => import("./pages/admin/AdminCohorts"));
const Bootcamp = lazyWithRetry(() => import("./pages/Bootcamp"));

const AdminFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache aggressively - most catalog/content data changes rarely.
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const PublicFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <RouteIndexing />
          <UtmTracker />
          <JourneyTracker />
          <AffiliateTracker />
          <CartProvider>
            <MaintenanceBanner />
            <NewAssessmentToast />
            <RouteErrorBoundary>
              <Suspense fallback={<PublicFallback />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/for-businesses" element={<ForBusinesses />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/career" element={<Affiliates />} />
              <Route path="/affiliates" element={<Navigate to="/career" replace />} />
              <Route path="/career/dashboard" element={<AffiliateDashboard />} />
              <Route path="/affiliate" element={<Navigate to="/career/dashboard" replace />} />
              <Route path="/flexible-payments" element={<FlexiblePayments />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses/:id/learn" element={<CourseLearning />} />
              <Route path="/courses/:id/quizzes" element={<CourseQuizzes />} />
              <Route path="/courses/:id/assignments" element={<CourseAssignments />} />
              <Route path="/quizzes/:quizId/attempts" element={<QuizAttempts />} />
              <Route path="/courses/:id/related" element={<RelatedCourses />} />
              <Route path="/verify/:code" element={<VerifyCertificate />} />
              <Route path="/verify" element={<VerifyCertificateLanding />} />
              <Route path="/verify-receipt/:reference" element={<VerifyReceipt />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/r/:slug" element={<RedirectInfluencer />} />
              <Route path="/p/:slug" element={<CmsPagePublic />} />
              <Route path="/instructors/:id" element={<InstructorDetail />} />
              <Route path="/paths" element={<LearningPaths />} />
              <Route path="/paths/:id" element={<LearningPathDetail />} />
              <Route path="/learning-paths" element={<Navigate to="/paths" replace />} />
              <Route path="/learning-paths/:id" element={<Navigate to="/paths" replace />} />
              <Route path="/help" element={<Help />} />
              <Route path="/help/:slug" element={<HelpArticle />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/:city" element={<Locations />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/instructors" element={<InstructorsIndex />} />
              <Route path="/testimonials" element={<TestimonialsPage />} />
              <Route path="/newsletter/confirm" element={<NewsletterAction mode="confirm" />} />
              <Route path="/newsletter/unsubscribe" element={<NewsletterAction mode="unsubscribe" />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/wishlist" element={<Navigate to="/bookmarks" replace />} />
              <Route path="/account" element={<Account />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/:id" element={<SupportTicket />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/refer" element={<Refer />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:slug" element={<CategoryCourses />} />
              <Route path="/cohorts" element={<Cohorts />} />
              <Route path="/cohorts/:id" element={<CohortSpace />} />
              <Route path="/bootcamp" element={<Bootcamp />} />
              <Route path="/instructor" element={<InstructorLayout />}>
                <Route index element={<InstructorOverview />} />
                <Route path="students" element={<InstructorStudents />} />
                <Route path="students/:userId" element={<InstructorStudentDetail />} />
                <Route path="cohort" element={<InstructorCohort />} />
                <Route path="assignments" element={<InstructorAssignments />} />
                <Route path="assignments/:assignmentId" element={<InstructorAssignmentGrading />} />
                <Route path="quizzes" element={<InstructorQuizzes />} />
                <Route path="assist" element={<InstructorAssist />} />
              </Route>
              <Route path="/terms" element={<Legal />} />
              <Route path="/privacy" element={<Legal />} />
              <Route path="/refund-policy" element={<Legal />} />
              <Route path="/cookie-policy" element={<Legal />} />

              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <Suspense fallback={<AdminFallback />}>
                      <AdminLayout />
                    </Suspense>
                  </RequireAdmin>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="dashboards" element={<AdminDashboards />} />

                {/* Hub routes (primary) */}
                <Route path="analytics" element={<AdminAnalyticsHub />} />
                <Route path="courses" element={<AdminCoursesHub />} />
                <Route path="people" element={<AdminPeopleHub />} />
                <Route path="assessments" element={<AdminAssessmentsHub />} />
                <Route path="communication" element={<AdminCommunicationHub />} />
                <Route path="commerce" element={<AdminCommerceHub />} />
                <Route path="jobs-hub" element={<AdminJobsHub />} />
                <Route path="content-hub" element={<AdminContentHub />} />
                <Route path="system" element={<AdminSystemHub />} />
                <Route path="finance" element={<AdminFinanceHub />} />
                <Route path="cohorts" element={<AdminCohorts />} />
                <Route path="bootcamps" element={<Navigate to="/admin/commerce?tab=bootcamps" replace />} />
                <Route path="learners/:userId" element={<AdminLearnerDetail />} />
                <Route path="finance/refunds" element={<Navigate to="/admin/finance?tab=refunds" replace />} />
                <Route path="finance/payouts" element={<Navigate to="/admin/finance?tab=payouts" replace />} />
                <Route path="finance/tax" element={<Navigate to="/admin/finance?tab=tax" replace />} />
                <Route path="permissions" element={<Navigate to="/admin/system?tab=permissions" replace />} />

                {/* Course builder & module editor (standalone wizard) */}
                <Route path="courses/new" element={<AdminCourseCreate />} />
                <Route path="courses/:courseId/edit" element={<AdminCourseCreate />} />
                <Route path="courses/:courseId/modules" element={<AdminCourseModules />} />

                {/* Legacy redirects → hub + tab */}
                <Route path="categories" element={<Navigate to="/admin/courses?tab=categories" replace />} />
                <Route path="tags" element={<Navigate to="/admin/courses?tab=tags" replace />} />
                <Route path="brands" element={<Navigate to="/admin/courses?tab=brands" replace />} />
                <Route path="paths" element={<Navigate to="/admin/courses?tab=paths" replace />} />
                <Route path="reviews" element={<Navigate to="/admin/courses?tab=reviews" replace />} />
                <Route path="certificates" element={<Navigate to="/admin/courses?tab=certificates" replace />} />
                <Route path="instructors" element={<Navigate to="/admin/courses?tab=instructors" replace />} />
                <Route path="promoted-banner" element={<Navigate to="/admin/courses?tab=promoted-banner" replace />} />

                <Route path="leads-hub" element={<Navigate to="/admin/people?tab=leads-hub" replace />} />
                <Route path="students" element={<Navigate to="/admin/people?tab=students" replace />} />
                <Route path="enrollments" element={<Navigate to="/admin/people?tab=enrollments" replace />} />
                <Route path="registrations" element={<Navigate to="/admin/people?tab=registrations" replace />} />
                <Route path="business-leads" element={<Navigate to="/admin/people?tab=business-leads" replace />} />
                <Route path="qna" element={<Navigate to="/admin/people?tab=qna" replace />} />

                <Route path="quizzes" element={<Navigate to="/admin/assessments?tab=quizzes" replace />} />
                <Route path="quiz-attempts" element={<Navigate to="/admin/assessments?tab=attempts" replace />} />

                <Route path="announcements" element={<Navigate to="/admin/communication?tab=announcements" replace />} />
                <Route path="notifications" element={<Navigate to="/admin/communication?tab=notifications" replace />} />
                <Route path="live-classes" element={<Navigate to="/admin/communication?tab=live-classes" replace />} />
                <Route path="chat" element={<Navigate to="/admin/communication?tab=chat" replace />} />
                <Route path="support-tickets" element={<Navigate to="/admin/communication?tab=tickets" replace />} />
                <Route path="email" element={<Navigate to="/admin/communication?tab=email" replace />} />
                <Route path="email-templates" element={<Navigate to="/admin/communication?tab=email-templates" replace />} />

                <Route path="orders" element={<Navigate to="/admin/commerce?tab=orders" replace />} />
                <Route path="pricing" element={<Navigate to="/admin/commerce?tab=pricing" replace />} />
                <Route path="cart-abandonment" element={<Navigate to="/admin/commerce?tab=cart-abandonment" replace />} />
                <Route path="influencers-marketing" element={<Navigate to="/admin/commerce?tab=influencers" replace />} />
                <Route path="marketing" element={<Navigate to="/admin/analytics?tab=marketing" replace />} />

                <Route path="jobs" element={<Navigate to="/admin/jobs-hub?tab=listings" replace />} />
                <Route path="job-applications" element={<Navigate to="/admin/jobs-hub?tab=applications" replace />} />

                <Route path="home-content" element={<Navigate to="/admin/content-hub?tab=home" replace />} />
                <Route path="content" element={<Navigate to="/admin/content-hub?tab=site" replace />} />
                <Route path="pages" element={<Navigate to="/admin/content-hub?tab=pages" replace />} />
                <Route path="blog" element={<Navigate to="/admin/content-hub?tab=blog" replace />} />
                <Route path="testimonials" element={<Navigate to="/admin/content-hub?tab=testimonials" replace />} />
                <Route path="media" element={<Navigate to="/admin/content-hub?tab=media" replace />} />

                <Route path="users" element={<Navigate to="/admin/system?tab=users" replace />} />
                <Route path="settings" element={<Navigate to="/admin/system?tab=settings" replace />} />
                <Route path="login-security" element={<Navigate to="/admin/system?tab=login-security" replace />} />
                <Route path="sessions" element={<Navigate to="/admin/system?tab=sessions" replace />} />
                <Route path="activity-log" element={<Navigate to="/admin/system?tab=activity-log" replace />} />
                <Route path="seo" element={<Navigate to="/admin/system?tab=seo" replace />} />
                <Route path="custom-scripts" element={<Navigate to="/admin/system?tab=custom-scripts" replace />} />
                <Route path="help" element={<AdminHelp />} />

                <Route path="course-health" element={<Navigate to="/admin/analytics?tab=course-health" replace />} />
                <Route path="user-activity" element={<Navigate to="/admin/analytics?tab=user-activity" replace />} />
                <Route path="wishlist" element={<Navigate to="/admin/analytics?tab=wishlist" replace />} />
              </Route>

              <Route path="/error" element={<ErrorPage />} />
              <Route path="/500" element={<ErrorPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </RouteErrorBoundary>
            <AiCoach />
            <CustomScripts />
            <CookieBanner />
            <SignupPrompt />
            <GadsLabelsLoader />
            <SignupPromptModal />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
