# Tamiz — Agent Instructions

## Project Overview

Tamiz is a monorepo for a browser extension. This extension selects page content visually. The extension converts the content to markdown or clean HTML. The core conversion logic is in agnostic packages. You can use these packages outside the extension.

## Monorepo Structure

```text
tamiz/
├── apps/
│   └── extension/          # Browser extension (WXT + SolidJS + Tailwind v4)
├── packages/
│   └── html-converter/     # Agnostic HTML conversion library
├── package.json            # Root — monorepo tools only
├── turbo.json
├── biome.jsonc
└── AGENTS.md
```

## Root Tools

- Runtime and Package Manager: Bun
- Build Orchestration: Turborepo
- Linter and Formatter: Biome with the Ultracite preset
- Git Hooks: Lefthook
- Commits: Commitizen

## Conventions

### Naming

- Use the `@tamiz/<name>` scope for all packages.
- Write package names in lowercase letters.
- Separate words in package names with hyphens.

### Language Standard

- Write all code, comments, README files, and documentation in English.
- Make the code self-documenting.
- Write comments to explain the reason for the code. Do not explain what the code does.
- You must use STE-flavored Simplified Technical English for all text.
- This rule applies to comments, documentation, TSDoc blocks, user interface strings, error messages, and README text.
- Use the `ste-writing` skill as the standard.

### Dependencies

- Add only necessary dependencies.
- Use dependencies that decrease code complexity.
- Use dependencies that decrease maintenance work.
- Get dependencies from trusted sources.
- Use this command to install a dependency: `bun add --filter @tamiz/<package> <dep>@latest`
- Do not install global tool dependencies in the workspace packages.
- Install global tools in the root directory only.

### Documentation

- Do not write documentation for simple code.
- Write TSDoc blocks for all methods, interfaces, type aliases, and module exports.
- Write TSDoc blocks for pure functions that manage complex logic or state mutations.
- Write TSDoc blocks for custom protocols or parsers.

### Public API Marking

- Add the `@public` tag to the TSDoc block for all exported types, interfaces, and component properties. These items form the public API.
- For grouped exports, put `/** @public */` directly above the export block.
- For inline exports with a TSDoc block, put the `@public` tag in the existing block. Do not make a separate block.
- For inline exports without a TSDoc block, put `/** @public */` directly above the declaration.

### Exports

- Do not use barrel files.
- Export items directly from the module.

### TypeScript

- Use strict mode: `strict: true`.
- Do not use the `any` type. Use the `unknown` type instead.
- Use type inference for local variables.
- Use `interface` for public APIs and component properties.
- Type the parameters and return values explicitly to improve clarity.
- Use `Record<string, unknown>` for generic objects. Do not use `object` or `any`.
- Do not use enums. Use JavaScript objects or TypeScript unions.
- Use type narrowing.
- Use `as const` assertions.

### Modern JavaScript

- Use `for...of` loops.
- Use optional chaining (`?.`).
- Use nullish coalescing (`??`).
- Use `const` as the default. Do not use `var`.
- Use `async` and `await` instead of promise chains.
- Always `await` promises.

### Testing

- Use Vitest as the test runner for all workspaces.
- Put the test files next to the source files.
- Use the same file name with a `.test` suffix. For example, use `picker.test.ts` for `picker.ts`.

## Workspace Awareness

- Identify the correct app or package before you change it.
- Add dependencies to the correct workspace `package.json` file.
- Do not add workspace dependencies to the root `package.json` file.
- Use the root `package.json` file for monorepo management tools only.

## Validation Protocol

- Run the full validation pipeline after every change.
- Run this command: `bun run validate`
- This command runs these steps in order: `lint`, `typecheck`, `test`.
- Do not skip steps.
- Do not commit code before the validation passes.

## Scope Discipline

- Do not over-engineer the code.
- Write agnostic logic.
- Make sure that the logic runs in any terminal without modifications.
