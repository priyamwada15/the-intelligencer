const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "llm",
  "large language model",
  "chatbot",
  "openai",
  "anthropic",
  "chatgpt",
  "claude",
  "gemini",
  "copilot",
  "neural network",
  "generative ai",
];

export function isAiRelevant(title: string, description: string | null): boolean {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  return AI_KEYWORDS.some((keyword) => haystack.includes(keyword));
}
