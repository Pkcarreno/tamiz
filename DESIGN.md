---
name: Tamiz
description: Design system for the Tamiz browser extension
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

**Creative direction: Paper & Ink**

The visual system uses warm neutral backgrounds and dark text. The interface stays hidden until the user needs it. The palette has warm tones and one orange accent. The accent color shows only on active states. The typography uses the default fonts of the operating system.

**Key characteristics:**

1. Use the warm background color (#f5f5f7) with white raised surfaces.
2. Use the orange accent color (#c45d2e) only for active states.
3. Use ghost buttons. Do not emphasize the background. Change the text color on hover.
4. Make the density compact. Do not make elements too large.
5. Put thin lines between interaction zones.
6. Use system fonts.

## Colors

The palette has warm neutral colors and one accent color. The accent color shows only on active states. All other areas use background colors.

### Primary

- **Orange** (#c45d2e): Use this color for active states. Examples include the selected format, the primary button state, and the highlight ring.

### Neutral

- **Warm background** (#f5f5f7): Use this color for the primary background.
- **White surface** (#ffffff): Use this color for elevated cards and panels.
- **Ink text** (#1d1d1f): Use this color for primary text.
- **Graphite text** (#6e6e73): Use this color for secondary text, descriptions, and labels.
- **Silver text** (#aeaeb2): Use this color for tertiary text, placeholders, and disabled states.

### Named rules

**The focus limit rule.** Put the orange accent on less than 15 percent of a surface.

**The pure background rule.** Do not use color overlays on background surfaces. Do not tint background surfaces. Use elevation and shadow to show depth.

## Typography

**Display font:** System fonts (-apple-system, SF Pro Text, Inter, system-ui).
**Body font:** System fonts.
**Mono font:** SF Mono, JetBrains Mono, Fira Code.

Use the system fonts to match the user interface of the browser. Change font weight and size to show hierarchy.

### Hierarchy

- **Display** (600 weight, 15px, -0.01em tracking): Use for titles.
- **Body** (400 weight, 13px, 1.5 line-height): Use for primary text.
- **Label** (500 weight, 10px, 0.06em tracking, uppercase): Use for field labels.
- **Mono** (400 weight, 12px): Use for data values, measurements, and code.

### Named rules

**The system font rule.** Do not import custom fonts. Use the default system fonts.

## Layout

The extension uses small fixed dimensions. The floating bar is approximately 260px wide. The system does not use a grid. Components are independent panels.

**Spacing rhythm:** Use a 4px base unit. Scale the spacing as 4, 8, 12, 16, 20, or 24px. Keep internal spacing tight. Put more space above headings than below headings.

**Density:** Make the layout compact.

## Elevation and Depth

The system uses small shadows on light backgrounds. Use white surfaces on the warm background to show depth. Use shadows for floating elements.

### Shadows

- **Small** (`0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)`): Use for buttons and small elements.
- **Medium** (`0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`): Use for the floating bar and elevated panels.
- **Large** (`0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.04)`): Use for toast notifications and overlays.
- **Focus glow** (`0 0 0 2px rgba(196,93,46,0.12), 0 0 12px rgba(196,93,46,0.2)`): Use for the active focus ring.

### Named rules

**The light background rule.** Make shadows small on light surfaces. Do not use heavy shadows.

## Shapes

Use moderate border radii for elements.

- **Small radius** (4px): Use for small buttons and select options.
- **Medium radius** (6px): Use for standard buttons, panels, and the floating bar.
- **Large radius** (8px): Use for toast notifications and large containers.
- **Pill radius** (999px): Use for the toast shape.

**Borders:** Use a 1px solid border at 10 percent black opacity.

## Components

### Buttons

The system has a ghost button and an icon button. Do not use a primary button or a secondary button. Do not change the background color on hover.

- **Ghost button:** A transparent button with text. Use for Cancel actions and text actions. Change the text color to the accent color on hover.
- **Icon button:** A transparent square button with an icon. Use for Copy actions and Download actions. Change the icon color to the accent color on hover.
- **Button states:** On hover, change the color to the accent color. On active, scale to 0.97. On disabled, set the opacity to 0.35. On focus, add a 2px orange outline.

### Select

The system uses the native select element. It has a subtle version and a standard version. Do not emphasize the background.

- **Subtle select:** A borderless element. Use for format selection in the floating bar.
- **Standard select:** An element with a minimal border. Use for forms.
- **Select states:** On focus, show the focus glow ring. On hover, change the text color.

### Toast

A short message at the bottom of the screen.

- **Shape:** Pill radius (999px).
- **Surface:** White background (#ffffff) with a medium shadow.
- **Animation:** Fade and scale from the bottom.

### Floating bar

A horizontal bar with a single row layout. The container has no gaps and no padding.

- **Surface:** White background (#ffffff) with a medium shadow and a 12px backdrop blur.
- **Shape:** Medium radius (6px).
- **Animation:** Scale and fade entrance for 280 milliseconds.
- **Content:** Format selector, separator, Copy icon, Download icon, separator, Cancel button.
- **Separators:** A 1px vertical line between interaction zones. Show the separator when the user hovers over the group.



## Rules

### Do these things

1. Use the orange accent only for active states.
2. Use ghost buttons. Change the color on hover.
3. Make the layout compact.
4. Put thin separators between interaction zones in the floating bar.
5. Use default system fonts.

### Do not do these things

1. Do not use the orange color as a general accent.
2. Do not add primary buttons.
3. Do not use heavy shadows on the light background.
4. Do not import custom fonts.
5. Do not use gradient backgrounds or color overlays.
6. Do not make elements too large.
