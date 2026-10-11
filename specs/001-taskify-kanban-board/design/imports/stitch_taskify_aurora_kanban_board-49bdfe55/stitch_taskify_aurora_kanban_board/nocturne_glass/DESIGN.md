---
name: Nocturne Glass
colors:
  surface: '#0e1323'
  surface-dim: '#0e1323'
  surface-bright: '#34394a'
  surface-container-lowest: '#080d1d'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f30'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3446'
  on-surface: '#dee1f9'
  on-surface-variant: '#bbcac5'
  inverse-surface: '#dee1f9'
  inverse-on-surface: '#2b3041'
  outline: '#859490'
  outline-variant: '#3c4946'
  surface-tint: '#4ddcc6'
  primary: '#b5fff0'
  on-primary: '#003730'
  primary-container: '#5eead4'
  on-primary-container: '#00675b'
  inverse-primary: '#006b5e'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#f6eeff'
  on-tertiary: '#3c0091'
  tertiary-container: '#ddcdff'
  on-tertiary-container: '#6b37d4'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ef9e2'
  primary-fixed-dim: '#4ddcc6'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#0e1323'
  on-background: '#dee1f9'
  surface-variant: '#2f3446'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system embodies a serene, twilight-inspired work environment tailored for small, high-trust teams. It merges strict organizational clarity with an ethereal, optical aesthetic: deep midnight spatial foundations, tranquil aurora glows, and translucent material strata. 

The aesthetic movement is refined **Glassmorphism grounded in Nocturnal Atmospheric Minimalism**. It projects quiet composure, effortless focus, and tactile luminous feedback. Every surface behaves like precision-milled frosted architectural glass suspended over deep ambient light fields. The interface eliminates stark corporate friction in favor of calm, immersive depth that reduces visual fatigue during extended desktop sessions.

## Colors

The foundation is built upon `#0B1020`, an expansive void populated by deep optical atmospheric blooms:
- **Aurora Blooms:** Radial blurred gradients in `#2DD4BF` (Teal), `#6366F1` (Indigo), and `#8B5CF6` (Violet) sitting behind structural panels at 12–18% opacity with 120px–180px Gaussian blur.
- **Glass Surfaces:** Base fill of `rgba(255, 255, 255, 0.08)` coupled with an inner specular edge highlight of `rgba(255, 255, 255, 0.14)`.
- **Primary Accent:** `#5EEAD4` provides clear interactive wayfinding, active states, and focus indicators.
- **Typography:** Primary text rests at `#E6E9F2` for high legibility without harsh glare; secondary metadata settles at `#A3ACC2`.
- **Workflow State Tokens:**
  - *To Do:* Slate `#94A3B8`
  - *In Progress:* Sky `#7DD3FC`
  - *In Review:* Amber `#FCD34D`
  - *Done:* Mint `#86EFAC`

State colors must be applied with subdued luminescence: pair solid state markers with a soft 10% translucent tint for container tags and column badges.

## Typography

The type system is powered entirely by **Plus Jakarta Sans**, utilizing its geometric clarity, friendly open counters, and crisp rendering against translucent dark backdrops. 

Headings employ tighter tracking (`-0.02em` to `-0.01em`) and medium-to-bold weights to ground spatial arrangements. Body copy relies on neutral regular weights (`400`) at comfortable line heights to preserve reading ease over blurred ambient color. Micro-labels, column counters, and status badges leverage uppercase or medium-weighted tracking to retain legibility across subtle frosted surfaces.

## Layout & Spacing

The layout follows a desktop-optimized horizontal workflow designed to house the four primary status tracks alongside a slim persistent command rail.

- **Canvas Architecture:** Viewport-locked desktop workspace with an invariant `2rem` outer safety margin.
- **Column Grid:** Fluid multi-track canvas where Kanban lanes share a uniform `gutter` of `1.25rem`. Each lane flexes symmetrically with a min-width of `300px` and max-width of `380px`.
- **Card Spacing:** Inside each lane, task cards stack vertically with `0.75rem` spacing. Card interior padding strictly adheres to `space-md` (`1rem`) to keep densities high without clutter.
- **Scroll Model:** Global horizontal scroll is isolated to the column viewport if window bounds compress below lane minimums, while vertical lanes scroll independently via hidden scrollbars.

## Elevation & Depth

Hierarchy is achieved via optical diffusion, backdrop blurs, and perimeter light catchers rather than opaque elevation tiers:

- **Base Ambient Layer (Z-0):** `#0B1020` canvas populated with static SVG or CSS radial auroras (`#2DD4BF`, `#6366F1`, `#8B5CF6`) blurred at `140px`.
- **Lane Columns (Z-1):** `backdrop-filter: blur(24px)`, surface fill `rgba(255, 255, 255, 0.04)`, border `1px solid rgba(255, 255, 255, 0.08)`.
- **Kanban Cards (Z-2):** `backdrop-filter: blur(16px)`, surface fill `rgba(255, 255, 255, 0.08)`, border `1px solid rgba(255, 255, 255, 0.14)`. Top-edge highlight created via `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.20)`. Ambient shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.35)`.
- **Floating Overlays & Modals (Z-3):** `backdrop-filter: blur(32px)`, surface fill `rgba(255, 255, 255, 0.12)`, border `1px solid rgba(255, 255, 255, 0.22)`, ambient shadow `0 20px 48px -8px rgba(0, 0, 0, 0.6)`.
- **Active Drag State:** While being moved, cards lift to Z-3, scale to `1.02`, and receive an outer edge illumination tint matching `#5EEAD4` at 30% opacity.

## Shapes

The geometry uses curated, tiered roundedness to communicate nesting and tactile boundaries:

- **Columns (Lanes):** `20px` border radius (`rounded-xl` custom), providing a soft, architectural vessel for tasks.
- **Task Cards:** `16px` border radius (`rounded-lg` token variant), fitting smoothly inside the `20px` container geometry.
- **Interactive Controls & Buttons:** Full pill geometry (`border-radius: 9999px`) to create clear differentiation between rectangular content modules and actionable triggers.
- **Tags & Status Badges:** `9999px` capsule silhouettes with compact internal padding.
- **Input Fields:** `12px` roundedness to match internal card micro-geometry.

## Components

### Buttons
- **Primary:** Pill shape (`9999px`). Background `#5EEAD4`, label text `#0B1020` (Bold `14px`), subtle glow `0 0 16px rgba(94, 234, 212, 0.35)`. Hover elevates glow intensity to 50%.
- **Secondary (Glass):** Pill shape. Background `rgba(255, 255, 255, 0.08)`, border `1px solid rgba(255, 255, 255, 0.14)`, text `#E6E9F2`. Hover transitions to `rgba(255, 255, 255, 0.14)`.
- **Icon Buttons:** Circular 36px or 40px hit area. 1.5px stroke monoline icons. Surface follows secondary glass rules.

### Kanban Cards
- Fluid frosted panel (`16px` radius). Inset top highlight `1px` white at 20% opacity. 
- Contains: Task title (`headline-md`, `#E6E9F2`), summary (`body-sm`, `#A3ACC2`), category tag, checklist completion pill, and an avatar row.
- Subtle transition on hover: `translateY(-2px)` accompanied by an increase of the border border-alpha to `0.22`.

### Columns
- Large glass containers (`20px` radius). Header contains an indicator pill showing column state color (`#94A3B8`, `#7DD3FC`, `#FCD34D`, or `#86EFAC`), title (`label-lg`), and an item counter pill.
- Scrollable card container with dedicated drop-indicator: a glowing 2px dashed outline in `#5EEAD4` with `16px` border radius.

### Input Fields & Search
- Surface `rgba(255, 255, 255, 0.05)`, border `1px solid rgba(255, 255, 255, 0.12)`, radius `12px`.
- Text `#E6E9F2`, placeholder `#A3ACC2` at 60% opacity. Focus state shifts border to `#5EEAD4` with a `0 0 0 3px rgba(94, 234, 212, 0.15)` ring.

### Team Avatars
- 28px/32px circles with a 1.5px border in `rgba(255, 255, 255, 0.3)`. Overlapping avatar stack with a -8px horizontal margin offset. Tooltips render with full glass blur.

### Chips & Badges
- Capsule pills (`9999px`). Background tint is a 10% alpha variant of the respective status color; text is the solid state color (`11px`, `label-sm`).