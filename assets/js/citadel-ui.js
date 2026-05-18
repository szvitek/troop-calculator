import { FORTIFICATION_STRENGTH_MULT } from "./citadel-siege.js";

const TARGET_EPIC = "epic";
const TARGET_CITADEL = "citadel";

let wallTemplate = null;

/**
 * @returns {"epic"|"citadel"}
 */
export function readBattleTargetMode(root = document) {
  return root.querySelector("#target-mode-citadel")?.checked
    ? TARGET_CITADEL
    : TARGET_EPIC;
}

export function isCitadelMode(root = document) {
  return readBattleTargetMode(root) === TARGET_CITADEL;
}

/**
 * @param {ParentNode} [root]
 * @returns {number}
 */
export function readWallCount(root = document) {
  const el = root.querySelector("#citadel-wall-count");
  if (!el) return 0;
  const n = parseInt(String(el.value).replace(/,/g, "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 1_000_000);
}

export function getCitadelWallTemplate() {
  return wallTemplate;
}

async function loadWallTemplate() {
  const res = await fetch("./assets/data/citadel-walls.json");
  if (!res.ok) throw new Error(`citadel-walls.json (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error("citadel-walls.json must be a non-empty array");
  }
  wallTemplate = data[0];
  return wallTemplate;
}

function syncTargetPanels(root = document) {
  const citadel = isCitadelMode(root);
  root.querySelector("#epic-target-section")?.classList.toggle("d-none", citadel);
  root.querySelector("#citadel-target-section")?.classList.toggle(
    "d-none",
    !citadel,
  );
  root.querySelector("#bonus-vs-epic-wrap")?.classList.toggle("d-none", citadel);
}

function updateWallReference(root = document) {
  const el = root.querySelector("#citadel-wall-reference");
  if (!el || !wallTemplate) return;
  const hp = Number(wallTemplate.hp).toLocaleString();
  const str = Number(wallTemplate.strength).toLocaleString();
  el.textContent = `${wallTemplate.name}: ${str} STR / ${hp} HP per wall (×${FORTIFICATION_STRENGTH_MULT} catapult vs fortification).`;
}

/** @param {ReturnType<import("./citadel-siege.js").analyzeCitadelSiege>|null} report */
export function renderCitadelReport(report, root = document) {
  const mount = root.querySelector("#citadel-siege-report");
  if (!mount) return;

  if (!report) {
    mount.classList.add("d-none");
    mount.replaceChildren();
    return;
  }

  if (report.needsCatapults) {
    mount.classList.remove("d-none");
    mount.className = "alert alert-warning py-2 px-3 mb-0 citadel-siege-report";
    mount.innerHTML = `
      <div class="fw-semibold mb-1"><i class="bi bi-bricks me-1"></i> Citadel siege</div>
      <div class="small">Select at least one <strong>catapult</strong> tier.</div>
    `;
    return;
  }

  mount.classList.remove("d-none");

  const statusClass = report.meetsGoal
    ? "alert-success"
    : report.wallCount > 0
      ? "alert-warning"
      : "alert-secondary";

  const goalLine =
    report.wallCount > 0
      ? `<strong>Goal:</strong> ${report.wallCount.toLocaleString()} walls → ${report.totalWallHp.toLocaleString()} HP total`
      : `<strong>Enter a wall count</strong> to see recommended catapult numbers.`;

  const mixIntro =
    report.wallCount > 0 && report.perUnit?.length
      ? report.multiTier
        ? `<div class="small mt-1"><strong>Recommended mix</strong> — send these tiers together in the opening volley:</div>`
        : `<div class="small mt-1"><strong>Recommended</strong> — catapults needed to break all walls:</div>`
      : "";

  const volleyLine =
    report.wallCount > 0
      ? `<strong>Combined volley:</strong> ${report.totalVolley.toLocaleString()} dmg — clears <strong>${report.wallsCleared.toLocaleString()}</strong> / ${report.wallCount.toLocaleString()} walls`
      : "";

  const shortfallLine =
    !report.meetsGoal && report.wallCount > 0 && report.shortfallHp > 0
      ? `<div class="small mt-1">Short by ${report.shortfallHp.toLocaleString()} HP — add tiers or raise Catapult Strength %.</div>`
      : "";

  const leadershipCompare =
    report.leadership > 0 && report.fieldableVolley != null
      ? report.fieldableMeetsGoal
        ? `<div class="small mt-2 text-success">With your Leadership (${report.leadership.toLocaleString()}): volley ${report.fieldableVolley.toLocaleString()} dmg — enough to clear walls.</div>`
        : `<div class="small mt-2 text-warning">With your Leadership (${report.leadership.toLocaleString()}): volley ${report.fieldableVolley.toLocaleString()} dmg — short by ${(report.totalWallHp - report.fieldableVolley).toLocaleString()} HP vs recommended mix.</div>`
      : `<div class="small mt-2 text-muted">Optional: enter Leadership to compare what your army can actually field.</div>`;

  const perUnitLines = report.perUnit
    .filter((u) => u.strike > 0)
    .map((u) => {
      const volley = Math.floor(u.stackDamage).toLocaleString();
      const walls = u.wallsCleared.toLocaleString();
      const field =
        u.fieldableCount != null
          ? `<div class="text-muted ms-3">With your Leadership: ${u.fieldableCount.toLocaleString()}× · ${Math.floor(u.fieldableStackDamage).toLocaleString()} dmg · ${u.fieldableWallsCleared.toLocaleString()} walls destroyed</div>`
          : "";
      return `<li class="small mb-1">
        <strong>${u.name ?? u.id}</strong> — <strong>${u.count.toLocaleString()}</strong>×
        · ${volley} dmg · <strong>${walls}</strong> walls destroyed
        ${field}
      </li>`;
    })
    .join("");

  mount.className = `alert ${statusClass} py-2 px-3 mb-0 citadel-siege-report`;
  mount.innerHTML = `
    <div class="fw-semibold mb-1"><i class="bi bi-bricks me-1"></i> Citadel siege</div>
    <div class="small">${goalLine}</div>
    ${mixIntro}
    ${perUnitLines ? `<ul class="mb-0 mt-2 ps-3 list-unstyled">${perUnitLines}</ul>` : ""}
    ${volleyLine ? `<div class="small mt-2 pt-1 border-top">${volleyLine}</div>` : ""}
    ${shortfallLine}
    ${leadershipCompare}
  `;
}

/**
 * @param {() => void} onChange
 */
export function initCitadelUI(onChange) {
  const section = document.getElementById("citadel-target-section");
  if (!section) return;

  loadWallTemplate()
    .then(() => {
      updateWallReference();
    })
    .catch((err) => console.error("Failed to load citadel walls:", err));

  document
    .querySelectorAll('input[name="battle-target-mode"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        syncTargetPanels();
        onChange();
      });
    });

  const wallInput = document.getElementById("citadel-wall-count");
  wallInput?.addEventListener("input", (e) => {
    if (e.target.value !== "" && parseFloat(e.target.value) < 0) {
      e.target.value = "0";
    }
    onChange();
  });

  syncTargetPanels();
}
