/**
 * Optional Umami analytics. Configure via meta tags in index.html (see README).
 * Does not run in an installed PWA (standalone / minimal-ui / iOS Add to Home Screen).
 */
export function initUmami() {
  if (isInstalledPwa()) return;

  const websiteId = getMeta("umami-website-id");
  const scriptUrl = getMeta("umami-script-url");
  if (!websiteId || !scriptUrl) return;

  if (document.querySelector("script[data-app-umami-loader]")) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = scriptUrl;
  script.setAttribute("data-website-id", websiteId);
  script.setAttribute("data-app-umami-loader", "");

  document.head.appendChild(script);
}

function getMeta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  const v = el?.getAttribute("content");
  return typeof v === "string" ? v.trim() : "";
}

function isInstalledPwa() {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch {
    /* ignore */
  }
  return window.navigator.standalone === true;
}
