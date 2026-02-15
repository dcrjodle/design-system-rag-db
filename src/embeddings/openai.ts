import OpenAI from "openai";
import type { Embedder } from "./index.js";

export function createOpenAIEmbedder(): Embedder {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const dims = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

  return {
    async embed(text: string) {
      const { data } = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text.replaceAll("\n", " "),
        dimensions: dims,
      });
      return data[0].embedding;
    },
  };
}
