import { getEffectiveDmg } from "./bonuses.js";

/**
 * Pure calculation engine -- zero DOM access.
 * Takes plain data in, returns results out.
 *
 * @param {object}   params
 * @param {number}   params.leadership    - Total leadership capacity
 * @param {number}   params.dominance     - Total dominance capacity
 * @param {number}   params.authority     - Total authority capacity
 * @param {Array}    params.selectedUnits - Array of { id, baseDmg, unitWeight, resource, category, tags, features }
 * @param {object|null} params.bonusState - Army bonus inputs (see bonuses.js)
 * @param {string[]|null} params.epicCombatTypes - Combat types on target epic
 * @returns {Array}  Array of { id, count, damage, warning, effectiveDmg }
 */
export function calculateTroops({
  leadership,
  dominance,
  authority,
  selectedUnits,
  bonusState = null,
  epicCombatTypes = null,
}) {
  if (selectedUnits.length === 0) return [];

  const units = selectedUnits.map((u) => {
    const effectiveDmg = getEffectiveDmg(
      u.baseDmg,
      u,
      bonusState,
      epicCombatTypes,
    );
    return { ...u, effectiveDmg };
  });

  const leadUnits = units.filter((u) => u.resource === "leadership");
  const domUnits = units.filter((u) => u.resource === "dominance");
  const authUnits = units.filter((u) => u.resource === "authority");

  const totalLeadRatio = leadUnits.reduce(
    (sum, u) => sum + u.unitWeight / u.effectiveDmg,
    0,
  );
  const totalDomRatio = domUnits.reduce(
    (sum, u) => sum + u.unitWeight / u.effectiveDmg,
    0,
  );
  const totalAuthRatio = authUnits.reduce(
    (sum, u) => sum + u.unitWeight / u.effectiveDmg,
    0,
  );

  const dmgGoal =
    leadership > 0 && totalLeadRatio > 0 ? leadership / totalLeadRatio : 0;

  return units.map((u) => {
    let count = 0;
    let warning = null;
    const dmg = u.effectiveDmg;

    if (u.resource === "leadership") {
      if (dmgGoal > 0) {
        count = Math.floor(dmgGoal / dmg);
      }
    } else if (u.resource === "dominance") {
      if (dmgGoal > 0) {
        count = Math.ceil(dmgGoal / dmg);

        if (dominance > 0 && totalDomRatio > 0) {
          const maxAllowed = Math.floor(
            (dominance * (u.unitWeight / dmg / totalDomRatio)) / u.unitWeight,
          );
          if (count > maxAllowed) {
            warning = { max: maxAllowed, resource: "Dominance" };
          }
        }
      } else if (dominance > 0 && totalDomRatio > 0) {
        count = Math.floor(dominance / totalDomRatio / dmg);
      }
    } else if (u.resource === "authority") {
      if (dmgGoal > 0) {
        count = Math.ceil(dmgGoal / dmg);

        if (authority > 0 && totalAuthRatio > 0) {
          const maxAllowed = Math.floor(
            (authority * (u.unitWeight / dmg / totalAuthRatio)) / u.unitWeight,
          );
          if (count > maxAllowed) {
            warning = { max: maxAllowed, resource: "Authority" };
          }
        }
      } else if (authority > 0 && totalAuthRatio > 0) {
        count = Math.floor(authority / totalAuthRatio / dmg);
      }
    }

    return {
      id: u.id,
      count,
      damage: Math.floor(count * dmg),
      effectiveDmg: dmg,
      warning,
    };
  });
}
