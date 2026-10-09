---
version: 1
slug: "src-app-css"
primary_target: "src/app.css"
related_targets: ["src/routes/(app)/settings/+page.svelte","src/routes/(app)/+layout.svelte"]
---

# Soft UI appearance

Mode: Operate. Scope: the existing skeuomorphic style across Today, Settings, History and Stats; modern styling and accounting behavior stay established. Reference: the user-supplied blue-grey neumorphic banking UI, not a pixel-identical new banking product. Four cycle palettes remain; use distinct pastels unless the user steers otherwise.

## Direction contract

THESIS: A familiar spending app made tactile through soft, same-color relief, replacing the paper-and-brass treatment the user rejected.

OWN-WORLD: Blue-grey first, warm sand, jade and rose companion palettes. Manrope and Be Vietnam Pro remain. Diffuse light from the upper left and shade to the lower right define raised surfaces; paired inset shadows define fields and selected controls. Coral marks the primary action, with dark readable text.

STORY: Read today's balance, enter an amount, then review transactions. Green and red keep their financial meanings. Native radio, date, input and button behavior remains recognizable.

FIRST VIEWPORT: The existing Tideline header and navigation above the current-cycle label; a raised balance panel and entry form lead on desktop, stacked on mobile. The entry form retains its standard tabs, date, money and note fields. Mobile navigation has four raised controls, with the current item pressed in.

FORM: User-pinned reference, code-led. No concept tournament: reference selection and Operate limits settle the visual world. Signature interaction: a raised button presses into the shared surface while selected tabs remain recessed.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
