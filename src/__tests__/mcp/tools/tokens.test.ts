import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockTokens, mockTokenUsage, mockComponents, mockEmbedder, MOCK_EMBEDDING } from "../../mock-data.js";

const mockSelectFrom = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();

vi.mock("../../../db/index.js", () => ({
  db: {
    select: vi.fn(() => ({ from: mockSelectFrom })),
    insert: vi.fn(() => ({
      values: mockInsertValues.mockReturnValue({
        returning: mockInsertReturning,
      }),
    })),
  },
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

import { registerTokenTools } from "../../../mcp/tools/tokens.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function parse(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

describe("token tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerTokenTools(server);
  });

  describe("add_token", () => {
    it("inserts token and returns data without embedding", async () => {
      const newToken = {
        id: 11,
        name: "color.accent.500",
        category: "color",
        value: "#EF4444",
        description: "Accent red",
        embedding: [0.1, 0.2, 0.3],
      };
      mockInsertReturning.mockResolvedValue([newToken]);

      const result = await tools["add_token"]({
        name: "color.accent.500",
        category: "color",
        value: "#EF4444",
        description: "Accent red",
      });
      const data = parse(result);
      expect(data.name).toBe("color.accent.500");
      expect(data.embedding).toBeUndefined();
    });

    it("returns error on embedder failure", async () => {
      const origEmbed = mockEmbedder.embed;
      mockEmbedder.embed = vi.fn().mockRejectedValue(new Error("rate limited"));

      const result = await tools["add_token"]({
        name: "test",
        category: "color",
        value: "#000",
      });
      const data = parse(result);
      expect(data.error).toBe("rate limited");
      expect(result.isError).toBe(true);

      mockEmbedder.embed = origEmbed;
    });
  });

  describe("get_token_usage", () => {
    it("returns components that use a given token", async () => {
      const usageRows = mockTokenUsage
        .filter((tu) => tu.tokenId === 7)
        .map((tu) => {
          const comp = mockComponents.find((c) => c.id === tu.componentId)!;
          return {
            componentId: comp.id,
            componentName: comp.name,
            tier: comp.tier,
            property: tu.property,
          };
        });

      let callCount = 0;
      mockSelectFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 7 }]),
            }),
          };
        }
        return {
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(usageRows),
          }),
        };
      });

      const result = await tools["get_token_usage"]({ name: "radius.md" });
      const data = parse(result);
      expect(data).toHaveLength(3);
      expect(data.map((r: { componentName: string }) => r.componentName).sort()).toEqual([
        "Button",
        "Card",
        "Input",
      ]);
    });

    it("returns error when token not found", async () => {
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await tools["get_token_usage"]({ name: "nonexistent" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });
  });
});
