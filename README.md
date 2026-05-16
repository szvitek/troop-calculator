# A2R Troop Stacking Calculator

A mobile-friendly, **installable PWA** for calculating optimal troop ratios in Total Battle.

---

### 💡 Simple by Design

This tool is built to be a fast, streamlined reference for players learning the fundamentals of troop stacking.

- **Installable PWA:** Add this app to your mobile device's Home Screen on iOS and Android to use it just like a native app with fast, offline asset caching.
- **Army Bonuses (Optional):** Open the **Army Bonuses** accordion and enter the **Strength %** values shown in-game. These numbers already include **hero talents, research, equipment**, and other account buffs rolled into your army’s profile—simply copy what the game displays.
- **Privacy First:** Troop calculations and custom configurations stay on your device and are **never** sent to a server.

---

## 💡 Why use this?

In high-level play, **Troop Stacking** is critical. This tool allows you to:

- Rapidly calculate leadership overhead when mixing different unit tiers.
- Experiment with stacks to find the "sweet spot" before committing resources in-game.
- Visualize your total army strength across multiple categories (Guards, Specs, Monsters).

## 🚀 Key Features

- **Full Unit Support:** Comprehensive data structures for Guards, Specialists (S1-S9), and Monsters.
- **Real-time Totals:** Instant calculations for troop counts and leadership requirements as you type.
- **Damage-Aware Calculations:** Optional Strength % inputs and unit card features calculate operational damage profiles via an additive formula matching the game's actual combat logs:

  `Effective Damage = Base Damage × (1 + Input Strength Bonuses + Unit Card Feature Bonus)`

  _(Note: Catapults, Mercenaries, and Health % matrices are planned for a future update)._

- **Optimized for Mobile:** A responsive, tabbed interface designed for seamless one-handed navigation.
- **Strict Privacy Controls:** All custom army setups utilize client-side processing. Lightweight aggregate traffic monitoring (Umami) only triggers when the app is opened inside a standard desktop browser tab; the installed PWA environment completely bypasses analytics scripts.
- **Dynamic Army Presets:** Save named combinations of stats, selected units, and structural bonuses locally to your browser using `localStorage`. Reload profiles from a dropdown, execute safe wipes, or distribute them via import/export codes.

## 📋 Army presets

Presets live in a compact control bar sitting directly above the stat inputs:

| Control      | What it does                                                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dropdown** | Pick a preset to apply it immediately and open **Summary** view. The placeholder row means no preset is selected.                                                                                     |
| **Reset**    | Clears stats and all unit selections, clears the dropdown selection, switches to **Detail** view, and recalculates. Saved presets are **not** removed from storage.                                   |
| **Save**     | Opens a modal to name the preset (or update the selected one via the overwrite option). Saves stats, selected units, and **Army Bonuses** values. Disabled until at least one stat field has a value. |
| **Delete**   | Removes the selected preset from storage after confirmation.                                                                                                                                          |
| **Export**   | Copies a share code for the **selected** preset to the clipboard (`a2r-preset:` + encoded JSON v2, including bonuses). If the clipboard API is unavailable, a modal shows the code to copy manually.  |
| **Import**   | Paste a share code; valid codes are stored as a new preset (named `Imported: …` with suffixes if that name already exists) and loaded when the modal closes. v1 codes import without bonuses.         |

Toasts provide instant confirmation feedback for saves, imports, exports, and profile deletions.

## 🛠 Built With

- **Bootstrap 5** - Responsive grid system, custom accordion items, and UI components.
- **Vanilla JavaScript (ES6)** - High-performance modular calculation scripts.
- **Bootstrap Icons** - Action bars, contextual menus, and stock UI glyphs.
- **Game Icons** - SVGs under `assets/icons/` ([game-icons.net](https://game-icons.net), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)); elements use custom programmatic properties (`fill="currentColor"`) allowing CSS to dynamically handle dark/light theme color tinting via the `.gi-svg` parent class wrappers.
