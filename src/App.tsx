import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCourseCreate from "./pages/admin/AdminCourseCreate";
import AdminCourseModules from "./pages/admin/AdminCourseModules";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminSiteContent from "./pages/admin/AdminSiteContent";
import AdminInfluencerMarketing from "./pages/admin/AdminInfluencerMarketing";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminMarketingAnalytics from "./pages/admin/AdminMarketingAnalytics";
import AdminEmail from "./pages/admin/AdminEmail";
import AdminActivityLog from "./pages/admin/AdminActivityLog";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminTags from "./pages/admin/AdminTags";
import AdminLearningPaths from "./pages/admin/AdminLearningPaths";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminQuizAttempts from "./pages/admin/AdminQuizAttempts";
import AdminQnA from "./pages/admin/AdminQnA";
import AdminCourseAnnouncements from "./pages/admin/AdminCourseAnnouncements";
import AdminBusinessLeads from "./pages/admin/AdminBusinessLeads";
import CourseLearning from "./pages/CourseLearning";
import VerifyCertificate from "./pages/VerifyCertificate";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminJobApplications from "./pages/admin/AdminJobApplications";
import AdminChat from "./pages/admin/AdminChat";
import AdminCustomScripts from "./pages/admin/AdminCustomScripts";
import AdminLiveClasses from "./pages/admin/AdminLiveClasses";
import { LiveChat } from "./components/LiveChat";
import { CustomScripts } from "./components/CustomScripts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses/:id/learn" element={<CourseLearning />} />
              <Route path="/verify/:code" element={<VerifyCertificate />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />

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
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="job-applications" element={<AdminJobApplications />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="custom-scripts" element={<AdminCustomScripts />} />
                <Route path="live-classes" element={<AdminLiveClasses />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <LiveChat />
            <CustomScripts />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
