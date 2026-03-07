import { MessageCircle } from "lucide-react";

export function WhatsAppFAB() {
  return (
    <a
      href="https://wa.me/2348001234567"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-primary-foreground" />
    </a>
  );
}
