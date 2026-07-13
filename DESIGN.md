# Design System: Editorial Frost & Earth

## 1. Overview & Creative North Star: "The Artisanal Chill"
This design system is built to bridge the gap between the raw, tactile nature of homemade goods and the crisp, refreshing precision of premium cold beverages. We are moving away from the "template" aesthetic of standard e-commerce to embrace a **High-End Editorial** experience.

**Creative North Star: The Artisanal Chill**
The interface should feel like a premium lifestyle magazine. We achieve this through **intentional asymmetry**, where product imagery breaks the container bounds, and a **tonal layering** system that mimics frosted glass resting on a warm, wooden countertop. We reject rigid grids in favor of "breathing" layouts—using vast whitespace to signal luxury and quality.

---

## 2. Colors & Surface Philosophy
The palette is a sophisticated interplay between the warmth of the "Coffee Brown" (`primary`) and the ethereal lightness of "Ice Blue" (`tertiary`).

### The Color Roles
*   **Primary (#331917):** Used for high-contrast typography and deep brand moments.
*   **Secondary (#006E20):** Representing the "Mint Green" freshness; reserved for success states and subtle herbal accents.
*   **Tertiary (#00242B):** The "Ice Blue" core, used to drive the cooling sensation of the UI.
*   **Surface / Background (#FFF8F3):** A warm cream base that ensures the "Cold" elements feel like they are popping off a stable, homemade foundation.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. 
*   *Example:* A `surface-container-low` section sitting directly on a `surface` background. 
*   Structural integrity is maintained through contrast in tone, not lines.

### Glass & Gradient Signature
To move beyond "flat" design, we utilize **Glassmorphism** for all floating elements (Modals, Hovering Cards). Use `surface-container-lowest` at 60% opacity with a `backdrop-filter: blur(12px)`.
*   **Signature Gradient:** For main CTAs, use a linear gradient from `primary` (#331917) to `primary_container` (#4B2E2B) at a 135-degree angle to provide a "roasted" depth that flat color cannot achieve.

---

## 3. Typography: Editorial Authority
We utilize two sans-serifs to create a "Modern Boutique" feel.

*   **Display & Headlines (Epilogue):** An authoritative, slightly wide sans-serif. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an "Editorial Header" effect. Headlines should often be asymmetrical—aligned left with significant right-side padding.
*   **Body & Labels (Manrope):** A highly legible, modern sans-serif. `body-lg` (1rem) is the workhorse. It provides a clean, neutral counterpoint to the expressive headlines.
*   **Hierarchy Note:** Use `on_surface_variant` (#504443) for secondary body text to reduce visual noise, keeping the focus on the `primary` dark titles.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too heavy for a "Fresh/Cold" brand. We use light and transparency to define space.

*   **The Layering Principle:** Stacking is the new bordering. 
    *   *Base:* `surface`
    *   *Section:* `surface-container-low`
    *   *Interactive Card:* `surface-container-lowest`
*   **Ambient Shadows:** If a card must float (e.g., a "Product of the Month"), use a shadow with a 40px blur, 0% spread, and 6% opacity, tinted with the `primary` hue.
*   **The Ghost Border:** For accessibility on white backgrounds, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism Depth:** Elements using the `tertiary_container` (Ice Blue) should always have a `backdrop-blur` to simulate looking through a chilled glass of water.

---

## 5. Components

### Buttons: The "Glowing" Interaction
*   **Primary:** A gradient-fill button using the `primary` to `primary_container` transition. Apply a subtle outer glow (4px blur) of the same color on hover to simulate "warmth."
*   **Secondary:** Glassmorphic. Transparent background, `backdrop-blur`, and a "Ghost Border."
*   **Shape:** Use the `xl` roundedness scale (1.5rem) for a friendly, organic feel.

### Cards & Lists: The "Fluid" Container
*   **Cards:** Forbid divider lines. Separate product info from descriptions using the `md` Spacing Scale (0.75rem) or a subtle shift from `surface-container-high` to `surface-container-highest`.
*   **Reveals:** All cards should use a "Smooth Reveal" animation: a 20px vertical slide combined with a 400ms ease-out opacity fade.

### Glassmorphic Chips
*   Used for flavors (e.g., "Mint," "Cold Brew").
*   Style: `tertiary_fixed_dim` at 40% opacity with `full` roundedness.

### Soft Input Fields
*   Text inputs use `surface_container_lowest` with a "Ghost Border." 
*   On focus, the border opacity increases to 40% and the background shifts to `tertiary_fixed` at 10% opacity (a "cool" highlight).

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins. If a photo is on the left, let the text on the right have 2x the expected padding to create an editorial "white space" feel.
*   **Do** overlap elements. Let a glassmorphic card slightly overlap a high-quality product image to create a sense of three-dimensional depth.
*   **Do** use the `secondary` (Mint) color sparingly—only for freshness "callouts" or organic badges.

### Don’t:
*   **Don’t** use pure black (#000) or pure grey. Always use the `on_surface` (#221A0F) for text to maintain the "Coffee/Cream" warmth.
*   **Don’t** use 90-degree sharp corners. The brand is "Homemade" and "Smooth"; stick to the `md` to `xl` roundedness scale.
*   **Don’t** use standard "Drop Shadows." If it looks like a default Photoshop shadow, it’s too heavy. Keep it ambient and tinted.