import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Bot, Route, HelpCircle } from "lucide-react";

interface CourseAiCoachProps {
  courseTitle: string;
  courseSlug: string;
}

/**
 * A small, non-intrusive AI Coach avatar for course pages. It sits in the
 * bottom corner, shows one short curiosity bubble after a delay, and opens a
 * compact panel with helpful next steps (AI chat, learning paths, FAQ).
 */
export function CourseAiCoach({ courseTitle, courseSlug }: CourseAiCoachProps) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("dismissed_ai_coach_bubble") === "true";
  });

  // Show the teaser bubble once, after a short delay, unless dismissed before
  useEffect(() => {
    if (dismissed) return;
    const show = setTimeout(() => setBubbleVisible(true), 4000);
    const hide = setTimeout(() => setBubbleVisible(false), 16000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [dismissed]);

  const dismissBubble = () => {
    setBubbleVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem("dismissed_ai_coach_bubble", "true");
    } catch {}
  };

  const openChat = () => {
    setPanelOpen(false);
    setBubbleVisible(false);
    window.dispatchEvent(new CustomEvent("sec:open-live-chat"));
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 flex flex-col items-end gap-2 print:hidden">
      {/* Curiosity bubble */}
      <AnimatePresence>
        {bubbleVisible && !panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative max-w-[220px] rounded-2xl rounded-br-sm border border-border bg-card shadow-lg px-3.5 py-2.5"
          >
            <button
              type="button"
              onClick={dismissBubble}
              aria-label="Dismiss AI Coach tip"
              className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-xs text-foreground leading-snug">
              Not sure if <span className="font-semibold">{courseTitle}</span> is right for you? I can help you decide.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coach panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="w-64 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <span className="text-sm font-heading font-semibold text-foreground">AI Coach</span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close AI Coach"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-1.5">
              <button
                type="button"
                onClick={openChat}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                Ask a question about this course
              </button>
              <Link
                to="/learning-paths"
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Route className="h-4 w-4 text-muted-foreground shrink-0" />
                See the full learning path
              </Link>
              <Link
                to={`/courses/${courseSlug}`}
                onClick={() => setPanelOpen(false)}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                Read the course FAQs
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar button */}
      <motion.button
        type="button"
        onClick={() => {
          setPanelOpen((v) => !v);
          setBubbleVisible(false);
        }}
        aria-label="Open AI Coach"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
        className="relative h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all"
      >
        <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping [animation-duration:3s] motion-reduce:hidden pointer-events-none" />
        <Bot className="h-5 w-5 text-muted-foreground" />
      </motion.button>
    </div>
  );
}
