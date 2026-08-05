---
name: Tamiz
description: Precision lens for extracting clean content from web pages for LLM workflows
colors:
  ground: "#0f0f17"
  ground-raised: "#16161f"
  ground-elevated: "#1c1c28"
  focus: "#00d4ff"
  focus-bright: "#33dfff"
  text: "#e8e8f0"
  text-secondary: "#9898a8"
  text-tertiary: "#5c5c6e"
  text-on-focus: "#0f0f17"
  state-error: "#ff4d6a"
  state-success: "#34d399"
  state-warning: "#fbbf24"
typography:
  sans:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.text-on-focus}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.focus-bright}"
    textColor: "{colors.text-on-focus}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "34px"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.04)"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "34px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "34px"
  select-option-active:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.text-on-focus}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "34px"
  toast:
    backgroundColor: "{colors.ground-elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: Tamiz

## Overview

**Creative North Star: "The Deep Lens"**

Tamiz is a precision instrument for extracting signal from noise. The visual system draws from microscope and telescope aesthetics — concentric focus rings, layered depth, and the moment when模糊 resolves into clarity. Every surface exists to bring exactly the content you need into focus, then recede.

The palette is deliberately restrained: deep graphite grounds with glass surfaces that feel like looking through precision optics. The single cyan accent (#00d4ff) is the color of focus itself — it appears only when the user is actively selecting, never as decoration. Typography is the system stack, chosen for native integration over personality; the interface should feel like part of the browser, not a third-party add-on.

**Key Characteristics:**
- Dark ground with glass-layer depth (backdrop-filter blur)
- Single cyan focus accent — appears only during active selection
- System typography for native feel
- Concentric focus rings as the visual signature
- Minimal chrome, maximum signal

## Colors

The palette is a restrained neutral system with one saturated accent. The accent appears only on interactive focus states; everything else is ground.

### Primary

- **Focus Cyan** (#00d4ff): The color of precision. Used exclusively for active focus states — the floating bar's selected format, the button's primary state, the element highlight ring. Its rarity is the point: the user sees it only when they're actively capturing content.

### Neutral

- **Deep Graphite** (#0f0f17): The ground. The browser extension's dark canvas, chosen for low visual weight and contrast with content.
- **Raised Surface** (#16161f): Elevated cards and panels (floating bar, toast). One step above ground for depth hierarchy.
- **Elevated Surface** (#1c1c28): Interactive surfaces and popups. The highest resting layer.
- **Fog White** (#e8e8f0): Primary text on dark ground. High contrast (16.3:1), not pure white to reduce eye strain.
- **Mist** (#9898a8): Secondary text, descriptions, labels. 6.5:1 contrast — clearly readable but subordinate.
- **Shadow** (#5c5c6e): Tertiary text, placeholders, disabled states. Use sparingly.

### Named Rules

**The Focus Rarity Rule.** The cyan accent appears on ≤15% of any given surface. Its rarity makes the focus moment feel significant. If cyan appears everywhere, it's decoration, not function.

**The Ground Purity Rule.** Never use colored overlays or tinted backgrounds on the ground surfaces. Depth comes from glass layers and shadows, not hue shifts.

## Typography

**Display Font:** System stack (-apple-system, SF Pro Text, Inter, system-ui)
**Body Font:** Same system stack
**Mono Font:** SF Mono, JetBrains Mono, Fira Code (for data and measurements)

**Character:** The typography is invisible by design. System faces blend with the browser's native UI, reinforcing that Tamiz is a tool, not a product. Hierarchy comes from weight and size, not font personality.

### Hierarchy

- **Display** (600 weight, 17px, -0.01em tracking): Popup title. Tight, confident, present but not loud.
- **Body** (400 weight, 14px, 1.5 line-height): Primary content text. The workhorse.
- **Label** (500 weight, 11px, 0.05em tracking, uppercase): Field labels. Small, scannable, functional.
- **Mono** (400 weight, 13px): Data values, measurements, code references. Never decorative.

### Named Rules

**The System Stack Rule.** Never import custom fonts. The system stack is the point — native integration over brand expression. If a face isn't available, the system fallback carries the same weight and rhythm.

## Layout

Tamiz operates at small fixed dimensions: the popup is 320px wide, the floating bar is ~280px wide, and content highlights overlay any page. There is no grid — components are self-contained panels with internal padding.

**Spacing rhythm:** 4px base unit, scaled as 4/8/12/16/20/24. Tight internal spacing, generous external separation. More space above headings than below.

**Density:** Compact. These are utility surfaces, not content pages. Every pixel serves a function.

## Elevation & Depth

The system uses a hybrid of glass layers and shadows. Glass surfaces (backdrop-filter: blur) create translucent depth on dark grounds. Shadows are structural — they separate layers, not decorate.

### Shadow Vocabulary

- **Small** (`0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)`): Subtle lift for buttons and small elements.
- **Medium** (`0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)`): Floating bar, elevated panels.
- **Large** (`0 8px 32px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.25)`): Toast notifications, overlays.
- **Focus Glow** (`0 0 0 2px rgba(0,212,255,0.15), 0 0 20px rgba(0,212,255,0.25)`): Primary button hover. The cyan glow signals precision.

### Named Rules

**The Glass Layer Rule.** Surfaces that float above the page use backdrop-filter blur with semi-transparent backgrounds. This creates depth without heavy shadows, and the transparency connects the tool to the content beneath.

## Shapes

The form language is soft but precise. Radii are moderate — not sharp, not bubbly.

- **Small** (6px): Compact elements like small buttons, select options.
- **Medium** (10px): Standard buttons, panels, floating bar. The default radius.
- **Large** (14px): Toast notifications, larger containers.
- **Pill** (999px): Toast shape. Fully rounded for a floating, ephemeral feel.

**Border treatment:** 1px solid borders at 8% white opacity. Barely visible at rest, they define edges without visual weight.

## Components

### Buttons

Three variants: primary (focus cyan), secondary (glass), ghost (transparent). All share 34px height, 10px radius, system font at 13px.

- **Primary:** Cyan background, dark text. The only place the accent appears at rest. Hover adds a glow shadow and brightens to #33dfff.
- **Secondary:** Glass surface (4% white) with subtle border. For secondary actions like Cancel.
- **Ghost:** Transparent, text-only. For minimal interventions.
- **States:** Hover (brightness shift), active (scale 0.97), disabled (0.35 opacity), focus-visible (2px cyan outline).

### Select (Toggle Group)

Connected button group for format selection. Active option uses the focus cyan; inactive options are glass surfaces.

- **Shape:** 10px radius, 1px borders between options.
- **Active:** Cyan background, dark text — mirrors primary button.
- **Inactive:** Glass surface, secondary text. Hover brightens.

### Toast

Ephemeral notification. Pill-shaped, glass surface, centered at bottom of viewport.

- **Shape:** Full pill (999px radius).
- **Surface:** Elevated ground (#1c1c28) with large shadow and 12px backdrop blur.
- **Animation:** Fade + scale from below.

### Floating Bar

The core interaction surface. Appears anchored to the selected element via Shadow DOM isolation.

- **Surface:** Raised ground (#16161f) with medium shadow and 16px backdrop blur.
- **Shape:** 14px radius (large). Two-row layout.
- **Animation:** Scale + fade entrance (350ms ease-out).
- **Content:** Format selector (row 1), action buttons (row 2).

### Popup

Configuration surface. 320px wide, dark ground, minimal chrome.

- **Surface:** Deep graphite ground. No borders, no shadows — it sits flat.
- **Typography:** Title (display), description (secondary), labels (tertiary uppercase).
- **Layout:** Vertical stack, generous spacing between sections.

## Do's and Don'ts

### Do:
- **Do** use the cyan accent only for active focus states — selection, hover highlight, primary action.
- **Do** use backdrop-filter blur on floating surfaces to create depth.
- **Do** keep typography at system defaults — the native feel is the brand.
- **Do** use glass surfaces (4-10% white) for secondary elements on dark ground.
- **Do** animate entrance with scale + fade (not just opacity).

### Don't:
- **Don't** use cyan as a general accent — it's reserved for the focus moment.
- **Don't** add borders heavier than 1px at 8% opacity — they become visual noise.
- **Don't** import custom fonts — the system stack is intentional.
- **Don't** use gradient backgrounds or decorative overlays — depth comes from glass and shadow.
- **Don't** stack cards or nest panels — keep the hierarchy flat and scannable.
