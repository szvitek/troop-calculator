export const CATEGORY_CONFIGS = [
  {
    name: "guardsmen",
    rootId: "guardsmen-container",
    prefix: "G",
    resource: "leadership",
  },
  {
    name: "specialists",
    rootId: "specialists-container",
    prefix: "S",
    resource: "leadership",
  },
  {
    name: "catapults",
    rootId: "catapults-container",
    prefix: "E",
    resource: "leadership",
  },
  {
    name: "monsters",
    rootId: "monsters-container",
    prefix: "M",
    resource: "dominance",
  },
];

/**
 * Fetches troop and tier data, validates responses, and builds a color lookup.
 * @returns {Promise<{troops: Array, tiers: Array, colorMap: Object}>}
 */
export async function loadData() {
  const [troopsRes, tiersRes] = await Promise.all([
    fetch("./assets/data/troops.json"),
    fetch("./assets/data/tiers.json"),
  ]);

  if (!troopsRes.ok) throw new Error(`troops.json: ${troopsRes.status}`);
  if (!tiersRes.ok) throw new Error(`tiers.json: ${tiersRes.status}`);

  const troops = await troopsRes.json();
  const tiers = await tiersRes.json();

  const colorMap = {};
  tiers.forEach((t) => {
    colorMap[t.id] = t.hex;
  });

  return { troops, tiers, colorMap };
}
