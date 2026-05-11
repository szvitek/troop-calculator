/**
 * Lazy-loads the changelog, wires the version badge, and syncs the version number.
 */
export function initChangelog() {
  const collapseEl = document.getElementById("collapseOne");
  const contentDiv = document.getElementById("changelogContent");
  const badge = document.getElementById("versionBadge");

  if (collapseEl && contentDiv) {
    collapseEl.addEventListener("show.bs.collapse", () => {
      if (!contentDiv.innerText.includes("Loading changelog...")) return;

      fetch("./changelog.txt")
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.text();
        })
        .then((text) => {
          contentDiv.innerText = text;
        })
        .catch((err) => {
          contentDiv.innerText =
            "Error loading changelog. Please try again later.";
          console.error("Fetch error:", err);
        });
    });
  }

  if (badge) {
    badge.addEventListener("click", (e) => {
      e.preventDefault();

      const bsCollapse = new bootstrap.Collapse(
        document.getElementById("collapseOne"),
        { toggle: false },
      );
      bsCollapse.show();

      document
        .getElementById("changelog")
        .scrollIntoView({ behavior: "smooth" });
    });
  }

  updateVersionBadge();
}

async function updateVersionBadge() {
  try {
    const res = await fetch("./changelog.txt");
    if (!res.ok) return;

    const text = await res.text();
    const match = text.match(/^v\d+\.\d+\.\d+/m);

    if (match) {
      document.getElementById("versionBadge").textContent = match[0];
    }
  } catch (err) {
    console.error("Could not sync version number:", err);
  }
}
