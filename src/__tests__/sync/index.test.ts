import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockComponents, mockEmbedder, MOCK_EMBEDDING } from "../mock-data.js";

const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockDeleteWhere = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelectLimit = vi.fn();

vi.mock("../../db/index.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: mockSelectFrom.mockReturnValue({
        where: mockSelectWhere.mockReturnValue({
          limit: mockSelectLimit,
        }),
      }),
    })),
    insert: vi.fn(() => ({
      values: mockInsertValues.mockReturnValue({
        returning: mockInsertReturning,
      }),
    })),
    update: vi.fn(() => ({
      set: mockUpdateSet.mockReturnValue({
        where: mockUpdateWhere,
      }),
    })),
    delete: vi.fn(() => ({
      where: mockDeleteWhere,
    })),
  },
}));

vi.mock("../../embeddings/index.js", () => ({
  getEmbedder: () => mockEmbedder,
}));

const mockMatchDependencies = vi.fn();
vi.mock("../../sync/parse-deps.js", () => ({
  matchDependencies: (...args: unknown[]) => mockMatchDependencies(...args),
  extractNames: vi.fn(() => []),
}));

import { syncComponent, rebuildDependencies, bulkSync } from "../../sync/index.js";

describe("syncComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWhere.mockResolvedValue(undefined);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockMatchDependencies.mockResolvedValue([]);
  });

  it("inserts new component and returns isNew true", async () => {
    mockSelectLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 99 }]);

    const result = await syncComponent({
      name: "NewComp",
      tier: "atom",
      code: "<div />",
      source: "manual",
    });

    expect(result.isNew).toBe(true);
    expect(result.id).toBe(99);
    expect(result.name).toBe("NewComp");
  });

  it("updates existing component and returns isNew false", async () => {
    const existing = { ...mockComponents[0] };
    mockSelectLimit.mockResolvedValue([existing]);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsertReturning.mockResolvedValue(undefined);

    const result = await syncComponent({
      name: "Button",
      tier: "atom",
      code: "new code",
      source: "manual",
    });

    expect(result.isNew).toBe(false);
    expect(result.id).toBe(existing.id);
  });

  it("detects code change in fieldsChanged", async () => {
    const existing = { ...mockComponents[0] };
    mockSelectLimit.mockResolvedValue([existing]);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsertReturning.mockResolvedValue(undefined);

    await syncComponent({
      name: "Button",
      tier: "atom",
      code: "changed code",
      source: "manual",
    });

    const insertCall = mockInsertValues.mock.calls[0][0];
    expect(insertCall.codeAfter).toBe("changed code");
    expect(insertCall.codeBefore).toBe(existing.code);
  });

  it("carries forward existing usageRules when not provided", async () => {
    const existing = { ...mockComponents[0] };
    mockSelectLimit.mockResolvedValue([existing]);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsertReturning.mockResolvedValue(undefined);

    await syncComponent({
      name: "Button",
      tier: "atom",
      code: existing.code,
      source: "manual",
    });

    const setCall = mockUpdateSet.mock.calls[0][0];
    expect(setCall.usageRules).toBe(existing.usageRules);
  });

  it("skips change log when nothing changed", async () => {
    const existing = { ...mockComponents[0] };
    mockSelectLimit.mockResolvedValue([existing]);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsertReturning.mockResolvedValue(undefined);

    await syncComponent({
      name: "Button",
      tier: "atom",
      code: existing.code,
      source: "manual",
    });

    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("returns dependenciesFound from rebuildDependencies", async () => {
    mockSelectLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: 50 }]);
    mockMatchDependencies.mockResolvedValue([
      { id: 1, name: "Button" },
      { id: 2, name: "Icon" },
    ]);

    const result = await syncComponent({
      name: "NewMolecule",
      tier: "molecule",
      code: `import { Button } from "./Button";\n<Icon />`,
      source: "manual",
    });

    expect(result.dependenciesFound).toEqual(["Button", "Icon"]);
  });
});

describe("rebuildDependencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  it("deletes old deps and inserts new ones", async () => {
    mockMatchDependencies.mockResolvedValue([
      { id: 1, name: "Button" },
      { id: 3, name: "Text" },
    ]);
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });

    const result = await rebuildDependencies(5, `import { Button } from "./Button";\n<Text />`);

    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalled();
    expect(result).toEqual(["Button", "Text"]);
  });

  it("only deletes when no deps found", async () => {
    mockMatchDependencies.mockResolvedValue([]);

    const result = await rebuildDependencies(1, "const x = 42;");

    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("bulkSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWhere.mockResolvedValue(undefined);
    mockMatchDependencies.mockResolvedValue([]);
  });

  it("syncs multiple components and returns array of results", async () => {
    mockSelectLimit.mockResolvedValue([]);
    mockInsertReturning
      .mockResolvedValueOnce([{ id: 10 }])
      .mockResolvedValueOnce([{ id: 11 }]);

    const results = await bulkSync([
      { name: "A", tier: "atom", code: "<a/>", source: "manual" },
      { name: "B", tier: "atom", code: "<b/>", source: "manual" },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("A");
    expect(results[1].name).toBe("B");
  });
});
