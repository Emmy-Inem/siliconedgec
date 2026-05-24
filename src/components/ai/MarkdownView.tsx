import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-code:before:hidden prose-code:after:hidden", className)}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}