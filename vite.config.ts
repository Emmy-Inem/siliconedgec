import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Fallbacks so production/publish builds work even when .env is unavailable
// (the .env file is git-ignored; the publishable key is public by design).
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://sdddxnjlgjjaoayyraxn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZGR4bmpsZ2pqYW9heXlyYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzY3MjMsImV4cCI6MjA4ODU1MjcyM30.sR14_CsbMhO3uX-7GYl12FZd2fDcj80smnoK4tE4IVI";
const SUPABASE_PROJECT_ID =
  process.env.VITE_SUPABASE_PROJECT_ID || "sdddxnjlgjjaoayyraxn";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      SUPABASE_PUBLISHABLE_KEY,
    ),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
      SUPABASE_PROJECT_ID,
    ),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: ["**/.git/**", "**/node_modules/**", "**/supabase/**", "**/.github/**"],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-framer": ["framer-motion"],
          "vendor-pdf": ["jspdf", "html2canvas"],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
}));
