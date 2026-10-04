# Repository Guide

## Monorepo Architecture

- `apps/extension`: Browser extension built with WXT, SolidJS, and Tailwind CSS v4 (picker UI, entrypoints, background service worker).
- `packages/html-converter`: Agnostic HTML conversion library built with tsdown (DOM parsing, markdown/clean HTML strategies).

## Commands

Run all tasks through `bun` and `turbo` scripts from `package.json`. Do not invoke raw CLI binaries directly:
- **Validation**: `bun run validate` (runs `lint`, `typecheck`, and `test` across the monorepo)
- **Individual Checks**: `bun run lint`, `bun run lint:fix`, `bun run typecheck`, `bun run test`
- **Build & Dev**: `bun run build`, `bun run dev`
- Always verify changes with `bun run validate` before completing any code task.

## Conventions

### Code & Documentation
- Write all code, identifiers, comments, documentation, and git commits in English.
- Apply the `semantic-code-naming` skill for identifier naming and grammar (A/HC/LC, positive boolean prefixes).
- Apply the `asd-ste100` skill for technical prose (TSDoc, error messages, documentation, user-facing text).
- Comments must explain the rationale (*why*), never obvious mechanics (*what*).
- Provide TSDoc for exported APIs, module contracts, and complex logic only. Skip TSDoc for self-evident code.
- Annotate intentional public library exports with `/** @public */`.

### Structure & Modules
- Import directly from module files; avoid barrel files (`index.ts`).
- Colocate tests next to the source file using `.test.ts` (e.g. `parser.ts` → `parser.test.ts`).
- Prefer TypeScript `interface` for public module contracts and component props.
- Consult the `typescript-advanced-types` skill when designing complex generics, mapped types, or utility types.
- Install dependencies strictly within the `package.json` of the package that requires them: `bun add --filter @tamiz/<package> <dep>`.

### Architecture & Local Context
- Each package and application maintains its domain rules and architecture in its local `AGENTS.md`. Consult the local `AGENTS.md` before making changes within any subpath:
