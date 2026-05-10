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

    const categoryConfigs = [
      { name: "guardsmen", rootId: "guardsmen-container", prefix: "G" },
      { name: "specialists", rootId: "specialists-container", prefix: "S" },
    ];

    // Render each category generically
    categoryConfigs.forEach((config) => {
      renderTroops(troopsData, colorMap, config);
    });
  } catch (err) {
    console.error("Failed to load configuration:", err);
  }
}

function renderTroops(data, colorMap, config) {
  const root = document.getElementById(config.rootId);
  if (!root) return; // Skip if tab doesn't exist in HTML yet

  const template = document.getElementById("tier-row-template");
  const unitTemplate = document.getElementById("unit-item-template");

  // Filter by the specific category (guardsmen, specialists, etc.)
  const filteredTiers = data.filter((item) => item.category === config.name);

  filteredTiers.forEach((tier) => {
    const clone = template.content.cloneNode(true);

    const masterCheck = clone.querySelector(".tier-master-check");
    masterCheck.dataset.tier = tier.tierId;
    masterCheck.dataset.category = config.name; // Tag for event bubbling

    const tierColor = colorMap[tier.tierId] || "#dc3545";
    clone.querySelector(".tier-card").style.borderColor = tierColor;

    const labelText = clone.querySelector(".tier-label-text");
    labelText.style.color = tierColor;
    // Dynamic label: G1, S5, etc.
    labelText.textContent = `${config.prefix}${tier.tierId}`;

    const container = clone.querySelector(".unit-slot-container");

    tier.units.forEach((unit) => {
      const unitClone = unitTemplate.content.cloneNode(true);
      const safeId = unit.name.replace(/\s+/g, "-").toLowerCase();

      const check = unitClone.querySelector(".unit-check");
      check.id = `check-${safeId}`;
      check.dataset.tier = tier.tierId;
      check.dataset.category = config.name; // Keep context
      check.dataset.dmg = unit.dmg;
      check.dataset.leadership = unit.leadership;

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
      const category = e.target.dataset.category;
      // Only select checkboxes that match BOTH the tier AND the category
      const checks = document.querySelectorAll(
        `.unit-check[data-tier="${tierId}"][data-category="${category}"]`,
      );
      checks.forEach((c) => (c.checked = e.target.checked));
    }

    // 2. CHILDREN -> MASTER (Scoped by Category)
    if (e.target.classList.contains("unit-check")) {
      const tierId = e.target.dataset.tier;
      const category = e.target.dataset.category; // Grab the category

      // Find the master check that matches BOTH tier and category
      const master = document.querySelector(
        `.tier-master-check[data-tier="${tierId}"][data-category="${category}"]`,
      );

      if (master) {
        const allInTier = document.querySelectorAll(
          `.unit-check[data-tier="${tierId}"][data-category="${category}"]`,
        );
        const checkedInTier = document.querySelectorAll(
          `.unit-check[data-tier="${tierId}"][data-category="${category}"]:checked`,
        );

        // Sync master state
        master.checked = allInTier.length === checkedInTier.length;

        // "Indeterminate" state logic
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

document
  .getElementById("collapseOne")
  .addEventListener("show.bs.collapse", function () {
    const contentDiv = document.getElementById("changelogContent");

    // Only fetch if it hasn't been loaded yet
    if (contentDiv.innerText.includes("Loading changelog...")) {
      fetch("./changelog.txt")
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.text();
        })
        .then((text) => {
          contentDiv.innerText = text;
        })
        .catch((err) => {
          contentDiv.innerText =
            "Error loading changelog. Please try again later.";
          console.error("Fetch error:", err);
        });
    }
  });

document.getElementById("versionBadge").addEventListener("click", function (e) {
  e.preventDefault(); // Prevent the default jump

  const changelogCollapse = document.getElementById("collapseOne");
  const bsCollapse = new bootstrap.Collapse(changelogCollapse, {
    toggle: false,
  });

  // 1. Open the accordion
  bsCollapse.show();

  // 2. Smoothly scroll to the accordion
  document.getElementById("changelog").scrollIntoView({
    behavior: "smooth",
  });
});

async function updateVersionFromChangelog() {
  try {
    const response = await fetch("changelog.txt");
    const text = await response.text();

    // This regex looks for "v" followed by numbers and dots at the start of a line
    const versionMatch = text.match(/^v\d+\.\d+\.\d+/m);

    if (versionMatch) {
      const latestVersion = versionMatch[0];
      document.getElementById("versionBadge").textContent = latestVersion;
      console.log(`Version updated to: ${latestVersion}`);
    }
  } catch (error) {
    console.error("Could not sync version number:", error);
  }
}

// Call this when the page loads
document.addEventListener("DOMContentLoaded", updateVersionFromChangelog);

// Start
initApp();
