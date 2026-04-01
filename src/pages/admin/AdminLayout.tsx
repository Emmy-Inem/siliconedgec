import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/admin-permissions";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AdminLayout() {
  const { user, adminRole, signOut } = useAuth();
  const location = useLocation();

  // Route-level permission guard
  if (adminRole && !canAccessRoute(adminRole, location.pathname)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="font-heading font-semibold text-sm">Admin Panel</h2>
            {adminRole === "moderator" && (
              <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Moderator</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </header>
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-auto p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
