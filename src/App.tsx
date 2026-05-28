import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CartProvider } from "@/contexts/CartContext";
import { RequireAdmin } from "@/components/RequireAdmin";
import { UtmTracker } from "@/components/UtmTracker";
import { InfluencerSignupPrompt } from "@/components/InfluencerSignupPrompt";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Cart from "./pages/Cart";
import ForBusinesses from "./pages/ForBusinesses";
import Certificates from "./pages/Certificates";
import Pricing from "./pages/Pricing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CourseLearning from "./pages/CourseLearning";
import VerifyCertificate from "./pages/VerifyCertificate";
import VerifyReceipt from "./pages/VerifyReceipt";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import RedirectInfluencer from "./pages/RedirectInfluencer";
import { LiveChat } from "./components/LiveChat";
import { CustomScripts } from "./components/CustomScripts";
import { CookieBanner } from "./components/CookieBanner";
import { GadsLabelsLoader } from "./components/GadsLabelsLoader";
import { HelmetProvider } from "react-helmet-async";
import CmsPagePublic from "./pages/CmsPage";
import InstructorDetail from "./pages/InstructorDetail";
import LearningPaths from "./pages/LearningPaths";
import LearningPathDetail from "./pages/LearningPathDetail";

// Code-split admin pages — they only load when an admin route is visited
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminCourseCreate = lazy(() => import("./pages/admin/AdminCourseCreate"));
const AdminCourseModules = lazy(() => import("./pages/admin/AdminCourseModules"));
const AdminInstructors = lazy(() => import("./pages/admin/AdminInstructors"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminEnrollments = lazy(() => import("./pages/admin/AdminEnrollments"));
const AdminTestimonials = lazy(() => import("./pages/admin/AdminTestimonials"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const AdminSiteContent = lazy(() => import("./pages/admin/AdminSiteContent"));
const AdminInfluencerMarketing = lazy(() => import("./pages/admin/AdminInfluencerMarketing"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminMarketingAnalytics = lazy(() => import("./pages/admin/AdminMarketingAnalytics"));
const AdminEmail = lazy(() => import("./pages/admin/AdminEmail"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminTags = lazy(() => import("./pages/admin/AdminTags"));
const AdminLearningPaths = lazy(() => import("./pages/admin/AdminLearningPaths"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminQuizzes = lazy(() => import("./pages/admin/AdminQuizzes"));
const AdminQuizAttempts = lazy(() => import("./pages/admin/AdminQuizAttempts"));
const AdminQnA = lazy(() => import("./pages/admin/AdminQnA"));
const AdminCourseAnnouncements = lazy(() => import("./pages/admin/AdminCourseAnnouncements"));
const AdminBusinessLeads = lazy(() => import("./pages/admin/AdminBusinessLeads"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs"));
const AdminJobApplications = lazy(() => import("./pages/admin/AdminJobApplications"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminCustomScripts = lazy(() => import("./pages/admin/AdminCustomScripts"));
const AdminLiveClasses = lazy(() => import("./pages/admin/AdminLiveClasses"));
const AdminRegistrations = lazy(() => import("./pages/admin/AdminRegistrations"));
const AdminSEO = lazy(() => import("./pages/admin/AdminSEO"));
const AdminUserActivity = lazy(() => import("./pages/admin/AdminUserActivity"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminLeadsHub = lazy(() => import("./pages/admin/AdminLeadsHub"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCertificates = lazy(() => import("./pages/admin/AdminCertificates"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminCartAbandonment = lazy(() => import("./pages/admin/AdminCartAbandonment"));
const AdminLoginSecurity = lazy(() => import("./pages/admin/AdminLoginSecurity"));
const AdminWishlistInsights = lazy(() => import("./pages/admin/AdminWishlistInsights"));
const AdminCourseHealth = lazy(() => import("./pages/admin/AdminCourseHealth"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminHomeContent = lazy(() => import("./pages/admin/AdminHomeContent"));
const AdminSessions = lazy(() => import("./pages/admin/AdminSessions"));

// Hub pages (consolidated tabbed views)
const AdminAnalyticsHub = lazy(() => import("./pages/admin/hubs/AdminAnalyticsHub"));
const AdminCoursesHub = lazy(() => import("./pages/admin/hubs/AdminCoursesHub"));
const AdminPeopleHub = lazy(() => import("./pages/admin/hubs/AdminPeopleHub"));
const AdminAssessmentsHub = lazy(() => import("./pages/admin/hubs/AdminAssessmentsHub"));
const AdminCommunicationHub = lazy(() => import("./pages/admin/hubs/AdminCommunicationHub"));
const AdminCommerceHub = lazy(() => import("./pages/admin/hubs/AdminCommerceHub"));
const AdminJobsHub = lazy(() => import("./pages/admin/hubs/AdminJobsHub"));
const AdminContentHub = lazy(() => import("./pages/admin/hubs/AdminContentHub"));
const AdminSystemHub = lazy(() => import("./pages/admin/hubs/AdminSystemHub"));

const AdminFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <UtmTracker />
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/for-businesses" element={<ForBusinesses />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses/:id/learn" element={<CourseLearning />} />
              <Route path="/verify/:code" element={<VerifyCertificate />} />
              <Route path="/verify-receipt/:reference" element={<VerifyReceipt />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/r/:slug" element={<RedirectInfluencer />} />
              <Route path="/p/:slug" element={<CmsPagePublic />} />
              <Route path="/instructors/:id" element={<InstructorDetail />} />
              <Route path="/paths" element={<LearningPaths />} />
              <Route path="/paths/:id" element={<LearningPathDetail />} />

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

                <Route path="course-health" element={<Navigate to="/admin/analytics?tab=course-health" replace />} />
                <Route path="user-activity" element={<Navigate to="/admin/analytics?tab=user-activity" replace />} />
                <Route path="wishlist" element={<Navigate to="/admin/analytics?tab=wishlist" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <LiveChat />
            <CustomScripts />
            <CookieBanner />
            <GadsLabelsLoader />
            <InfluencerSignupPrompt />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
