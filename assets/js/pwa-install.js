const DISMISSED_KEY = "a2r-pwa-install-dismissed";

let deferredInstallPrompt = null;

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneDisplay() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function isDismissed() {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

function setDismissed() {
  localStorage.setItem(DISMISSED_KEY, "1");
}

function showInstallBanner() {
  if (isStandaloneDisplay() || isDismissed()) return;
  document.getElementById("pwa-install-banner")?.classList.remove("d-none");
}

function hideInstallBanner() {
  document.getElementById("pwa-install-banner")?.classList.add("d-none");
}

function showIOSInstallInstructions() {
  const copy = document.getElementById("pwa-install-copy");
  const installButton = document.getElementById("pwa-install-button");

  if (copy) {
    copy.replaceChildren(
      "Tap the ",
      Object.assign(document.createElement("i"), {
        className: "bi bi-box-arrow-up text-primary fw-bold",
        ariaHidden: "true",
      }),
      " Share button in Safari, then choose ",
      Object.assign(document.createElement("strong"), {
        textContent: "Add to Home Screen",
      }),
      ".",
    );
  }

  installButton?.classList.add("d-none");
  showInstallBanner();
}

async function promptInstall() {
  if (!deferredInstallPrompt) return;

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  hideInstallBanner();

  try {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome !== "accepted") setDismissed();
  } catch (err) {
    console.warn("PWA install prompt failed:", err);
  }
}

export function initPwaInstallPrompt() {
  if (isStandaloneDisplay() || isDismissed()) return;

  if (isIOSDevice()) {
    showIOSInstallInstructions();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallBanner();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    hideInstallBanner();
    localStorage.removeItem(DISMISSED_KEY);
  });

  document.getElementById("pwa-install-button")?.addEventListener("click", () => {
    void promptInstall();
  });

  document.getElementById("pwa-install-later")?.addEventListener("click", () => {
    hideInstallBanner();
  });

  document.getElementById("pwa-install-dismiss")?.addEventListener("click", () => {
    setDismissed();
    hideInstallBanner();
  });
}
