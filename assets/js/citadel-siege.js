import {
  fortificationFeatureBonus,
  getCatapultSiegeStrengthPercent,
  getDragonAdjustedBaseDmg,
} from "./bonuses.js";

/** In-game rule: catapult strength vs fortifications (not shown on unit card). */
export const FORTIFICATION_STRENGTH_MULT = 20;

/**
 * Per-catapult damage vs one citadel wall (opening volley, before wall retaliation).
 * @param {number} baseDmg
 * @param {{ category: string, features?: Record<string, number> }} unit
 * @param {ReturnType<import("./bonuses.js").readBonusState>} bonusState
 */
export function strikeVsWall(baseDmg, unit, bonusState) {
  if (unit.category !== "catapults") return 0;
  const adjustedBaseDmg = getDragonAdjustedBaseDmg(baseDmg, bonusState);
  const strPct = getCatapultSiegeStrengthPercent(bonusState);
  const featPct = fortificationFeatureBonus(unit.features ?? {});
  return adjustedBaseDmg * FORTIFICATION_STRENGTH_MULT * (1 + strPct + featPct);
}

/**
 * @param {Array<{ strike: number }>} tiers
 * @param {number} dmgGoal
 */
function volleyDamageAtGoal(tiers, dmgGoal) {
  if (dmgGoal <= 0) return 0;
  return tiers.reduce(
    (sum, t) => sum + Math.floor(dmgGoal / t.strike) * t.strike,
    0,
  );
}

/**
 * Smallest dmgGoal so each selected tier fires in the opening volley (march-style
 * balance) and combined damage meets or exceeds totalWallHp.
 * @param {Array<{ strike: number }>} tiers
 * @param {number} totalWallHp
 */
function findBalancedDmgGoal(tiers, totalWallHp) {
  if (totalWallHp <= 0 || tiers.length === 0) return 0;

  const maxStrike = Math.max(...tiers.map((t) => t.strike));
  let lo = 0;
  let hi = Math.ceil(totalWallHp / maxStrike) * maxStrike;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (volleyDamageAtGoal(tiers, mid) >= totalWallHp) hi = mid;
    else lo = mid + 1;
  }

  return hi;
}

/**
 * Recommended catapult counts per selected tier to break the wall pool together.
 * Does not use Leadership — optional compare via {@link fieldCatapultsWithLeadership}.
 *
 * @param {Array} selectedCatapults
 * @param {number} totalWallHp
 * @param {ReturnType<import("./bonuses.js").readBonusState>} bonusState
 */
export function recommendCitadelMix(
  selectedCatapults,
  totalWallHp,
  bonusState,
) {
  if (selectedCatapults.length === 0 || totalWallHp <= 0) return [];

  const tiers = selectedCatapults
    .map((u) => ({
      ...u,
      strike: strikeVsWall(u.baseDmg, u, bonusState),
    }))
    .filter((t) => t.strike > 0);

  if (tiers.length === 0) return [];

  const dmgGoal =
    tiers.length === 1
      ? totalWallHp
      : findBalancedDmgGoal(tiers, totalWallHp);

  return tiers.map((t) => {
    const count =
      tiers.length === 1
        ? Math.ceil(totalWallHp / t.strike)
        : Math.floor(dmgGoal / t.strike);
    const damage = count * t.strike;
    return {
      id: t.id,
      name: t.name,
      count,
      damage,
      effectiveDmg: t.strike,
      citadelStrike: t.strike,
      citadelMinAlone: Math.ceil(totalWallHp / t.strike),
      warning: null,
    };
  });
}

/**
 * How many of each selected tier fit under a Leadership cap (march stack math).
 * Optional — for comparing against the recommended siege mix.
 */
export function fieldCatapultsWithLeadership({
  leadership,
  selectedCatapults,
  bonusState,
}) {
  if (selectedCatapults.length === 0 || leadership <= 0) return [];

  const units = selectedCatapults
    .map((u) => ({
      ...u,
      strike: strikeVsWall(u.baseDmg, u, bonusState),
    }))
    .filter((u) => u.strike > 0);

  const totalLeadRatio = units.reduce(
    (sum, u) => sum + u.unitWeight / u.strike,
    0,
  );

  if (totalLeadRatio <= 0) return [];

  const dmgGoal = leadership / totalLeadRatio;

  return units.map((u) => {
    const count = Math.floor(dmgGoal / u.strike);
    return {
      id: u.id,
      name: u.name,
      count,
      damage: count * u.strike,
      effectiveDmg: u.strike,
      citadelStrike: u.strike,
      warning: null,
    };
  });
}

/**
 * @param {object} params
 * @param {{ hp: number, name?: string }} params.wall
 * @param {number} params.wallCount
 * @param {ReturnType<typeof recommendCitadelMix>} params.recommendedResults
 * @param {ReturnType<typeof fieldCatapultsWithLeadership>|null} [params.fieldableResults]
 * @param {number} [params.leadership]
 */
export function analyzeCitadelSiege({
  wall,
  wallCount,
  recommendedResults,
  fieldableResults = null,
  leadership = 0,
}) {
  const safeWallCount = Math.max(0, Math.floor(wallCount) || 0);
  const wallHp = wall?.hp > 0 ? wall.hp : 0;
  const totalWallHp = safeWallCount * wallHp;

  const totalVolley = recommendedResults.reduce((sum, r) => sum + r.damage, 0);
  const wallsCleared =
    wallHp > 0 ? Math.min(safeWallCount, Math.floor(totalVolley / wallHp)) : 0;
  const meetsGoal = safeWallCount > 0 && totalVolley >= totalWallHp;

  const fieldableVolley = fieldableResults
    ? fieldableResults.reduce((sum, r) => sum + r.damage, 0)
    : 0;
  const fieldableMeetsGoal =
    fieldableResults && safeWallCount > 0 && fieldableVolley >= totalWallHp;

  const perUnit = recommendedResults.map((r) => {
    const field = fieldableResults?.find((f) => f.id === r.id);
    const stackDamage = r.damage;
    const fieldableStack = field?.damage ?? 0;
    return {
      id: r.id,
      name: r.name,
      strike: r.citadelStrike ?? r.effectiveDmg,
      count: r.count,
      stackDamage,
      wallsCleared:
        wallHp > 0
          ? Math.min(safeWallCount, Math.floor(stackDamage / wallHp))
          : 0,
      minAlone: r.citadelMinAlone ?? null,
      fieldableCount: field?.count ?? null,
      fieldableStackDamage: fieldableStack,
      fieldableWallsCleared:
        wallHp > 0
          ? Math.min(safeWallCount, Math.floor(fieldableStack / wallHp))
          : 0,
    };
  });

  return {
    wallName: wall?.name ?? "Wall",
    wallHp,
    wallCount: safeWallCount,
    totalWallHp,
    totalVolley,
    wallsCleared,
    meetsGoal,
    shortfallHp: Math.max(0, totalWallHp - totalVolley),
    leadership: Math.max(0, leadership),
    fieldableVolley,
    fieldableMeetsGoal,
    multiTier: recommendedResults.length > 1,
    perUnit,
  };
}

/** @deprecated Use recommendCitadelMix — kept for tests/callers during transition */
export function calculateCitadelCatapults(params) {
  return fieldCatapultsWithLeadership(params);
}
