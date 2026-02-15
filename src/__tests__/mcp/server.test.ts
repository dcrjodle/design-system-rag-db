import { describe, it, expect, vi } from "vitest";

const mockTool = vi.fn();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    name: string;
    version: string;
    constructor(opts: { name: string; version: string }) {
      this.name = opts.name;
      this.version = opts.version;
    }
    tool = mockTool;
  },
}));

vi.mock("../../mcp/tools/components.js", () => ({
  registerComponentTools: vi.fn(),
}));
vi.mock("../../mcp/tools/tokens.js", () => ({
  registerTokenTools: vi.fn(),
}));
vi.mock("../../mcp/tools/search.js", () => ({
  registerSearchTools: vi.fn(),
}));
vi.mock("../../mcp/tools/sync.js", () => ({
  registerSyncTools: vi.fn(),
}));

import { createServer } from "../../mcp/server.js";
import { registerComponentTools } from "../../mcp/tools/components.js";
import { registerTokenTools } from "../../mcp/tools/tokens.js";
import { registerSearchTools } from "../../mcp/tools/search.js";
import { registerSyncTools } from "../../mcp/tools/sync.js";

describe("createServer", () => {
  it("returns an McpServer instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });

  it("registers all tool groups", () => {
    createServer();
    expect(registerComponentTools).toHaveBeenCalled();
    expect(registerTokenTools).toHaveBeenCalled();
    expect(registerSearchTools).toHaveBeenCalled();
    expect(registerSyncTools).toHaveBeenCalled();
  });
});
