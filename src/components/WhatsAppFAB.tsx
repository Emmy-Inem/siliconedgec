import { forwardRef, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const WhatsAppFAB = forwardRef<HTMLAnchorElement>(function WhatsAppFAB(_, ref) {
  const { data: settings } = useSiteSettings();
  const [aiCoachActive, setAiCoachActive] = useState(() =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-ai-coach-active") === "true"
  );

  useEffect(() => {
    setAiCoachActive(document.documentElement.getAttribute("data-ai-coach-active") === "true");
    const onPresence = (e: Event) => {
      const customEvent = e as CustomEvent<{ active?: boolean }>;
      setAiCoachActive(Boolean(customEvent?.detail?.active));
    };
    window.addEventListener("sec:ai-coach-presence", onPresence);
    return () => window.removeEventListener("sec:ai-coach-presence", onPresence);
  }, []);

  const raw = settings?.whatsapp_number || "";
  const number = raw.replace(/\D/g, "");
  // Hide FAB if not configured (placeholder or empty) or when AI Coach is active
  if (aiCoachActive || !number || raw.toUpperCase().includes("UPDATE")) return null;

  return (
    <a
      ref={ref}
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-primary-foreground" />
    </a>
  );
});
