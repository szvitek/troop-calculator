import { cloneTemplate } from "./dom.js";

/** Combat types used in the army bonus grid (matches in-game unit cards). */
export const COMBAT_TYPES = ["melee", "ranged", "mounted", "flying"];

/** Categories that have per-type Strength % rows in the bonus grid. */
export const BONUS_GRID_CATEGORIES = ["guardsmen", "specialists", "monsters"];

/** Single Strength % input for all catapult units (no Melee/Ranged/Mounted/Flying row). */
export const BONUS_CATAPULTS_KEY = "catapults-strength";

export const BONUS_VS_EPIC_KEY = "vs-epic";
export const BONUS_DRAGON_INCLUDED_KEY = "dragon-included";
export const BONUS_DRAGON_STRENGTH_KEY = "dragon-strength";

/** All `data-bonus-key` values used by the army bonus form (for preset import validation). */
export const BONUS_INPUT_KEYS = [
  BONUS_VS_EPIC_KEY,
  BONUS_DRAGON_INCLUDED_KEY,
  BONUS_DRAGON_STRENGTH_KEY,
  BONUS_CATAPULTS_KEY,
  ...BONUS_GRID_CATEGORIES.flatMap((category) =>
    COMBAT_TYPES.map((combat) => `grid.${category}.${combat}`),
  ),
];

const MAX_BONUS_INPUT_CHARS = 24;
const MAX_BONUS_PERCENT = 100_000;

const CATEGORY_LABELS = {
  guardsmen: "Guardsman",
  specialists: "Specialist",
  monsters: "Monster",
  catapults: "Catapult",
  mercenaries: "Mercenary",
};

const COMBAT_LABELS = {
  melee: "Melee",
  ranged: "Ranged",
  mounted: "Mounted",
  flying: "Flying",
};

/** @type {Array<{ category: string, tabPaneId: string, type: "grid"|"catapult"|"mercenary" }>} */
const TAB_BONUS_LAYOUT = [
  { category: "guardsmen", tabPaneId: "guards-content", type: "grid" },
  { category: "specialists", tabPaneId: "specs-content", type: "grid" },
  { category: "catapults", tabPaneId: "catapults-content", type: "catapult" },
  { category: "monsters", tabPaneId: "monsters-content", type: "grid" },
  {
    category: "mercenaries",
    tabPaneId: "mercenaries-content",
    type: "mercenary",
  },
];

let categoryBonusesPreferOpen = false;
let syncingCategoryBonusState = false;

/**
 * @param {string|number} value
 * @returns {number} Decimal bonus (e.g. 52 → 0.52)
 */
export function parsePercentInput(value) {
  const n = parseFloat(String(value).replace(/%/g, "").trim());
  if (Number.isNaN(n) || n < 0) return 0;
  return n / 100;
}

/**
 * @param {string[]} tags
 * @returns {string|null}
 */
export function getCombatType(tags = []) {
  return COMBAT_TYPES.find((t) => tags.includes(t)) ?? null;
}

/**
 * Unit card feature bonus for epic fights.
 * @param {Record<string, number>} features
 * @param {string[]|null} [epicCombatTypes] Types present on the target epic
 */
export function combatFeatureBonus(features = {}, epicCombatTypes = null) {
  const types = epicCombatTypes?.length > 0 ? epicCombatTypes : COMBAT_TYPES;
  const vals = types
    .map((key) => features[key])
    .filter((v) => typeof v === "number" && !Number.isNaN(v));
  return vals.length ? Math.max(...vals) : 0;
}

/**
 * @param {ParentNode} [root]
 * @returns {{
 *   vsEpic: number,
 *   dragonIncluded: boolean,
 *   dragonStrength: number,
 *   catapults: number,
 *   grid: Record<string, Record<string, number>>
 * }}
 */
export function readBonusState(root = document) {
  const dragonIncludedEl = root.querySelector(
    `.bonus-check-input[data-bonus-key="${BONUS_DRAGON_INCLUDED_KEY}"]`,
  );
  const state = {
    vsEpic: 0,
    dragonIncluded: dragonIncludedEl ? dragonIncludedEl.checked : true,
    dragonStrength: 0,
    catapults: 0,
    grid: Object.fromEntries(
      BONUS_GRID_CATEGORIES.map((c) => [
        c,
        Object.fromEntries(COMBAT_TYPES.map((t) => [t, 0])),
      ]),
    ),
  };

  root.querySelectorAll(".bonus-pct-input").forEach((el) => {
    const key = el.dataset.bonusKey;
    if (!key) return;
    const val = parsePercentInput(el.value);

    if (key === BONUS_VS_EPIC_KEY) state.vsEpic = val;
    else if (key === BONUS_DRAGON_STRENGTH_KEY) state.dragonStrength = val;
    else if (key === BONUS_CATAPULTS_KEY) state.catapults = val;
    else if (key.startsWith("grid.")) {
      const [, category, combat] = key.split(".");
      if (state.grid[category] && combat in state.grid[category]) {
        state.grid[category][combat] = val;
      }
    }
  });

  return state;
}

/**
 * @param {ParentNode} [root]
 * @returns {Record<string, string>}
 */
export function captureBonusInputs(root = document) {
  const bonuses = {};
  root.querySelectorAll(".bonus-pct-input, .bonus-check-input").forEach((el) => {
    const key = el.dataset.bonusKey;
    if (!key) return;
    bonuses[key] =
      el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value.trim();
  });
  return bonuses;
}

/**
 * @param {Record<string, string>|undefined} bonuses
 * @param {ParentNode} [root]
 */
export function applyBonusInputs(bonuses = {}, root = document) {
  root.querySelectorAll(".bonus-pct-input, .bonus-check-input").forEach((el) => {
    const key = el.dataset.bonusKey;
    if (!key) return;
    if (el.type === "checkbox") {
      el.checked =
        key === BONUS_DRAGON_INCLUDED_KEY
          ? !bonuses || bonuses[key] !== "0"
          : bonuses && bonuses[key] === "1";
    } else {
      el.value =
        bonuses && Object.prototype.hasOwnProperty.call(bonuses, key)
          ? String(bonuses[key])
          : "";
    }
  });
}

/**
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
export function sanitizeBonusInputs(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const allowed = new Set(BONUS_INPUT_KEYS);
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) continue;
    if (key === BONUS_DRAGON_INCLUDED_KEY) {
      out[key] = String(value) === "0" ? "0" : "1";
      continue;
    }
    const s = String(value).trim().slice(0, MAX_BONUS_INPUT_CHARS);
    if (!s) continue;
    const n = parseFloat(s.replace(/%/g, ""));
    if (Number.isNaN(n) || n < 0 || n > MAX_BONUS_PERCENT) continue;
    out[key] = s;
  }
  return out;
}

/** Catapult Strength % only (citadel siege — no vs Epic). */
export function getCatapultSiegeStrengthPercent(bonusState) {
  return getDragonAdjustedStrengthPercent(bonusState.catapults ?? 0, bonusState);
}

export function getDragonAdjustedStrengthPercent(strengthPct, bonusState) {
  const dragonStrength = bonusState?.dragonStrength ?? 0;
  if (!bonusState || bonusState.dragonIncluded || dragonStrength <= 0) {
    return strengthPct;
  }
  return Math.max(0, strengthPct - dragonStrength);
}

/** Fortification line on the unit card (decimal, e.g. 0.65 = 65%). */
export function fortificationFeatureBonus(features = {}) {
  const v = features.fortification;
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

export function getStrengthBonusPercent(unit, bonusState) {
  if (unit.category === "mercenaries") return 0;

  let pct = bonusState.vsEpic;

  if (unit.category === "catapults") {
    pct += bonusState.catapults ?? 0;
    return getDragonAdjustedStrengthPercent(pct, bonusState);
  }

  const combat = getCombatType(unit.tags ?? []);
  if (combat && BONUS_GRID_CATEGORIES.includes(unit.category)) {
    pct += bonusState.grid[unit.category]?.[combat] ?? 0;
  }

  return getDragonAdjustedStrengthPercent(pct, bonusState);
}

/**
 * Effective per-unit damage for stacking and display.
 * @param {number} baseDmg
 * @param {{ category: string, tags?: string[], features?: Record<string, number> }} unit
 * @param {ReturnType<typeof readBonusState>|null} bonusState
 * @param {string[]|null} [epicCombatTypes]
 */
export function getEffectiveDmg(
  baseDmg,
  unit,
  bonusState,
  epicCombatTypes = null,
) {
  if (!bonusState) return baseDmg;
  const strPct = getStrengthBonusPercent(unit, bonusState);
  const featPct = combatFeatureBonus(unit.features ?? {}, epicCombatTypes);
  return baseDmg * (1 + strPct + featPct);
}

function syncLinkedBonusInputs(source) {
  const key = source.dataset.bonusKey;
  if (!key) return;
  document
    .querySelectorAll(`.bonus-pct-input[data-bonus-key="${key}"]`)
    .forEach((el) => {
      if (el !== source) el.value = source.value;
    });
}

function createCombatGrid(category) {
  const grid = document.createElement("div");
  grid.className = "category-bonus-grid";

  for (const combat of COMBAT_TYPES) {
    const card = document.createElement("div");
    card.className = "card bonus-type-card";
    const id = `bonus-${category}-${combat}`;

    const body = document.createElement("div");
    body.className = "card-body p-2";

    const title = document.createElement("div");
    title.className = "small fw-semibold";
    title.textContent = COMBAT_LABELS[combat];

    const label = document.createElement("label");
    label.className = "form-label bonus-mini-label";
    label.htmlFor = `${id}-str`;
    label.textContent = `${CATEGORY_LABELS[category]} Strength %`;

    const input = document.createElement("input");
    input.type = "number";
    input.className = "form-control form-control-sm bonus-pct-input";
    input.id = `${id}-str`;
    input.dataset.bonusKey = `grid.${category}.${combat}`;
    input.min = "0";
    input.step = "0.01";
    input.placeholder = "0";

    body.append(title, label, input);
    card.appendChild(body);
    grid.appendChild(card);
  }

  return grid;
}

function createMercenaryBonusWipAlert() {
  const fragment = cloneTemplate("mercenary-bonus-wip-template");
  return fragment?.firstElementChild ?? null;
}

function createCatapultStrengthBlock() {
  const fragment = cloneTemplate("bonus-catapult-strength-template");
  return fragment?.firstElementChild ?? null;
}

function buildTabBonusAccordion({ category, tabPaneId, type }) {
  const pane = document.getElementById(tabPaneId);
  if (!pane) return;

  const accordionId = `armyBonusesAccordion-${category}`;
  const collapseId = `armyBonusesCollapse-${category}`;
  const label = CATEGORY_LABELS[category] ?? category;

  const accordion = document.createElement("div");
  accordion.className = "accordion mb-3 category-bonuses-accordion";
  accordion.id = accordionId;

  const item = document.createElement("div");
  item.className = "accordion-item";

  const header = document.createElement("h2");
  header.className = "accordion-header";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "accordion-button collapsed py-2 small";
  btn.setAttribute("data-bs-toggle", "collapse");
  btn.setAttribute("data-bs-target", `#${collapseId}`);
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", collapseId);
  btn.textContent = "Army Bonuses";
  const sub = document.createElement("span");
  sub.className = "text-muted fw-normal ms-2 d-none d-sm-inline";
  sub.textContent = label;
  btn.appendChild(sub);

  header.appendChild(btn);
  item.appendChild(header);

  const collapse = document.createElement("div");
  collapse.id = collapseId;
  collapse.className = "accordion-collapse collapse category-bonuses-collapse";

  const body = document.createElement("div");
  body.className = "accordion-body py-2 px-2";

  if (type === "mercenary") {
    const wip = createMercenaryBonusWipAlert();
    if (wip) body.appendChild(wip);
  } else {
    const intro = document.createElement("p");
    intro.className = "small text-muted mb-2";
    if (type === "catapult") {
      intro.innerHTML =
        "Enter in-game <strong>Strength %</strong> (whole numbers, e.g. 52 for 52%). Citadel siege uses Catapult Strength only.";
    } else {
      intro.innerHTML = `Enter <strong>${label}</strong> Strength % per combat type from in-game (whole numbers).`;
    }
    body.appendChild(intro);

    if (type === "grid") {
      body.appendChild(createCombatGrid(category));
    } else if (type === "catapult") {
      const catapultBlock = createCatapultStrengthBlock();
      if (catapultBlock) body.appendChild(catapultBlock);
    }
  }

  collapse.appendChild(body);
  item.appendChild(collapse);
  accordion.appendChild(item);

  pane.insertBefore(accordion, pane.firstChild);

  collapse.addEventListener("hidden.bs.collapse", () => {
    btn.classList.add("collapsed");
    btn.setAttribute("aria-expanded", "false");
    if (!syncingCategoryBonusState) categoryBonusesPreferOpen = false;
  });
  collapse.addEventListener("shown.bs.collapse", () => {
    btn.classList.remove("collapsed");
    btn.setAttribute("aria-expanded", "true");
    if (!syncingCategoryBonusState) categoryBonusesPreferOpen = true;
  });
}

function syncActiveCategoryBonusAccordion() {
  const activePane = document.querySelector(
    "#unitTabsContent .tab-pane.active .category-bonuses-collapse",
  );
  if (!activePane) return;

  const isOpen = activePane.classList.contains("show");
  if (categoryBonusesPreferOpen === isOpen) return;

  syncingCategoryBonusState = true;
  const doneEvent = categoryBonusesPreferOpen
    ? "shown.bs.collapse"
    : "hidden.bs.collapse";
  activePane.addEventListener(
    doneEvent,
    () => {
      syncingCategoryBonusState = false;
    },
    { once: true },
  );

  const instance = bootstrap.Collapse.getOrCreateInstance(activePane, {
    toggle: false,
  });
  if (categoryBonusesPreferOpen) instance.show();
  else instance.hide();
}

/** Collapses all open per-tab Army Bonuses accordions. */
export function collapseArmyBonusesAccordion() {
  categoryBonusesPreferOpen = false;
  document.querySelectorAll(".category-bonuses-collapse.show").forEach((el) => {
    const instance = bootstrap.Collapse.getInstance(el);
    if (instance) instance.hide();
    else {
      el.classList.remove("show");
      const btn = document.querySelector(
        `[data-bs-target="#${el.id}"], [aria-controls="${el.id}"]`,
      );
      btn?.classList.add("collapsed");
      btn?.setAttribute("aria-expanded", "false");
    }
  });
}

/**
 * Builds per-tab army bonus accordions and wires recalculation.
 * @param {() => void} onChange
 */
export function initBonusUI(onChange) {
  TAB_BONUS_LAYOUT.forEach((layout) => buildTabBonusAccordion(layout));

  document.querySelectorAll('#unitTabs button[data-bs-toggle="pill"]').forEach((el) => {
    el.addEventListener("shown.bs.tab", syncActiveCategoryBonusAccordion);
  });

  document.querySelectorAll(".bonus-pct-input").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.value !== "" && parseFloat(el.value) < 0) el.value = "0";
      syncLinkedBonusInputs(el);
      onChange();
    });
  });

  document.querySelectorAll(".bonus-check-input").forEach((el) => {
    el.addEventListener("change", () => {
      onChange();
    });
  });
}
