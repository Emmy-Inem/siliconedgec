import { supabase } from "./client";

const directAuth = import.meta.env.VITE_SUPABASE_DIRECT_AUTH === "true";

export const appleSignInAvailable = !directAuth || import.meta.env.VITE_SUPABASE_APPLE_ENABLED === "true";

export async function signInWithSocialProvider(provider: "google" | "apple", redirectTo: string) {
  if (directAuth) {
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  }

  const { lovable } = await import("../lovable");
  return lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectTo });
}
