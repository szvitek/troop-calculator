// THEME TOGGLE

// Define valid themes
const validThemes = ["light", "dark", "auto"];

// Check for saved preference; if none, default to 'auto'
const getStoredTheme = () => localStorage.getItem("theme");
const setStoredTheme = (theme) => localStorage.setItem("theme", theme);

// The Normalization Logic
const getNormalizedTheme = () => {
  const stored = getStoredTheme();
  // If it's valid, use it. If not (null or "bad"), return "auto".
  return validThemes.includes(stored) ? stored : "auto";
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
  // 1. Try to find the button
  let btnToActivate = document.querySelector(
    `[data-bs-theme-value="${theme}"]`,
  );

  // 2. Defensive Fallback: If theme is invalid/missing, default to 'auto'
  if (!btnToActivate) {
    console.warn(`Theme "${theme}" not found, falling back to auto.`);
    btnToActivate = document.querySelector('[data-bs-theme-value="auto"]');
  }

  // 3. Absolute Safety: Exit if even the fallback isn't found
  if (!btnToActivate || !activeThemeIcon) return;

  // 4. Reset all buttons (Remove active class and hide checkmarks)
  document.querySelectorAll("[data-bs-theme-value]").forEach((element) => {
    element.classList.remove("active");
    const checkIcon = element.querySelector(".bi-check2");
    if (checkIcon) checkIcon.classList.add("d-none");
  });

  // 5. Activate the selected button
  btnToActivate.classList.add("active");
  const activeCheck = btnToActivate.querySelector(".bi-check2");
  if (activeCheck) activeCheck.classList.remove("d-none");

  // 6. Update the main navbar icon (Class-based logic)
  const iconInBtn = btnToActivate.querySelector("i");
  if (iconInBtn) {
    const iconClass = iconInBtn.classList[1]; // Grabs the second class, e.g., 'bi-moon-stars-fill'
    activeThemeIcon.className = `bi ${iconClass} me-2 theme-icon-active`;
  }
};

// Initial Setup
const initialTheme = getNormalizedTheme();
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

    const unitTemplate = document.getElementById("unit-item-template");

    tier.units.forEach((unit) => {
      const unitClone = unitTemplate.content.cloneNode(true);
      const safeId = unit.name.replace(/\s+/g, "-").toLowerCase();
      const tierColor = colorMap[String(tier.tierId)] || "#dc3545";

      // 1. Setup Checkbox
      const check = unitClone.querySelector(".unit-check");
      check.id = `check-${safeId}`;
      check.dataset.tier = tier.tierId;
      check.dataset.dmg = unit.dmg;
      check.dataset.leadership = unit.leadership;

      // 2. Setup Name Label
      const nameLabel = unitClone.querySelector(".unit-name-label");
      nameLabel.textContent = unit.name;

      // 3. Setup Count Output (the Span)
      const countSpan = unitClone.querySelector(".unit-count-output");
      countSpan.id = `count-${safeId}`;
      countSpan.style.borderColor = `${tierColor}66`;

      // 4. Setup Damage Output
      const dmgSpan = unitClone.querySelector(".unit-dmg-output");
      dmgSpan.id = `dmg-${safeId}`;
      dmgSpan.style.color = tierColor;
      dmgSpan.style.background = `${tierColor}20`;

      container.appendChild(unitClone);
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
    // 1. MASTER -> CHILDREN (Existing)
    if (e.target.classList.contains("tier-master-check")) {
      const tierId = e.target.dataset.tier;
      const checks = document.querySelectorAll(
        `.unit-check[data-tier="${tierId}"]`,
      );
      checks.forEach((c) => (c.checked = e.target.checked));
    }

    // 2. CHILDREN -> MASTER (The Fix)
    if (e.target.classList.contains("unit-check")) {
      const tierId = e.target.dataset.tier;
      // Find the master checkbox for this specific tier
      const master = document.querySelector(
        `.tier-master-check[data-tier="${tierId}"]`,
      );

      if (master) {
        const allInTier = document.querySelectorAll(
          `.unit-check[data-tier="${tierId}"]`,
        );
        const checkedInTier = document.querySelectorAll(
          `.unit-check[data-tier="${tierId}"]:checked`,
        );

        // If all are checked, master is checked.
        // If even one is missing, master is unchecked.
        master.checked = allInTier.length === checkedInTier.length;

        // Optional: Add "indeterminate" state (the horizontal dash)
        master.indeterminate =
          checkedInTier.length > 0 && checkedInTier.length < allInTier.length;
      }
    }

    // 3. ALWAYS CALCULATE
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
    if (!el) return;

    // Use 'input' so the numbers update in real-time as they type
    el.addEventListener("input", (e) => {
      let val = parseFloat(e.target.value);

      // 1. Instant Clamp: If they type a negative, force it to 0 immediately
      if (val < 0) {
        e.target.value = 0;
      }

      // 2. Always Calculate: This runs for any value >= 0
      calculateTroops();
    });
  });
}

// Start
initApp();
