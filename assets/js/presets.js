import { runCalculation, showDetailView, showSummaryView } from "./events.js";
import {
  TARGET_CITADEL,
  TARGET_EPIC,
  applyBattleTargetMode,
  applyWallCount,
  readBattleTargetMode,
  readWallCount,
} from "./citadel-ui.js";
import {
  applyBonusInputs,
  captureBonusInputs,
  collapseArmyBonusesAccordion,
  sanitizeBonusInputs,
} from "./bonuses.js";
import {
  applyEpicPresetState,
  captureEpicPresetState,
  sanitizeEpicPreset,
} from "./epics.js";
import { syncEpicTargetDisplay } from "./epic-ui.js";

const STORAGE_KEY = "troop-presets";
const SHARE_VERSION = 4;
const MAX_WALL_COUNT = 1_000_000;
/** Prefix so pasted codes are recognizable and import can validate. */
const SHARE_PREFIX = "a2r-preset:";

function parseStatValue(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const raw = String(el.value).replace(/,/g, "").trim();
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecodeToString(b64url) {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const MAX_IMPORT_CHARS = 400_000;
const MAX_STAT = 1e12;

function clampStat(value) {
  const x = parseInt(String(value), 10);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.min(x, MAX_STAT);
}

function clampWallCount(value) {
  const x = parseInt(String(value), 10);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.min(x, MAX_WALL_COUNT);
}

function normalizeTarget(raw) {
  return raw === TARGET_CITADEL ? TARGET_CITADEL : TARGET_EPIC;
}

/** @param {object} preset */
function normalizeStoredPreset(preset) {
  return {
    target: normalizeTarget(preset?.target),
    leadership: clampStat(preset?.leadership),
    authority: clampStat(preset?.authority),
    dominance: clampStat(preset?.dominance),
    units: Array.isArray(preset?.units) ? preset.units : [],
    bonuses: preset?.bonuses && typeof preset.bonuses === "object" ? preset.bonuses : {},
    epic: preset?.epic ?? { mode: "none" },
    citadel: { wallCount: clampWallCount(preset?.citadel?.wallCount) },
  };
}

function sanitizeImportedUnits(units) {
  if (!Array.isArray(units)) return [];
  const out = [];
  for (const id of units) {
    if (typeof id !== "string" || id.length > 256) continue;
    const el = document.getElementById(id);
    if (el && el.classList.contains("unit-check")) out.push(id);
  }
  return out;
}

function makeImportedStorageKey(presets, sourceLabel) {
  const raw =
    typeof sourceLabel === "string" && sourceLabel.trim()
      ? sourceLabel.trim().slice(0, 120)
      : "Preset";
  const base = `Imported: ${raw}`;
  if (!Object.prototype.hasOwnProperty.call(presets, base)) return base;
  let n = 2;
  while (Object.prototype.hasOwnProperty.call(presets, `${base} (${n})`)) {
    n += 1;
  }
  return `${base} (${n})`;
}

/**
 * @returns {{ ok: true, preset: object, sourceLabel: string } | { ok: false, error: string }}
 */
function parseShareCode(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Paste a share code." };
  if (trimmed.length > MAX_IMPORT_CHARS) {
    return { ok: false, error: "Code is too long." };
  }
  if (!trimmed.startsWith(SHARE_PREFIX)) {
    return {
      ok: false,
      error: `Invalid code (must start with ${SHARE_PREFIX}).`,
    };
  }

  const b64 = trimmed.slice(SHARE_PREFIX.length).trim();
  if (!b64) return { ok: false, error: "Missing encoded data after prefix." };

  let jsonStr;
  try {
    jsonStr = base64UrlDecodeToString(b64);
  } catch {
    return { ok: false, error: "Could not decode the code." };
  }

  let obj;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    return { ok: false, error: "Could not parse preset data." };
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, error: "Invalid preset data." };
  }
  if (obj.v !== 1 && obj.v !== 2 && obj.v !== 3 && obj.v !== SHARE_VERSION) {
    return { ok: false, error: "Unsupported share code version." };
  }

  const sourceLabel =
    typeof obj.name === "string" ? obj.name.trim().slice(0, 120) : "";

  const preset = {
    target:
      obj.v >= 4 && obj.target === TARGET_CITADEL ? TARGET_CITADEL : TARGET_EPIC,
    leadership: clampStat(obj.leadership),
    authority: clampStat(obj.authority),
    dominance: clampStat(obj.dominance),
    units: sanitizeImportedUnits(obj.units),
    bonuses:
      obj.v >= 2 ? sanitizeBonusInputs(obj.bonuses) : {},
    epic:
      obj.v >= 3
        ? sanitizeEpicPreset(obj.epic)
        : { mode: "none" },
    citadel: {
      wallCount:
        obj.v >= 4 ? clampWallCount(obj.citadel?.wallCount) : 0,
    },
  };

  return { ok: true, preset, sourceLabel };
}

function buildShareCode(presetName, data) {
  const payload = {
    v: SHARE_VERSION,
    name: presetName,
    target: data.target === TARGET_CITADEL ? TARGET_CITADEL : TARGET_EPIC,
    leadership: data.leadership ?? 0,
    authority: data.authority ?? 0,
    dominance: data.dominance ?? 0,
    units: Array.isArray(data.units) ? data.units : [],
    bonuses: sanitizeBonusInputs(data.bonuses),
    epic: sanitizeEpicPreset(data.epic),
    citadel: { wallCount: clampWallCount(data.citadel?.wallCount) },
  };
  return `${SHARE_PREFIX}${base64UrlEncode(JSON.stringify(payload))}`;
}

function syncPresetActionButtons() {
  const select = document.getElementById("preset-select");
  const del = document.getElementById("preset-delete");
  const exp = document.getElementById("preset-export");
  if (!select || !del || !exp) return;
  const hasSelection =
    Boolean(select.value) && !select.selectedOptions[0]?.disabled;
  del.disabled = !hasSelection;
  exp.disabled = !hasSelection;
}

/** True if the current form has meaningful data worth saving as a preset. */
function isPresetInputPopulated() {
  for (const id of [
    "input-leadership",
    "input-authority",
    "input-dominance",
    "citadel-wall-count",
  ]) {
    const el = document.getElementById(id);
    if (el && el.value.trim() !== "") return true;
  }
  if (document.querySelector(".unit-check:checked")) return true;
  if (
    [...document.querySelectorAll(".bonus-pct-input")].some(
      (el) => el.value.trim() !== "",
    )
  ) {
    return true;
  }
  const dragonIncluded = document.querySelector(
    '.bonus-check-input[data-bonus-key="dragon-included"]',
  );
  if (dragonIncluded && !dragonIncluded.checked) return true;
  return false;
}

function syncSavePresetButton() {
  const saveBtn = document.getElementById("preset-save");
  if (!saveBtn) return;
  saveBtn.disabled = !isPresetInputPopulated();
}

function showExportFallback(code) {
  const ta = document.getElementById("export-fallback-text");
  const modalEl = document.getElementById("exportFallbackModal");
  if (!ta || !modalEl) return;
  ta.value = code;
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
  modalEl.addEventListener(
    "shown.bs.modal",
    () => {
      ta.focus();
      ta.select();
    },
    { once: true },
  );
}

let presetToastInstance = null;

/**
 * @param {string} message
 */
function showPresetToast(message) {
  const el = document.getElementById("preset-toast");
  const body = document.getElementById("preset-toast-body");
  const closeBtn = el?.querySelector(".btn-close");
  if (!el || !body) return;

  body.textContent = message;
  el.classList.remove("text-bg-success", "text-bg-info");
  el.classList.add("text-bg-success");
  closeBtn?.classList.add("btn-close-white");

  if (!presetToastInstance) {
    presetToastInstance = bootstrap.Toast.getOrCreateInstance(el, {
      autohide: true,
      delay: 3200,
    });
  }
  presetToastInstance.show();
}

// --- Modal helper ---

function showModal({
  title,
  message,
  showInput = false,
  currentPresetName = null,
  confirmLabel = "OK",
  btnClass = "btn-primary",
}) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("presetModal");
    const titleEl = document.getElementById("presetModalLabel");
    const msgEl = document.getElementById("preset-modal-message");
    const inputWrap = document.getElementById("preset-modal-input-wrap");
    const input = document.getElementById("preset-modal-input");
    const overwriteWrap = document.getElementById("preset-modal-overwrite-wrap");
    const overwriteCheck = document.getElementById("preset-modal-overwrite");
    const confirmBtn = document.getElementById("preset-modal-confirm");

    const showOverwrite = showInput && !!currentPresetName;

    titleEl.textContent = title;
    msgEl.textContent = message;
    inputWrap.classList.toggle("d-none", !showInput);
    overwriteWrap.classList.toggle("d-none", !showOverwrite);
    confirmBtn.textContent = confirmLabel;
    confirmBtn.className = `btn btn-sm ${btnClass}`;

    input.value = "";
    if (showOverwrite) overwriteCheck.checked = false;
    if (showInput) confirmBtn.disabled = true;

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    let pendingResult = null;
    /** True only when we filled the empty field with the current preset name on check. */
    let didPrefillFromEmpty = false;

    function validateInput() {
      confirmBtn.disabled = !input.value.trim();
    }

    function onOverwriteToggle() {
      if (overwriteCheck.checked) {
        if (!input.value.trim() && currentPresetName) {
          input.value = currentPresetName;
          didPrefillFromEmpty = true;
        } else {
          didPrefillFromEmpty = false;
        }
      } else if (didPrefillFromEmpty) {
        input.value = "";
        didPrefillFromEmpty = false;
      }
      validateInput();
      input.focus();
    }

    function cleanup() {
      confirmBtn.removeEventListener("click", onConfirm);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      input.removeEventListener("input", validateInput);
      if (showOverwrite) {
        overwriteCheck.removeEventListener("change", onOverwriteToggle);
      }
    }

    function onConfirm() {
      pendingResult = showInput
        ? { name: input.value.trim(), overwrite: showOverwrite && overwriteCheck.checked }
        : true;
      modal.hide();
    }

    function onHidden() {
      const result = pendingResult;
      cleanup();
      resolve(result ?? (showInput ? null : false));
    }

    confirmBtn.addEventListener("click", onConfirm);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    if (showInput) input.addEventListener("input", validateInput);
    if (showOverwrite) overwriteCheck.addEventListener("change", onOverwriteToggle);

    modal.show();
    if (showInput) {
      modalEl.addEventListener("shown.bs.modal", () => input.focus(), { once: true });
    }
  });
}

// --- localStorage CRUD ---

function getPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// --- State capture / restore ---

function captureState() {
  return {
    target: readBattleTargetMode(),
    leadership: parseStatValue("input-leadership"),
    authority: parseStatValue("input-authority"),
    dominance: parseStatValue("input-dominance"),
    units: Array.from(document.querySelectorAll(".unit-check:checked")).map(
      (cb) => cb.id,
    ),
    bonuses: captureBonusInputs(),
    epic: captureEpicPresetState(),
    citadel: { wallCount: readWallCount() },
  };
}

async function restoreState(preset) {
  const data = normalizeStoredPreset(preset);

  applyBattleTargetMode(data.target);
  applyWallCount(data.citadel.wallCount);

  await applyEpicPresetState(data.epic);
  syncEpicTargetDisplay();

  document.getElementById("input-leadership").value = data.leadership || 0;
  document.getElementById("input-authority").value = data.authority || 0;
  document.getElementById("input-dominance").value = data.dominance || 0;

  document
    .querySelectorAll(".unit-check")
    .forEach((cb) => (cb.checked = false));
  document
    .querySelectorAll(".tier-master-check")
    .forEach((cb) => {
      cb.checked = false;
      cb.indeterminate = false;
    });

  data.units.forEach((id) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = true;
  });

  applyBonusInputs(sanitizeBonusInputs(data.bonuses));

  syncAllMasters();
  runCalculation();
  collapseArmyBonusesAccordion();
  showSummaryView();
  syncSavePresetButton();
}

/** Clears stat inputs and unit checks, resets preset dropdown to placeholder, recalculates, shows detail view. */
async function resetFormToEmpty() {
  await applyEpicPresetState({ mode: "none" });
  syncEpicTargetDisplay();

  for (const id of [
    "input-leadership",
    "input-authority",
    "input-dominance",
  ]) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  }

  document.querySelectorAll(".unit-check").forEach((cb) => {
    cb.checked = false;
  });
  document.querySelectorAll(".tier-master-check").forEach((cb) => {
    cb.checked = false;
    cb.indeterminate = false;
  });

  const select = document.getElementById("preset-select");
  if (select) select.selectedIndex = 0;

  applyBonusInputs({});

  syncAllMasters();
  runCalculation();
  showDetailView();
  syncPresetActionButtons();
  syncSavePresetButton();
}

function syncAllMasters() {
  document.querySelectorAll(".tier-master-check").forEach((master) => {
    const { tier, category } = master.dataset;
    const all = document.querySelectorAll(
      `.unit-check[data-tier="${tier}"][data-category="${category}"]`,
    );
    const checked = document.querySelectorAll(
      `.unit-check[data-tier="${tier}"][data-category="${category}"]:checked`,
    );

    master.checked = all.length > 0 && all.length === checked.length;
    master.indeterminate = checked.length > 0 && checked.length < all.length;
  });
}

// --- Dropdown ---

function populateDropdown() {
  const select = document.getElementById("preset-select");
  const presets = getPresets();
  const names = Object.keys(presets).sort();

  const currentValue = select.value;
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Load Preset --";
  placeholder.disabled = true;
  placeholder.selected = !currentValue || !names.includes(currentValue);
  select.appendChild(placeholder);

  names.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  if (names.includes(currentValue)) {
    select.value = currentValue;
  }

  syncPresetActionButtons();
  syncSavePresetButton();
}

// --- Init ---

export function initPresets() {
  const select = document.getElementById("preset-select");
  const resetBtn = document.getElementById("preset-reset");
  const saveBtn = document.getElementById("preset-save");
  const deleteBtn = document.getElementById("preset-delete");
  const exportBtn = document.getElementById("preset-export");
  const importBtn = document.getElementById("preset-import");
  const importModalEl = document.getElementById("importPresetModal");
  const importTa = document.getElementById("import-preset-text");
  const importSubmit = document.getElementById("import-preset-submit");
  const importAlert = document.getElementById("import-preset-alert");

  if (!select || !resetBtn || !saveBtn || !deleteBtn || !exportBtn || !importBtn)
    return;
  if (!importModalEl || !importTa || !importSubmit || !importAlert) return;

  populateDropdown();

  resetBtn.addEventListener("click", () => {
    void resetFormToEmpty();
  });

  document.addEventListener("input", (e) => {
    if (
      e.target.id === "input-leadership" ||
      e.target.id === "input-authority" ||
      e.target.id === "input-dominance" ||
      e.target.id === "citadel-wall-count" ||
      e.target.classList.contains("bonus-pct-input")
    ) {
      syncSavePresetButton();
    }
  });

  document.addEventListener("change", (e) => {
    if (
      e.target.classList.contains("unit-check") ||
      e.target.classList.contains("tier-master-check") ||
      e.target.classList.contains("bonus-check-input")
    ) {
      syncSavePresetButton();
    }
  });

  select.addEventListener("change", () => {
    const name = select.value;
    if (!name) {
      syncPresetActionButtons();
      syncSavePresetButton();
      return;
    }

    const presets = getPresets();
    if (presets[name]) {
      void restoreState(presets[name]);
    }

    syncPresetActionButtons();
    syncSavePresetButton();
  });

  exportBtn.addEventListener("click", async () => {
    const name = select.value;
    if (!name || select.selectedOptions[0]?.disabled) return;

    const presets = getPresets();
    const data = presets[name];
    if (!data) return;

    const code = buildShareCode(name, data);

    try {
      await navigator.clipboard.writeText(code);
      showPresetToast("Share code copied to clipboard.");
    } catch {
      showExportFallback(code);
    }
  });

  importBtn.addEventListener("click", () => {
    importTa.value = "";
    importAlert.textContent = "";
    importAlert.classList.add("d-none");
    importSubmit.disabled = true;
    const modal = bootstrap.Modal.getOrCreateInstance(importModalEl);
    modal.show();
    importModalEl.addEventListener(
      "shown.bs.modal",
      () => importTa.focus(),
      { once: true },
    );
  });

  importTa.addEventListener("input", () => {
    importSubmit.disabled = !importTa.value.trim();
  });

  importSubmit.addEventListener("click", () => {
    importAlert.classList.add("d-none");
    importAlert.textContent = "";

    const parsed = parseShareCode(importTa.value);
    if (!parsed.ok) {
      importAlert.textContent = parsed.error;
      importAlert.classList.remove("d-none");
      return;
    }

    const presets = getPresets();
    const key = makeImportedStorageKey(presets, parsed.sourceLabel);
    presets[key] = parsed.preset;
    savePresets(presets);

    const modal = bootstrap.Modal.getOrCreateInstance(importModalEl);

    function onImportHidden() {
      importModalEl.removeEventListener("hidden.bs.modal", onImportHidden);
      populateDropdown();
      select.value = key;
      select.dispatchEvent(new Event("change"));
      showPresetToast("Preset imported");
    }

    importModalEl.addEventListener("hidden.bs.modal", onImportHidden);
    modal.hide();
  });

  saveBtn.addEventListener("click", async () => {
    const currentPreset = select.value && !select.selectedOptions[0]?.disabled
      ? select.value
      : null;

    const result = await showModal({
      title: "Save Preset",
      message: "Enter a name for this army preset:",
      showInput: true,
      currentPresetName: currentPreset,
    });
    if (!result) return;

    const targetName = result.name;
    if (!targetName) return;

    const presets = getPresets();
    const isRename = result.overwrite && currentPreset
      && targetName !== currentPreset && !presets[targetName];

    if (presets[targetName] && targetName !== currentPreset) {
      const confirmed = await showModal({
        title: "Overwrite Preset",
        message: `A preset named "${targetName}" already exists. Overwrite it?`,
        confirmLabel: "Overwrite",
        btnClass: "btn-warning",
      });
      if (!confirmed) return;
    }

    if (isRename) delete presets[currentPreset];

    presets[targetName] = captureState();
    savePresets(presets);
    populateDropdown();
    select.value = targetName;
    select.dispatchEvent(new Event("change"));
    showPresetToast(`Preset saved "${targetName}"`);
  });

  deleteBtn.addEventListener("click", async () => {
    const name = select.value;
    if (!name) return;

    const confirmed = await showModal({
      title: "Delete Preset",
      message: `Are you sure you want to delete "${name}"?`,
      confirmLabel: "Delete",
      btnClass: "btn-danger",
    });
    if (!confirmed) return;

    const presets = getPresets();
    delete presets[name];
    savePresets(presets);
    populateDropdown();
    showPresetToast(`Preset deleted "${name}"`);
  });
}
