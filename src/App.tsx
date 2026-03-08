import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAdmin } from "@/components/RequireAdmin";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
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
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminSiteContent from "./pages/admin/AdminSiteContent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/for-businesses" element={<ForBusinesses />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminOverview />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="instructors" element={<AdminInstructors />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="enrollments" element={<AdminEnrollments />} />
              <Route path="testimonials" element={<AdminTestimonials />} />
              <Route path="pricing" element={<AdminPricing />} />
              <Route path="content" element={<AdminSiteContent />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
