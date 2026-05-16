/** Combat types used in the army bonus grid (matches in-game unit cards). */
export const COMBAT_TYPES = ["melee", "ranged", "mounted", "flying"];

/** Categories that have per-type Strength % rows in the bonus grid. */
export const BONUS_GRID_CATEGORIES = ["guardsmen", "specialists", "monsters"];

/** All `data-bonus-key` values used by the army bonus form (for preset import validation). */
export const BONUS_INPUT_KEYS = [
  "vs-epic",
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
};

const COMBAT_LABELS = {
  melee: "Melee",
  ranged: "Ranged",
  mounted: "Mounted",
  flying: "Flying",
};

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
 * Unit card feature bonus for epic-style fights: only Melee / Ranged / Mounted /
 * Flying lines on the card (the same types epics field). Ignores fortification,
 * beast, siege, dragon, etc. Uses the highest of those four until a target-epic
 * picker chooses a specific defender type.
 * @param {Record<string, number>} features
 */
export function combatFeatureBonus(features = {}) {
  const vals = COMBAT_TYPES.map((key) => features[key]).filter(
    (v) => typeof v === "number" && !Number.isNaN(v),
  );
  return vals.length ? Math.max(...vals) : 0;
}

/**
 * @param {ParentNode} [root]
 * @returns {{
 *   vsEpic: number,
 *   grid: Record<string, Record<string, number>>
 * }}
 */
export function readBonusState(root = document) {
  const state = {
    vsEpic: 0,
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

    if (key === "vs-epic") state.vsEpic = val;
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
  root.querySelectorAll(".bonus-pct-input").forEach((el) => {
    const key = el.dataset.bonusKey;
    if (!key) return;
    bonuses[key] = el.value.trim();
  });
  return bonuses;
}

/**
 * @param {Record<string, string>|undefined} bonuses
 * @param {ParentNode} [root]
 */
export function applyBonusInputs(bonuses = {}, root = document) {
  root.querySelectorAll(".bonus-pct-input").forEach((el) => {
    const key = el.dataset.bonusKey;
    if (!key) return;
    el.value =
      bonuses && Object.prototype.hasOwnProperty.call(bonuses, key)
        ? String(bonuses[key])
        : "";
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
    const s = String(value).trim().slice(0, MAX_BONUS_INPUT_CHARS);
    if (!s) continue;
    const n = parseFloat(s.replace(/%/g, ""));
    if (Number.isNaN(n) || n < 0 || n > MAX_BONUS_PERCENT) continue;
    out[key] = s;
  }
  return out;
}

/**
 * Sum of player-entered Strength % bonuses for this unit (as a decimal).
 * @param {{ category: string, tags?: string[] }} unit
 * @param {ReturnType<typeof readBonusState>} bonusState
 */
export function getStrengthBonusPercent(unit, bonusState) {
  let pct = bonusState.vsEpic;

  const combat = getCombatType(unit.tags ?? []);
  if (combat && BONUS_GRID_CATEGORIES.includes(unit.category)) {
    pct += bonusState.grid[unit.category]?.[combat] ?? 0;
  }

  return pct;
}

/**
 * Effective per-unit damage for stacking and display.
 * Bonuses from the form and unit card features are **additive** percents:
 *   effectiveDmg = baseDmg × (1 + strengthBonusSum + featureBonus)
 * (Not multiplied — that overshoots in-game damage vs epics.)
 *
 * @param {number} baseDmg
 * @param {{ category: string, tags?: string[], features?: Record<string, number> }} unit
 * @param {ReturnType<typeof readBonusState>|null} bonusState
 */
export function getEffectiveDmg(baseDmg, unit, bonusState) {
  if (!bonusState) return baseDmg;
  const strPct = getStrengthBonusPercent(unit, bonusState);
  const featPct = combatFeatureBonus(unit.features ?? {});
  return baseDmg * (1 + strPct + featPct);
}

/** Collapses the Army Bonuses accordion (no-op if already closed). */
export function collapseArmyBonusesAccordion() {
  const collapseEl = document.getElementById("armyBonusesCollapse");
  const btn = document.querySelector("#armyBonusesAccordion .accordion-button");
  if (!collapseEl || !btn) return;

  if (!collapseEl.classList.contains("show")) {
    btn.classList.add("collapsed");
    btn.setAttribute("aria-expanded", "false");
    return;
  }

  bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false }).hide();
}

/**
 * Builds the army bonus form inside #army-bonuses-mount and wires recalculation.
 * @param {() => void} onChange
 */
export function initBonusUI(onChange) {
  const mount = document.getElementById("army-bonuses-mount");
  if (!mount) return;

  const collapseEl = document.getElementById("armyBonusesCollapse");
  const accordionBtn = document.querySelector(
    "#armyBonusesAccordion .accordion-button",
  );
  if (collapseEl && accordionBtn) {
    collapseEl.addEventListener("hidden.bs.collapse", () => {
      accordionBtn.classList.add("collapsed");
      accordionBtn.setAttribute("aria-expanded", "false");
    });
    collapseEl.addEventListener("shown.bs.collapse", () => {
      accordionBtn.classList.remove("collapsed");
      accordionBtn.setAttribute("aria-expanded", "true");
    });
  }

  mount.innerHTML = "";

  const global = document.createElement("div");
  global.className = "bonus-global mb-3";
  global.innerHTML = `
    <label class="form-label small fw-semibold mb-1" for="bonus-vs-epic">Strength against Epic %</label>
    <input type="number" class="form-control form-control-sm bonus-pct-input" id="bonus-vs-epic"
      data-bonus-key="vs-epic" min="0" step="0.01" placeholder="0" inputmode="decimal" />
  `;
  mount.appendChild(global);

  const gridWrap = document.createElement("div");
  gridWrap.className = "bonus-category-grid";

  BONUS_GRID_CATEGORIES.forEach((category) => {
    const col = document.createElement("div");
    col.className = "bonus-category-col";

    const title = document.createElement("div");
    title.className = "bonus-category-title small fw-bold text-center mb-2";
    title.textContent = CATEGORY_LABELS[category] ?? category;
    col.appendChild(title);

    COMBAT_TYPES.forEach((combat) => {
      const card = document.createElement("div");
      card.className = "card bonus-type-card mb-2";
      const id = `bonus-${category}-${combat}`;
      card.innerHTML = `
        <div class="card-body p-2">
          <div class="small fw-semibold">${COMBAT_LABELS[combat]}</div>
          <label class="form-label bonus-mini-label" for="${id}-str">Strength %</label>
          <input type="number" class="form-control form-control-sm bonus-pct-input mb-1" id="${id}-str"
            data-bonus-key="grid.${category}.${combat}" min="0" step="0.01" placeholder="0" />
          <label class="form-label bonus-mini-label text-muted" for="${id}-hp">Health %</label>
          <input type="number" class="form-control form-control-sm" id="${id}-hp" min="0" step="0.01" placeholder="0" disabled />
        </div>
      `;
      col.appendChild(card);
    });

    gridWrap.appendChild(col);
  });

  mount.appendChild(gridWrap);

  mount.querySelectorAll(".bonus-pct-input").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.value !== "" && parseFloat(el.value) < 0) el.value = "0";
      onChange();
    });
  });
}
