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

  attachGlobalEvents();
}

// CALCULATOR LOGIC
function calculateTroops() {
  // 1. INPUT GATHERING
  const totalLead =
    parseFloat(document.getElementById("input-leadership").value) || 0;
  const totalDom =
    parseFloat(document.getElementById("input-dominance").value) || 0;
  const allUnitChecks = document.querySelectorAll(".unit-check");
  const checkedUnits = Array.from(allUnitChecks).filter((cb) => cb.checked);

  // 2. THE DEEP CLEAN (Reset UI immediately)
  allUnitChecks.forEach((u) => {
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

  if (checkedUnits.length === 0) return;

  // 3. PRE-CALCULATE RATIOS
  const leadUnits = checkedUnits.filter(
    (u) => u.dataset.resource === "leadership",
  );
  const domUnits = checkedUnits.filter(
    (u) => u.dataset.resource === "dominance",
  );

  let totalLeadRatio = 0;
  leadUnits.forEach(
    (u) =>
      (totalLeadRatio +=
        parseFloat(u.dataset.unitWeight) / parseFloat(u.dataset.dmg)),
  );

  let totalDomRatio = 0;
  domUnits.forEach(
    (u) =>
      (totalDomRatio +=
        parseFloat(u.dataset.unitWeight) / parseFloat(u.dataset.dmg)),
  );

  // 4. CALCULATE THE DAMAGE GOAL
  // Goal comes from Leadership. If no Leadership units/input, goal is 0.
  const dmgGoal =
    totalLead > 0 && totalLeadRatio > 0 ? totalLead / totalLeadRatio : 0;

  // 5. THE MAIN LOOP (Flat Logic)
  checkedUnits.forEach((u) => {
    const id = u.id.replace("check-", "");
    const weight = parseFloat(u.dataset.unitWeight);
    const baseDmg = parseFloat(u.dataset.dmg);
    const type = u.dataset.resource;
    const row = u.closest(".unit-item");
    const warningIcon = row ? row.querySelector(".warning-icon") : null;

    let finalCount = 0;

    // --- LOGIC FOR LEADERSHIP UNITS ---
    if (type === "leadership") {
      if (dmgGoal > 0) {
        finalCount = Math.floor(dmgGoal / baseDmg);
      }
    }

    // --- LOGIC FOR DOMINANCE UNITS ---
    else if (type === "dominance") {
      if (dmgGoal > 0) {
        // SCENARIO A: MIRROR MODE (Match the Guards)
        finalCount = Math.ceil(dmgGoal / baseDmg);

        // Show Warning if it exceeds Dominance
        if (totalDom > 0 && totalDomRatio > 0) {
          const maxAllowed = Math.floor(
            (totalDom * (weight / baseDmg / totalDomRatio)) / weight,
          );
          if (finalCount > maxAllowed && warningIcon) {
            showWarning(warningIcon, maxAllowed);
          }
        }
      } else if (totalDom > 0 && totalDomRatio > 0) {
        // SCENARIO B: MAX MODE (No Guards, just fill dominance)
        finalCount = Math.floor(totalDom / totalDomRatio / baseDmg);
      }
    }

    // UPDATE UI
    document.getElementById(`count-${id}`).textContent =
      finalCount.toLocaleString();
    document.getElementById(`dmg-${id}`).textContent = Math.floor(
      finalCount * baseDmg,
    ).toLocaleString();
  });
}

// Helper to keep the main loop clean
function showWarning(icon, max) {
  icon.classList.remove("d-none");
  const msg = `Your current Dominance only allows ${max.toLocaleString()} units to maintain balance`;
  icon.setAttribute("data-bs-title", msg);
  icon.setAttribute("title", msg);
  const tt = bootstrap.Tooltip.getInstance(icon);
  if (tt) tt.setContent({ ".tooltip-inner": msg });
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
      // If empty, treat as 0
      if (e.target.value === "") {
        calculateTroops();
        return;
      }

      let val = parseFloat(e.target.value);

      if (val < 0 || isNaN(val)) {
        e.target.value = 0;
      }

      calculateTroops();
    });
  });

  // Initialize all tooltips on the page
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
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
