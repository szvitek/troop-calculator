import { calculateTroops } from "./calculator.js";
import {
  resetAllResults,
  updateResults,
  renderSummary,
} from "./renderer.js";

/**
 * Reads current UI state and runs the calculator, then pushes results to the DOM.
 */
export function runCalculation() {
  resetAllResults();

  const leadership =
    parseInt(document.getElementById("input-leadership").value, 10) || 0;
  const dominance =
    parseInt(document.getElementById("input-dominance").value, 10) || 0;
  const authority =
    parseInt(document.getElementById("input-authority").value, 10) || 0;

  const selectedUnits = Array.from(
    document.querySelectorAll(".unit-check:checked"),
  ).map((cb) => ({
    id: cb.id.replace("check-", ""),
    dmg: parseFloat(cb.dataset.dmg),
    unitWeight: parseFloat(cb.dataset.unitWeight),
    resource: cb.dataset.resource,
  }));

  const results = calculateTroops({
    leadership,
    dominance,
    authority,
    selectedUnits,
  });
  updateResults(results);
  renderSummary(results);
}

/**
 * Registers all event listeners exactly once.
 */
export function attachEvents() {
  // Checkbox delegation (master <-> children sync + recalculate)
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("tier-master-check")) {
      const { tier, category } = e.target.dataset;
      document
        .querySelectorAll(
          `.unit-check[data-tier="${tier}"][data-category="${category}"]`,
        )
        .forEach((c) => (c.checked = e.target.checked));
    }

    if (e.target.classList.contains("unit-check")) {
      const { tier, category } = e.target.dataset;
      const master = document.querySelector(
        `.tier-master-check[data-tier="${tier}"][data-category="${category}"]`,
      );

      if (master) {
        const all = document.querySelectorAll(
          `.unit-check[data-tier="${tier}"][data-category="${category}"]`,
        );
        const checked = document.querySelectorAll(
          `.unit-check[data-tier="${tier}"][data-category="${category}"]:checked`,
        );

        master.checked = all.length === checked.length;
        master.indeterminate =
          checked.length > 0 && checked.length < all.length;
      }
    }

    if (
      e.target.classList.contains("tier-master-check") ||
      e.target.classList.contains("unit-check")
    ) {
      runCalculation();
    }
  });

  // Real-time recalculation on stat inputs
  ["input-leadership", "input-authority", "input-dominance"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", (e) => {
      if (e.target.value === "") {
        runCalculation();
        return;
      }

      const val = parseInt(e.target.value, 10);
      if (val < 0 || isNaN(val)) {
        e.target.value = 0;
      }

      runCalculation();
    });
  });

  // View toggle FAB (detail <-> summary)
  const toggleBtn = document.getElementById("view-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const detail = document.getElementById("detail-view");
      const detailHeading = document.getElementById("detail-heading");
      const summary = document.getElementById("summary-container");
      const summaryHeading = document.getElementById("summary-heading");
      const icon = toggleBtn.querySelector("i");

      const showingSummary = detail.classList.toggle("d-none");
      detailHeading.classList.toggle("d-none", showingSummary);
      summary.classList.toggle("d-none", !showingSummary);
      summaryHeading.classList.toggle("d-none", !showingSummary);

      icon.className = showingSummary
        ? "bi bi-grid-3x3-gap"
        : "bi bi-list-check";
    });
  }

  // Bootstrap tooltips (once)
  document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el));
}

/**
 * Programmatically switches to the summary view if not already visible.
 */
export function showSummaryView() {
  const detail = document.getElementById("detail-view");
  const detailHeading = document.getElementById("detail-heading");
  const summary = document.getElementById("summary-container");
  const summaryHeading = document.getElementById("summary-heading");
  const toggleBtn = document.getElementById("view-toggle");

  if (!detail.classList.contains("d-none")) {
    detail.classList.add("d-none");
    detailHeading.classList.add("d-none");
    summary.classList.remove("d-none");
    summaryHeading.classList.remove("d-none");

    if (toggleBtn) {
      const icon = toggleBtn.querySelector("i");
      icon.className = "bi bi-grid-3x3-gap";
    }
  }
}
