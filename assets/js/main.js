import { initTheme } from "./theme.js";
import { loadData, CATEGORY_CONFIGS } from "./data.js";
import { renderAllCategories } from "./renderer.js";
import { attachEvents } from "./events.js";
import { initPresets } from "./presets.js";
import { initChangelog } from "./changelog.js";
import { initUmami } from "./analytics.js";

initUmami();

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}
