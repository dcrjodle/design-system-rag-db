import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockComponents, mockEmbedder, MOCK_EMBEDDING } from "../../mock-data.js";

const mockSelectFrom = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("../../../db/index.js", () => ({
  db: {
    select: vi.fn(() => ({ from: mockSelectFrom })),
    update: vi.fn(() => ({
      set: mockUpdateSet.mockReturnValue({
        where: mockUpdateWhere.mockResolvedValue(undefined),
      }),
    })),
  },
}));

const mockSyncComponent = vi.fn();
const mockBulkSync = vi.fn();
const mockRebuildDependencies = vi.fn();

vi.mock("../../../sync/index.js", () => ({
  syncComponent: (...args: unknown[]) => mockSyncComponent(...args),
  bulkSync: (...args: unknown[]) => mockBulkSync(...args),
  rebuildDependencies: (...args: unknown[]) => mockRebuildDependencies(...args),
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

import { registerSyncTools } from "../../../mcp/tools/sync.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function parse(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

describe("sync tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerSyncTools(server);
  });

  describe("sync_component", () => {
    it("delegates to syncComponent function", async () => {
      mockSyncComponent.mockResolvedValue({
        id: 1, name: "Button", isNew: false, dependenciesFound: [],
      });

      const result = await tools["sync_component"]({
        name: "Button",
        tier: "atom",
        code: "<button/>",
        source: "manual",
      });
      const data = parse(result);
      expect(data.name).toBe("Button");
      expect(mockSyncComponent).toHaveBeenCalledWith({
        name: "Button",
        tier: "atom",
        code: "<button/>",
        source: "manual",
      });
    });

    it("returns error on failure", async () => {
      mockSyncComponent.mockRejectedValue(new Error("db error"));

      const result = await tools["sync_component"]({
        name: "Button",
        tier: "atom",
        code: "<button/>",
        source: "manual",
      });
      const data = parse(result);
      expect(data.error).toBe("db error");
      expect(result.isError).toBe(true);
    });
  });

  describe("bulk_sync_components", () => {
    it("delegates to bulkSync function", async () => {
      mockBulkSync.mockResolvedValue([
        { id: 1, name: "A", isNew: true, dependenciesFound: [] },
        { id: 2, name: "B", isNew: true, dependenciesFound: [] },
      ]);

      const result = await tools["bulk_sync_components"]({
        components: [
          { name: "A", tier: "atom", code: "<a/>", source: "manual" },
          { name: "B", tier: "atom", code: "<b/>", source: "manual" },
        ],
      });
      const data = parse(result);
      expect(data).toHaveLength(2);
    });
  });

  describe("detect_dependencies", () => {
    it("looks up component and calls rebuildDependencies", async () => {
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 5, code: mockComponents[4].code }]),
        }),
      });
      mockRebuildDependencies.mockResolvedValue(["Input", "Button", "Icon"]);

      const result = await tools["detect_dependencies"]({ name: "SearchBar" });
      const data = parse(result);
      expect(data.name).toBe("SearchBar");
      expect(data.dependencies).toEqual(["Input", "Button", "Icon"]);
      expect(mockRebuildDependencies).toHaveBeenCalledWith(5, mockComponents[4].code);
    });

    it("returns error when component not found", async () => {
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await tools["detect_dependencies"]({ name: "Missing" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });
  });

  describe("update_component_context", () => {
    it("updates fields and re-embeds", async () => {
      const comp = { ...mockComponents[0] };
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([comp]),
        }),
      });

      const result = await tools["update_component_context"]({
        name: "Button",
        usageRules: "Updated rules",
      });
      const data = parse(result);
      expect(data.updated).toBe(true);
      expect(data.id).toBe(comp.id);
      expect(mockUpdateSet).toHaveBeenCalled();
    });

    it("returns error when component not found", async () => {
      mockSelectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await tools["update_component_context"]({
        name: "Missing",
        usageRules: "rules",
      });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });

    it("returns error when no fields provided", async () => {
      const result = await tools["update_component_context"]({
        name: "Button",
      });
      const data = parse(result);
      expect(data.error).toBe("Provide at least one of usageRules, requirements, or examples");
      expect(result.isError).toBe(true);
    });
  });

  describe("add_component", () => {
    it("delegates to syncComponent", async () => {
      mockSyncComponent.mockResolvedValue({
        id: 10, name: "NewWidget", isNew: true, dependenciesFound: [],
      });

      const result = await tools["add_component"]({
        name: "NewWidget",
        tier: "atom",
        code: "<widget/>",
        source: "manual",
      });
      const data = parse(result);
      expect(data.isNew).toBe(true);
      expect(mockSyncComponent).toHaveBeenCalled();
    });
  });
});
