# A2R Troop Stacking Calculator

A professional, mobile-first web utility designed for players to calculate and manage army compositions efficiently. Built for speed, accuracy, and ease of use during active gameplay.

## 💡 Why use this?

In high-level play, **Troop Stacking** is critical. This tool allows you to:

- Rapidly calculate leadership overhead when mixing different unit tiers.
- Experiment with stacks to find the "sweet spot" before committing resources in-game.
- Visualize your total army strength across multiple categories (Guards, Specs, Monsters).

## 🚀 Key Features

- **Full Unit Support:** Comprehensive data for Guards, Specialists (S1-S9), and Monsters.
- **Real-time Totals:** Instant calculations for troop counts and leadership requirements as you type.
- **Optimized for Mobile:** A clean, tabbed interface with a focus on one-handed navigation.
- **Privacy-Focused:** No trackers or external databases; all calculations happen locally in your browser.
- **Army presets:** Save named combinations of stats and selected units in this browser only ([localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)), reload them from a dropdown, reset the form, or share them with import/export codes.

## 📋 Army presets

Presets live in a compact bar above the stat inputs:

| Control | What it does |
|--------|----------------|
| **Dropdown** | Pick a preset to apply it immediately and open **Summary** view. The placeholder row means no preset is selected. |
| **Reset** | Clears stats and all unit selections, clears the dropdown selection, switches to **Detail** view, and recalculates. Saved presets are **not** removed from storage. |
| **Save** | Opens a modal to name the preset (or update the selected one via the overwrite option). Save stays disabled until at least one stat field has a value. |
| **Delete** | Removes the selected preset from storage after confirmation. |
| **Export** | Copies a share code for the **selected** preset to the clipboard (`a2r-preset:` + encoded JSON). If the clipboard API is unavailable, a modal shows the code to copy manually. |
| **Import** | Paste a share code; valid codes are stored as a new preset (named `Imported: …` with suffixes if that name already exists) and loaded when the modal closes. |

Toasts confirm save, import, export, and delete. Nothing is uploaded to a server.

## 🛠 Built With

- **Bootstrap 5** - Responsive layout and components.
- **Vanilla JavaScript (ES6)** - Modular logic for high performance.
- **Bootstrap Icons** - For a clean, visual interface.
