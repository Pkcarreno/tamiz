---
name: Tamiz
description: Precision instrument for extracting clean content from web pages for LLM workflows
colors:
  ground: "#f5f5f7"
  ground-raised: "#ffffff"
  ground-elevated: "#ffffff"
  focus: "#c45d2e"
  focus-bright: "#d9723f"
  text: "#1d1d1f"
  text-secondary: "#6e6e73"
  text-tertiary: "#aeaeb2"
  text-on-focus: "#ffffff"
  state-error: "#d70015"
  state-success: "#34c759"
  state-warning: "#ff9f0a"
typography:
  sans:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "24px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.text-tertiary}"
    rounded: "{rounded.sm}"
    padding: "0"
    height: "24px"
  select-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 4px"
    height: "24px"
  select-standard:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "28px"
  toast:
    backgroundColor: "{colors.ground-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: Tamiz

## Overview

**Creative Direction: "Paper & Ink"**

Tamiz is a precision instrument for extracting signal from noise. The visual system draws from stationery and craft — warm paper grounds, near-black ink text, and the restraint of a well-made tool. Every surface exists to bring content into focus, then recede. The interface is invisible until needed.

The palette is deliberately restrained: warm paper tones with a single burnt orange accent that appears only on active focus states. Typography is the system stack, chosen for native integration over personality. The extension should feel like part of the browser, not a third-party add-on.

**Key Characteristics:**
- Light warm paper ground (#f5f5f7) with white raised surfaces
- Single burnt orange accent (#c45d2e) — appears only on active focus states
- Ghost interactions: no background emphasis, text-color hover (link-like)
- macOS-native density: compact, accessible, not oversized
- Hairline separators between interaction zones
- System typography for native feel

## Colors

The palette is a restrained warm neutral system with one saturated accent. The accent appears only on interactive focus states; everything else is ground.

### Primary

- **Burnt Orange** (#c45d2e): The color of focus. Used exclusively for active focus states — the floating bar's selected format, the button's primary state, the element highlight ring. Its rarity is the point: the user sees it only when they're actively capturing content.

### Neutral

- **Warm Paper** (#f5f5f7): The ground. The browser extension's light canvas, chosen for low visual weight and warmth.
- **White Surface** (#ffffff): Elevated cards and panels (floating bar, toast). Pure white for depth hierarchy on light ground.
- **Ink** (#1d1d1f): Primary text on light ground. High contrast (16.1:1), near-black for readability.
- **Graphite** (#6e6e73): Secondary text, descriptions, labels. 5.2:1 contrast — clearly readable but subordinate.
- **Silver** (#aeaeb2): Tertiary text, placeholders, disabled states. Use sparingly.

### Named Rules

**The Focus Rarity Rule.** The burnt orange accent appears on ≤15% of any given surface. Its rarity makes the focus moment feel significant. If orange appears everywhere, it's decoration, not function.

**The Ground Purity Rule.** Never use colored overlays or tinted backgrounds on the ground surfaces. Depth comes from elevation and shadow, not hue shifts.

## Typography

**Display Font:** System stack (-apple-system, SF Pro Text, Inter, system-ui)
**Body Font:** Same system stack
**Mono Font:** SF Mono, JetBrains Mono, Fira Code (for data and measurements)

**Character:** The typography is invisible by design. System faces blend with the browser's native UI, reinforcing that Tamiz is a tool, not a product. Hierarchy comes from weight and size, not font personality.

### Hierarchy

- **Display** (600 weight, 15px, -0.01em tracking): Popup title. Tight, confident, present but not loud.
- **Body** (400 weight, 13px, 1.5 line-height): Primary content text. The workhorse.
- **Label** (500 weight, 10px, 0.06em tracking, uppercase): Field labels. Small, scannable, functional.
- **Mono** (400 weight, 12px): Data values, measurements, code references. Never decorative.

### Named Rules

**The System Stack Rule.** Never import custom fonts. The system stack is the point — native integration over brand expression.

## Layout

Tamiz operates at small fixed dimensions: the popup is 280px wide, the floating bar is ~260px wide, and content highlights overlay any page. There is no grid — components are self-contained panels with internal padding.

**Spacing rhythm:** 4px base unit, scaled as 4/8/12/16/20/24. Tight internal spacing, generous external separation. More space above headings than below.

**Density:** Compact. macOS-native. These are utility surfaces, not content pages. Every pixel serves a function.

## Elevation & Depth

The system uses minimal shadows on light ground. Depth comes from elevation differences — white surfaces on warm paper ground — with subtle shadows for floating elements.

### Shadow Vocabulary

- **Small** (`0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)`): Subtle lift for buttons and small elements.
- **Medium** (`0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`): Floating bar, elevated panels.
- **Large** (`0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.04)`): Toast notifications, overlays.
- **Focus Glow** (`0 0 0 2px rgba(196,93,46,0.12), 0 0 12px rgba(196,93,46,0.2)`): Active focus ring. The warm glow signals precision.

### Named Rules

**The Light Ground Rule.** On light surfaces, shadows are minimal and warm. Heavy shadows feel wrong on paper — they belong on dark grounds.

## Shapes

The form language is compact but soft. Radii are moderate — not sharp, not bubbly.

- **Small** (4px): Compact elements like small buttons, select options.
- **Medium** (6px): Standard buttons, panels, floating bar. The default radius.
- **Large** (8px): Toast notifications, larger containers.
- **Pill** (999px): Toast shape. Fully rounded for a floating, ephemeral feel.

**Border treatment:** 1px solid borders at 10% black opacity. Barely visible at rest, they define edges without visual weight.

## Components

### Buttons

Two variants: ghost (text-only) and icon (icon-only square). No primary, no secondary emphasis — all buttons are ghost-like. Hover changes text/icon color (link-like behavior), never background.

- **Ghost:** Transparent, text-only. For Cancel and text actions. Hover changes text color to focus.
- **Icon:** Transparent, icon-only square. For Copy and Download (lucide-solid icons). Hover changes icon color to focus.
- **States:** Hover (text color to focus), active (scale 0.97), disabled (0.35 opacity), focus-visible (2px orange outline).

### Select (Native `<select>`)

Two visual variants: subtle (floating bar) and standard (popup). Both are minimal — no background emphasis, no visible border at rest.

- **Subtle:** Borderless, full-width, ghost-like. For floating bar format selection.
- **Standard:** Minimal border, for popup/form layouts.
- **States:** Focus (warm glow ring), hover (subtle text color change).

### Toast

Ephemeral notification. Pill-shaped, light surface, centered at bottom of viewport.

- **Shape:** Full pill (999px radius).
- **Surface:** White ground (#ffffff) with medium shadow.
- **Animation:** Fade + scale from below.

### Floating Bar

The core interaction surface. Single-row layout, no container gaps or padding.

- **Surface:** White ground (#ffffff) with medium shadow and 12px backdrop blur.
- **Shape:** 6px radius (medium). Single-row layout.
- **Animation:** Scale + fade entrance (280ms ease-out).
- **Content:** Format selector (fill width) → separator → Copy icon → Download icon → separator → Cancel.
- **Separators:** Thin 1px vertical lines between interaction zones. Become visible on hover of the group.

### Popup

Configuration surface. 280px wide, light ground, minimal chrome.

- **Surface:** Warm paper ground (#f5f5f7). No borders, no shadows — it sits flat.
- **Typography:** Title (display), description (secondary), labels (tertiary uppercase).
- **Layout:** Vertical stack, generous spacing between sections.

## Do's and Don'ts

### Do:
- **Do** use the burnt orange accent only for active focus states — selection, hover highlight, primary action.
- **Do** keep buttons ghost-like: text-only or icon-only, hover changes color not background.
- **Do** use macOS-native density: compact, accessible, not oversized.
- **Do** use thin separators between interaction zones in the floating bar.
- **Do** keep typography at system defaults — the native feel is the brand.

### Don't:
- **Don't** use orange as a general accent — it's reserved for the focus moment.
- **Don't** add primary or emphasis buttons — all actions are ghost-like.
- **Don't** use heavy shadows on light ground — they feel wrong on paper.
- **Don't** import custom fonts — the system stack is intentional.
- **Don't** use gradient backgrounds or decorative overlays — depth comes from elevation.
- **Don't** make elements oversized — macOS density is the reference.
