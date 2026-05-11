const VALID_THEMES = ["light", "dark", "auto"];

const getStoredTheme = () => localStorage.getItem("theme");
const setStoredTheme = (theme) => localStorage.setItem("theme", theme);

function getNormalizedTheme() {
  const stored = getStoredTheme();
  return VALID_THEMES.includes(stored) ? stored : "auto";
}

function applyTheme(theme) {
  if (theme === "auto") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute(
      "data-bs-theme",
      isDark ? "dark" : "light",
    );
  } else {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }
}

function showActiveTheme(theme) {
  const activeThemeIcon = document.querySelector(".theme-icon-active");
  let btnToActivate = document.querySelector(
    `[data-bs-theme-value="${theme}"]`,
  );

  if (!btnToActivate) {
    console.warn(`Theme "${theme}" not found, falling back to auto.`);
    btnToActivate = document.querySelector('[data-bs-theme-value="auto"]');
  }

  if (!btnToActivate || !activeThemeIcon) return;

  document.querySelectorAll("[data-bs-theme-value]").forEach((el) => {
    el.classList.remove("active");
    const checkIcon = el.querySelector(".bi-check2");
    if (checkIcon) checkIcon.classList.add("d-none");
  });

  btnToActivate.classList.add("active");
  const activeCheck = btnToActivate.querySelector(".bi-check2");
  if (activeCheck) activeCheck.classList.remove("d-none");

  const iconInBtn = btnToActivate.querySelector("i");
  if (iconInBtn) {
    const iconClass = iconInBtn.classList[1];
    activeThemeIcon.className = `bi ${iconClass} me-2 theme-icon-active`;
  }
}

/**
 * Applies the saved theme immediately and wires up the theme toggle buttons.
 * Safe to call before DOMContentLoaded for the attribute set,
 * then registers click listeners once the DOM is ready.
 */
export function initTheme() {
  const theme = getNormalizedTheme();
  applyTheme(theme);

  showActiveTheme(theme);

  document.querySelectorAll("[data-bs-theme-value]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const selected = toggle.getAttribute("data-bs-theme-value");
      setStoredTheme(selected);
      applyTheme(selected);
      showActiveTheme(selected);
    });
  });
}
