# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People with LLM-based workflows who need to extract information from web pages without noise that could induce hallucinations. These are pro AI users — developers, researchers, and knowledge workers who rely on LLMs daily and understand that input quality directly affects output quality.

## Product Purpose

Tamiz removes noise from web content and delivers clean, signal-rich text to LLM contexts. Like the kitchen sieve it's named after — which strains powder to remove larger lumps — Tamiz strains web pages to remove navigation, ads, boilerplate, and irrelevant markup, leaving only the content that matters.

Success means: the user selects exactly the content they want, in the format their LLM needs, with zero friction and zero noise in the output.

## Positioning

The visual element picker is the core differentiator. Competitors offer clipboard-based "copy as markdown" that captures everything or requires manual selection. Tamiz lets users hover, preview, and click to capture precisely the element they want — with conversion quality tuned for LLM consumption.

The name Tamiz (Spanish for "sieve/strainer") encodes the product promise: remove noise, increase signal.

## Operating Context

- Browser extension running in Chrome and Firefox
- User activates via popup (format selection + Capture button) or context menu
- Picker overlay appears on the current page — user hovers to highlight elements, clicks to select
- Floating action bar provides Copy, Download, and format toggle
- Output goes to clipboard (primary) or file download (secondary)
- Works on any web page (`<all_urls>`)

## Capabilities and Constraints

- **Element picker**: Visual hover-highlight + click selection with state machine (IDLE → HIGHLIGHTING → SELECTED)
- **Format output**: Markdown (via `@tamiz/html-converter`) or raw HTML
- **Copy to clipboard**: Primary action, one click
- **Download as file**: Secondary action, `.md` or `.html` extension
- **Shadow DOM isolation**: Picker UI doesn't interfere with host page styles
- **Cross-browser**: Chrome (MV3) and Firefox (MV3)
- **No data collection**: All processing happens locally, no network requests
- **Permissions**: `activeTab`, `contextMenus`, `scripting`, `downloads`

## Brand Commitments

- **Name**: Tamiz — Spanish for sieve/strainer, metaphor for removing noise and increasing signal
- **Voice**: Direct, technical, no-nonsense. Speaks to pro users who understand the problem
- **Visual direction**: macOS-native aesthetic — clean, minimal, modern trending apps. Think Linear, Raycast, Arc — not cluttered toolbars or chrome extension clichés
- **No logo yet**: Design system is open to establish one

## Evidence on Hand

- Working extension with full picker flow (hover → select → copy/download)
- `@tamiz/html-converter` package handles HTML→Markdown conversion
- Design tokens defined in `content.css` (generic defaults, not branded)
- UI components: Button, Select, Toast — functional but visually unbranded
- Tests exist for core logic (picker, position, content extraction, messaging)

## Product Principles

1. **Signal over noise**: Every design decision should reduce cognitive load and surface the content that matters
2. **Zero friction**: From activation to copied text, the flow should be as short as possible
3. **Local-first**: No data leaves the browser. Privacy is a feature, not a policy
4. **Precision control**: The user decides exactly what to capture — not the tool
5. **Blend in**: The extension should feel native to the browser, not bolted on

## Accessibility & Inclusion

- Keyboard navigation: Escape to dismiss picker
- Screen reader considerations for floating bar (ARIA labels needed)
- High-contrast highlight for element selection
- No specific standard required yet, but WCAG 2.1 AA is the target
