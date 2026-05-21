import { initTheme } from "./theme.js";
import { loadData, CATEGORY_CONFIGS } from "./data.js";
import { renderAllCategories } from "./renderer.js";
import { attachEvents, runCalculation } from "./events.js";
import { initPresets } from "./presets.js";
import { initChangelog } from "./changelog.js";
import { initUmami } from "./analytics.js";
import { initBonusUI } from "./bonuses.js";
import { initEpicUI } from "./epic-ui.js";
import { initCitadelUI } from "./citadel-ui.js";
import { initPwaInstallPrompt } from "./pwa-install.js";

initUmami();
initPwaInstallPrompt();

function initModalFocusGuards() {
  document.querySelectorAll(".modal").forEach((modalEl) => {
    modalEl.addEventListener("hide.bs.modal", () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && modalEl.contains(active)) {
        active.blur();
      }
    });
  });
}

async function init() {
  initTheme();

  try {
    const { troops, colorMap } = await loadData();
    renderAllCategories(troops, colorMap, CATEGORY_CONFIGS);
    attachEvents();
    initCitadelUI(runCalculation);
    initEpicUI(runCalculation);
    initBonusUI(runCalculation);
    initPresets();
    initModalFocusGuards();
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
