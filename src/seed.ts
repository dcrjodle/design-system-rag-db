import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { tokens, components, componentTokenUsage } from "./db/schema.js";
import { syncComponent } from "./sync/index.js";
import { getEmbedder } from "./embeddings/index.js";

async function seed() {
  const embedder = getEmbedder();

  console.log("Seeding tokens...");
  const tokenData = [
    { name: "color.primary.500", category: "color", value: "#3B82F6", description: "Primary brand blue" },
    { name: "color.neutral.900", category: "color", value: "#111827", description: "Dark text color" },
    { name: "color.neutral.100", category: "color", value: "#F3F4F6", description: "Light background" },
    { name: "spacing.sm", category: "spacing", value: "8px", description: "Small spacing unit" },
    { name: "spacing.md", category: "spacing", value: "16px", description: "Medium spacing unit" },
    { name: "spacing.lg", category: "spacing", value: "24px", description: "Large spacing unit" },
    { name: "radius.md", category: "radius", value: "8px", description: "Medium border radius" },
    { name: "font.size.sm", category: "typography", value: "14px", description: "Small font size" },
    { name: "font.size.base", category: "typography", value: "16px", description: "Base font size" },
    { name: "font.size.lg", category: "typography", value: "20px", description: "Large font size" },
  ];

  const insertedTokens: Record<string, number> = {};
  for (const t of tokenData) {
    const embedding = await embedder.embed([t.name, t.category, t.description].join(" — "));
    const [row] = await db.insert(tokens).values({ ...t, embedding }).returning({ id: tokens.id });
    insertedTokens[t.name] = row.id;
  }

  console.log("Seeding atoms...");
  const button = await syncComponent({
    name: "Button",
    tier: "atom",
    imports: `import { forwardRef } from "react";`,
    code: `const Button = ({ variant = "primary", size = "md", children, ...props }) => (
  <button className={\`btn btn--\${variant} btn--\${size}\`} {...props}>
    {children}
  </button>
);`,
    source: "manual",
    usageRules: "Use Button for all clickable actions. Primary variant for main CTAs, secondary for less prominent actions. Always provide accessible labels.",
    requirements: "Must support disabled state, loading state, and keyboard navigation. Renders as <button> by default.",
    examples: '<Button variant="primary">Save</Button>\n<Button variant="secondary" disabled>Cancel</Button>',
  });

  const icon = await syncComponent({
    name: "Icon",
    tier: "atom",
    imports: `import { LucideIcon } from "lucide-react";`,
    code: `const Icon = ({ icon: IconComponent, size = 20, ...props }) => (
  <IconComponent size={size} {...props} />
);`,
    source: "manual",
    usageRules: "Use Icon to render Lucide icons consistently. Always pair with aria-label when used standalone (not next to text).",
    requirements: "Must accept any Lucide icon component. Supports size and color props.",
  });

  const text = await syncComponent({
    name: "Text",
    tier: "atom",
    code: `const Text = ({ as: Tag = "p", size = "base", children, ...props }) => (
  <Tag className={\`text text--\${size}\`} {...props}>{children}</Tag>
);`,
    source: "manual",
    usageRules: "Use Text for all typography. Choose semantic HTML tags via the 'as' prop. Use size tokens for consistent sizing.",
    requirements: "Must support all heading levels and paragraph. Must apply design token font sizes.",
  });

  const input = await syncComponent({
    name: "Input",
    tier: "atom",
    imports: `import { forwardRef } from "react";`,
    code: `const Input = ({ label, error, ...props }) => (
  <div className="input-wrapper">
    {label && <label className="input-label">{label}</label>}
    <input className={\`input \${error ? "input--error" : ""}\`} {...props} />
    {error && <span className="input-error">{error}</span>}
  </div>
);`,
    source: "manual",
    usageRules: "Use Input for all single-line text inputs. Always provide a label for accessibility. Show error messages inline.",
    requirements: "Must support ref forwarding. Must show validation errors. Must be accessible with proper label association.",
  });

  console.log("Seeding molecules...");
  const searchBar = await syncComponent({
    name: "SearchBar",
    tier: "molecule",
    imports: `import { Input } from "./Input";\nimport { Button } from "./Button";\nimport { Icon } from "./Icon";\nimport { Search } from "lucide-react";`,
    code: `const SearchBar = ({ onSearch, ...props }) => (
  <form className="search-bar" onSubmit={(e) => { e.preventDefault(); onSearch(e.currentTarget.query.value); }}>
    <Input name="query" placeholder="Search..." {...props} />
    <Button type="submit" variant="primary">
      <Icon icon={Search} size={16} />
    </Button>
  </form>
);`,
    source: "manual",
    usageRules: "Use SearchBar for search interfaces. Place at the top of content areas. Submits on Enter or button click.",
    requirements: "Must call onSearch with the query string. Must be a semantic form element.",
  });

  const card = await syncComponent({
    name: "Card",
    tier: "molecule",
    imports: `import { Text } from "./Text";`,
    code: `const Card = ({ title, children, ...props }) => (
  <div className="card" {...props}>
    {title && <Text as="h3" size="lg" className="card-title">{title}</Text>}
    <div className="card-body">{children}</div>
  </div>
);`,
    source: "manual",
    usageRules: "Use Card to group related content. Always provide a title for context. Cards can be nested inside grid layouts.",
    requirements: "Must have a distinct visual boundary (border or shadow). Title is optional but recommended.",
  });

  const formField = await syncComponent({
    name: "FormField",
    tier: "molecule",
    imports: `import { Input } from "./Input";\nimport { Text } from "./Text";`,
    code: `const FormField = ({ label, hint, error, ...inputProps }) => (
  <div className="form-field">
    <Input label={label} error={error} {...inputProps} />
    {hint && <Text size="sm" className="form-field-hint">{hint}</Text>}
  </div>
);`,
    source: "manual",
    usageRules: "Use FormField for labeled form inputs with optional hints. Combine into form layouts.",
    requirements: "Must show label, optional hint text, and error messages. Must forward all input props.",
  });

  console.log("Seeding organisms...");
  await syncComponent({
    name: "Header",
    tier: "organism",
    imports: `import { Button } from "./Button";\nimport { Icon } from "./Icon";\nimport { Text } from "./Text";\nimport { SearchBar } from "./SearchBar";\nimport { Menu } from "lucide-react";`,
    code: `const Header = ({ title, onMenuClick, onSearch }) => (
  <header className="header">
    <Button variant="ghost" onClick={onMenuClick}>
      <Icon icon={Menu} />
    </Button>
    <Text as="h1" size="lg">{title}</Text>
    <SearchBar onSearch={onSearch} />
  </header>
);`,
    source: "manual",
    usageRules: "Use Header at the top of every page. Contains navigation trigger, page title, and search. Sticky on scroll.",
    requirements: "Must include menu button, title, and search. Must be responsive — search collapses on mobile.",
  });

  await syncComponent({
    name: "LoginForm",
    tier: "organism",
    imports: `import { FormField } from "./FormField";\nimport { Button } from "./Button";\nimport { Text } from "./Text";\nimport { Card } from "./Card";`,
    code: `const LoginForm = ({ onSubmit }) => (
  <Card title="Sign In">
    <form onSubmit={onSubmit} className="login-form">
      <FormField label="Email" type="email" name="email" required />
      <FormField label="Password" type="password" name="password" required />
      <Button type="submit" variant="primary">Sign In</Button>
      <Text size="sm">Forgot your password?</Text>
    </form>
  </Card>
);`,
    source: "manual",
    usageRules: "Use LoginForm on the authentication page. Center it vertically and horizontally. Show server errors above the submit button.",
    requirements: "Must validate email format and password length client-side. Must handle loading/submitting state. Must be accessible.",
  });

  console.log("Linking token usage...");
  const tokenLinks: { componentName: string; tokenName: string; property: string }[] = [
    { componentName: "Button", tokenName: "color.primary.500", property: "background-color" },
    { componentName: "Button", tokenName: "radius.md", property: "border-radius" },
    { componentName: "Button", tokenName: "spacing.sm", property: "padding" },
    { componentName: "Text", tokenName: "font.size.base", property: "font-size" },
    { componentName: "Text", tokenName: "color.neutral.900", property: "color" },
    { componentName: "Input", tokenName: "spacing.sm", property: "padding" },
    { componentName: "Input", tokenName: "radius.md", property: "border-radius" },
    { componentName: "Input", tokenName: "font.size.base", property: "font-size" },
    { componentName: "Card", tokenName: "spacing.md", property: "padding" },
    { componentName: "Card", tokenName: "radius.md", property: "border-radius" },
    { componentName: "Card", tokenName: "color.neutral.100", property: "background-color" },
    { componentName: "Header", tokenName: "spacing.lg", property: "padding" },
    { componentName: "Header", tokenName: "color.neutral.100", property: "background-color" },
  ];

  for (const link of tokenLinks) {
    const [comp] = await db.select({ id: components.id }).from(components).where(eq(components.name, link.componentName)).limit(1);
    if (comp) {
      await db.insert(componentTokenUsage).values({
        componentId: comp.id,
        tokenId: insertedTokens[link.tokenName],
        property: link.property,
      });
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
