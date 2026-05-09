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
