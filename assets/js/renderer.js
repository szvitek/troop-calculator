/**
 * Renders all category tabs and exposes helpers to update calculation results.
 */

function toSafeId(name) {
  return name.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Clones HTML templates and populates them for every category.
 */
export function renderAllCategories(troops, colorMap, configs) {
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
        const safeId = toSafeId(unit.name);

        const check = unitClone.querySelector(".unit-check");
        check.id = `check-${safeId}`;
        check.dataset.tier = tier.tierId;
        check.dataset.category = config.name;
        check.dataset.dmg = unit.dmg;
        check.dataset.resource = config.resource;
        check.dataset.unitWeight = unit.unitWeight;

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
 * @param {Array<{id: string, count: number, damage: number, warning: object|null}>} results
 */
export function updateResults(results) {
  results.forEach((r) => {
    const countEl = document.getElementById(`count-${r.id}`);
    const dmgEl = document.getElementById(`dmg-${r.id}`);

    if (countEl) countEl.textContent = r.count.toLocaleString();
    if (dmgEl) dmgEl.textContent = r.damage.toLocaleString();

    if (r.warning) {
      showWarning(r.id, r.warning.max, r.warning.resource);
    }
  });
}

/**
 * Shows the warning icon and updates its tooltip for a specific unit.
 */
function showWarning(unitId, max, resource) {
  const check = document.getElementById(`check-${unitId}`);
  if (!check) return;

  const row = check.closest(".unit-item");
  const icon = row ? row.querySelector(".warning-icon") : null;
  if (!icon) return;

  icon.classList.remove("d-none");
  const msg = `Your current ${resource} only allows ${max.toLocaleString()} units to maintain balance`;
  icon.setAttribute("data-bs-title", msg);
  icon.setAttribute("title", msg);

  const tt = bootstrap.Tooltip.getInstance(icon);
  if (tt) tt.setContent({ ".tooltip-inner": msg });
}
