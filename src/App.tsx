import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CartProvider } from "@/contexts/CartContext";
import { RequireAdmin } from "@/components/RequireAdmin";
import { UtmTracker } from "@/components/UtmTracker";
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
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CourseLearning from "./pages/CourseLearning";
import VerifyCertificate from "./pages/VerifyCertificate";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import RedirectInfluencer from "./pages/RedirectInfluencer";
import { LiveChat } from "./components/LiveChat";
import { CustomScripts } from "./components/CustomScripts";
import { CookieBanner } from "./components/CookieBanner";
import { HelmetProvider } from "react-helmet-async";
import CmsPagePublic from "./pages/CmsPage";

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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses/:id/learn" element={<CourseLearning />} />
              <Route path="/verify/:code" element={<VerifyCertificate />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/r/:slug" element={<RedirectInfluencer />} />
              <Route path="/p/:slug" element={<CmsPagePublic />} />

              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<AdminOverview />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="courses/new" element={<AdminCourseCreate />} />
                <Route path="courses/:courseId/edit" element={<AdminCourseCreate />} />
                <Route path="courses/:courseId/modules" element={<AdminCourseModules />} />
                <Route path="instructors" element={<AdminInstructors />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="enrollments" element={<AdminEnrollments />} />
                <Route path="testimonials" element={<AdminTestimonials />} />
                <Route path="pricing" element={<AdminPricing />} />
                <Route path="content" element={<AdminSiteContent />} />
                <Route path="influencers-marketing" element={<AdminInfluencerMarketing />} />
                <Route path="marketing" element={<AdminMarketingAnalytics />} />
                <Route path="email" element={<AdminEmail />} />
                <Route path="activity-log" element={<AdminActivityLog />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="paths" element={<AdminLearningPaths />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="quizzes" element={<AdminQuizzes />} />
                <Route path="quiz-attempts" element={<AdminQuizAttempts />} />
                <Route path="qna" element={<AdminQnA />} />
                <Route path="announcements" element={<AdminCourseAnnouncements />} />
                <Route path="business-leads" element={<AdminBusinessLeads />} />
                <Route path="leads-hub" element={<AdminLeadsHub />} />
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="job-applications" element={<AdminJobApplications />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="custom-scripts" element={<AdminCustomScripts />} />
                <Route path="live-classes" element={<AdminLiveClasses />} />
                <Route path="registrations" element={<AdminRegistrations />} />
                <Route path="seo" element={<AdminSEO />} />
                <Route path="user-activity" element={<AdminUserActivity />} />
                <Route path="brands" element={<AdminBrands />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="pages" element={<AdminPages />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="cart-abandonment" element={<AdminCartAbandonment />} />
                <Route path="login-security" element={<AdminLoginSecurity />} />
                <Route path="wishlist" element={<AdminWishlistInsights />} />
                <Route path="course-health" element={<AdminCourseHealth />} />
                <Route path="email-templates" element={<AdminEmailTemplates />} />
                <Route path="home-content" element={<AdminHomeContent />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <LiveChat />
            <CustomScripts />
            <CookieBanner />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
