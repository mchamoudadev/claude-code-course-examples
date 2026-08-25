---
name: Neo-Financial Cryptosystem
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-numeric:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 4px
  container-padding: 20px
  stack-gap: 12px
  grid-gutter: 16px
  safe-area-bottom: 34px
---

## Brand & Style
The design system is engineered for a high-fidelity mobile crypto experience, emphasizing security, precision, and technological sophistication. The brand personality is "Neo-Financial": a synthesis of institutional reliability and decentralized innovation. 

The aesthetic leverages **Glassmorphism** and **Modern Minimalism**. It utilizes deep obsidian layers to create a sense of infinite depth, while vibrant electric accents guide the user's eye toward critical transactional data. The emotional response should be one of calm control amidst the volatility of the crypto market. 

**Key Visual Principles:**
- **Luminosity:** Use soft glows and inner borders to simulate light-emitting hardware.
- **Precision:** Every element is aligned to a strict grid with ultra-fine 1px strokes.
- **Depth:** Backgrounds are not flat; they use subtle radial gradients and backdrop blurs to create a multi-layered interface.

## Colors
This design system operates exclusively in **Dark Mode** to reduce eye strain and provide a premium, "terminal-like" atmosphere.

- **Backgrounds:** The primary foundation is #0A0A0B (Deep Charcoal). Elevated surfaces use #121214 (Obsidian), creating a subtle distinction between the canvas and interactive cards.
- **Accents:** "Electric Blue" (#3B82F6) serves as the primary action color. "Cyan" (#06B6D4) is used for secondary data points and interactive highlights.
- **Status:** "Emerald" (#10B981) represents positive market movement and success states, while "Rose" (#F43F5E) is reserved for negative trends and critical alerts.
- **Glass Effects:** Use high-transparency whites (2% - 8% opacity) for surface overlays to maintain legibility while achieving the frosted effect.

## Typography
The typography system prioritizes legibility and data density. **Inter** provides a neutral, modern foundation for all UI copy.

- **Numeric Displays:** For asset balances and market prices, utilize **JetBrains Mono** (or a similar high-quality monospaced font) to ensure numbers remain vertically aligned in tables and scrolling lists.
- **Display Scales:** Use `display-lg` for total portfolio balances. These should have a slight negative letter-spacing for a tighter, high-end feel.
- **Weight Strategy:** Use Semibold (600) for headers to create hierarchy against the dark background, as thinner weights can lose legibility on OLED screens.

## Layout & Spacing
The layout follows a **Fluid Grid** approach tailored for mobile-first interaction. 

- **Grid:** A 4-column layout for mobile, with 20px side margins to prevent content from touching the screen edges.
- **Rhythm:** An 8pt spatial system is used for most components, while a 4pt "micro-step" is used for tight data clusters (e.g., price change percentages next to tickers).
- **Mobile Reflow:** On larger mobile screens (Pro Max/Plus models), cards may expand horizontally, but critical actions (Buy/Sell) must remain within the "thumb zone" in the bottom third of the display.

## Elevation & Depth
Elevation in this design system is achieved through **luminance and blur** rather than traditional drop shadows.

- **Level 1 (Base):** #0A0A0B. The deepest layer.
- **Level 2 (Cards):** #121214 with a 1px solid border at 8% white opacity.
- **Level 3 (Modals/Overlays):** Backdrop-filter: blur(20px) with a semi-transparent background (rgba(18, 18, 20, 0.8)).
- **Active States:** Elements in an active or "pressed" state should emit a soft glow using the primary color (`box-shadow: 0 0 15px rgba(59, 130, 246, 0.3)`).
- **Fine Lines:** Use 1px "hairline" borders to define segments without adding visual bulk.

## Shapes
The shape language is "Sophisticated Geometric." 

- **Primary Radius:** Use 0.5rem (8px) for standard buttons and inputs to maintain a crisp, professional look.
- **Secondary Radius:** Use 1rem (16px) for main asset cards and container surfaces to create a softer, more approachable feel for large content areas.
- **Icons:** Use linear, 2px stroke icons with slightly rounded caps and joins to match the typography's curvature.

## Components
Consistent styling across financial components ensures user trust and task efficiency.

- **Asset Cards:** Use a subtle glassmorphism effect. The background should be obsidian with a top-down linear gradient (White 5% to White 2%). Include a sparkline chart rendered in Emerald or Rose based on the 24h trend.
- **Action Buttons:** The primary button is a solid "Electric Blue" with white text. Secondary buttons are "Ghost" style: 1px Cyan border with Cyan text.
- **Trend Charts:** Line charts should use a 2px stroke width with a subtle gradient fill (area chart) below the line, fading to 0% opacity.
- **Bottom Navigation:** A frosted glass bar (blur 24px) with high-contrast active icons. Use a "Cyan" dot indicator below the active icon for clarity.
- **Inputs:** Darker than the surface background (#050505) with a 1px border that glows "Electric Blue" on focus. Label text should be small, all-caps monospaced.
- **Chips/Badges:** Small, rounded-pill shapes with a low-opacity background of the status color (e.g., Emerald at 10% opacity) and full-saturation text for readability.