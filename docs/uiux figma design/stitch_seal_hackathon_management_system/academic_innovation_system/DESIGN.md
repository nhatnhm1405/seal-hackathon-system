---
name: Academic Innovation System
colors:
  surface: '#faf8ff'
  surface-dim: '#dad9e1'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#eeedf4'
  surface-container-high: '#e9e7ef'
  surface-container-highest: '#e3e1e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#444651'
  inverse-surface: '#2f3036'
  inverse-on-surface: '#f1f0f7'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#faf8ff'
  on-background: '#1a1b21'
  surface-variant: '#e3e1e9'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.25'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.5'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

## Brand & Style

This design system establishes a professional, high-trust environment for academic hackathons. It blends the institutional authority of a university with the high-energy innovation of a tech startup. The aesthetic is **Corporate Modern**, prioritizing clarity, data density without clutter, and a sense of "prestige-meets-performance."

The user experience focuses on high legibility and structural discipline. By drawing inspiration from Kaggle’s data-centric layouts and Devpost’s project showcases, the system encourages participants to focus on their engineering output while providing administrators with a robust framework for management. The visual tone is encouraging and precise, utilizing generous white space to reduce cognitive load during high-stakes competition periods.

## Colors

The palette is anchored by **Deep Navy**, used for primary actions, navigation backgrounds, and high-level headers to reinforce academic stability. **Electric Teal** serves as the primary accent, drawing the eye to innovation-led calls to action, progress indicators, and active states.

The neutral palette uses a **Slate Gray** spectrum to manage hierarchy. Backgrounds utilize the lightest shades (`#F8FAFC`) to keep the interface airy, while borders (`#E2E8F0`) provide subtle definition between modules. Status colors are vibrant but used sparingly to ensure that alerts and task completions are immediately recognizable without overwhelming the user.

## Typography

This design system employs a tiered typography strategy to balance warmth and technical precision. **Plus Jakarta Sans** is used for headlines to provide an approachable, modern feel. **Inter** is the workhorse for body text, chosen for its exceptional legibility in data-heavy dashboards and long-form rules.

For technical metadata, such as Team IDs, API keys, or Submission timestamps, **JetBrains Mono** is utilized. This distinct shift in font family signals to the user that they are looking at "system data" or "code-related" information, enhancing the developer-centric feel of the platform.

## Layout & Spacing

The layout utilizes a **12-column fixed grid** on desktop, centered within the viewport. To maintain an "academic" sense of order, the spacing rhythm is strictly based on a **4px/8px baseline**. 

- **Desktop:** 12 columns with 24px gutters. Content is contained within a 1280px max-width container.
- **Tablet:** 8 columns with 16px gutters and 24px side margins.
- **Mobile:** 4 columns with 16px gutters and 16px side margins.

Generous vertical spacing (`xxl`) is used between major sections (e.g., separating the "Submission Form" from "Rules") to prevent the technical density from feeling overwhelming. Horizontal spacing within components follows the `md` (16px) unit for internal padding.

## Elevation & Depth

Depth is communicated through **tonal layering** and **soft ambient shadows**. The base surface of the application is the lightest neutral (`#F8FAFC`). Components like cards and modals are placed on a pure white background (`#FFFFFF`) to make them "pop" against the subtle gray base.

Elevation levels:
- **Level 0 (Flat):** Used for background containers and subtle dividers. No shadow, 1px border in `#E2E8F0`.
- **Level 1 (Raised):** Used for standard cards and inputs. A very soft, diffused shadow: `0px 2px 4px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Overlay):** Used for dropdowns, tooltips, and hover states. `0px 10px 15px -3px rgba(15, 23, 42, 0.1)`.
- **Level 3 (Modal):** Used for primary dialogs. Deepest shadow with a subtle tint of the primary Navy to maintain color harmony.

## Shapes

The design system uses a **Rounded** shape language (`0.5rem` or `8px` base) to strike a balance between formal geometry and modern software aesthetics.

- **Standard Elements:** 8px (0.5rem) for buttons, input fields, and small cards.
- **Large Containers:** 16px (1rem) for main content cards and modal windows.
- **Interactive Tags/Chips:** Pill-shaped (fully rounded) to distinguish them from actionable buttons and static data containers.

Borders are kept thin (1px) and use the Slate 200 color to maintain a "clean" and "uncluttered" look, avoiding the heavy-handedness of more aggressive design styles.

## Components

### Buttons
- **Primary:** Deep Navy background, white text. 8px corners. High contrast.
- **Secondary:** White background, Deep Navy border (1px), Deep Navy text.
- **Ghost:** Transparent background, Electric Teal text. Used for less prominent actions.

### Input Fields
- White background with a Slate 200 border. On focus, the border transitions to Electric Teal with a 2px outer "glow" using 20% opacity of the accent color.

### Cards
- White background, 8px or 16px rounded corners, and a 1px Slate 200 border. Content inside cards should follow the 16px (md) internal padding rule.

### Chips & Badges
- **Status Badges:** Use a light tint (10% opacity) of the status color for the background and the full-strength color for the text (e.g., Emerald text on light emerald background).
- **Technology Tags:** Pill-shaped, using Slate 100 background and Slate 900 text.

### Data Tables
- Header rows use a Slate 50 background with `label-sm` (JetBrains Mono) for column titles. Row separators are 1px Slate 200 lines. Hover states on rows use a subtle Slate 50 tint.

### Specialized Components
- **Code Snippet Block:** Uses a Slate 950 background with JetBrains Mono text for high-contrast technical display.
- **Countdown Timer:** Large display typography (`display-lg`) to create urgency for hackathon deadlines.