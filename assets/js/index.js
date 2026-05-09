// THEME TOGGLE
// Check for saved preference; if none, default to 'auto'
const getStoredTheme = () => localStorage.getItem("theme");
const setStoredTheme = (theme) => localStorage.setItem("theme", theme);

const getPreferredTheme = () => {
  const storedTheme = getStoredTheme();
  // Default to 'auto' if the user hasn't picked anything yet
  return storedTheme ? storedTheme : "auto";
};

const setTheme = (theme) => {
  if (theme === "auto") {
    // Apply light or dark based on system preference
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute(
      "data-bs-theme",
      isDark ? "dark" : "light",
    );
  } else {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }
};

const showActiveTheme = (theme) => {
  const activeThemeIcon = document.querySelector(".theme-icon-active");
  const btnToActivate = document.querySelector(
    `[data-bs-theme-value="${theme}"]`,
  );

  // Remove active class and checkmarks from all
  document.querySelectorAll("[data-bs-theme-value]").forEach((element) => {
    element.classList.remove("active");
    element.querySelector(".bi-check2").classList.add("d-none");
  });

  // Add active class and checkmark to selected
  btnToActivate.classList.add("active");
  btnToActivate.querySelector(".bi-check2").classList.remove("d-none");

  // Update the main navbar icon to match selection
  const iconClass = btnToActivate.querySelector("i").classList[1];
  activeThemeIcon.className = `bi ${iconClass} me-2 theme-icon-active`;
};

// Initial Setup
const initialTheme = getPreferredTheme();
setTheme(initialTheme);

window.addEventListener("DOMContentLoaded", () => {
  showActiveTheme(initialTheme);

  document.querySelectorAll("[data-bs-theme-value]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const theme = toggle.getAttribute("data-bs-theme-value");
      setStoredTheme(theme);
      setTheme(theme);
      showActiveTheme(theme);
    });
  });
});

// GENERATE ROWS
async function initApp() {
  try {
    // Fetch both data files at the same time
    const [troopsRes, tiersRes] = await Promise.all([
      fetch("./assets/data/troops.json"),
      fetch("./assets/data/tiers.json"),
    ]);

    const troopsData = await troopsRes.json();
    const tiersData = await tiersRes.json();

    // Create a quick lookup for colors: { "1": "#hex", "2": "#hex" ... }
    const colorMap = {};
    tiersData.forEach((t) => {
      colorMap[t.id] = t.hex;
    });

    console.log("tiersData", tiersData);
    console.log("colorMap", colorMap);

    renderGuardsmen(troopsData, colorMap);
  } catch (err) {
    console.error("Failed to load configuration:", err);
  }
}

function renderGuardsmen(data, colorMap) {
  const root = document.getElementById("guardsmen-root");
  const template = document.getElementById("tier-row-template");
  const guardsmen = data.filter((item) => item.category === "guardsmen");

  guardsmen.forEach((tier) => {
    const clone = template.content.cloneNode(true);

    const masterCheck = clone.querySelector(".tier-master-check");
    masterCheck.dataset.tier = tier.tierId;

    // Pull the color from our new colorMap using the tierId
    const tierColor = colorMap[tier.tierId] || "#dc3545";
    const card = clone.querySelector(".tier-card");
    card.style.borderColor = tierColor;

    const labelText = clone.querySelector(".tier-label-text");
    labelText.style.color = tierColor;
    labelText.textContent = `G${tier.tierId}`;

    const container = clone.querySelector(".unit-slot-container");

    tier.units.forEach((unit) => {
      const unitDiv = document.createElement("div");
      unitDiv.className = "unit-item d-flex flex-column";
      const safeId = unit.name.replace(/\s+/g, "-").toLowerCase();

      unitDiv.innerHTML = `
            <div class="input-group input-group-sm">
                <div class="input-group-text">
                    <input class="form-check-input unit-check" type="checkbox" 
                        data-tier="${tier.tierId}" 
                        data-dmg="${unit.dmg}" 
                        data-leadership="${unit.leadership}"
                        id="check-${safeId}">
                </div>
                <span class="input-group-text flex-grow-1 unit-name-label">${unit.name}</span>
                
                <!-- Changed from <input> to <span> for better styling control -->
                <span class="form-control text-end fw-bold unit-count-output d-flex align-items-center justify-content-end" 
                    id="count-${safeId}" 
                    style="max-width: 75px; border-color: ${tierColor}66; min-height: 31px;">0</span>
            </div>
            <div class="d-flex justify-content-between align-items-center px-1 mt-1">
                <span class="dmg-label">TOTAL DMG</span>
                <span class="fw-bold unit-dmg-output" id="dmg-${safeId}" 
                    style="color: ${tierColor}; background: ${tierColor}20;">0</span>
            </div>
        `;
      container.appendChild(unitDiv);
    });

    root.appendChild(clone);
  });

  attachGlobalEvents();
}

// CALCULATOR LOGIC
function calculateTroops() {
  const totalLeadership =
    parseFloat(document.getElementById("input-leadership").value) || 0;
  const allUnitChecks = document.querySelectorAll(".unit-check");
  const checkedUnits = Array.from(allUnitChecks).filter(
    (checkbox) => checkbox.checked,
  );

  // Reset everything first
  allUnitChecks.forEach((checkbox) => {
    const safeId = checkbox.id.replace("check-", "");
    const countEl = document.getElementById(`count-${safeId}`);
    const dmgEl = document.getElementById(`dmg-${safeId}`);

    if (countEl) countEl.textContent = "0"; // Updated to textContent
    if (dmgEl) dmgEl.textContent = "0";
  });

  if (checkedUnits.length === 0 || totalLeadership === 0) return;

  // 1. Calculate the sum of (LeadershipCost / BaseDmg) for all selected units
  // This represents the total leadership cost to deal 1 unit of damage from every selected source simultaneously
  let totalCostToDealEqualDmg = 0;
  checkedUnits.forEach((checkbox) => {
    const leadershipCost = parseFloat(checkbox.dataset.leadership);
    const baseDmg = parseFloat(checkbox.dataset.dmg);
    totalCostToDealEqualDmg += leadershipCost / baseDmg;
  });

  // 2. The Dmg Target is how much damage each unit type is allowed to deal
  const dmgTargetPerType = totalLeadership / totalCostToDealEqualDmg;

  // 3. Update the UI
  checkedUnits.forEach((checkbox) => {
    const leadershipCost = parseFloat(checkbox.dataset.leadership);
    const baseDmg = parseFloat(checkbox.dataset.dmg);
    const safeId = checkbox.id.replace("check-", "");

    // How many units of this type do we need to hit that dmg target?
    const count = Math.floor(dmgTargetPerType / baseDmg);
    const actualTotalDmgForThisUnit = count * baseDmg;

    const countEl = document.getElementById(`count-${safeId}`);
    const dmgEl = document.getElementById(`dmg-${safeId}`);

    if (countEl) countEl.textContent = count.toLocaleString();
    if (dmgEl) dmgEl.textContent = actualTotalDmgForThisUnit.toLocaleString();
  });
}

// GLOBAL EVENT LISTENERS
function attachGlobalEvents() {
  document.addEventListener("change", (e) => {
    // 1. If we clicked a Master Check, toggle the children first
    if (e.target.classList.contains("tier-master-check")) {
      const tierId = e.target.dataset.tier;
      const checks = document.querySelectorAll(
        `.unit-check[data-tier="${tierId}"]`,
      );
      checks.forEach((c) => (c.checked = e.target.checked));
    }

    // 2. Now that the UI state is updated, calculate for either case
    if (
      e.target.classList.contains("tier-master-check") ||
      e.target.classList.contains("unit-check")
    ) {
      calculateTroops();
    }
  });

  // Listen for typing in the main stats
  const statsInputs = [
    "input-leadership",
    "input-authority",
    "input-dominance",
  ];
  statsInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", calculateTroops);
  });
}

// Start
initApp();
