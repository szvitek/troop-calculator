# PROJECT ROADMAP: A2R Toolbox

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

## 📌 [PHASE 5] Bonuses & Epic Monster Optimizations

### 🚀 v1.1.0 — Unit Bonuses & State Integration

- [x] **Database Schema Expansion**
  - Extend `troops.json` payload data to explicitly map unique `unitTypes`, classification `tags`, and combat `features` counters.
- [x] **Front-End DOM Synchronization**
  - Wire up reactive event listeners across the single-panel **Active March Modifiers** accordion dashboard to handle dynamic state updates.
- [x] **Calculation Logic Overhaul**
  - Rewrite core execution script functions to mathematically factor in unit-specific multipliers, matrices, and unbaked baseline card traits.

---

### 🧠 v1.2.0 — Epics, UI, & Algorithmic Optimization

- [x] **Master Epic Data Deployment**
  - Seed the database engine with complete `epics.json` profiles detailing multi-layer squad sequences and recurring wave metrics.
- [x] **Target Interface Engineering**
  - Build out intuitive frontend dropdown selectors for immediate presets of standard in-game Epic Targets.
  - Construct generic manual override fields allowing players to experiment with non-standard or raw custom Epic Monster statistics.
- [x] **The "Smart-Fill" Optimization Module**
  - Implement the core optimization loop to deconstruct enemy row lineups and automatically map your absolute highest-efficiency army output.

---

### 🏰 v1.3.0 — Catapults & Citadel Siege

Scope: **Catapults** (siege support alongside the existing march stack).

- [x] **Catapult bonus damage in the calculator**
  - Add Catapult Strength % (and related inputs) to Army Bonuses and wire them into effective damage / stacking math for catapult units.
- [x] **Citadel catapult calculator**
  - Given wall count, recommend **how many catapults** to send (per-tier minimum + Leadership stacks) using ×20 fortification damage and opening-volley rules.

---

### 📖 v1.4.0 — Polish, Documentation & Onboarding

- [x] **Rebrand to A2R Toolbox**
  - App title, navbar, manifest, README, and help modal title; subtitle for troop stacking & citadel siege.
- [x] **UI cleanup**
  - Clean up the UI for a finalized release (citadel siege report, summary vs detail, tooltips, spacing, and other polish from the v1.3.x pass).
- [x] **PWA install prompt**
  - Add an in-app install popup / banner when the browser supports install (`beforeinstallprompt`), so users can add the app to their home screen without hunting the browser menu.
- [x] **Global Stat Modifiers**
  - Move **Strength against Epic %** out of the per-tab Army Bonuses accordions into a shared **Global Modifiers** section.
  - Add **Dragon Strength to Army %** as a global input, because unit cards include dragon bonuses while some marches/siege targets may not allow the dragon.
  - Add a checked-by-default **Dragon included in march** toggle for both **Epic march** and **Citadel siege** modes.
  - When the dragon toggle is unchecked, remove the entered Dragon Strength to Army % from card strength before effective damage calculations.
  - Keep **Dragon Health to Army %** out of the UI until survivability/health logic exists, to avoid a dead input.
  - Save and restore global modifiers in presets/share codes so players enter them once.
- [ ] **Epic Target & Kill Threshold Improvements**
  - [x] Merge the current Standard/Custom epic target flow: selecting a standard epic should populate editable custom inputs.
  - [x] Treat the editable epic inputs as the calculation source of truth, so players can quickly adjust standard presets for non-standard event epics.
  - [x] Preserve preset/share-code support for the selected or edited epic target data.
  - Add kill threshold metadata to the existing results: units needed to secure one epic unit kill, kills secured by the suggested stack, and minimum units needed for the shown kill count.
  - Display these kill-threshold insights in Summary view as informational badges/tooltips (for example: “1 kill · min 10 units · save 8” or “0 kills · needs 10 units”).
  - Keep the current greedy/balanced recommendation unchanged for now; use the Summary insight to help players manually avoid sending units that do not cross the next kill threshold.
  - Later consider a dedicated kill-optimized mode only after validating the threshold behavior against in-game battle journals.
- [ ] **Embedded strategy guide**
  - Author a comprehensive, step-by-step "How-To" guide in the application UI, complete with visual UI screenshots (beyond the current Help modal).

---

Last Updated: 2026-05-17
Status: Phase 5 (Active — v1.4.0 in progress)
