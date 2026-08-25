---
name: Tamiz
description: Design system for the Tamiz browser extension
colors:
  ground: "#fafafa"
  ground-raised: "#ffffff"
  ground-elevated: "#ffffff"
  accent: "#2563eb"
  accent-bright: "#3b82f6"
  accent-dim: "rgba(37,99,235,0.12)"
  accent-glow: "rgba(37,99,235,0.2)"
  text: "#0a0a0a"
  text-secondary: "#525252"
  text-tertiary: "#a3a3a3"
  text-on-accent: "#ffffff"
  state-error: "#dc2626"
  state-success: "#16a34a"
  state-warning: "#f59e0b"
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
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
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
    padding: "0 8px"
    height: "28px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.text-tertiary}"
    rounded: "{rounded.sm}"
    padding: "0"
    height: "28px"
    width: "28px"
  select-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "28px"
  select-standard:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "32px"
  toast:
    backgroundColor: "{colors.ground-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: Tamiz

## Overview

**Creative direction: Precision Tool**

Tamiz is a precision instrument for extracting signal from noise. The interface is cold, minimal, and surgical — it disappears until the user needs it, then appears with purpose. The palette uses cool neutrals and one blue accent on active states only. System typography. Ghost interactions. No decoration.

**Key characteristics:**

1. Use cool neutral backgrounds (#fafafa light / #0a0a0a dark) with raised surfaces.
2. Use the blue accent (#2563eb) only for active states and focus rings.
3. Use ghost buttons. No background emphasis. Change text/icon color on hover.
4. Use comfortable density — not too compact, not oversized. Targets are easy to click.
5. Use zero visual gap between elements in toolbars. Separation is invisible, visible only on hover or focus.
6. Use system fonts. No custom imports.

## Colors

The palette uses cool neutral tones and one accent color. The accent appears only on active states. All other areas use background colors. The system supports light and dark mode through the same token set.

### Light Mode

- **Background** (#fafafa): Primary background surface.
- **Raised** (#ffffff): Elevated cards, panels, floating bar.
- **Elevated** (#ffffff): Toasts, popovers, overlays.
- **Accent** (#2563eb): Active states, selected format, focus rings, highlight border.
- **Text** (#0a0a0a): Primary text.
- **Text secondary** (#525252): Descriptions, labels, secondary actions.
- **Text tertiary** (#a3a3a3): Placeholders, disabled states, icons at rest.
- **Border** (rgba(0,0,0,0.08)): Separators, input borders.

### Dark Mode

- **Background** (#0a0a0a): Primary background surface.
- **Raised** (#141414): Elevated cards, panels, floating bar.
- **Elevated** (#1a1a1a): Toasts, popovers, overlays.
- **Accent** (#3b82f6): Active states, selected format, focus rings, highlight border.
- **Text** (#fafafa): Primary text.
- **Text secondary** (#a3a3a3): Descriptions, labels, secondary actions.
- **Text tertiary** (#525252): Placeholders, disabled states, icons at rest.
- **Border** (rgba(255,255,255,0.08)): Separators, input borders.

### Named rules

**The accent limit rule.** The blue accent appears on less than 15 percent of any surface. It marks active states, not decoration.

**The pure surface rule.** Do not tint background surfaces. Do not use color overlays on backgrounds. Use elevation and subtle borders to show depth.

**The dark mode rule.** Dark mode is not inverted light mode. Shadows become unnecessary; borders and elevation differences provide depth. Reduce contrast slightly between text levels.

## Typography

**Display font:** System fonts (-apple-system, SF Pro Text, Inter, system-ui).
**Body font:** System fonts.
**Mono font:** SF Mono, JetBrains Mono, Fira Code.

Use system fonts to match the browser chrome. Change font weight and size to show hierarchy.

### Hierarchy

- **Display** (600 weight, 14px, -0.01em tracking): Use for titles and section headers.
- **Body** (400 weight, 13px, 1.5 line-height): Use for primary text and UI labels.
- **Label** (500 weight, 11px, 0.04em tracking): Use for field labels and badges.
- **Mono** (400 weight, 12px): Use for data values, measurements, and code.

### Named rules

**The system font rule.** Do not import custom fonts. Use the default system fonts.

## Layout

The extension uses small fixed dimensions. The floating bar is the primary layout unit. The system does not use a grid. Components are independent panels.

**Spacing rhythm:** Use a 4px base unit. Scale as 4, 8, 12, 16, 20, or 24px. Keep internal spacing tight.

**Density:** Use comfortable density. Hit targets are 28px minimum. Not compact to the point of difficulty, not oversized.

## Elevation and Depth

Light mode uses subtle shadows. Dark mode uses borders and background elevation. Floating elements always use the raised surface with a border.

### Shadows

- **Small** (`0 1px 2px rgba(0,0,0,0.05)`): Use for small elevated elements in light mode.
- **Medium** (`0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`): Use for the floating bar and panels in light mode.
- **Large** (`0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.04)`): Use for toasts and overlays in light mode.
- **Focus glow** (`0 0 0 2px var(--accent-dim), 0 0 12px var(--accent-glow)`): Use for the active focus ring.

**Dark mode shadows:** Reduce or remove shadows. Use 1px border on raised surfaces instead.

### Named rules

**The light background rule.** Keep shadows small on light surfaces. In dark mode, replace shadows with borders.

## Shapes

Use moderate border radii. The system avoids extreme rounding.

- **Small radius** (4px): Use for buttons, selects, and small interactive elements.
- **Medium radius** (6px): Use for panels, the floating bar, and containers.
- **Large radius** (8px): Use for toast notifications and overlays.
- **Pill radius** (999px): Use for the toast shape.

**Borders:** Use 1px solid at 8 percent opacity (light) or 8 percent white (dark).

## Icons

**Library:** Lucide Icons. Use `lucide-solid` for SolidJS integration.

**Sizes:** 16px for inline icons in buttons. 14px for compact button icons. 20px for standalone icons.

**Color:** Icons inherit text color from their container. On hover, icons in ghost buttons change to the accent color.

**Why Lucide:** Consistent stroke width and optical weight across the full set. Good coverage for tool/utility iconography. The `lucide-solid` package provides tree-shakeable SolidJS components with no custom wrapper needed.

**SolidJS integration:** Use `lucide-solid` for first-class SolidJS components. No custom wrapper needed — import named components directly (e.g., `import { Copy, Download, X } from "lucide-solid"`). Each component accepts a `size` prop (in pixels) and inherits `currentColor` for fill.

## Components

### Buttons

The system has ghost buttons and icon buttons. No primary buttons. No secondary buttons. No background emphasis on any button.

- **Ghost button:** Transparent button with text. Height 28px. Text color changes to accent on hover.
- **Icon button:** Transparent square button with an icon. 28×28px. Icon color changes to accent on hover.
- **Button states:**
  - Rest: text-secondary or text-tertiary color.
  - Hover: accent color. No background change.
  - Active: scale(0.97). 160ms ease-out.
  - Focus: box-shadow (not outline) for cross-browser consistency. `--tz-shadow-focus` = `0 0 0 2px var(--tz-accent-dim), 0 0 12px var(--tz-accent-glow)`. Selector: `focus-visible:shadow-focus` + `focus-visible:outline-none`. Why box-shadow: outline doesn't animate with CSS transitions, doesn't support glow, and has inconsistent rendering across browsers (especially in Shadow DOM).
  - Disabled: opacity 0.35. cursor not-allowed.

#### Focus Strategy

All interactive elements follow a unified focus pattern:

- **Focus ring:** `focus-visible:shadow-focus focus-visible:outline-none` — uses `box-shadow` for consistent cross-browser rendering and glow support.
- **Focus transitions:** `box-shadow` included in the `transition` property for smooth animation.
- **Press feedback:** `active:enabled:scale-[0.97]` for tactile press feel.

### Select

Native `<select>` element with two visual variants.

- **Subtle select:** Borderless, 28px height. Use for format selection in the floating bar.
- **Standard select:** Minimal border, 32px height. Use for forms and popup settings.
- **States:** Focus shows the focus ring. Hover changes text color to accent. No background change.

### Toast

A short notification message at the bottom of the viewport.

- **Shape:** Pill radius (999px).
- **Surface:** Raised background with medium shadow (light) or border (dark).
- **Padding:** 8px 16px.
- **Animation:** Scale(0.95) + opacity entrance, 180ms ease-out. Exit 120ms ease-in.
- **Behavior:** Auto-dismiss after 2 seconds. Hover pauses dismiss.

### Floating Bar

The floating bar is the primary interaction surface. It appears after the user selects an element. It uses a two-row layout.

**Container:**
- Surface: `bg-raised` with 1px border.
- Shape: Medium radius (6px).
- Backdrop: 12px blur in dark mode. No blur in light mode (solid surface).
- Shadow: Medium shadow (light) or border only (dark).
- Width: Auto — determined by the widest row content. No fixed width.

**Row 1 — Top (subtle zone):**
- Layout: `display: flex; justify-content: space-between; align-items: center`.
- Contents: Format selector (left) and Settings button (right).
- The format selector fills available space minus the settings button width.
- Both elements use subtle styling. Text color is secondary.
- Height: 28px.

**Row 2 — Bottom (action zone):**
- Layout: `display: flex; align-items: center; justify-content: center`.
- Contents: Copy, Download, Cancel buttons.
- Buttons are evenly distributed across the row width.
- Height: 28px.

**Gap between rows:**
- A 1px horizontal border line separates the two rows. The border is the same color as the container border (8% opacity). The border is invisible against the raised surface and becomes visible on hover/focus context.

**Zero visual gap:**
- Elements within each row have no visible gap at rest. The spacing is structural (internal padding) but not visual. Elements appear separated only when hovered or focused — the accent color on the interactive element creates implicit separation.

**Animation:**
- Entrance: scale(0.97) + opacity, 180ms ease-out.
- No exit animation (instant disappearance — the tool recedes immediately).

**Positioning:**
- Anchored below the selected element with 8px offset.
- Clamped to viewport bounds with 8px margin.
- Repositions on scroll and resize without animation.

### Selector (Highlight Overlay)

The element highlight overlay shows during HIGHLIGHTING and SELECTED states.

- **Hover highlight:** 2px solid accent at 40% opacity. No background fill.
- **Selected highlight:** 2px solid accent at full opacity with accent-dim background (12% opacity).
- **Transition:** border-color and background-color, 120ms ease-out.

## Rules

### Do these things

1. Use the blue accent only for active states and focus.
2. Use ghost buttons. Change text/icon color on hover, never background.
3. Use comfortable density — 28px minimum hit targets.
4. Maintain zero visual gap in toolbars. Separation is implicit, not visual.
5. Use system fonts. No custom imports.
6. Support dark mode through the same token set.
7. Use Lucide Icons for all iconography.

### Do not do these things

1. Do not use the accent color as decoration.
2. Do not add primary or secondary buttons with backgrounds.
3. Do not use heavy shadows in light mode or any shadows in dark mode.
4. do not import custom fonts.
5. Do not use gradient backgrounds or color overlays.
6. Do not make elements smaller than 28px hit targets.
7. Do not add visible gaps between toolbar elements at rest.
8. Do not animate the floating bar exit.
