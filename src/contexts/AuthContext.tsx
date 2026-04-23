import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AdminRole } from "@/lib/admin-permissions";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminRole: AdminRole;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  adminRole: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);

  const checkAdminRole = async (userId: string) => {
    try {
      // Check admin first
      const { data: isAdm } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (isAdm) {
        setAdminRole("admin");
        return;
      }
      // Check moderator
      const { data: isMod } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "moderator",
      });
      if (isMod) {
        setAdminRole("moderator");
        return;
      }
      setAdminRole(null);
    } catch {
      setAdminRole(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminRole(session.user.id).finally(() => setLoading(false));
          // After OAuth callback, the user often lands on "/" (default OAuth
          // redirect_uri). If a post-auth destination was stashed by the
          // influencer flow, honor it here.
          if (event === "SIGNED_IN") {
            try {
              const dest = sessionStorage.getItem("sec_post_auth_redirect");
              if (dest) {
                const path = window.location.pathname;
                if (path === "/" || path.startsWith("/sign-in") || path.startsWith("/sign-up")) {
                  sessionStorage.removeItem("sec_post_auth_redirect");
                  // Defer to next tick so React has finished updating auth state.
                  setTimeout(() => {
                    window.location.replace(dest);
                  }, 50);
                }
              }
            } catch {}
          }
        } else {
          setAdminRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = adminRole === "admin" || adminRole === "moderator";

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
