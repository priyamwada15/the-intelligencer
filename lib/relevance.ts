const AI_WORD_KEYWORDS = ["ai", "llm", "gpt", "claude", "gemini", "copilot"];
const AI_PHRASE_KEYWORDS = [
  "artificial intelligence",
  "machine learning",
  "large language model",
  "chatbot",
  "openai",
  "anthropic",
  "chatgpt",
  "neural network",
  "generative ai",
];

export function isAiRelevant(title: string, description: string | null): boolean {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  if (AI_PHRASE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return true;
  }
  return AI_WORD_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(haystack));
}
