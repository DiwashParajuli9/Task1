import type { ModelOption } from "@/types";
import { env } from "@/lib/env";

export const GROQ_MODELS: ModelOption[] = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", provider: "groq" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", provider: "groq" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", provider: "groq" },
];

export const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
];

export type LlmProvider = "groq" | "openai";

export function getActiveProvider(): LlmProvider {
  const explicit = env("LLM_PROVIDER")?.toLowerCase();
  if (explicit === "groq" || explicit === "openai") return explicit;

  const base = env("OPENAI_BASE_URL")?.toLowerCase() ?? "";
  if (base.includes("groq.com")) return "groq";

  return "openai";
}

export function getAvailableModels(): ModelOption[] {
  return getActiveProvider() === "groq" ? GROQ_MODELS : OPENAI_MODELS;
}

export function getDefaultModelId(): string {
  const configured = env("DEFAULT_MODEL");
  const models = getAvailableModels();
  if (configured && models.some((m) => m.id === configured)) {
    return configured;
  }
  return models[0]?.id ?? "llama-3.3-70b-versatile";
}

/** Map stale OpenAI model ids (DB/UI) to a valid model for the active provider. */
export function normalizeModelId(modelId: string | undefined): string {
  const models = getAvailableModels();
  const fallback = getDefaultModelId();

  if (!modelId) return fallback;
  if (models.some((m) => m.id === modelId)) return modelId;

  return fallback;
}
