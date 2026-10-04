# Extension Application Guide

## Architecture

Browser extension for visually selecting and converting web page content into clean HTML or Markdown.

### Entrypoints
- `src/entrypoints/background.ts`: Service worker managing clipboard interactions, tab messaging, and browser action commands.
- `src/entrypoints/content.tsx`: Content script rendering the Shadow DOM UI overlay (selection indicator, floating action bar, toast notifications).
- `src/entrypoints/options.tsx`: Settings page for user preferences (output format, hotkeys, theme).
- `src/entrypoints/main-world.ts`: Script injected into the page context for DOM-level interactions when isolated worlds restrict access.

## Conventions & Skills

### WXT Framework
- Consult the `wxt-browser-extensions` skill for extension lifecycle, storage APIs, manifest options, and messaging protocols.
- Use WXT auto-imports and typed wrappers. Avoid hardcoding browser runtime globals when WXT provides typed equivalents.

### SolidJS UI
- Consult the `solid-composition-patterns` skill for UI components.
- Preserve SolidJS reactivity invariants: never destructure component props; use `splitProps` or access `props.x` directly.
- Use `createSignal`, `createMemo`, and fine-grained primitives for local UI state.

### Styling & Polish
- Consult the `tailwind-css-patterns` and `emil-design-eng` skills for UI styling, micro-interactions, and accessibility.
- Tailwind CSS v4 is used with CSS-first configuration. Use design tokens and semantic variables instead of magic values.
- Ensure all overlay UI renders inside Shadow DOM to prevent style leakage with host web pages.
