import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockComponents,
  mockDependencies,
  mockTokenUsage,
  mockTokens,
  mockChangeLogs,
} from "../../mock-data.js";

const mockSelectFrom = vi.fn();
const mockChain = vi.fn();

vi.mock("../../../db/index.js", () => ({
  db: {
    select: vi.fn(() => ({ from: mockSelectFrom })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "../../../db/index.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
const tools: Record<string, ToolHandler> = {};

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    tool(name: string, _desc: string, _schema: unknown, handler: ToolHandler) {
      tools[name] = handler;
    }
  },
}));

import { registerComponentTools } from "../../../mcp/tools/components.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function parse(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

function setupSelectChain(result: unknown) {
  const limitFn = vi.fn().mockResolvedValue(result);
  const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn, orderBy: orderByFn });
  const innerJoinFn = vi.fn().mockReturnValue({ where: whereFn });

  mockSelectFrom.mockReturnValue({
    where: whereFn,
    limit: limitFn,
    innerJoin: innerJoinFn,
  });

  return { whereFn, limitFn, innerJoinFn, orderByFn };
}

describe("component tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerComponentTools(server);
  });

  describe("get_component", () => {
    it("returns component by name without embedding", async () => {
      const comp = { ...mockComponents[0] };
      setupSelectChain([comp]);

      const result = await tools["get_component"]({ name: "Button" });
      const data = parse(result);
      expect(data.name).toBe("Button");
      expect(data.embedding).toBeUndefined();
    });

    it("returns component by id", async () => {
      const comp = { ...mockComponents[1] };
      setupSelectChain([comp]);

      const result = await tools["get_component"]({ id: 2 });
      const data = parse(result);
      expect(data.name).toBe("Icon");
    });

    it("returns error when not found", async () => {
      setupSelectChain([]);

      const result = await tools["get_component"]({ name: "NonExistent" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });

    it("returns error when neither name nor id provided", async () => {
      const result = await tools["get_component"]({});
      const data = parse(result);
      expect(data.error).toBe("Provide either name or id");
      expect(result.isError).toBe(true);
    });

    it("returns error on db failure", async () => {
      (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("connection lost");
      });

      const result = await tools["get_component"]({ name: "Button" });
      const data = parse(result);
      expect(data.error).toBe("connection lost");
      expect(result.isError).toBe(true);
    });
  });

  describe("list_components", () => {
    it("returns all components", async () => {
      const rows = mockComponents.map(({ id, name, tier, version, source, updatedAt }) => ({
        id, name, tier, version, source, updatedAt,
      }));
      mockSelectFrom.mockResolvedValue(rows);

      const result = await tools["list_components"]({});
      const data = parse(result);
      expect(data).toHaveLength(9);
    });

    it("returns filtered components by tier", async () => {
      const atoms = mockComponents
        .filter((c) => c.tier === "atom")
        .map(({ id, name, tier, version, source, updatedAt }) => ({
          id, name, tier, version, source, updatedAt,
        }));
      const whereFn = vi.fn().mockResolvedValue(atoms);
      mockSelectFrom.mockReturnValue({ where: whereFn });

      const result = await tools["list_components"]({ tier: "atom" });
      const data = parse(result);
      expect(data).toHaveLength(4);
      expect(data.every((c: { tier: string }) => c.tier === "atom")).toBe(true);
    });
  });

  describe("get_component_dependencies", () => {
    it("returns child components", async () => {
      const children = mockDependencies
        .filter((d) => d.parentId === 5)
        .map((d) => {
          const comp = mockComponents.find((c) => c.id === d.childId)!;
          return { id: comp.id, name: comp.name, tier: comp.tier, context: d.context };
        });

      setupSelectChain([{ id: 5 }]);

      let callCount = 0;
      mockSelectFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 5 }]),
            }),
          };
        }
        return {
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(children),
          }),
        };
      });

      const result = await tools["get_component_dependencies"]({ name: "SearchBar" });
      const data = parse(result);
      expect(data).toHaveLength(3);
      expect(data.map((d: { name: string }) => d.name).sort()).toEqual(["Button", "Icon", "Input"]);
    });

    it("returns error when parent not found", async () => {
      setupSelectChain([]);

      const result = await tools["get_component_dependencies"]({ name: "Missing" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });
  });

  describe("get_component_dependents", () => {
    it("returns parent components", async () => {
      const parents = mockDependencies
        .filter((d) => d.childId === 1)
        .map((d) => {
          const comp = mockComponents.find((c) => c.id === d.parentId)!;
          return { id: comp.id, name: comp.name, tier: comp.tier, context: d.context };
        });

      let callCount = 0;
      mockSelectFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          };
        }
        return {
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(parents),
          }),
        };
      });

      const result = await tools["get_component_dependents"]({ name: "Button" });
      const data = parse(result);
      expect(data).toHaveLength(3);
    });

    it("returns error when child not found", async () => {
      setupSelectChain([]);

      const result = await tools["get_component_dependents"]({ name: "Missing" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });
  });

  describe("get_component_tokens", () => {
    it("returns linked tokens with property", async () => {
      const tokenRows = mockTokenUsage
        .filter((tu) => tu.componentId === 1)
        .map((tu) => {
          const token = mockTokens.find((t) => t.id === tu.tokenId)!;
          return {
            tokenId: token.id,
            tokenName: token.name,
            category: token.category,
            value: token.value,
            property: tu.property,
          };
        });

      let callCount = 0;
      mockSelectFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          };
        }
        return {
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(tokenRows),
          }),
        };
      });

      const result = await tools["get_component_tokens"]({ name: "Button" });
      const data = parse(result);
      expect(data).toHaveLength(3);
      expect(data.map((t: { property: string }) => t.property).sort()).toEqual([
        "background-color",
        "border-radius",
        "padding",
      ]);
    });

    it("returns error when component not found", async () => {
      setupSelectChain([]);

      const result = await tools["get_component_tokens"]({ name: "Missing" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });
  });

  describe("get_component_history", () => {
    it("returns changelog entries", async () => {
      const logs = mockChangeLogs.filter((l) => l.componentId === 1);

      let callCount = 0;
      mockSelectFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(logs),
            }),
          }),
        };
      });

      const result = await tools["get_component_history"]({ name: "Button" });
      const data = parse(result);
      expect(data).toHaveLength(2);
    });

    it("returns error when component not found", async () => {
      setupSelectChain([]);

      const result = await tools["get_component_history"]({ name: "Missing" });
      const data = parse(result);
      expect(data.error).toBe("Not found");
    });
  });
});
