# tamiz

A browser extension that selects web page content visually and converts it to markdown or clean HTML.

Features:

- Element picker: selects exact HTML elements, filtering out ads and noise.
- Format output: converts content to markdown or clean HTML.
- Export options: copies to clipboard or downloads as a file.
- Keyboard-first: operates the entire selection and export flow via shortcuts.

## usage

### installation

- Chrome Web Store (coming soon)
- Firefox Add-ons (coming soon)

### workflow

1. Start the extension via the browser icon, context menu, or keyboard shortcut.
2. Move your cursor to highlight an element on the page.
3. Click the element to select it.
4. Use the floating action bar to copy the content or download it as a file.

### shortcuts

| command       | action                | context            |
| ------------- | --------------------- | ------------------ |
| `Alt+Shift+G` | start selection       | extension inactive |
| `c`           | copy content          | element selected   |
| `s`           | download file         | element selected   |
| `f`           | toggle output format  | element selected   |
| `e`           | toggle exclusion mode | element selected   |
| `r`           | restart selection     | element selected   |
| `Esc`         | dismiss picker        | any active state   |

## internals

The project is structured as a monorepo powered by Bun and Turborepo.

- **`@tamiz/html-converter`**: agnostic core logic package that handles DOM transformation.
- **`@tamiz/extension`**: browser extension built with WXT, SolidJS, and Tailwind CSS v4. Uses a Shadow DOM to prevent host page style conflicts.

### running locally

#### prerequisites

- **Bun**: `>= 1.3.14`

#### scripts

Run all commands from the repository root using `bun`:

**core workflow**

- `bun run dev`: Start development mode for Chrome and Firefox.
- `bun run build`: Build all packages and applications with Turborepo caching.
- `bun run zip`: Create the packaged `.zip` extension files for distribution.

**quality & maintenance**

- `bun run validate`: Run the full lint, typecheck, and test pipeline.
- `bun run test`: Execute unit tests.
- `bun run typecheck`: Perform TypeScript type checking.
- `bun run lint` / `lint:fix`: Run or auto-fix the linter and formatter checks.
- `bun run nuke`: Remove all generated artifacts, dependencies, and caches across the entire repository.

## faq

### What browsers are supported?

Chrome (Manifest V3) and Firefox (Manifest V2).

### Does it send my data to a server?

No. All data processing occurs locally in your browser.
