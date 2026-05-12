/**
 * Pure calculation engine -- zero DOM access.
 * Takes plain data in, returns results out.
 *
 * @param {object}   params
 * @param {number}   params.leadership    - Total leadership capacity
 * @param {number}   params.dominance     - Total dominance capacity
 * @param {number}   params.authority     - Total authority capacity
 * @param {Array}    params.selectedUnits - Array of { id, dmg, unitWeight, resource }
 * @returns {Array}  Array of { id, count, damage, warning }
 */
export function calculateTroops({
  leadership,
  dominance,
  authority,
  selectedUnits,
}) {
  if (selectedUnits.length === 0) return [];

  const leadUnits = selectedUnits.filter((u) => u.resource === "leadership");
  const domUnits = selectedUnits.filter((u) => u.resource === "dominance");
  const authUnits = selectedUnits.filter((u) => u.resource === "authority");

  const totalLeadRatio = leadUnits.reduce(
    (sum, u) => sum + u.unitWeight / u.dmg,
    0,
  );
  const totalDomRatio = domUnits.reduce(
    (sum, u) => sum + u.unitWeight / u.dmg,
    0,
  );
  const totalAuthRatio = authUnits.reduce(
    (sum, u) => sum + u.unitWeight / u.dmg,
    0,
  );

  const dmgGoal =
    leadership > 0 && totalLeadRatio > 0 ? leadership / totalLeadRatio : 0;

  return selectedUnits.map((u) => {
    let count = 0;
    let warning = null;

    if (u.resource === "leadership") {
      if (dmgGoal > 0) {
        count = Math.floor(dmgGoal / u.dmg);
      }
    } else if (u.resource === "dominance") {
      if (dmgGoal > 0) {
        count = Math.ceil(dmgGoal / u.dmg);

        if (dominance > 0 && totalDomRatio > 0) {
          const maxAllowed = Math.floor(
            (dominance * (u.unitWeight / u.dmg / totalDomRatio)) / u.unitWeight,
          );
          if (count > maxAllowed) {
            warning = { max: maxAllowed, resource: "Dominance" };
          }
        }
      } else if (dominance > 0 && totalDomRatio > 0) {
        count = Math.floor(dominance / totalDomRatio / u.dmg);
      }
    } else if (u.resource === "authority") {
      if (dmgGoal > 0) {
        count = Math.ceil(dmgGoal / u.dmg);

        if (authority > 0 && totalAuthRatio > 0) {
          const maxAllowed = Math.floor(
            (authority * (u.unitWeight / u.dmg / totalAuthRatio)) /
              u.unitWeight,
          );
          if (count > maxAllowed) {
            warning = { max: maxAllowed, resource: "Authority" };
          }
        }
      } else if (authority > 0 && totalAuthRatio > 0) {
        count = Math.floor(authority / totalAuthRatio / u.dmg);
      }
    }

    return {
      id: u.id,
      count,
      damage: Math.floor(count * u.dmg),
      warning,
    };
  });
}
