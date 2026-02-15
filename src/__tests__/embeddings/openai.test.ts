import { describe, it, expect, vi, beforeEach } from "vitest";
import { MOCK_EMBEDDING } from "../mock-data.js";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: class {
    embeddings = { create: mockCreate };
  },
}));

import { createOpenAIEmbedder } from "../../embeddings/openai.js";

describe("createOpenAIEmbedder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      data: [{ embedding: MOCK_EMBEDDING }],
    });
  });

  it("calls embeddings.create with correct parameters", async () => {
    const embedder = createOpenAIEmbedder();
    await embedder.embed("hello world");

    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "hello world",
      dimensions: 1536,
    });
  });

  it("returns the embedding from the response", async () => {
    const embedder = createOpenAIEmbedder();
    const result = await embedder.embed("test");
    expect(result).toEqual(MOCK_EMBEDDING);
  });

  it("replaces newlines with spaces in input", async () => {
    const embedder = createOpenAIEmbedder();
    await embedder.embed("line1\nline2\nline3");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "line1 line2 line3" })
    );
  });
});
