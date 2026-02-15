import { describe, it, expect, vi, beforeEach } from "vitest";
import { MOCK_EMBEDDING } from "../mock-data.js";

const mockEmbed = vi.fn();

vi.mock("ollama", () => ({
  Ollama: class {
    embed = mockEmbed;
  },
}));

import { createOllamaEmbedder } from "../../embeddings/ollama.js";

describe("createOllamaEmbedder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbed.mockResolvedValue({ embeddings: [MOCK_EMBEDDING] });
  });

  it("calls embed with correct model", async () => {
    const embedder = createOllamaEmbedder();
    await embedder.embed("hello");

    expect(mockEmbed).toHaveBeenCalledWith({
      model: "nomic-embed-text",
      input: "hello",
    });
  });

  it("returns the first embedding from the response", async () => {
    const embedder = createOllamaEmbedder();
    const result = await embedder.embed("test");
    expect(result).toEqual(MOCK_EMBEDDING);
  });
});
