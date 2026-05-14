# A2R Troop Stacking Calculator

A mobile-friendly, **installable PWA** for calculating optimal troop ratios in Total Battle.

---

### 💡 Simple by Design

This tool is built to be a fast, streamlined reference for players learning the fundamentals of troop stacking.

- **Installable:** This app is a **Progressive Web App (PWA)**. You can "Add to Home Screen" on iOS and Android to use it just like a native app.
- **Basic Calculation:** To keep the interface clean and the math straightforward, this calculator **does not factor in** hero talents, research, or equipment bonuses.
- **Rough Proportions:** The results provide a solid starting point for unit ratios. I may reconsider adding specific unit bonuses in a future update, but for now, it remains a "no-fuss" estimator.
- **Privacy-friendly:** Troop math and presets stay on your device and are **never** sent to a server. Lightweight **aggregate analytics (Umami)** may run when accessed via a **browser tab** to monitor site traffic. By design, the **installed PWA skips analytics entirely**, ensuring your standalone use remains completely private.

---

## 💡 Why use this?

In high-level play, **Troop Stacking** is critical. This tool allows you to:

- Rapidly calculate leadership overhead when mixing different unit tiers.
- Experiment with stacks to find the "sweet spot" before committing resources in-game.
- Visualize your total army strength across multiple categories (Guards, Specs, Monsters).

## 🚀 Key Features

- **Full Unit Support:** Comprehensive data for Guards, Specialists (S1-S9), and Monsters.
- **Real-time Totals:** Instant calculations for troop counts and leadership requirements as you type.
- **Optimized for Mobile:** A clean, tabbed interface with a focus on one-handed navigation.
- **Privacy-friendly:** Troop math and presets stay on your device and are **never** sent to a server. Lightweight **aggregate analytics (Umami)** may run when accessed via a **browser tab** to monitor site traffic. By design, the **installed PWA skips analytics entirely**, ensuring your standalone use remains completely private.
- **Installable (PWA):** Web app manifest and service worker cache core assets for faster repeat visits and basic offline support after the first load.
- **Army presets:** Save named combinations of stats and selected units in this browser only ([localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)), reload them from a dropdown, reset the form, or share them with import/export codes.

## 📋 Army presets

Presets live in a compact bar above the stat inputs:

| Control      | What it does                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dropdown** | Pick a preset to apply it immediately and open **Summary** view. The placeholder row means no preset is selected.                                                              |
| **Reset**    | Clears stats and all unit selections, clears the dropdown selection, switches to **Detail** view, and recalculates. Saved presets are **not** removed from storage.            |
| **Save**     | Opens a modal to name the preset (or update the selected one via the overwrite option). Save stays disabled until at least one stat field has a value.                         |
| **Delete**   | Removes the selected preset from storage after confirmation.                                                                                                                   |
| **Export**   | Copies a share code for the **selected** preset to the clipboard (`a2r-preset:` + encoded JSON). If the clipboard API is unavailable, a modal shows the code to copy manually. |
| **Import**   | Paste a share code; valid codes are stored as a new preset (named `Imported: …` with suffixes if that name already exists) and loaded when the modal closes.                   |

Toasts confirm save, import, export, and delete. Preset flows do not upload your army data to this app’s servers.

## 🛠 Built With

- **Bootstrap 5** - Responsive layout and components.
- **Vanilla JavaScript (ES6)** - Modular logic for high performance.
- **Bootstrap Icons** - Preset bar, theme menu, and other stock UI glyphs.
- **Game Icons** - SVGs under `assets/icons/` ([game-icons.net](https://game-icons.net), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)); each file uses `fill="currentColor"` so the page can tint icons via CSS on the wrapping `.gi-svg`.
