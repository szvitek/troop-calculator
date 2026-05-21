import { getStrengthBonusPercent } from "./bonuses.js";
import { COMBAT_LABELS } from "./epics.js";

/**
 * Per-unit damage vs one epic layer (Strength bonuses + feature vs that layer's type).
 * @param {number} baseDmg
 * @param {{ category: string, tags?: string[], features?: Record<string, number> }} unit
 * @param {string|null} layerCombatType
 * @param {ReturnType<import("./bonuses.js").readBonusState>} bonusState
 */
export function strikeDamageVsLayer(baseDmg, unit, layerCombatType, bonusState) {
  const strPct = getStrengthBonusPercent(unit, bonusState);
  let featPct = 0;
  if (layerCombatType && unit.features) {
    const v = unit.features[layerCombatType];
    if (typeof v === "number" && !Number.isNaN(v)) featPct = v;
  }
  return Math.max(0, Math.floor(baseDmg * (1 + strPct + featPct)));
}

/**
 * Estimated epic soldiers killed in one volley: floor(stackDmg / hp) when stack meets HP threshold.
 * @param {number} stackDmg
 * @param {number} hp
 */
export function estimateKillsFromStackDamage(stackDmg, hp) {
  if (hp <= 0 || stackDmg < hp) return 0;
  return Math.floor(stackDmg / hp);
}

/**
 * Whether this stack's total damage can kill at least one epic soldier on any layer.
 * Compares count × per-unit strike (layer-specific feature) vs that layer's HP.
 *
 * @param {{ baseDmg: number, category: string, tags?: string[], features?: Record<string, number> }} unit
 * @param {number} count Troop count from the stack calculator
 * @param {Array<{ name: string, combatType: string|null, hp: number }>} squads
 * @param {ReturnType<import("./bonuses.js").readBonusState>} bonusState
 * @returns {{ canKill: boolean, best: { layer: object, strike: number, stackDmg: number, count: number }|null }}
 */
export function analyzeUnitVsEpic(unit, count, squads, bonusState) {
  const strikes = [];
  const n = Math.max(0, count);

  for (const layer of squads) {
    if (!layer.combatType || layer.hp <= 0) continue;
    const strike = strikeDamageVsLayer(
      unit.baseDmg,
      unit,
      layer.combatType,
      bonusState,
    );
    const stackDmg = n * strike;
    const kills = estimateKillsFromStackDamage(stackDmg, layer.hp);
    strikes.push({ layer, strike, stackDmg, count: n, kills });
  }

  if (strikes.length === 0) {
    return { canKill: true, best: null };
  }

  strikes.sort((a, b) => b.stackDmg - a.stackDmg);

  for (const entry of strikes) {
    if (entry.stackDmg >= entry.layer.hp) {
      return { canKill: true, best: entry };
    }
  }

  return { canKill: false, best: strikes[0] };
}

/**
 * @param {string} epicName
 * @param {{ layer: { name: string, combatType: string|null, hp: number }, strike: number, stackDmg: number, count: number }} best
 */
export function formatEpicWeakLinkMessage(epicName, best) {
  const typeLabel = best.layer.combatType
    ? COMBAT_LABELS[best.layer.combatType]
    : "Unknown";
  const countStr = best.count.toLocaleString();
  const strikeStr = Math.floor(best.strike).toLocaleString();
  const stackStr = Math.floor(best.stackDmg).toLocaleString();
  const hpStr = Math.floor(best.layer.hp).toLocaleString();
  return (
    `May not secure kills on ${epicName} — best vs ${typeLabel} ` +
    `(${best.layer.name}): ${countStr} × ${strikeStr} = ${stackStr} dmg vs ` +
    `${hpStr} HP per enemy`
  );
}

/**
 * @param {Array<{ id: string, baseDmg: number, category: string, tags?: string[], features?: Record<string, number> }>} selectedUnits
 * @param {Array<{ id: string, count: number }>} results
 * @param {{ name: string|null, squads: Array }} epicTarget
 * @param {ReturnType<import("./bonuses.js").readBonusState>} bonusState
 * @returns {Map<string, string>} unit id → tooltip message
 */
export function getEpicWeakLinkWarnings(
  selectedUnits,
  results,
  epicTarget,
  bonusState,
) {
  const out = new Map();
  if (!epicTarget?.squads?.length || !selectedUnits.length) return out;

  const countById = new Map(results.map((r) => [r.id, r.count]));
  const epicName = epicTarget.name ?? "this epic";

  for (const unit of selectedUnits) {
    const count = countById.get(unit.id) ?? 0;
    const { canKill, best } = analyzeUnitVsEpic(
      unit,
      count,
      epicTarget.squads,
      bonusState,
    );
    if (!canKill && best) {
      out.set(unit.id, formatEpicWeakLinkMessage(epicName, best));
    }
  }

  return out;
}

/**
 * @param {Array<{ id: string, baseDmg: number, category: string, tags?: string[], features?: Record<string, number> }>} selectedUnits
 * @param {Array<{ id: string, count: number }>} results
 * @param {{ name: string|null, squads: Array }} epicTarget
 * @param {ReturnType<import("./bonuses.js").readBonusState>} bonusState
 * @returns {Map<string, { kills: number, combatType: string|null, layerName: string }>}
 */
export function getEpicKillEstimates(
  selectedUnits,
  results,
  epicTarget,
  bonusState,
) {
  const out = new Map();
  if (!epicTarget?.squads?.length || !selectedUnits.length) return out;

  const countById = new Map(results.map((r) => [r.id, r.count]));

  for (const unit of selectedUnits) {
    const count = countById.get(unit.id) ?? 0;
    const { best } = analyzeUnitVsEpic(
      unit,
      count,
      epicTarget.squads,
      bonusState,
    );
    if (!best) continue;

    out.set(unit.id, {
      kills: best.kills,
      combatType: best.layer.combatType,
      layerName: best.layer.name,
    });
  }

  return out;
}
