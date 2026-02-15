import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../embeddings/openai.js", () => ({
  createOpenAIEmbedder: vi.fn(() => ({ embed: async () => [0.1] })),
}));

vi.mock("../../embeddings/ollama.js", () => ({
  createOllamaEmbedder: vi.fn(() => ({ embed: async () => [0.2] })),
}));

describe("getEmbedder", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns OpenAI embedder by default", async () => {
    delete process.env.EMBEDDING_PROVIDER;
    const { getEmbedder } = await import("../../embeddings/index.js");
    const embedder = getEmbedder();
    const result = await embedder.embed("test");
    expect(result).toEqual([0.1]);
  });

  it("returns OpenAI embedder when provider is openai", async () => {
    process.env.EMBEDDING_PROVIDER = "openai";
    const { getEmbedder } = await import("../../embeddings/index.js");
    const embedder = getEmbedder();
    const result = await embedder.embed("test");
    expect(result).toEqual([0.1]);
  });

  it("returns Ollama embedder when provider is ollama", async () => {
    process.env.EMBEDDING_PROVIDER = "ollama";
    const { getEmbedder } = await import("../../embeddings/index.js");
    const embedder = getEmbedder();
    const result = await embedder.embed("test");
    expect(result).toEqual([0.2]);
  });
});
