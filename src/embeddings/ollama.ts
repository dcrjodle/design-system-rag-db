import { Ollama } from "ollama";
import type { Embedder } from "./index.js";

export function createOllamaEmbedder(): Embedder {
  const client = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://localhost:11434" });
  const model = process.env.OLLAMA_MODEL ?? "nomic-embed-text";

  return {
    async embed(text: string) {
      const { embeddings } = await client.embed({ model, input: text });
      return embeddings[0];
    },
  };
}
