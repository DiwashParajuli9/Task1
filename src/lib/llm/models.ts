import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { env } from "@/lib/env";
import {
  getActiveProvider,
  getAvailableModels,
  getDefaultModelId,
  normalizeModelId,
} from "@/lib/llm/model-options";

export {
  getActiveProvider,
  getAvailableModels,
  getDefaultModelId,
  normalizeModelId,
  GROQ_MODELS,
  OPENAI_MODELS,
} from "@/lib/llm/model-options";

export function getLlmApiKey(): string {
  const provider = getActiveProvider();
  const key =
    provider === "groq"
      ? (env("GROQ_API_KEY") ?? env("OPENAI_API_KEY") ?? env("LLM_API_KEY"))
      : (env("OPENAI_API_KEY") ?? env("LLM_API_KEY"));

  if (!key) {
    throw new Error(
      provider === "groq"
        ? "Set GROQ_API_KEY in .env (get one at console.groq.com)"
        : "Set OPENAI_API_KEY in .env",
    );
  }
  return key;
}

export function resolveModel(modelId: string): LanguageModel {
  const id = normalizeModelId(modelId);
  const provider = getActiveProvider();

  if (provider === "groq") {
    const groq = createGroq({ apiKey: getLlmApiKey() });
    return groq(id);
  }

  const openai = createOpenAI({
    apiKey: getLlmApiKey(),
    baseURL: env("OPENAI_BASE_URL"),
  });
  return openai(id);
}
