/** @typedef {"melee"|"ranged"|"mounted"|"flying"} CombatType */

export const COMBAT_TYPES = ["melee", "ranged", "mounted", "flying"];

export const COMBAT_LABELS = {
  melee: "Melee",
  ranged: "Ranged",
  mounted: "Mounted",
  flying: "Flying",
};

/**
 * Rock–paper–scissors: epic layer of type `epicType` is strong vs player attackers
 * of `RPS_EPIC_BEATS[epicType]` (stored as that key on the epic's `features` object).
 * @type {Record<CombatType, CombatType>}
 */
export const RPS_EPIC_BEATS = {
  flying: "melee",
  melee: "mounted",
  mounted: "ranged",
  ranged: "flying",
};

/** @type {Record<CombatType, string>} */
export const RPS_EPIC_BEATS_LABEL = Object.fromEntries(
  COMBAT_TYPES.map((t) => [t, COMBAT_LABELS[RPS_EPIC_BEATS[t]]]),
);

let epicsCatalog = [];

/**
 * @param {string} name
 */
export function slugifyEncounterName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @returns {Promise<Array>}
 */
export async function loadEpicsCatalog() {
  const res = await fetch("./assets/data/epics.json");
  if (!res.ok) throw new Error(`Failed to load epics.json (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("epics.json must be an array");
  epicsCatalog = data.map((enc) => ({
    ...enc,
    id: slugifyEncounterName(enc.encounterName),
  }));
  return epicsCatalog;
}

export function getEpicsCatalog() {
  return epicsCatalog;
}

/**
 * @param {string} id
 */
export function getEpicById(id) {
  return epicsCatalog.find((e) => e.id === id) ?? null;
}

/**
 * @param {string[]} tags
 * @returns {CombatType|null}
 */
export function getCombatTypeFromTags(tags = []) {
  return COMBAT_TYPES.find((t) => tags.includes(t)) ?? null;
}

/**
 * @param {Array<{ tags?: string[] }>} squads
 * @returns {CombatType[]}
 */
export function getCombatTypesFromSquads(squads = []) {
  const set = new Set();
  for (const squad of squads) {
    const ct = getCombatTypeFromTags(squad.tags ?? []);
    if (ct) set.add(ct);
  }
  return COMBAT_TYPES.filter((t) => set.has(t));
}

/**
 * @param {CombatType} epicCombatType
 * @param {number} featurePercent Whole percent from UI (e.g. 80 → 0.8)
 */
export function buildEpicLayerFeatures(epicCombatType, featurePercent) {
  const vsType = RPS_EPIC_BEATS[epicCombatType];
  if (!vsType || featurePercent <= 0) return {};
  return { [vsType]: featurePercent };
}

/**
 * @param {string|number} value
 */
function parseStat(value) {
  const n = parseFloat(String(value).replace(/,/g, "").trim());
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

/**
 * @param {string|number} value Whole percent (80 → 0.8)
 */
function parseFeaturePercent(value) {
  const n = parseFloat(String(value).replace(/%/g, "").trim());
  if (Number.isNaN(n) || n < 0) return 0;
  return n / 100;
}

/**
 * Normalize squads for display / downstream use.
 * @param {Array} squads
 */
export function normalizeSquads(squads) {
  return squads.map((s) => {
    const combatType = getCombatTypeFromTags(s.tags ?? []);
    return {
      name: s.name ?? "—",
      tier: s.tier ?? null,
      combatType,
      strength: s.strength ?? 0,
      hp: s.hp ?? 0,
      features: s.features ?? {},
      tags: s.tags ?? [],
    };
  });
}

/**
 * @typedef {object} EpicTargetState
 * @property {"none"|"preset"|"custom"} mode
 * @property {string|null} id
 * @property {string|null} name
 * @property {CombatType[]} combatTypes
 * @property {ReturnType<typeof normalizeSquads>} squads
 */

/**
 * @param {ParentNode} [root]
 * @returns {EpicTargetState}
 */
export function readEpicTargetState(root = document) {
  const none = {
    mode: "none",
    id: null,
    name: null,
    combatTypes: [],
    squads: [],
  };

  const presetMode = root.querySelector("#epic-mode-preset")?.checked;
  const customMode = root.querySelector("#epic-mode-custom")?.checked;

  if (customMode) {
    const squads = COMBAT_TYPES.map((combatType) => {
      const strength = parseStat(
        root.querySelector(`#epic-custom-${combatType}-strength`)?.value,
      );
      const hp = parseStat(
        root.querySelector(`#epic-custom-${combatType}-hp`)?.value,
      );
      const featPct = parseFeaturePercent(
        root.querySelector(`#epic-custom-${combatType}-feature`)?.value,
      );
      return {
        name: `${COMBAT_LABELS[combatType]} layer`,
        tier: null,
        combatType,
        strength,
        hp,
        features: buildEpicLayerFeatures(combatType, featPct),
        tags: ["epic", combatType],
      };
    });

    return {
      mode: "custom",
      id: "custom",
      name: "Custom epic",
      combatTypes: [...COMBAT_TYPES],
      squads,
    };
  }

  if (!presetMode) return none;

  const select = root.querySelector("#epic-preset-select");
  const id = select?.value?.trim() || "";
  if (!id) return none;

  const enc = getEpicById(id);
  if (!enc) return none;

  const squads = normalizeSquads(enc.squads ?? []);
  const combatTypes = getCombatTypesFromSquads(enc.squads ?? []);

  return {
    mode: "preset",
    id: enc.id,
    name: enc.encounterName,
    combatTypes,
    squads,
  };
}

const MAX_EPIC_STAT = 1e15;
const MAX_FEATURE_PERCENT = 100_000;

function clampEpicStat(value) {
  const n = parseFloat(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_EPIC_STAT);
}

function clampFeaturePercentWhole(value) {
  const n = parseFloat(String(value).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_FEATURE_PERCENT);
}

/**
 * Serializable epic target for presets / share codes.
 * @param {ParentNode} [root]
 */
export function captureEpicPresetState(root = document) {
  const state = readEpicTargetState(root);
  if (state.mode === "none") return { mode: "none" };
  if (state.mode === "preset") {
    return { mode: "preset", presetId: state.id };
  }

  const layers = {};
  for (const combatType of COMBAT_TYPES) {
    const squad = state.squads.find((s) => s.combatType === combatType);
    const vs = RPS_EPIC_BEATS[combatType];
    let featurePercent = 0;
    if (squad?.features && vs && typeof squad.features[vs] === "number") {
      featurePercent = squad.features[vs] * 100;
    }
    layers[combatType] = {
      strength: squad?.strength ?? 0,
      hp: squad?.hp ?? 0,
      featurePercent,
    };
  }

  return {
    mode: "custom",
    layers,
  };
}

/**
 * @param {unknown} raw
 * @param {{ validateCatalog?: boolean }} [opts]
 */
export function sanitizeEpicPreset(raw, opts = {}) {
  const none = { mode: "none" };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return none;

  const mode = raw.mode;
  if (mode === "none") return none;

  if (mode === "preset") {
    const presetId =
      typeof raw.presetId === "string" ? raw.presetId.trim().slice(0, 120) : "";
    if (!presetId) return none;
    if (opts.validateCatalog && epicsCatalog.length && !getEpicById(presetId)) {
      return none;
    }
    return { mode: "preset", presetId };
  }

  if (mode === "custom") {
    const layers = {};
    for (const combatType of COMBAT_TYPES) {
      const src = raw.layers?.[combatType];
      layers[combatType] = {
        strength: clampEpicStat(src?.strength),
        hp: clampEpicStat(src?.hp),
        featurePercent: clampFeaturePercentWhole(src?.featurePercent),
      };
    }
    return { mode: "custom", layers };
  }

  return none;
}

function ensureEpicPresetDropdown(root) {
  const select = root.querySelector("#epic-preset-select");
  const catalog = getEpicsCatalog();
  if (!select || catalog.length === 0 || select.options.length > 1) return;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "— Select epic —";
  select.appendChild(placeholder);

  catalog.forEach((enc) => {
    const opt = document.createElement("option");
    opt.value = enc.id;
    opt.textContent = enc.encounterName;
    select.appendChild(opt);
  });
}

/**
 * @param {unknown} epic
 * @param {ParentNode} [root]
 */
export async function applyEpicPresetState(epic, root = document) {
  await loadEpicsCatalog();
  ensureEpicPresetDropdown(root);
  const data = sanitizeEpicPreset(epic, { validateCatalog: true });

  const presetRadio = root.querySelector("#epic-mode-preset");
  const customRadio = root.querySelector("#epic-mode-custom");
  const select = root.querySelector("#epic-preset-select");

  if (data.mode === "custom") {
    if (customRadio) customRadio.checked = true;
    if (presetRadio) presetRadio.checked = false;
    if (select) select.value = "";

    for (const combatType of COMBAT_TYPES) {
      const layer = data.layers[combatType];
      const strEl = root.querySelector(`#epic-custom-${combatType}-strength`);
      const hpEl = root.querySelector(`#epic-custom-${combatType}-hp`);
      const featEl = root.querySelector(`#epic-custom-${combatType}-feature`);
      if (strEl) {
        strEl.value = layer.strength > 0 ? String(layer.strength) : "";
      }
      if (hpEl) hpEl.value = layer.hp > 0 ? String(layer.hp) : "";
      if (featEl) {
        featEl.value =
          layer.featurePercent > 0 ? String(layer.featurePercent) : "";
      }
    }
    return;
  }

  if (customRadio) customRadio.checked = false;
  if (presetRadio) presetRadio.checked = true;

  if (data.mode === "preset" && select) {
    const hasOpt = [...select.options].some((o) => o.value === data.presetId);
    select.value = hasOpt ? data.presetId : "";
    return;
  }

  if (select) select.value = "";
}
