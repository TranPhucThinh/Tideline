---
name: Tideline
description: Daily spending ledger with two visual styles and cycle-based themes
colors:
  tide-canvas: "#f1f5f8"
  tide-surface: "#ffffff"
  tide-ink: "#203a56"
  tide-muted: "#53677a"
  tide-line: "#d9e2e9"
  tide-surplus: "#16766d"
  tide-deficit: "#a84453"
  dawn-canvas: "#f8f3eb"
  dawn-ink: "#473328"
  slate-canvas: "#eef2f3"
  slate-ink: "#293e48"
  bloom-canvas: "#f6f2f7"
  bloom-ink: "#44364f"
  ledger-canvas: "#f0e7d8"
  ledger-surface: "#fffaf0"
  ledger-ink: "#35413c"
  brass-canvas: "#eee9dc"
  brass-ink: "#403a2c"
  enamel-canvas: "#e6edec"
  enamel-ink: "#29444a"
  clay-canvas: "#f1e7df"
  clay-ink: "#503b33"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    lineHeight: 1.5
rounded:
  control: "0.625rem"
  panel: "1rem"
spacing:
  card: "1.25rem"
  card-desktop: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.tide-ink}"
    textColor: "{colors.tide-surface}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
---

# Design System: Tideline

## Overview

**Creative North Star: "A dependable daily ledger"**

Tideline is an operating interface for frequent money entries. Its navigation, reading order, and semantic status colors stay stable. Users choose between the incumbent **Hiện tại** style and the tactile **Sổ tay** style. Each style has four named palettes that rotate with the user's spending cycle; the first palette starts in the cycle containing account creation.

**Key Characteristics:**

- Numbers and actions stay prominent across styles.
- Palette changes mark a new cycle without relocating controls.
- Sổ tay gives surfaces, fields, and buttons restrained physical depth.

## Colors

The default modern Tide palette is the existing blue ink and mist canvas. Modern rotates through Tide, Dawn, Slate, and Bloom. Sổ tay rotates through Sổ thu chi, Đồng thau, Men biển, and Đất nung. Exact runtime palettes live in `src/app.css` under the eight `data-ui-theme` selectors; the frontmatter records their defining canvas and ink colors.

**The Semantic Color Rule.** Positive balance remains green and deficit remains red in all eight themes. Muted labels, rules, input borders, and status backgrounds follow the active palette.

## Typography

Manrope carries headings and numeric emphasis; Be Vietnam Pro carries body copy and form labels. Amounts use tabular figures and retain wrapping on narrow screens. Both styles use the same type hierarchy.

## Layout

The signed-in app is mobile-first with a bottom navigation bar and a narrow reading width. At the desktop breakpoint, the content widens to a `max-w-5xl` container and navigation moves into the header. Settings uses two columns on desktop; appearance spans both columns. Theme changes never alter these task paths.

## Elevation & Depth

Hiện tại uses largely flat color surfaces and borders. Sổ tay uses a light directional highlight, a soft downward shadow on panels, inset shading on fields, and a pressed state on buttons. Its treatment is implemented in `src/app.css` under `data-ui-style='skeuomorphic'` and applies across all four Sổ tay palettes.

**The Material Rule.** Depth clarifies which areas are a surface, an input, or an action; it does not compete with money values.

## Shapes

Controls have a softly rounded 0.625rem corner; panels use 1rem. Sổ tay keeps the same geometry so switching styles does not change spatial memory.

## Components

### Buttons

Primary buttons use the active ink color and a light text color. Sổ tay adds an edge, highlight, and a one-pixel pressed movement. Focus remains a visible two-pixel ink outline.

### Cards and ledger

Panels and the ledger table use the active surface, line color, and panel radius. Sổ tay adds paper-like directional lighting and short soft shadows. Surplus and deficit cards keep their semantic fills.

### Inputs and navigation

Inputs use a solid readable surface and distinct border; Sổ tay adds inner depth. The active navigation item retains its placement and label, gaining a subtle raised treatment in Sổ tay.

## Do's and Don'ts

### Do:

- Do preserve readable contrast and semantic surplus/deficit meaning in every palette.
- Do show the style choice and current cycle theme together in Settings.
- Do keep form controls and navigation in consistent positions across styles.

### Don't:

- Don't let material lighting reduce the contrast of amount text or chart data.
- Don't change the spending calculation or transaction history when the theme changes.
