---
name: aftercurfew-premium
description: Apple-inspired premium dark aesthetic with blue accent for AfterCurfew late-night delivery storefront.
license: MIT
---

# AfterCurfew Premium Design System

## Mission
You are an expert UI designer implementing the AfterCurfew storefront — a late-night food delivery app for a college hostel. Every pixel must feel premium, Apple-like, and intentional.

## Brand
AfterCurfew is a late-night delivery service. The brand is premium, minimal, and moody — like Apple's dark mode meets a late-night diner. The crescent moon is the hero icon.

## Style Foundations
- **Visual style:** modern, minimal, clean, premium
- **Typography:** Inter (UI), mono=JetBrains Mono
- **Weights:** 400, 500, 600, 700, 800
- **Color palette:**
  - `--bg: #0a0a0f` — near-black with blue undertone
  - `--surface: #16161e` — card surfaces
  - `--surface-2: #1e1e2a` — elevated surfaces
  - `--accent: #007AFF` — Apple blue (primary CTAs, links, active states)
  - `--accent-hover: #3395FF` — lighter blue for hover
  - `--accent-muted: rgba(0, 122, 255, 0.15)` — subtle accent backgrounds
  - `--text: #f5f5f7` — primary text (Apple white)
  - `--text-secondary: #a1a1aa` — secondary text
  - `--text-muted: #6b6b7b` — muted hints
  - `--success: #34d399` — green
  - `--warning: #fbbf24` — amber
  - `--error: #ef4444` — red
- **Spacing:** 4/8/12/16/20/24/32
- **Radii:** 8px (buttons/inputs), 12px (cards), 16px (modals), 24px (bottom sheets)
- **Shadows:** `0 4px 16px rgba(0,0,0,0.4)` — soft, deep shadows

## Accessibility
WCAG 2.2 AA, keyboard-first interactions, visible focus states with accent color, `prefers-reduced-motion` support.

## Writing Tone
concise, warm, helpful — like a late-night snack run. Use Hindi-english mix naturally when appropriate.

## Rules: Do
- Use semantic CSS custom properties (`var(--accent)`) over raw hex values
- Preserve visual hierarchy — products, then categories, then actions
- Use glassmorphism (`backdrop-filter: blur(20px)`) for headers and overlays
- Animate with spring curves (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for premium feel
- Use indigo-blue accent sparingly — it's the hero color, don't overuse
- Bottom sheets should slide up with spring animation
- Cards should stagger in with `fadeInUp` animation
- Touch targets must be minimum 44px

## Rules: Don't
- Don't use purple, pink, or green as primary accent
- Don't use low-contrast text on dark surfaces
- Don't use box-shadows on light mode without adjusting opacity
- Don't use emoji-heavy designs — use SVGs for icons
- Don't add borders to cards unless necessary — use shadows for depth
- Don't use harsh transitions — everything should feel smooth
- Don't inline styles in HTML — use CSS classes and variables

## Component Rules
- **Cards:** aspect-ratio 4:5, image fills top, name+price below, subtle shadow, scale on hover
- **Buttons:** 8px radius, accent bg, white text, 44px min height, subtle hover lift
- **Bottom sheet:** 24px top radius, handle bar, overlay fades in, content slides up with spring
- **Tab bar:** fixed bottom, glass background, active tab gets accent color, inactive gets muted text
- **Modals:** centered, 16px radius, overlay fades, content scales in, close button top-right
- **Inputs:** 8px radius, surface-2 bg, accent border on focus, 44px height
- **Toast:** slides in from top, 8px radius, success=green, error=red

## Mobile First
- Design for 390px first, then scale up
- Bottom sheet modals on mobile, centered modals on desktop
- Tab bar replaces side nav
- Safe area insets for notched phones (`env(safe-area-inset-bottom)`)
- Touch device hover states disabled
