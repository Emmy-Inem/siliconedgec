import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { streamText, type ModelMessage } from "npm:ai@6";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.ts";

export function createResponsesCall(
  request: Request,
  config: { baseURL: string; apiKey: string; model: string },
  messages: ModelMessage[],
  instructions?: string,
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const gemini = config.baseURL === "https://generativelanguage.googleapis.com/v1beta/openai";
  const provider = createOpenAI({
    baseURL: config.baseURL.replace(/\/+$/, ""),
    apiKey: config.apiKey,
    ...(gemini ? {} : { headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } }),
    fetch: gemini ? fetch : runIdFetch.fetch,
  });
  const reasoning = config.model !== "openai/chat-latest";
  const result = streamText({
    model: gemini ? provider.chat(config.model) : provider.responses(config.model),
    maxRetries: 0,
    // AI SDK 6 lacks `instructions`: rename this key to `system` there.
    ...(instructions ? { system: instructions } : {}),
    messages,
    abortSignal: request.signal,
    ...(gemini ? {} : { providerOptions: {
      openai: {
        store: false,
        ...(reasoning
          ? {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            }
          : {}),
      },
    } }),
  });
  return {
    result,
    response: () => {
      const response = result.toUIMessageStreamResponse({ sendReasoning: !gemini });
      return gemini ? Promise.resolve(response) : withLovableAiGatewayRunIdHeader(response, runIdFetch);
    },
  };
}
