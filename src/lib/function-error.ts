// Extracts the real error message from a failed backend function call.
export async function readFunctionError(error: any): Promise<Error> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json();
      if (body?.error) return new Error(String(body.error));
      if (body?.message) return new Error(String(body.message));
    }
  } catch {
    /* ignore */
  }
  return error instanceof Error ? error : new Error("Request failed");
}
