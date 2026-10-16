import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageCircle,
  Route,
  HelpCircle,
  Sparkles,
  Send,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import aiCoachAvatar from "@/assets/ai-coach-avatar.png";
import { COURSE_DETAIL_FAQS } from "./courseFaqs";

interface CourseAiCoachProps {
  courseTitle: string;
  courseSlug: string;
}

type CoachView = "menu" | "quiz" | "faqs";

const EXPERIENCE_OPTIONS = [
  { id: "beginner", label: "🌱 Complete Beginner", desc: "Brand new — no prior technical background" },
  { id: "intermediate", label: "🚀 Some Experience", desc: "Know the basics, ready for structured mastery" },
  { id: "pro", label: "💼 Working Professional", desc: "Want practical workflows & 10x productivity" },
];

const GOAL_OPTIONS = [
  { id: "productivity", label: "⚡ Save 10+ hrs/week & automate work" },
  { id: "career", label: "🎯 Land a promotion or high-growth tech role" },
  { id: "projects", label: "🛠️ Build real projects & earn a certificate" },
];

/**
 * An interactive, lively AI Coach companion for course pages.
 * Features floating levitation, pulsing aura, rotating curiosity prompts,
 * a 2-step "Is this course right for me?" fit quiz, inline FAQs, and
 * direct question handoff to the live AI assistant.
 */
export function CourseAiCoach({ courseTitle, courseSlug }: CourseAiCoachProps) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<CoachView>("menu");
  const [isHovered, setIsHovered] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");

  // Fit Quiz state
  const [quizStep, setQuizStep] = useState<1 | 2 | 3>(1);
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  // Inline FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("dismissed_ai_coach_bubble") === "true";
  });

  const teasers = [
    {
      text: `👋 Not sure if ${courseTitle} is right for you? Take a 15-sec fit check!`,
      targetView: "quiz" as CoachView,
    },
    {
      text: "✨ Curious what projects & skills you'll master? Ask me anything!",
      targetView: "menu" as CoachView,
    },
    {
      text: "🗺️ Want to see the full career learning path for this track?",
      targetView: "menu" as CoachView,
    },
    {
      text: "💡 Need quick answers on certificates, live classes, or installments?",
      targetView: "faqs" as CoachView,
    },
  ];

  // Show teaser bubble after short delay & rotate messages periodically
  useEffect(() => {
    if (dismissed || panelOpen) return;
    const showTimer = setTimeout(() => setBubbleVisible(true), 2500);
    return () => clearTimeout(showTimer);
  }, [dismissed, panelOpen]);

  useEffect(() => {
    if (!bubbleVisible || panelOpen) return;
    const interval = setInterval(() => {
      setBubbleIndex((prev) => (prev + 1) % teasers.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [bubbleVisible, panelOpen, teasers.length]);

  const dismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBubbleVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem("dismissed_ai_coach_bubble", "true");
    } catch {}
  };

  const openChatWithQuestion = (question?: string) => {
    setPanelOpen(false);
    setBubbleVisible(false);
    window.dispatchEvent(
      new CustomEvent("sec:open-live-chat", {
        detail: {
          resetToAi: true,
          initialQuestion: question,
        },
      })
    );
  };

  const handleMiniSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customQuestion.trim();
    if (!trimmed) return;
    setCustomQuestion("");
    openChatWithQuestion(`Regarding "${courseTitle}": ${trimmed}`);
  };

  const learningPathUrl =
    courseSlug.includes("ai-") ||
    courseTitle.toLowerCase().includes("ai") ||
    courseTitle.toLowerCase().includes("llm")
      ? "/paths/ai-generative-productivity-track"
      : courseTitle.toLowerCase().includes("cloud") ||
        courseTitle.toLowerCase().includes("azure")
      ? "/paths/cloud-engineering-accelerator-track"
      : "/paths";

  const resetQuiz = () => {
    setQuizStep(1);
    setSelectedExp(null);
    setSelectedGoal(null);
  };

  const currentTeaser = teasers[bubbleIndex % teasers.length];

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex flex-col items-start gap-2.5 print:hidden">
      {/* Interactive Rotating Curiosity Bubble */}
      <AnimatePresence mode="wait">
        {(bubbleVisible || (isHovered && !panelOpen)) && !panelOpen && (
          <motion.div
            key={bubbleIndex}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            onClick={() => {
              setView(currentTeaser.targetView);
              setPanelOpen(true);
              setBubbleVisible(false);
            }}
            className="group relative max-w-[250px] sm:max-w-[270px] cursor-pointer rounded-2xl rounded-bl-sm border border-primary/25 bg-card/95 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-primary/50 px-4 py-3 transition-all"
          >
            <button
              type="button"
              onClick={dismissBubble}
              aria-label="Dismiss AI Coach tip"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>AI Course Coach</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed font-medium group-hover:text-primary transition-colors">
              {currentTeaser.text}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              Click to explore <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Multi-View Coach Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-[310px] sm:w-[350px] rounded-2xl border border-primary/25 bg-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                {view !== "menu" ? (
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="p-1 -ml-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Back to menu"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="relative shrink-0">
                    <img
                      src={aiCoachAvatar}
                      alt="AI Coach"
                      width={34}
                      height={34}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/40"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-heading font-bold text-foreground truncate flex items-center gap-1.5">
                    {view === "menu" && "AI Course Coach"}
                    {view === "quiz" && "15-Sec Course Fit Check"}
                    {view === "faqs" && "Course FAQs"}
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  </h4>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {view === "menu" ? "Online • Personal Learning Advisor" : courseTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close AI Coach"
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-3.5 overflow-y-auto space-y-3 flex-1">
              {view === "menu" && (
                <>
                  {/* Coach Greeting Bubble */}
                  <div className="rounded-xl bg-muted/50 border border-border/60 p-3 text-xs text-foreground leading-relaxed">
                    Hi there! 👋 I'm your AI Coach for{" "}
                    <span className="font-semibold text-primary">{courseTitle}</span>. How can I help you today?
                  </div>

                  {/* Highlighted Interactive Fit Check Card */}
                  <button
                    type="button"
                    onClick={() => {
                      resetQuiz();
                      setView("quiz");
                    }}
                    className="w-full group relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 text-left hover:border-primary/60 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          <Zap className="h-3 w-3" /> Interactive Quiz
                        </span>
                        <p className="text-xs font-semibold text-foreground">
                          Is this course right for me?
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Answer 2 quick questions for a personalized match score.
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Quick One-Click Smart Prompts */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      Instant AI Answers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "What will I build?",
                        "Do I need coding experience?",
                        "Build me a 4-week study plan",
                        "Installment payment options?",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() =>
                            openChatWithQuestion(`For the course "${courseTitle}": ${prompt}`)
                          }
                          className="text-[11px] px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors text-left"
                        >
                          💬 {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="space-y-1 pt-1 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => openChatWithQuestion()}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                        Open Live AI Chat Assistant
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>

                    <Link
                      to={learningPathUrl}
                      onClick={() => setPanelOpen(false)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Route className="h-4 w-4 text-primary shrink-0" />
                        See the full learning path
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setView("faqs")}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                        Read the course FAQs
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </>
              )}

              {/* VIEW 2: Interactive 2-Step Fit Quiz */}
              {view === "quiz" && (
                <div className="space-y-3">
                  {quizStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Step 1 of 2</span>
                        <span className="font-semibold text-primary">50%</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        What is your current experience level?
                      </p>
                      <div className="space-y-2">
                        {EXPERIENCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedExp(opt.id);
                              setQuizStep(2);
                            }}
                            className="w-full text-left p-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                          >
                            <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                            <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {quizStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Step 2 of 2</span>
                        <span className="font-semibold text-primary">100%</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        What is your #1 goal for taking this course?
                      </p>
                      <div className="space-y-2">
                        {GOAL_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedGoal(opt.id);
                              setQuizStep(3);
                            }}
                            className="w-full text-left p-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium text-foreground"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {quizStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            98% Match Score
                          </span>
                          <h5 className="text-xs font-bold text-foreground">
                            Great fit for your goals!
                          </h5>
                        </div>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {selectedExp === "beginner"
                          ? `This program starts from the ground up with zero jargon and guides you step-by-step.`
                          : `You'll skip the fluff and dive straight into repeatable frameworks, real-world labs, and capstone workflows.`}{" "}
                        {selectedGoal === "productivity"
                          ? `Expect to reclaim 10+ hours a week with ready-to-use templates.`
                          : `You'll graduate with a verifiable Silicon Edge certificate and portfolio project.`}
                      </p>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            openChatWithQuestion(
                              `I'm a ${selectedExp} learner looking to ${selectedGoal} with "${courseTitle}". Can you give me a tailored study plan?`
                            )
                          }
                          className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <GraduationCap className="h-3.5 w-3.5" />
                          Get My Custom Study Plan
                        </button>
                        <button
                          type="button"
                          onClick={resetQuiz}
                          className="text-[11px] text-muted-foreground hover:text-foreground text-center py-1"
                        >
                          Retake quiz
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* VIEW 3: Inline Interactive FAQs */}
              {view === "faqs" && (
                <div className="space-y-2">
                  {COURSE_DETAIL_FAQS.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/70 bg-background overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between gap-2 p-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="px-2.5 pb-2.5 text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
                                {faq.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      openChatWithQuestion(`I have a question about "${courseTitle}"`)
                    }
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Ask a different question
                  </button>
                </div>
              )}
            </div>

            {/* Direct Mini-Input Footer */}
            <form
              onSubmit={handleMiniSubmit}
              className="p-2.5 border-t border-border bg-muted/20 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask AI Coach anything…"
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={!customQuestion.trim()}
                aria-label="Send question to AI Coach"
                className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lively Floating Avatar Button */}
      <div
        className="relative flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer pulsing aura rings */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary/30 via-emerald-400/20 to-primary/30 blur-sm animate-pulse pointer-events-none" />
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-duration:2.8s] motion-reduce:hidden pointer-events-none" />

        <motion.button
          type="button"
          onClick={() => {
            setPanelOpen((v) => !v);
            setBubbleVisible(false);
          }}
          aria-label="Open AI Coach"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: panelOpen ? 0 : [0, -5, 0],
          }}
          whileHover={{
            scale: 1.08,
            rotate: [0, -4, 4, 0],
            transition: { duration: 0.35 },
          }}
          whileTap={{ scale: 0.93 }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { type: "spring", stiffness: 260, damping: 20 },
            y: {
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="relative h-16 w-16 rounded-full bg-card border-2 border-primary/50 shadow-xl hover:shadow-primary/25 hover:border-primary overflow-visible transition-colors"
        >
          <div className="h-full w-full rounded-full overflow-hidden">
            <img
              src={aiCoachAvatar}
              alt="AI Coach"
              loading="lazy"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Floating top-left badge */}
          <motion.span
            animate={{ scale: isHovered ? 1.15 : [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-md flex items-center gap-0.5 pointer-events-none"
          >
            <Sparkles className="h-2.5 w-2.5" />
            {isHovered ? "Hi! 👋" : "AI"}
          </motion.span>

          {/* Online status indicator dot */}
          <span
            title="AI Coach Online"
            className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center pointer-events-none"
          >
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          </span>
        </motion.button>
      </div>
    </div>
  );
}
