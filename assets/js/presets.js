import { runCalculation, showSummaryView } from "./events.js";

const STORAGE_KEY = "troop-presets";

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
    leadership:
      parseInt(document.getElementById("input-leadership").value, 10) || 0,
    authority:
      parseInt(document.getElementById("input-authority").value, 10) || 0,
    dominance:
      parseInt(document.getElementById("input-dominance").value, 10) || 0,
    units: Array.from(document.querySelectorAll(".unit-check:checked")).map(
      (cb) => cb.id,
    ),
  };
}

function restoreState(preset) {
  document.getElementById("input-leadership").value = preset.leadership || 0;
  document.getElementById("input-authority").value = preset.authority || 0;
  document.getElementById("input-dominance").value = preset.dominance || 0;

  document
    .querySelectorAll(".unit-check")
    .forEach((cb) => (cb.checked = false));
  document
    .querySelectorAll(".tier-master-check")
    .forEach((cb) => {
      cb.checked = false;
      cb.indeterminate = false;
    });

  (preset.units || []).forEach((id) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = true;
  });

  syncAllMasters();
  runCalculation();
  showSummaryView();
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
  select.innerHTML =
    '<option value="" selected disabled>-- Load Preset --</option>';

  names.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  if (names.includes(currentValue)) {
    select.value = currentValue;
  }

  const hasSelection = select.value && !select.selectedOptions[0]?.disabled;
  document.getElementById("preset-delete").disabled = !hasSelection;
}

// --- Init ---

export function initPresets() {
  const select = document.getElementById("preset-select");
  const saveBtn = document.getElementById("preset-save");
  const deleteBtn = document.getElementById("preset-delete");

  if (!select || !saveBtn || !deleteBtn) return;

  populateDropdown();

  select.addEventListener("change", () => {
    const name = select.value;
    if (!name) return;

    const presets = getPresets();
    if (presets[name]) restoreState(presets[name]);

    deleteBtn.disabled = false;
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
  });
}
