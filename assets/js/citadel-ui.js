import { cloneTemplate } from "./dom.js";

export const TARGET_EPIC = "epic";
export const TARGET_CITADEL = "citadel";

const MAX_WALL_COUNT = 1_000_000;

let wallTemplate = null;

/**
 * @returns {"epic"|"citadel"}
 */
export function readBattleTargetMode(root = document) {
  return root.querySelector("#target-mode-citadel")?.checked
    ? TARGET_CITADEL
    : TARGET_EPIC;
}

export function isCitadelMode(root = document) {
  return readBattleTargetMode(root) === TARGET_CITADEL;
}

/**
 * @param {ParentNode} [root]
 * @returns {number}
 */
export function readWallCount(root = document) {
  const el = root.querySelector("#citadel-wall-count");
  if (!el) return 0;
  const n = parseInt(String(el.value).replace(/,/g, "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_WALL_COUNT);
}

/**
 * @param {number} count
 * @param {ParentNode} [root]
 */
export function applyWallCount(count, root = document) {
  const el = root.querySelector("#citadel-wall-count");
  if (!el) return;
  const n = Number.isFinite(count) && count > 0 ? Math.min(count, MAX_WALL_COUNT) : 0;
  el.value = n > 0 ? String(n) : "";
}

/**
 * @param {"epic"|"citadel"} mode
 * @param {ParentNode} [root]
 */
export function applyBattleTargetMode(mode, root = document) {
  const epicRadio = root.querySelector("#target-mode-epic");
  const citadelRadio = root.querySelector("#target-mode-citadel");
  if (mode === TARGET_CITADEL) {
    if (citadelRadio) citadelRadio.checked = true;
  } else if (epicRadio) {
    epicRadio.checked = true;
  }
  syncToolModeUI(root);
}

export function getCitadelWallTemplate() {
  return wallTemplate;
}

async function loadWallTemplate() {
  const res = await fetch("./assets/data/citadel-walls.json");
  if (!res.ok) throw new Error(`citadel-walls.json (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error("citadel-walls.json must be a non-empty array");
  }
  wallTemplate = data[0];
  return wallTemplate;
}

function showCatapultTabOnly(root = document) {
  const tabBtn = root.querySelector("#catapults-tab");
  if (!tabBtn || !window.bootstrap?.Tab) return;
  bootstrap.Tab.getOrCreateInstance(tabBtn).show();
}

function forceDetailView(root = document) {
  const detail = root.querySelector("#detail-view");
  const detailHeading = root.querySelector("#detail-heading");
  if (!detail) return;

  detail.classList.remove("d-none");
  detailHeading?.classList.remove("d-none");

  root.querySelector("#summary-container")?.classList.add("d-none");
  root.querySelector("#summary-heading")?.classList.add("d-none");
  root.querySelector("#citadel-summary-container")?.classList.add("d-none");
  root.querySelector("#citadel-summary-heading")?.classList.add("d-none");
  root.querySelector("#citadel-siege-report")?.classList.remove("d-none");
}

/**
 * Epic march vs citadel siege: panels, stats row, unit tabs, summary FAB.
 * @param {ParentNode} [root]
 */
export function syncToolModeUI(root = document) {
  const citadel = isCitadelMode(root);
  const tool = citadel ? TARGET_CITADEL : TARGET_EPIC;
  if (root === document && document.body) {
    document.body.dataset.activeTool = tool;
  }

  root.querySelector("#epic-target-section")?.classList.toggle("d-none", citadel);
  root.querySelector("#citadel-target-section")?.classList.toggle(
    "d-none",
    !citadel,
  );
  root.querySelectorAll(".tool-epic-only").forEach((el) => {
    el.classList.toggle("d-none", citadel);
  });
  root.querySelectorAll(".tool-citadel-only").forEach((el) => {
    el.classList.toggle("d-none", !citadel);
  });

  root.querySelector(".detail-heading-epic")?.classList.toggle("d-none", citadel);
  root
    .querySelector(".detail-heading-citadel")
    ?.classList.toggle("d-none", !citadel);

  root.querySelectorAll("#unitTabsContent [data-unit-category]").forEach((pane) => {
    const isCatapult = pane.dataset.unitCategory === "catapults";
    pane.classList.toggle("d-none", citadel && !isCatapult);
  });

  if (citadel) {
    forceDetailView(root);
    showCatapultTabOnly(root);
  } else {
    root.querySelector("#citadel-summary-container")?.classList.add("d-none");
    root.querySelector("#citadel-summary-heading")?.classList.add("d-none");
  }
}

/** @type {{ report: object|null, results: Array<object> }|null} */
let citadelSummaryCache = null;

/**
 * @param {ReturnType<import("./citadel-siege.js").analyzeCitadelSiege>|null} report
 * @param {Array<object>} results
 */
export function updateCitadelSummaryCache(report, results) {
  citadelSummaryCache = { report, results };
}

function getCatapultTierColor(tier) {
  const master = document.querySelector(
    `.tier-master-check[data-tier="${tier}"][data-category="catapults"]`,
  );
  const label = master?.closest(".tier-card")?.querySelector(".tier-label-text");
  const color = label?.style?.color;
  return color && color !== "transparent" ? color : "#6c757d";
}

function parseCatapultTier(unitId) {
  const cb = document.getElementById(`check-${unitId}`);
  if (cb?.dataset?.tier) return parseInt(cb.dataset.tier, 10);
  const m = String(unitId).match(/catapults-(\d+)-/);
  return m ? parseInt(m[1], 10) : 0;
}

function appendSummaryStatRow(container, label, value, { valueClass = "" } = {}) {
  const fragment = cloneTemplate("summary-stat-row-template", (root) => {
    const labelEl = root.querySelector(".summary-stat-label");
    const valueEl = root.querySelector(".summary-stat-value");
    if (labelEl) labelEl.textContent = label;
    if (valueEl) {
      valueEl.textContent = value;
      if (valueClass) valueEl.classList.add(valueClass);
    }
  });
  if (fragment) container.appendChild(fragment);
}

function buildSummaryTierCard({ title, labelColor }) {
  const tierTpl = document.getElementById("summary-tier-template");
  if (!tierTpl) return null;
  const clone = tierTpl.content.cloneNode(true);
  const label = clone.querySelector(".summary-tier-label");
  if (label) {
    label.textContent = title;
    label.style.color = labelColor;
  }
  return clone;
}

function appendCitadelUnitSummaryRow(container, unit, color) {
  const unitTpl = document.getElementById("summary-unit-template");
  if (!unitTpl) return;
  const unitClone = unitTpl.content.cloneNode(true);
  const volley = Math.floor(unit.stackDamage ?? 0).toLocaleString();
  const walls = (unit.wallsCleared ?? 0).toLocaleString();

  unitClone.querySelector(".summary-unit-name").textContent =
    unit.name ?? unit.id;
  unitClone.querySelector(".summary-unit-count").textContent =
    unit.count.toLocaleString();
  const dmgEl = unitClone.querySelector(".summary-unit-damage");
  if (dmgEl) {
    dmgEl.textContent = `${volley} dmg · ${walls} walls`;
    dmgEl.style.color = color;
  }
  container.appendChild(unitClone);
}

/** Renders the citadel siege summary panel (goal, volley, per-tier list). */
export function renderCitadelSummary(root = document) {
  const content = root.querySelector("#citadel-summary-content");
  const empty = root.querySelector("#citadel-summary-empty");
  if (!content || !empty) return;

  const cached = citadelSummaryCache;
  const report = cached?.report;
  const results = cached?.results ?? [];

  if (!report || report.needsCatapults) {
    content.replaceChildren();
    empty.classList.remove("d-none");
    empty.textContent = report?.needsCatapults
      ? "Select at least one catapult tier."
      : "Select catapult tiers and enter a wall count.";
    return;
  }

  if (results.length === 0 || report.wallCount <= 0) {
    content.replaceChildren();
    empty.classList.remove("d-none");
    empty.textContent = "Enter a wall count to see the recommended mix.";
    return;
  }

  empty.classList.add("d-none");
  content.replaceChildren();

  const overview = buildSummaryTierCard({
    title: "Siege overview",
    labelColor: "var(--bs-secondary-color)",
  });
  if (overview) {
    const overviewBody = overview.querySelector(".summary-unit-container");
    if (overviewBody) {
      appendSummaryStatRow(
        overviewBody,
        "Goal",
        `${report.wallCount.toLocaleString()} walls → ${report.totalWallHp.toLocaleString()} HP`,
      );
      appendSummaryStatRow(
        overviewBody,
        "Combined volley",
        `${report.totalVolley.toLocaleString()} dmg — ${report.wallsCleared.toLocaleString()} / ${report.wallCount.toLocaleString()} walls`,
      );
      if (!report.meetsGoal && report.shortfallHp > 0) {
        appendSummaryStatRow(
          overviewBody,
          "Shortfall",
          `${report.shortfallHp.toLocaleString()} HP`,
          { valueClass: "text-warning" },
        );
      }
    }
    content.appendChild(overview);
  }

  const wallHp = report.wallHp > 0 ? report.wallHp : 1;
  const tierRows =
    (report.perUnit ?? []).length > 0
      ? report.perUnit
      : results.map((r) => ({
          id: r.id,
          name: r.name,
          count: r.count,
          stackDamage: r.damage,
          wallsCleared:
            r.citadelWallsCleared ??
            (r.count > 0 && r.damage > 0
              ? Math.min(report.wallCount, Math.floor(r.damage / wallHp))
              : 0),
        }));

  const units = tierRows.filter(
    (u) => u.count > 0 && (u.stackDamage ?? 0) > 0,
  );

  const tierGroups = {};
  for (const unit of units) {
    const tier = parseCatapultTier(unit.id);
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(unit);
  }

  const sortedTiers = Object.keys(tierGroups)
    .map(Number)
    .sort((a, b) => b - a);

  for (const tier of sortedTiers) {
    const color = getCatapultTierColor(tier);
    const tierCard = buildSummaryTierCard({
      title: `Tier ${tier}`,
      labelColor: color,
    });
    if (!tierCard) continue;

    const container = tierCard.querySelector(".summary-unit-container");
    if (!container) continue;

    tierGroups[tier]
      .sort(
        (a, b) =>
          (b.stackDamage ?? 0) - (a.stackDamage ?? 0) ||
          String(a.name).localeCompare(String(b.name)),
      )
      .forEach((unit) => appendCitadelUnitSummaryRow(container, unit, color));

    content.appendChild(tierCard);
  }
}

/** @param {ReturnType<import("./citadel-siege.js").analyzeCitadelSiege>|null} report */
export function renderCitadelReport(report, root = document) {
  const mount = root.querySelector("#citadel-siege-report");
  if (!mount) return;

  if (!report) {
    mount.classList.add("d-none");
    mount.replaceChildren();
    return;
  }

  if (report.needsCatapults) {
    mount.classList.remove("d-none");
    mount.className = "alert alert-warning py-2 px-3 mb-0 citadel-siege-report";
    const fragment = cloneTemplate("citadel-siege-report-hint-template", (root) => {
      const hint = root.querySelector(".citadel-report-hint");
      if (hint) {
        hint.innerHTML =
          "Select at least one <strong>catapult</strong> tier below.";
      }
    });
    mount.replaceChildren(fragment ?? []);
    return;
  }

  mount.classList.remove("d-none");

  const statusClass = report.meetsGoal
    ? "alert-success"
    : report.wallCount > 0
      ? "alert-warning"
      : "alert-secondary";

  const goalHtml =
    report.wallCount > 0
      ? `<strong>Goal:</strong> ${report.wallCount.toLocaleString()} walls → ${report.totalWallHp.toLocaleString()} HP total`
      : "<strong>Enter a wall count</strong> to see recommended catapult numbers.";

  const volleyHtml =
    report.wallCount > 0
      ? `<strong>Combined volley:</strong> ${report.totalVolley.toLocaleString()} dmg — clears <strong>${report.wallsCleared.toLocaleString()}</strong> / ${report.wallCount.toLocaleString()} walls`
      : "";

  mount.className = `alert ${statusClass} py-2 px-3 mb-0 citadel-siege-report`;
  const showShortfall =
    !report.meetsGoal && report.wallCount > 0 && report.shortfallHp > 0;
  const fragment = cloneTemplate("citadel-siege-report-template", (root) => {
    const goalEl = root.querySelector(".citadel-report-goal");
    const volleyEl = root.querySelector(".citadel-report-volley");
    const shortfallEl = root.querySelector(".citadel-report-shortfall");
    if (goalEl) goalEl.innerHTML = goalHtml;
    if (volleyEl) {
      if (volleyHtml) {
        volleyEl.innerHTML = volleyHtml;
        volleyEl.classList.remove("d-none");
      } else {
        volleyEl.classList.add("d-none");
      }
    }
    if (shortfallEl) {
      if (showShortfall) {
        shortfallEl.textContent = `Short by ${report.shortfallHp.toLocaleString()} HP — add tiers or raise Catapult Strength %.`;
        shortfallEl.classList.remove("d-none");
      } else {
        shortfallEl.classList.add("d-none");
      }
    }
  });
  mount.replaceChildren(fragment ?? []);
}


export function initCitadelUI(onChange) {
  const section = document.getElementById("citadel-target-section");
  if (!section) return;

  loadWallTemplate().catch((err) =>
    console.error("Failed to load citadel walls:", err),
  );

  document
    .querySelectorAll('input[name="battle-target-mode"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        syncToolModeUI();
        onChange();
      });
    });

  const wallInput = document.getElementById("citadel-wall-count");
  wallInput?.addEventListener("input", (e) => {
    if (e.target.value !== "" && parseFloat(e.target.value) < 0) {
      e.target.value = "0";
    }
    onChange();
  });

  syncToolModeUI();
}
