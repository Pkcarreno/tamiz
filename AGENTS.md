# Tamiz — Agent Instructions

## Project Overview

Tamiz is a monorepo for a browser extension that visually selects page content and converts it to markdown or clean HTML. The core conversion logic lives in agnostic packages reusable outside the extension.

## Monorepo Structure

```
tamiz/
├── apps/
│   └── extension/          # Browser extension (WXT + SolidJS)
├── packages/
│   └── <converter-name>/   # Agnostic HTML conversion logic
├── package.json            # Root — monorepo tools only
├── turbo.json
├── biome.json
└── AGENTS.md               # This file
```

## Tooling (Root)

- **Runtime/Package Manager**: Bun
- **Build Orchestration**: Turborepo
- **Linter/Formatter**: Biome + Ultracite preset
- **Git Hooks**: Lefthook
- **Commits**: Commitizen

## Conventions

### Naming

- All packages use the `@tamiz/<name>` scope
- Package names are lowercase, hyphen-separated

### Code Language

- All code, comments, READMEs, and documentation in **English**
- Code must be self-documenting. Comments explain **why**, not **what**

### Dependencies

- **Only indispensable dependencies**. Prefer dependencies that reduce code complexity and maintenance burden.
- Only from trusted, high-performance sources
- Install with: `bun add --filter @tamiz/<package> <dep>@latest`
- Never add global tooling deps to workspace packages — root only

### Documentation

- Do not over-document trivial implementations
- **TSDOC is MANDATORY** for:
  - All methods, interfaces, type aliases, and module entry point exports
  - Pure functions managing complex logic or state mutations
  - Custom protocol implementations or parsers where the "why" or I/O shapes are non-obvious

### Public API Marking

All exported types, interfaces, and component props forming the public API MUST have `@public` in their TSDoc block:

- **Grouped exports**: `/** @public */` directly above the export block
- **Inline exports with TSDOC**: Merge `@public` into existing block (no separate block)
- **Inline exports without TSDOC**: `/** @public */` directly above the declaration

### Exports

- **AVOID barrel files**. Export directly from the module.

### TypeScript

- **Strict Mode**: `strict: true`. Avoid `any`; prefer `unknown`
- **Inference**: Use Type Inference for local variables
- **Types**: Prefer `interface` for public APIs and props. Use explicit typing for parameters/returns where it enhances clarity
- **Utility Types**: Use `Record<string, unknown>` for generic objects instead of `object` or `any`
- **Enums**: Avoid enums. Use JavaScript objects or TypeScript unions instead
- Leverage type narrowing and `as const` assertions

### Modern JavaScript

- Use `for...of`, optional chaining (`?.`), and nullish coalescing (`??`)
- `const` by default. Never `var`
- `async/await` instead of promise chains. Always `await` promises

## Workspace Awareness

- Always verify which app or package you are modifying
- Add dependencies to the correct workspace `package.json`, not root
- Root `package.json` is exclusively for monorepo management tools

## Scope Discipline

- No over-engineering
- No elaborate visual designs or heavy effects
- Logic must be agnostic — runnable in any terminal without modification
