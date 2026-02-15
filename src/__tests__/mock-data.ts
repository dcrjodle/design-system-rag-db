export const MOCK_EMBEDDING = [0.1, 0.2, 0.3];

export const mockTokens = [
  { id: 1, name: "color.primary.500", category: "color", value: "#3B82F6", description: "Primary brand blue", embedding: MOCK_EMBEDDING },
  { id: 2, name: "color.neutral.900", category: "color", value: "#111827", description: "Dark text color", embedding: MOCK_EMBEDDING },
  { id: 3, name: "color.neutral.100", category: "color", value: "#F3F4F6", description: "Light background", embedding: MOCK_EMBEDDING },
  { id: 4, name: "spacing.sm", category: "spacing", value: "8px", description: "Small spacing unit", embedding: MOCK_EMBEDDING },
  { id: 5, name: "spacing.md", category: "spacing", value: "16px", description: "Medium spacing unit", embedding: MOCK_EMBEDDING },
  { id: 6, name: "spacing.lg", category: "spacing", value: "24px", description: "Large spacing unit", embedding: MOCK_EMBEDDING },
  { id: 7, name: "radius.md", category: "radius", value: "8px", description: "Medium border radius", embedding: MOCK_EMBEDDING },
  { id: 8, name: "font.size.sm", category: "typography", value: "14px", description: "Small font size", embedding: MOCK_EMBEDDING },
  { id: 9, name: "font.size.base", category: "typography", value: "16px", description: "Base font size", embedding: MOCK_EMBEDDING },
  { id: 10, name: "font.size.lg", category: "typography", value: "20px", description: "Large font size", embedding: MOCK_EMBEDDING },
] as const;

const now = new Date("2025-06-01T00:00:00Z");

export const componentCode = {
  Button: `import { forwardRef } from "react";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = "primary", size = "md", children, ...props }, ref) => (
  <button ref={ref} className={\`btn btn--\${variant} btn--\${size}\`} {...props}>
    {children}
  </button>
));`,

  Icon: `import { LucideIcon } from "lucide-react";

export const Icon = ({ icon: IconComponent, size = 20, ...props }: IconProps) => (
  <IconComponent size={size} {...props} />
);`,

  Text: `export const Text = ({ as: Tag = "p", size = "base", children, ...props }: TextProps) => (
  <Tag className={\`text text--\${size}\`} {...props}>{children}</Tag>
);`,

  Input: `import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, ...props }, ref) => (
  <div className="input-wrapper">
    {label && <label className="input-label">{label}</label>}
    <input ref={ref} className={\`input \${error ? "input--error" : ""}\`} {...props} />
    {error && <span className="input-error">{error}</span>}
  </div>
));`,

  SearchBar: `import { Input } from "./Input";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Search } from "lucide-react";

export const SearchBar = ({ onSearch, ...props }: SearchBarProps) => (
  <form className="search-bar" onSubmit={(e) => { e.preventDefault(); onSearch(e.currentTarget.query.value); }}>
    <Input name="query" placeholder="Search..." {...props} />
    <Button type="submit" variant="primary">
      <Icon icon={Search} size={16} />
    </Button>
  </form>
);`,

  Card: `import { Text } from "./Text";

export const Card = ({ title, children, ...props }: CardProps) => (
  <div className="card" {...props}>
    {title && <Text as="h3" size="lg" className="card-title">{title}</Text>}
    <div className="card-body">{children}</div>
  </div>
);`,

  FormField: `import { Input } from "./Input";
import { Text } from "./Text";

export const FormField = ({ label, hint, error, ...inputProps }: FormFieldProps) => (
  <div className="form-field">
    <Input label={label} error={error} {...inputProps} />
    {hint && <Text size="sm" className="form-field-hint">{hint}</Text>}
  </div>
);`,

  Header: `import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { SearchBar } from "./SearchBar";
import { Menu } from "lucide-react";

export const Header = ({ title, onMenuClick, onSearch }: HeaderProps) => (
  <header className="header">
    <Button variant="ghost" onClick={onMenuClick}>
      <Icon icon={Menu} />
    </Button>
    <Text as="h1" size="lg">{title}</Text>
    <SearchBar onSearch={onSearch} />
  </header>
);`,

  LoginForm: `import { FormField } from "./FormField";
import { Button } from "./Button";
import { Text } from "./Text";
import { Card } from "./Card";

export const LoginForm = ({ onSubmit }: LoginFormProps) => (
  <Card title="Sign In">
    <form onSubmit={onSubmit} className="login-form">
      <FormField label="Email" type="email" name="email" required />
      <FormField label="Password" type="password" name="password" required />
      <Button type="submit" variant="primary">Sign In</Button>
      <Text size="sm">Forgot your password?</Text>
    </form>
  </Card>
);`,
};

export const mockComponents = [
  {
    id: 1, name: "Button", tier: "atom" as const, code: componentCode.Button,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use Button for all clickable actions.",
    requirements: "Must support disabled state.",
    examples: '<Button variant="primary">Save</Button>',
    version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 2, name: "Icon", tier: "atom" as const, code: componentCode.Icon,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use Icon to render Lucide icons consistently.",
    requirements: "Must accept any Lucide icon component.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 3, name: "Text", tier: "atom" as const, code: componentCode.Text,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use Text for all typography.",
    requirements: "Must support all heading levels.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 4, name: "Input", tier: "atom" as const, code: componentCode.Input,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use Input for all single-line text inputs.",
    requirements: "Must support ref forwarding.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 5, name: "SearchBar", tier: "molecule" as const, code: componentCode.SearchBar,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use SearchBar for search interfaces.",
    requirements: "Must call onSearch with the query string.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 6, name: "Card", tier: "molecule" as const, code: componentCode.Card,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use Card to group related content.",
    requirements: "Must have a distinct visual boundary.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 7, name: "FormField", tier: "molecule" as const, code: componentCode.FormField,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use FormField for labeled form inputs.",
    requirements: "Must show label, optional hint text, and error messages.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 8, name: "Header", tier: "organism" as const, code: componentCode.Header,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use Header at the top of every page.",
    requirements: "Must include menu button, title, and search.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
  {
    id: 9, name: "LoginForm", tier: "organism" as const, code: componentCode.LoginForm,
    source: "manual" as const, propsSchema: null,
    usageRules: "Use LoginForm on the authentication page.",
    requirements: "Must validate email format.",
    examples: null, version: "1.0.0", embedding: MOCK_EMBEDDING, updatedAt: now,
  },
];

export const mockDependencies = [
  { id: 1, parentId: 5, childId: 4, context: null },  // SearchBar -> Input
  { id: 2, parentId: 5, childId: 1, context: null },  // SearchBar -> Button
  { id: 3, parentId: 5, childId: 2, context: null },  // SearchBar -> Icon
  { id: 4, parentId: 6, childId: 3, context: null },  // Card -> Text
  { id: 5, parentId: 7, childId: 4, context: null },  // FormField -> Input
  { id: 6, parentId: 7, childId: 3, context: null },  // FormField -> Text
  { id: 7, parentId: 8, childId: 1, context: null },  // Header -> Button
  { id: 8, parentId: 8, childId: 2, context: null },  // Header -> Icon
  { id: 9, parentId: 8, childId: 3, context: null },  // Header -> Text
  { id: 10, parentId: 8, childId: 5, context: null }, // Header -> SearchBar
  { id: 11, parentId: 9, childId: 7, context: null }, // LoginForm -> FormField
  { id: 12, parentId: 9, childId: 1, context: null }, // LoginForm -> Button
  { id: 13, parentId: 9, childId: 3, context: null }, // LoginForm -> Text
  { id: 14, parentId: 9, childId: 6, context: null }, // LoginForm -> Card
];

export const mockTokenUsage = [
  { id: 1, componentId: 1, tokenId: 1, property: "background-color" },  // Button -> color.primary.500
  { id: 2, componentId: 1, tokenId: 7, property: "border-radius" },     // Button -> radius.md
  { id: 3, componentId: 1, tokenId: 4, property: "padding" },           // Button -> spacing.sm
  { id: 4, componentId: 3, tokenId: 9, property: "font-size" },         // Text -> font.size.base
  { id: 5, componentId: 3, tokenId: 2, property: "color" },             // Text -> color.neutral.900
  { id: 6, componentId: 4, tokenId: 4, property: "padding" },           // Input -> spacing.sm
  { id: 7, componentId: 4, tokenId: 7, property: "border-radius" },     // Input -> radius.md
  { id: 8, componentId: 4, tokenId: 9, property: "font-size" },         // Input -> font.size.base
  { id: 9, componentId: 6, tokenId: 5, property: "padding" },           // Card -> spacing.md
  { id: 10, componentId: 6, tokenId: 7, property: "border-radius" },    // Card -> radius.md
  { id: 11, componentId: 6, tokenId: 3, property: "background-color" }, // Card -> color.neutral.100
  { id: 12, componentId: 8, tokenId: 6, property: "padding" },          // Header -> spacing.lg
  { id: 13, componentId: 8, tokenId: 3, property: "background-color" }, // Header -> color.neutral.100
];

export const mockChangeLogs = [
  {
    id: 1, componentId: 1, source: "manual" as const,
    codeBefore: 'export const Button = () => <button />;',
    codeAfter: componentCode.Button,
    fieldsChanged: ["code", "usage_rules"],
    createdAt: new Date("2025-05-15T00:00:00Z"),
  },
  {
    id: 2, componentId: 6, source: "codebase" as const,
    codeBefore: 'export const Card = ({ children }) => <div>{children}</div>;',
    codeAfter: componentCode.Card,
    fieldsChanged: ["code"],
    createdAt: new Date("2025-05-20T00:00:00Z"),
  },
  {
    id: 3, componentId: 1, source: "figma" as const,
    codeBefore: componentCode.Button,
    codeAfter: componentCode.Button + "\n// updated",
    fieldsChanged: ["code"],
    createdAt: new Date("2025-05-25T00:00:00Z"),
  },
];

export const mockEmbedder = {
  embed: async (_text: string) => MOCK_EMBEDDING,
};
