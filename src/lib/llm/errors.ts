import { getActiveProvider } from "@/lib/llm/model-options";

export function formatChatError(error: Error): string {
  const message = error.message.toLowerCase();
  const provider = getActiveProvider();
  const providerName = provider === "groq" ? "Groq" : "OpenAI";

  if (message.includes("insufficient_quota") || message.includes("quota")) {
    if (provider === "groq") {
      return "Groq quota or rate limit reached. Check console.groq.com or try again later.";
    }
    return "OpenAI quota exceeded. Add billing at platform.openai.com/account/billing.";
  }
  if (message.includes("invalid_api_key") || message.includes("incorrect api key")) {
    if (provider === "groq") {
      return "Invalid Groq API key. Set GROQ_API_KEY in .env (from console.groq.com).";
    }
    return "Invalid OpenAI API key. Set OPENAI_API_KEY in .env.";
  }
  if (message.includes("rate_limit") || message.includes("rate limit")) {
    return `${providerName} rate limit hit. Wait a moment and try again.`;
  }
  if (message.includes("model") && message.includes("not found")) {
    return `Model not found on ${providerName}. Pick a model from the dropdown.`;
  }

  return error.message || "Something went wrong while generating a response.";
}
