# HTML Converter Package Guide

## Architecture

Agnostic HTML conversion library that transforms DOM structures and HTML strings into clean Markdown or sanitized HTML.

### Core Structure
- `src/converter.ts`: Core orchestrator routing elements through configured transformation strategies.
- `src/cleaner.ts`: Sanitization and node filtering pipeline (removes scripts, ads, tracking, hidden nodes).
- `src/dom.ts`: Cross-environment DOM parsing utilities.
- `src/strategies/`: Concrete transformation strategies (`markdown.ts`, `html.ts`).

## Conventions & Skills

### Environment Independence
- The package must remain strictly agnostic of browser extensions. Never import browser extension APIs (`browser.*`, `chrome.*`) or extension-specific code.
- Support both browser DOM environments and headless/server runtimes.

### Bundling & Types
- Consult the `tsdown` skill for bundling configuration and type generation powered by Rolldown.
- Consult the `typescript-advanced-types` skill for strategy options, AST visitor contracts, and transformation type definitions.
- Export items directly from module files; avoid barrel files (`index.ts`).
- Annotate all exported public APIs with `/** @public */`.
