import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Renders markdown and turns inline citation tokens like `[L1]`, `[L2]` and
 * `[Lesson: <title>]` into small chips so the AI tutor's grounded answers feel
 * trustworthy. Anything else is rendered as-is.
 */
function renderWithCitations(text: string): React.ReactNode[] {
  const pattern = /\[(L\d+|Lesson:\s*[^\]]+)\]/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span
        key={`c-${i++}`}
        className="inline-flex items-center align-baseline rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary mx-0.5"
        title="Grounded in lesson context"
      >
        {m[1].replace(/^Lesson:\s*/, "")}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-code:before:hidden prose-code:after:hidden", className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p>
              {Array.isArray(children)
                ? children.map((c, i) =>
                    typeof c === "string" ? <span key={i}>{renderWithCitations(c)}</span> : c,
                  )
                : typeof children === "string"
                  ? renderWithCitations(children)
                  : children}
            </p>
          ),
          li: ({ children }) => (
            <li>
              {Array.isArray(children)
                ? children.map((c, i) =>
                    typeof c === "string" ? <span key={i}>{renderWithCitations(c)}</span> : c,
                  )
                : typeof children === "string"
                  ? renderWithCitations(children)
                  : children}
            </li>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}