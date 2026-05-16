# A2R Troop Stacking Calculator

A mobile-friendly, **installable PWA** for calculating optimal troop ratios in Total Battle.

---

### 💡 Simple by Design

This tool is built to be a fast, streamlined reference for players learning the fundamentals of troop stacking.

- **Installable:** This app is a **Progressive Web App (PWA)**. You can "Add to Home Screen" on iOS and Android to use it just like a native app.
- **Army Bonuses (optional):** Open the **Army Bonuses** accordion and enter the **Strength %** values shown in-game (vs Epic, plus Guardsman / Specialist / Monster × Melee / Ranged / Mounted / Flying). Those numbers already include **hero talents, research, equipment**, and other account bonuses rolled into your army’s Strength — type what the game displays. Counts use **effective damage**: `base × (1 + your Strength bonuses + the highest Melee/Ranged/Mounted/Flying feature on the unit card)`. **Catapult** and **Mercenary** bonus rows are not in the form yet; they are planned for a future update. Health % fields are placeholders and are not applied yet.
- **Privacy-friendly:** Troop math and presets stay on your device and are **never** sent to a server. Lightweight **aggregate analytics (Umami)** may run when accessed via a **browser tab** to monitor site traffic. By design, the **installed PWA skips analytics entirely**, ensuring your standalone use remains completely private.

---

## 💡 Why use this?

In high-level play, **Troop Stacking** is critical. This tool allows you to:

- Rapidly calculate leadership overhead when mixing different unit tiers.
- Experiment with stacks to find the "sweet spot" before committing resources in-game.
- Visualize your total army strength across multiple categories (Guards, Specs, Monsters).

## 🚀 Key Features

- **Full Unit Support:** Comprehensive data for Guards, Specialists (S1-S9), and Monsters.
- **Army Bonuses:** Optional Strength % inputs and per-unit card features for damage-aware stack counts (see above).
- **Real-time Totals:** Instant calculations for troop counts and leadership requirements as you type.
- **Optimized for Mobile:** A clean, tabbed interface with a focus on one-handed navigation.
- **Privacy-friendly:** Troop math and presets stay on your device and are **never** sent to a server. Lightweight **aggregate analytics (Umami)** may run when accessed via a **browser tab** to monitor site traffic. By design, the **installed PWA skips analytics entirely**, ensuring your standalone use remains completely private.
- **Installable (PWA):** Web app manifest and service worker cache core assets for faster repeat visits and basic offline support after the first load.
- **Army presets:** Save named combinations of stats, selected units, and **Army Bonuses** in this browser only ([localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)), reload them from a dropdown, reset the form, or share them with import/export codes (v2 includes bonuses; v1 codes still work).

## 📋 Army presets

Presets live in a compact bar above the stat inputs:

| Control      | What it does                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dropdown** | Pick a preset to apply it immediately and open **Summary** view. The placeholder row means no preset is selected.                                                              |
| **Reset**    | Clears stats and all unit selections, clears the dropdown selection, switches to **Detail** view, and recalculates. Saved presets are **not** removed from storage.            |
| **Save**     | Opens a modal to name the preset (or update the selected one via the overwrite option). Saves stats, selected units, and **Army Bonuses** values. Disabled until at least one stat field has a value. |
| **Delete**   | Removes the selected preset from storage after confirmation.                                                                                                                   |
| **Export**   | Copies a share code for the **selected** preset to the clipboard (`a2r-preset:` + encoded JSON v2, including bonuses). If the clipboard API is unavailable, a modal shows the code to copy manually. |
| **Import**   | Paste a share code; valid codes are stored as a new preset (named `Imported: …` with suffixes if that name already exists) and loaded when the modal closes. v1 codes import without bonuses. |

Toasts confirm save, import, export, and delete. Preset flows do not upload your army data to this app’s servers.

## 🛠 Built With

- **Bootstrap 5** - Responsive layout and components.
- **Vanilla JavaScript (ES6)** - Modular logic for high performance.
- **Bootstrap Icons** - Preset bar, theme menu, and other stock UI glyphs.
- **Game Icons** - SVGs under `assets/icons/` ([game-icons.net](https://game-icons.net), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)); each file uses `fill="currentColor"` so the page can tint icons via CSS on the wrapping `.gi-svg`.
