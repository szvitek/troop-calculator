/**
 * Renders all category tabs and exposes helpers to update calculation results.
 */

import { COMBAT_LABELS } from "./epics.js";
import { isCitadelMode } from "./citadel-ui.js";

let storedColorMap = {};

function toSafeId(category, tierId, name) {
  return `${category}-${tierId}-${name}`.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Clones HTML templates and populates them for every category.
 */
export function renderAllCategories(troops, colorMap, configs) {
  storedColorMap = colorMap;
  const template = document.getElementById("tier-row-template");
  const unitTemplate = document.getElementById("unit-item-template");

  configs.forEach((config) => {
    const root = document.getElementById(config.rootId);
    if (!root) return;

    const filteredTiers = troops.filter(
      (item) => item.category === config.name,
    );

    filteredTiers.forEach((tier) => {
      const clone = template.content.cloneNode(true);

      const masterCheck = clone.querySelector(".tier-master-check");
      masterCheck.dataset.tier = tier.tierId;
      masterCheck.dataset.category = config.name;

      const tierColor = colorMap[tier.tierId] || "#dc3545";
      clone.querySelector(".tier-card").style.borderColor = tierColor;

      const labelText = clone.querySelector(".tier-label-text");
      labelText.style.color = tierColor;
      labelText.textContent = `${config.prefix}${tier.tierId}`;

      const container = clone.querySelector(".unit-slot-container");

      tier.units.forEach((unit) => {
        const unitClone = unitTemplate.content.cloneNode(true);
        const safeId = toSafeId(config.name, tier.tierId, unit.name);

        const check = unitClone.querySelector(".unit-check");
        check.id = `check-${safeId}`;
        check.dataset.tier = tier.tierId;
        check.dataset.category = config.name;
        check.dataset.dmg = unit.dmg;
        check.dataset.resource = config.resource;
        check.dataset.unitWeight = unit.unitWeight;
        check.dataset.tags = JSON.stringify(unit.tags ?? []);
        check.dataset.features = JSON.stringify(unit.features ?? {});

        unitClone.querySelector(".unit-name-label").textContent = unit.name;

        const countSpan = unitClone.querySelector(".unit-count-output");
        countSpan.id = `count-${safeId}`;
        countSpan.style.borderColor = `${tierColor}66`;

        const dmgSpan = unitClone.querySelector(".unit-dmg-output");
        dmgSpan.id = `dmg-${safeId}`;
        dmgSpan.style.color = tierColor;
        dmgSpan.style.background = `${tierColor}20`;

        container.appendChild(unitClone);
      });

      root.appendChild(clone);
    });
  });
}

/**
 * Zeroes every unit's count/damage and hides all warnings.
 */
export function resetAllResults() {
  document.querySelectorAll(".unit-check").forEach((u) => {
    const id = u.id.replace("check-", "");
    const row = u.closest(".unit-item");
    const countEl = document.getElementById(`count-${id}`);
    const dmgEl = document.getElementById(`dmg-${id}`);
    const warningIcon = row ? row.querySelector(".warning-icon") : null;
    const tt = bootstrap.Tooltip.getInstance(warningIcon);

    if (countEl) {
      countEl.textContent = "0";
      countEl.classList.remove("text-danger", "fw-bold");
    }
    if (dmgEl) dmgEl.textContent = "0";
    if (warningIcon) warningIcon.classList.add("d-none");
    if (tt) tt.hide();
  });
}

/**
 * Writes calculator results into the DOM.
 * @param {Array<{id: string, count: number, damage: number, warning?: object|null, epicWarning?: string, citadelMinAlone?: number, citadelStrike?: number}>} results
 * @param {{ citadelMode?: boolean, wallHp?: number }} [opts]
 */
export function updateResults(results, opts = {}) {
  const citadelMode = opts.citadelMode ?? isCitadelMode();

  results.forEach((r) => {
    const countEl = document.getElementById(`count-${r.id}`);
    const dmgEl = document.getElementById(`dmg-${r.id}`);

    if (countEl) countEl.textContent = r.count.toLocaleString();
    if (dmgEl) {
      if (citadelMode && r.citadelStrike) {
        const walls =
          r.citadelWallsCleared != null
            ? r.citadelWallsCleared
            : opts.wallHp > 0
              ? Math.floor(r.damage / opts.wallHp)
              : 0;
        dmgEl.textContent = `${r.damage.toLocaleString()} dmg · ${walls.toLocaleString()} walls`;
        dmgEl.setAttribute(
          "title",
          `Strike ${Math.floor(r.citadelStrike).toLocaleString()} per catapult · recommended ${r.count.toLocaleString()}×${r.citadelMinAlone != null ? ` · solo tier needs ${r.citadelMinAlone.toLocaleString()}×` : ""}`,
        );
      } else {
        dmgEl.textContent = r.damage.toLocaleString();
        dmgEl.removeAttribute("title");
      }
    }

    const messages = [];
    if (r.warning) {
      messages.push(
        `Your current ${r.warning.resource} only allows ${r.warning.max.toLocaleString()} units to maintain balance`,
      );
    }
    if (r.epicWarning) messages.push(r.epicWarning);

    if (messages.length > 0) {
      setUnitWarning(r.id, messages.join(" "));
    }
  });
}

/**
 * Shows the warning icon and updates its tooltip for a specific unit.
 */
function setUnitWarning(unitId, message) {
  const check = document.getElementById(`check-${unitId}`);
  if (!check) return;

  const row = check.closest(".unit-item");
  const icon = row ? row.querySelector(".warning-icon") : null;
  if (!icon) return;

  icon.classList.remove("d-none");
  icon.setAttribute("data-bs-title", message);
  icon.setAttribute("title", message);

  const tt = bootstrap.Tooltip.getInstance(icon);
  if (tt) tt.setContent({ ".tooltip-inner": message });
}

/**
 * Builds the summary view from calculator results and checked checkbox metadata.
 * Groups selected units by tier (descending) with counts and damage.
 * @param {Array<{id: string, count: number, damage: number}>} results
 * @param {{ citadelMode?: boolean }} [opts]
 */
export function renderSummary(results, opts = {}) {
  const contentEl = document.getElementById("summary-content");
  const emptyEl = document.getElementById("summary-empty");
  if (!contentEl || !emptyEl) return;

  const citadelMode = opts.citadelMode ?? isCitadelMode();

  const resultMap = {};
  results.forEach((r) => {
    resultMap[r.id] = r;
  });

  let checked = document.querySelectorAll(".unit-check:checked");
  if (citadelMode) {
    checked = [...checked].filter((cb) => cb.dataset.category === "catapults");
  }

  if (checked.length === 0) {
    contentEl.innerHTML = "";
    emptyEl.classList.remove("d-none");
    emptyEl.textContent = citadelMode
      ? "Select catapult tiers to see siege stack counts."
      : "Select units from the detail view to see your stack summary.";
    return;
  }
  emptyEl.classList.add("d-none");

  const tierGroups = {};
  checked.forEach((cb) => {
    const id = cb.id.replace("check-", "");
    const tier = parseInt(cb.dataset.tier, 10);
    const row = cb.closest(".unit-item");
    const name = row
      ? row.querySelector(".unit-name-label").textContent
      : id;

    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push({
      id,
      name,
      count: resultMap[id]?.count ?? 0,
      damage: resultMap[id]?.damage ?? 0,
      warning: resultMap[id]?.warning ?? null,
      epicWarning: resultMap[id]?.epicWarning ?? null,
      epicKills: resultMap[id]?.epicKills ?? null,
      citadelWallsCleared: resultMap[id]?.citadelWallsCleared ?? null,
    });
  });

  const showEpicKills = results.some((r) => r.epicKills);

  const allSummaryUnits = Object.values(tierGroups).flat();
  const maxStackDamage = allSummaryUnits.reduce(
    (max, u) => Math.max(max, u.damage),
    0,
  );
  const DIE_FIRST_TIP =
    "Highest stack damage in your army — ~50% chance this stack is eliminated first.";

  const sortedTiers = Object.keys(tierGroups)
    .map(Number)
    .sort((a, b) => b - a);

  const tierTpl = document.getElementById("summary-tier-template");
  const unitTpl = document.getElementById("summary-unit-template");

  contentEl.innerHTML = "";

  sortedTiers.forEach((tier) => {
    const color = storedColorMap[tier] || "#6c757d";
    const tierClone = tierTpl.content.cloneNode(true);

    tierClone.querySelector(".summary-tier-card").style.borderColor = color;
    const label = tierClone.querySelector(".summary-tier-label");
    label.style.color = color;
    label.textContent = `Tier ${tier}`;

    const container = tierClone.querySelector(".summary-unit-container");

    tierGroups[tier].sort(
      (a, b) => b.damage - a.damage || a.name.localeCompare(b.name),
    );

    tierGroups[tier].forEach((u) => {
      const unitClone = unitTpl.content.cloneNode(true);
      const row = unitClone.querySelector(".summary-row");
      const isHighestDmg =
        maxStackDamage > 0 && u.damage === maxStackDamage;

      if (isHighestDmg && row) {
        row.classList.add("summary-row-highest-dmg");
        const dieFirstIcon = unitClone.querySelector(".summary-die-first-icon");
        if (dieFirstIcon) {
          dieFirstIcon.classList.remove("d-none");
          dieFirstIcon.setAttribute("data-bs-title", DIE_FIRST_TIP);
          dieFirstIcon.setAttribute("title", DIE_FIRST_TIP);
          new bootstrap.Tooltip(dieFirstIcon);
        }
      }

      unitClone.querySelector(".summary-unit-name").textContent = u.name;
      unitClone.querySelector(".summary-unit-count").textContent =
        u.count.toLocaleString();

      const dmgEl = unitClone.querySelector(".summary-unit-damage");
      const result = resultMap[u.id];
      if (citadelMode) {
        dmgEl.textContent = "—";
        dmgEl.setAttribute(
          "title",
          "Siege breakdown is in the Citadel siege report below.",
        );
      } else {
        dmgEl.textContent = `${u.damage.toLocaleString()} dmg`;
        dmgEl.removeAttribute("title");
      }
      dmgEl.style.color = color;

      if (showEpicKills && u.epicKills) {
        const sep = unitClone.querySelector(".summary-kills-sep");
        const killsEl = unitClone.querySelector(".summary-unit-kills");
        if (sep) sep.classList.remove("d-none");
        if (killsEl) {
          killsEl.classList.remove("d-none");
          const k = u.epicKills.kills;
          killsEl.textContent = `${k.toLocaleString()} kill${k === 1 ? "" : "s"}`;
          killsEl.classList.toggle("text-success", k > 0);
          killsEl.classList.toggle("text-danger", k === 0);

          const typeLabel = u.epicKills.combatType
            ? COMBAT_LABELS[u.epicKills.combatType]
            : "";
          const tip =
            `Est. kills vs ${typeLabel} (${u.epicKills.layerName}): ` +
            `floor(stack dmg ÷ enemy HP). Best target by stack damage.`;
          killsEl.setAttribute("data-bs-title", tip);
          killsEl.setAttribute("title", tip);
          new bootstrap.Tooltip(killsEl);
        }
      }

      const summaryMessages = [];
      if (u.warning) {
        summaryMessages.push(
          `Your current ${u.warning.resource} only allows ${u.warning.max.toLocaleString()} units to maintain balance`,
        );
      }
      if (u.epicWarning) summaryMessages.push(u.epicWarning);

      if (summaryMessages.length > 0) {
        const icon = unitClone.querySelector(".summary-warning-icon");
        icon.classList.remove("d-none");
        const msg = summaryMessages.join(" ");
        icon.setAttribute("data-bs-title", msg);
        icon.setAttribute("title", msg);
        new bootstrap.Tooltip(icon);
      }

      container.appendChild(unitClone);
    });

    contentEl.appendChild(tierClone);
  });
}

/**
 * Clears the summary panel content.
 */
export function clearSummary() {
  const contentEl = document.getElementById("summary-content");
  const emptyEl = document.getElementById("summary-empty");
  if (contentEl) contentEl.innerHTML = "";
  if (emptyEl) emptyEl.classList.remove("d-none");
}
