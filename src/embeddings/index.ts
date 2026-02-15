import "dotenv/config";
import { createOpenAIEmbedder } from "./openai.js";
import { createOllamaEmbedder } from "./ollama.js";

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

export function getEmbedder(): Embedder {
  const provider = process.env.EMBEDDING_PROVIDER ?? "openai";
  if (provider === "ollama") return createOllamaEmbedder();
  return createOpenAIEmbedder();
}
