import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockComponents, mockTokens, mockEmbedder, MOCK_EMBEDDING } from "../../mock-data.js";

const mockDb = {
  select: vi.fn(),
};
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock("../../../db/index.js", () => ({
  db: new Proxy({}, {
    get: (_, prop) => {
      if (prop === "select") return mockDb.select;
      return undefined;
    },
  }),
}));

vi.mock("../../../embeddings/index.js", () => ({
  getEmbedder: () => mockEmbedder,
}));

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
const tools: Record<string, ToolHandler> = {};

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    tool(name: string, _desc: string, _schema: unknown, handler: ToolHandler) {
      tools[name] = handler;
    }
  },
}));

import { registerSearchTools } from "../../../mcp/tools/search.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function parse(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

function setupSearchChain(rows: unknown[]) {
  mockLimit.mockResolvedValue(rows);
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockDb.select.mockReturnValue({ from: mockFrom });
}

describe("search tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerSearchTools(server);
  });

  describe("search_components", () => {
    it("returns components with similarity scores", async () => {
      const searchResults = mockComponents.slice(0, 3).map((c) => ({
        id: c.id,
        name: c.name,
        tier: c.tier,
        usageRules: c.usageRules,
        requirements: c.requirements,
        examples: c.examples,
        similarity: 0.85,
      }));
      setupSearchChain(searchResults);

      const result = await tools["search_components"]({ query: "button for actions" });
      const data = parse(result);
      expect(data).toHaveLength(3);
      expect(data[0].similarity).toBe(0.85);
    });

    it("returns empty array when no matches above threshold", async () => {
      setupSearchChain([]);

      const result = await tools["search_components"]({ query: "completely unrelated" });
      const data = parse(result);
      expect(data).toEqual([]);
    });

    it("applies tier filter in where clause", async () => {
      const atomResults = mockComponents
        .filter((c) => c.tier === "atom")
        .map((c) => ({
          id: c.id,
          name: c.name,
          tier: c.tier,
          usageRules: c.usageRules,
          requirements: c.requirements,
          examples: c.examples,
          similarity: 0.7,
        }));
      setupSearchChain(atomResults);

      const result = await tools["search_components"]({
        query: "input field",
        tier: "atom",
      });
      const data = parse(result);
      expect(data.every((c: { tier: string }) => c.tier === "atom")).toBe(true);
      expect(mockWhere).toHaveBeenCalled();
    });

    it("builds different where clause with and without tier", async () => {
      setupSearchChain([]);

      await tools["search_components"]({ query: "test" });
      const whereCallsWithoutTier = mockWhere.mock.calls.length;

      vi.clearAllMocks();
      setupSearchChain([]);

      await tools["search_components"]({ query: "test", tier: "atom" });
      const whereCallsWithTier = mockWhere.mock.calls.length;

      expect(whereCallsWithoutTier).toBe(1);
      expect(whereCallsWithTier).toBe(1);
    });

    it("respects limit parameter", async () => {
      setupSearchChain([
        { id: 1, name: "Button", tier: "atom", similarity: 0.9 },
      ]);

      await tools["search_components"]({
        query: "button",
        limit: 1,
      });
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("uses default limit of 10", async () => {
      setupSearchChain([]);

      await tools["search_components"]({ query: "button" });
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it("accepts custom threshold", async () => {
      setupSearchChain([]);

      const result = await tools["search_components"]({
        query: "button",
        threshold: 0.8,
      });
      const data = parse(result);
      expect(data).toEqual([]);
      expect(mockWhere).toHaveBeenCalled();
    });

    it("returns error on embedder failure", async () => {
      const origEmbed = mockEmbedder.embed;
      mockEmbedder.embed = vi.fn().mockRejectedValue(new Error("API key invalid"));

      const result = await tools["search_components"]({ query: "test" });
      const data = parse(result);
      expect(data.error).toBe("API key invalid");
      expect(result.isError).toBe(true);

      mockEmbedder.embed = origEmbed;
    });
  });

  describe("search_tokens", () => {
    it("returns tokens with similarity scores", async () => {
      const searchResults = mockTokens.slice(0, 3).map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        value: t.value,
        description: t.description,
        similarity: 0.8,
      }));
      setupSearchChain(searchResults);

      const result = await tools["search_tokens"]({ query: "blue color" });
      const data = parse(result);
      expect(data).toHaveLength(3);
      expect(data[0].similarity).toBe(0.8);
    });

    it("returns empty array when no matches", async () => {
      setupSearchChain([]);

      const result = await tools["search_tokens"]({ query: "xyz" });
      const data = parse(result);
      expect(data).toEqual([]);
    });

    it("accepts custom threshold", async () => {
      setupSearchChain([]);

      const result = await tools["search_tokens"]({
        query: "color",
        threshold: 0.9,
      });
      const data = parse(result);
      expect(data).toEqual([]);
    });

    it("returns error on db failure", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("connection refused");
      });

      const result = await tools["search_tokens"]({ query: "test" });
      const data = parse(result);
      expect(data.error).toBe("connection refused");
      expect(result.isError).toBe(true);
    });
  });
});
