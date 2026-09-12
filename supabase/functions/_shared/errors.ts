// Shared error sanitization and PII masking helpers for Supabase edge functions

/**
 * Mask an email address to protect PII in application logs.
 * Example: "john.doe@example.com" -> "jo***@example.com"
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "[unknown-email]";
  const [local, domain] = email.trim().split("@");
  if (!domain) return "[invalid-email]";
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

/**
 * Return a safe, sanitized client error response while preserving detailed
 * internal error logs on the server.
 */
export function safeErrorResponse(
  error: unknown,
  status = 500,
  corsHeaders: Record<string, string> = {},
  fallbackMessage = "An unexpected error occurred. Please try again later."
): Response {
  const internalMessage = error instanceof Error ? error.message : String(error);
  console.error(`[EdgeFunctionError] status=${status}:`, internalMessage);

  return new Response(
    JSON.stringify({
      error: fallbackMessage,
      statusCode: status,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}
