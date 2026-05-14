# PROJECT ROADMAP: Troop Calculator

## [PHASE 1] The Foundation

- [x] v0.1.0 - v0.3.0: Core logic and initial Bootstrap layout.
- [x] v0.4.0: Added Specialists (S1-S9) and implemented first tabbed interface.
- [x] v0.5.0: Refined UI feedback and calculation edge cases for high-leadership units.
- [x] v0.6.0: Final monolithic version before major architectural shift.

## [PHASE 2] The Modernization

- [x] v0.7.0: ES Modules Refactor & Grid Alignment
  - [x] Deconstruct monolithic index.js into Logic, UI, and Data modules.
  - [x] Implement native import/export syntax (type="module").

## [PHASE 3] Content & UX Expansion

- [x] v0.8.0: Content Completion
  - [x] Add Mercenaries data structure and tab.
  - [x] Finalize troop database across all categories.
- [x] v0.9.0: UX Overhaul
  - [x] Implement "Review Mode" (Flattened view for selected units only).
  - [x] Enable sticky header with auto-aligning navigation.

## [PHASE 4] Productivity & Professionalism

- [x] v0.10.0: The Persistence Release
  - [x] Presets: Save/Load army compositions to localStorage.
  - [x] Export: Share code for the selected preset (clipboard; fallback modal if unavailable).
  - [x] Import: Paste share codes to merge presets into localStorage.
- [x] v1.0.0: The App Experience
  - [x] PWA Implementation: `manifest.webmanifest` and service worker (`sw.js`) with installable standalone UI, theme colors, and icons/screenshots for richer install prompts.
  - [x] Offline capability and asset precaching for repeat visits and basic offline use after first load (same-origin assets, including self-hosted Bootstrap Icons).
  - [x] Umami analytics: aggregate traffic in a **browser tab** only; tracker not loaded in the **installed PWA**

---

Last Updated: 2026-05-14
Status: Phase 4 (Complete — v1.0.0 shipped)
