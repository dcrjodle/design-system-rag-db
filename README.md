# Design System RAG DB

A Postgres + pgvector database for storing, querying, and syncing design system components — exposed via an MCP server for agents and web apps.

Store components across the atomic design hierarchy (tokens, atoms, molecules, organisms), track how they reference each other, and query by meaning using vector similarity search.

## What it does

- **Relational structure** — tracks which atoms are used in which molecules/organisms, and which design tokens are consumed by each component
- **Semantic search** — ask natural language questions like "which component handles form validation?" and get relevant results via pgvector cosine similarity
- **Sync from anywhere** — agents can upsert components from Figma, codebases, or manual input with automatic dependency detection and change logging
- **Context for agents** — stores usage rules, requirements, and examples per component so agents can generate code, tests, and layouts with full business context
- **Change history** — every code update is logged with before/after snapshots and source attribution

## Quick start

```bash
cp .env.example .env
# configure your embedding provider (see below)

docker compose up -d
npm install
npm run db:migrate
npm run seed        # optional: loads example design system
npm run build
```

## Embedding providers

Semantic search requires an embedding model to convert text into vectors. Pick one:

### Option A: Ollama (free, local)

1. Install Ollama:

```bash
brew install ollama
```

2. Start the server and pull the model:

```bash
ollama serve
ollama pull nomic-embed-text
```

3. Set your `.env`:

```
EMBEDDING_PROVIDER=ollama
EMBEDDING_DIMENSIONS=768
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text
```

### Option B: OpenAI (hosted, requires API key)

1. Get an API key from [platform.openai.com](https://platform.openai.com)

2. Set your `.env`:

```
EMBEDDING_PROVIDER=openai
EMBEDDING_DIMENSIONS=1536
OPENAI_API_KEY=sk-...
```

### Dimension matching

`EMBEDDING_DIMENSIONS` must match the output size of your chosen model. The database vector columns are sized from this variable. If you switch providers, regenerate and re-run migrations:

```bash
npm run db:generate
npm run db:migrate
npm run seed
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start MCP server via tsx |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run seed` | Seed database with example components and tokens |

## Database schema

```
tokens                     — design tokens (colors, spacing, typography)
components                 — atoms, molecules, organisms with code + metadata
component_dependencies     — which components use which other components
component_token_usage      — which components use which tokens
component_change_log       — history of every code/metadata update
```

## MCP tools

### Relational lookups

| Tool | Description |
|---|---|
| `get_component` | Get a component by name or id |
| `list_components` | List/filter components by tier |
| `get_component_dependencies` | Child components used by a given component |
| `get_component_dependents` | Parent components that use a given component |
| `get_component_tokens` | Design tokens used by a component |
| `get_component_history` | Change log for a component |
| `get_token_usage` | Components that use a given token |

### Semantic search

| Tool | Description |
|---|---|
| `search_components` | Natural language search across components |
| `search_tokens` | Natural language search across tokens |

### Mutations

| Tool | Description |
|---|---|
| `add_component` | Insert a new component |
| `add_token` | Insert a new design token |
| `update_component_context` | Update usage rules, requirements, or examples |

### Sync

| Tool | Description |
|---|---|
| `sync_component` | Upsert a component from any source with auto dependency detection |
| `bulk_sync_components` | Batch upsert multiple components |
| `detect_dependencies` | Re-parse and rebuild dependency edges for a component |

## Configuration

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | — |
| `EMBEDDING_PROVIDER` | `openai` or `ollama` | `openai` |
| `EMBEDDING_DIMENSIONS` | Vector dimensions | `1536` |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `nomic-embed-text` |

## Connecting to Cursor

Add to your `.cursor/mcp.json`:

**With Ollama:**

```json
{
  "mcpServers": {
    "design-system-rag-db": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/design-system-rag-db",
      "env": {
        "DATABASE_URL": "postgres://postgres:postgres@localhost:5432/design_system",
        "EMBEDDING_PROVIDER": "ollama",
        "EMBEDDING_DIMENSIONS": "768",
        "OLLAMA_HOST": "http://localhost:11434",
        "OLLAMA_MODEL": "nomic-embed-text"
      }
    }
  }
}
```

**With OpenAI:**

```json
{
  "mcpServers": {
    "design-system-rag-db": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/design-system-rag-db",
      "env": {
        "DATABASE_URL": "postgres://postgres:postgres@localhost:5432/design_system",
        "EMBEDDING_PROVIDER": "openai",
        "EMBEDDING_DIMENSIONS": "1536",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```
