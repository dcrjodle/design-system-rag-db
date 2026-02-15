import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractNames } from "../../sync/parse-deps.js";
import { mockComponents } from "../mock-data.js";

vi.mock("../../db/index.js", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from "../../db/index.js";

function mockDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
}

describe("extractNames", () => {
  it("extracts named imports", () => {
    const code = `import { Button, Icon } from "./Button";`;
    expect(extractNames(code)).toEqual(["Button", "Icon"]);
  });

  it("extracts default imports", () => {
    const code = `import React from "react";`;
    expect(extractNames(code)).toEqual(["React"]);
  });

  it("extracts aliased imports using the original name", () => {
    const code = `import { Foo as Bar } from "./Foo";`;
    expect(extractNames(code)).toEqual(["Foo"]);
  });

  it("extracts JSX tags starting with uppercase", () => {
    const code = `const x = <Button><Icon /></Button>;`;
    expect(extractNames(code)).toEqual(["Button", "Icon"]);
  });

  it("ignores lowercase HTML tags", () => {
    const code = `const x = <div><span>hello</span></div>;`;
    expect(extractNames(code)).toEqual([]);
  });

  it("deduplicates imports and JSX tags", () => {
    const code = `import { Button } from "./Button";\nconst x = <Button>click</Button>;`;
    expect(extractNames(code)).toEqual(["Button"]);
  });

  it("returns empty array for plain code with no imports or JSX", () => {
    const code = `const x = 42;\nconsole.log(x);`;
    expect(extractNames(code)).toEqual([]);
  });

  it("handles multiple import lines", () => {
    const code = `import { Input } from "./Input";\nimport { Text } from "./Text";\nimport { Search } from "lucide-react";`;
    expect(extractNames(code)).toEqual(["Input", "Text", "Search"]);
  });

  it("handles mixed default and named imports across lines", () => {
    const code = `import React from "react";\nimport { useState, useEffect } from "react";`;
    expect(extractNames(code)).toEqual(["React", "useState", "useEffect"]);
  });

  it("handles real SearchBar component code", () => {
    const code = `import { Input } from "./Input";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Search } from "lucide-react";

export const SearchBar = ({ onSearch }) => (
  <form>
    <Input name="query" />
    <Button type="submit">
      <Icon icon={Search} size={16} />
    </Button>
  </form>
);`;
    const names = extractNames(code);
    expect(names).toContain("Input");
    expect(names).toContain("Button");
    expect(names).toContain("Icon");
    expect(names).toContain("Search");
  });
});

describe("matchDependencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matching components from db", async () => {
    const { matchDependencies } = await import("../../sync/parse-deps.js");
    const matched = [
      { id: mockComponents[3].id, name: "Input" },
      { id: mockComponents[0].id, name: "Button" },
      { id: mockComponents[1].id, name: "Icon" },
    ];
    mockDbSelect(matched);

    const result = await matchDependencies(
      `import { Input } from "./Input";\nimport { Button } from "./Button";\n<Icon />`
    );
    expect(result).toEqual(matched);
  });

  it("excludes own component id", async () => {
    const { matchDependencies } = await import("../../sync/parse-deps.js");
    const allRows = [
      { id: 5, name: "SearchBar" },
      { id: 4, name: "Input" },
      { id: 1, name: "Button" },
    ];
    mockDbSelect(allRows);

    const result = await matchDependencies(
      `import { Input } from "./Input";\n<Button />\n<SearchBar />`,
      5
    );
    expect(result).toEqual([
      { id: 4, name: "Input" },
      { id: 1, name: "Button" },
    ]);
  });

  it("returns empty array when no names extracted", async () => {
    const { matchDependencies } = await import("../../sync/parse-deps.js");
    const result = await matchDependencies("const x = 42;");
    expect(result).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
});
