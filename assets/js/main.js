import { initTheme } from "./theme.js";
import { loadData, CATEGORY_CONFIGS } from "./data.js";
import { renderAllCategories } from "./renderer.js";
import { attachEvents } from "./events.js";
import { initPresets } from "./presets.js";
import { initChangelog } from "./changelog.js";

async function init() {
  initTheme();

  try {
    const { troops, colorMap } = await loadData();
    renderAllCategories(troops, colorMap, CATEGORY_CONFIGS);
    attachEvents();
    initPresets();
  } catch (err) {
    console.error("Failed to load configuration:", err);
  }

  initChangelog();
}

init();
