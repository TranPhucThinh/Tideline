---
name: Tideline
description: Daily spending ledger with modern and soft relief styles and cycle-based themes
colors:
  tide-canvas: "#f1f5f8"
  tide-surface: "#ffffff"
  tide-ink: "#203a56"
  tide-muted: "#53677a"
  tide-line: "#d9e2e9"
  tide-input-line: "#8193a3"
  tide-surplus: "#16766d"
  tide-surplus-bg: "#e1f1ee"
  tide-deficit: "#a84453"
  tide-deficit-bg: "#f8e9ec"
  dawn-canvas: "#f8f3eb"
  dawn-ink: "#473328"
  slate-canvas: "#eef2f3"
  slate-ink: "#293e48"
  bloom-canvas: "#f6f2f7"
  bloom-ink: "#44364f"
  soft-coral: "#ee917b"
  soft-coral-ink: "#542b25"
  mist-surface: "#e6eef5"
  mist-ink: "#293e50"
  mist-muted: "#526578"
  mist-line: "#c5d3df"
  mist-input-line: "#74899c"
  mist-surplus: "#246858"
  mist-surplus-bg: "#d9e9e4"
  mist-deficit: "#a13c45"
  mist-deficit-bg: "#f0dfe3"
  mist-swatch: "#b5cbdc"
  sand-surface: "#eee9e1"
  sand-ink: "#493e34"
  sand-muted: "#6b5f52"
  sand-line: "#d7cdbf"
  sand-input-line: "#8f7e6a"
  sand-surplus: "#396445"
  sand-surplus-bg: "#e0e8da"
  sand-deficit: "#9c4038"
  sand-deficit-bg: "#efded8"
  sand-swatch: "#d5c8b6"
  jade-surface: "#e3ede8"
  jade-ink: "#304b43"
  jade-muted: "#516b60"
  jade-line: "#c2d3ca"
  jade-input-line: "#6f8a7e"
  jade-surplus: "#206551"
  jade-surplus-bg: "#d3e6dc"
  jade-deficit: "#9b4148"
  jade-deficit-bg: "#efdee0"
  jade-swatch: "#b6cebf"
  rose-surface: "#f0e5e8"
  rose-ink: "#503c46"
  rose-muted: "#725b67"
  rose-line: "#ddc9d1"
  rose-input-line: "#977b89"
  rose-surplus: "#30674f"
  rose-surplus-bg: "#dce9df"
  rose-deficit: "#a0394c"
  rose-deficit-bg: "#efdae0"
  rose-swatch: "#d9bcc7"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.01em"
  page-title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  section-title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    lineHeight: 1.5
rounded:
  segment: "0.5rem"
  control: "0.625rem"
  sample: "0.75rem"
  panel: "1rem"
  soft-segment: "0.75rem"
  soft-control: "1rem"
  soft-panel: "1.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  compact: "0.75rem"
  md: "1rem"
  card: "1.25rem"
  card-desktop: "1.5rem"
  page-desktop: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.tide-ink}"
    textColor: "{colors.tide-surface}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
    height: "3rem"
  button-secondary:
    backgroundColor: "{colors.tide-surface}"
    textColor: "{colors.tide-ink}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
  button-danger:
    backgroundColor: "{colors.tide-deficit}"
    textColor: "{colors.tide-surface}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
  soft-button-primary:
    backgroundColor: "{colors.soft-coral}"
    textColor: "{colors.soft-coral-ink}"
    rounded: "{rounded.soft-control}"
    padding: "0.625rem 1rem"
    height: "3rem"
  input:
    backgroundColor: "{colors.tide-surface}"
    textColor: "{colors.tide-ink}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
    height: "3rem"
  soft-input:
    backgroundColor: "{colors.mist-surface}"
    textColor: "{colors.mist-ink}"
    rounded: "{rounded.soft-control}"
    padding: "0.75rem 1rem"
    height: "3rem"
  panel:
    backgroundColor: "{colors.tide-surface}"
    textColor: "{colors.tide-ink}"
    rounded: "{rounded.panel}"
    padding: "1.25rem"
  soft-panel:
    backgroundColor: "{colors.mist-surface}"
    textColor: "{colors.mist-ink}"
    rounded: "{rounded.soft-panel}"
    padding: "1.25rem"
  soft-navigation:
    backgroundColor: "{colors.mist-surface}"
    textColor: "{colors.mist-ink}"
    rounded: "{rounded.soft-control}"
    padding: "0.5rem"
  soft-choice:
    backgroundColor: "{colors.mist-surface}"
    textColor: "{colors.mist-ink}"
    rounded: "{rounded.soft-control}"
    padding: "1rem"
  soft-segment:
    backgroundColor: "{colors.mist-surface}"
    textColor: "{colors.mist-ink}"
    rounded: "{rounded.soft-segment}"
    padding: "0.5rem"
---

# Design System: Tideline

## Overview

**Creative North Star: "A dependable daily ledger"**

Tideline is an operating interface for frequent money entries. Numbers, navigation and semantic status colors stay stable across the incumbent **Hiện tại** style and the soft relief **Nổi mềm** style. The style is chosen separately from the palette: each style owns four themes that rotate with the spending cycle, beginning with the cycle containing account creation.

Nổi mềm uses pastel surfaces of one shared color, with upper-left light and lower-right shade. Raised actions press inward; fields and selected controls remain recessed. Manrope and Be Vietnam Pro retain the familiar hierarchy so material depth supports daily entry and reading.

**Key Characteristics:**

- Numbers and actions stay prominent across styles.
- Palette changes mark a new cycle without relocating controls.
- Nổi mềm uses same-color relief and recessed selections.

## Colors

### Primary

Modern primary actions use the active palette's ink. Nổi mềm primary actions use soft coral with dark coral ink; hover mixes the accent with white. Tide, Dawn, Slate and Bloom remain the modern cycle themes.

### Neutral

Sương xanh uses blue-grey mist, Cát ấm uses warm sand, Ngọc dịu uses pale jade and Hồng phấn uses pastel rose. In Nổi mềm the canvas and panel share the surface token. Each theme has its own readable ink, muted text, divider and stronger input boundary. The four swatch tokens are the actual appearance-preview colors, rather than action colors. Modern maintains separate canvas and light surface colors; its first theme and geometry are unchanged. Runtime companion palettes remain defined in src/app.css.

### Semantic

Surplus and deficit text, fills and validation messages use the active theme's green and red. Nổi mềm balance panels use the shared surface while keeping semantic amount text.

**The Semantic Color Rule.** Positive balance remains green and deficit remains red in all eight themes. Labels, input boundaries and status backgrounds follow the active palette.

## Typography

Manrope carries headings and numeric emphasis; Be Vietnam Pro carries body copy and form labels. Amounts use tabular figures and wrap on narrow screens. The prominent daily amount uses clamp(2rem, 8vw, 2.625rem), weight 600 and line-height 1.15. Page titles grow from the frontmatter's mobile size to 1.75rem at the desktop breakpoint; section titles retain the recorded size. Labels and context use 0.875rem; ordinary entry text uses 1rem. Appearance-choice titles use weight 700.

## Layout

The app is mobile-first, capped at 30rem with fixed bottom navigation and safe-area padding. At 48rem it widens to 64rem and moves navigation into the header; content padding grows from 1.25rem to 2rem. Today uses a 1.2fr/1fr desktop grid, with the entry form beside the balance and transactions. Settings uses two desktop columns with appearance spanning both; choices split at 40rem. Panels use 1.25rem padding, growing to 1.5rem on desktop; recurring major gaps are 1.5rem.

## Elevation & Depth

Hiện tại uses flat surfaces and borders, with a separate dialog shadow. Nổi mềm uses paired diffuse shadows: raised panels at 8px offsets, controls at 4px offsets, inset fields at 4px offsets and pressed controls at 2px offsets. Highlight opacity is 85%; the shadow tint changes with each pastel palette. Dialogs use a larger paired shadow. Primary actions add a small inner highlight. Exact shadow strings are recorded in the sidecar.

**The Shared Surface Rule.** Nổi mềm uses the same color for canvas and surfaces; paired shadows define depth, while selected tabs, navigation and radio choices stay inset.

## Shapes

Modern controls use the control radius (10px), panels the panel radius (16px), and segmented items the segment radius (8px). Nổi mềm controls and entries use soft-control (16px), panels soft-panel (24px), and segmented items soft-segment (12px). Appearance samples use sample (12px), and palette swatches are circles. Fields retain their visible one-pixel input boundary even when panels use transparent borders.

## Components

### Buttons

Modern primary, secondary and danger buttons keep their ink, bordered surface and deficit treatments. Nổi mềm primary buttons use coral with dark text, raised control shadows and a light inner edge; secondary buttons use the shared surface. Primary hover is 90% coral plus white; secondary hover becomes pressed. Enabled active buttons move down one pixel and use the pressed inset shadow. Disabled buttons use opacity 0.5 and a not-allowed cursor. Focus is a two-pixel ink outline with three-pixel offset. Soft button transitions use 180ms shadow/background and 150ms opacity; reduced-motion removes these transitions.

### Cards / Containers

Modern panels use a light surface and divider border. Nổi mềm panels use the canvas color with paired raised relief; transaction entries use the smaller raised-control shadow and radius. Financial figures retain green/red meaning. Desktop and mobile padding follow Layout.

### Inputs / Fields

Fields have a one-pixel active-theme input boundary, shared surface background, minimum height 3rem, and 0.75rem by 1rem padding. Nổi mềm adds the inset field shadow. Focus changes the boundary to ink and keeps the visible outline. Date wrappers receive their own focus outline. Placeholder and caret colors remain readable. Validation uses semantic deficit text and fill outside the field; no dedicated error-border token is introduced.

### Navigation

Mobile links show icons over labels and become horizontal on desktop. Modern current links use the surplus background. Nổi mềm links are raised at rest, with current links inset; the active icon uses dark coral ink. Hover retains the shared surface and readable ink. Focus remains visible.

### Segmented tabs and appearance choices

Modern tabs retain their flat ink-filled selection. Nổi mềm segments have a pressed tray and selected items use the pressed inset shadow, shared surface and weight 600. Native radio appearance choices are raised at rest and inset when selected, with the input boundary color marking selection. Choice focus outlines the full label; native radios retain keyboard behavior. Style names are Hiện tại and Nổi mềm, independently of the cycling palette.

Forced-colors replaces material shadows with visible CanvasText or ButtonText borders and uses Highlight outlines for selected navigation, choices and tabs.

## Do's and Don'ts

### Do:

- Do preserve readable contrast and semantic surplus/deficit meaning in every palette.
- Do show the style choice separately from the current cycle theme in Settings.
- Do keep native field boundaries, visible focus and consistent navigation positions across styles.

### Don't:

- Don't let material lighting reduce the contrast of amount text or chart data.
- Don't change the spending calculation or transaction history when the theme changes.
- Don't replace recessed selected controls with raised shadows in Nổi mềm.
