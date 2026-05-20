import {
  COMBAT_LABELS,
  COMBAT_TYPES,
  RPS_EPIC_BEATS_LABEL,
  loadEpicsCatalog,
  populateCustomEpicInputsFromPreset,
} from "./epics.js";

function wireCustomTypeCard(clone, combatType) {
  const vsLabel = RPS_EPIC_BEATS_LABEL[combatType];
  const strengthId = `epic-custom-${combatType}-strength`;
  const hpId = `epic-custom-${combatType}-hp`;
  const featureId = `epic-custom-${combatType}-feature`;

  clone.querySelector(".epic-custom-type-title").textContent =
    `${COMBAT_LABELS[combatType]} layer`;

  const strengthLabel = clone.querySelector(".epic-custom-strength-label");
  const strengthInput = clone.querySelector(".epic-custom-strength-input");
  strengthLabel.htmlFor = strengthId;
  strengthInput.id = strengthId;

  const hpLabel = clone.querySelector(".epic-custom-hp-label");
  const hpInput = clone.querySelector(".epic-custom-hp-input");
  hpLabel.htmlFor = hpId;
  hpInput.id = hpId;

  const featureLabel = clone.querySelector(".epic-custom-feature-label");
  const featureInput = clone.querySelector(".epic-custom-feature-input");
  featureLabel.htmlFor = featureId;
  featureLabel.textContent = `Feature vs ${vsLabel} %`;
  featureInput.id = featureId;
}

function buildCustomEpicGrid() {
  const mount = document.getElementById("epic-custom-grid-mount");
  const typeTpl = document.getElementById("epic-custom-type-template");
  if (!mount || !typeTpl || mount.childElementCount > 0) return;

  mount.replaceChildren();
  COMBAT_TYPES.forEach((combatType) => {
    const clone = typeTpl.content.cloneNode(true);
    wireCustomTypeCard(clone, combatType);
    mount.appendChild(clone);
  });
}

function clearCustomEpicInputs() {
  document.querySelectorAll(".epic-custom-input").forEach((el) => {
    el.value = "";
  });
}

/**
 * @param {() => void} onChange
 */
export function initEpicUI(onChange) {
  const section = document.getElementById("epic-target-section");
  if (!section) return;

  buildCustomEpicGrid();

  loadEpicsCatalog()
    .then((catalog) => {
      const select = document.getElementById("epic-preset-select");
      if (!select) return;

      select.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.selected = true;
      placeholder.textContent = "— Select epic —";
      select.appendChild(placeholder);

      catalog.forEach((enc) => {
        const opt = document.createElement("option");
        opt.value = enc.id;
        opt.textContent = enc.encounterName;
        select.appendChild(opt);
      });
    })
    .catch((err) => console.error("Failed to load epics:", err));

  function refresh() {
    onChange();
  }

  document.getElementById("epic-preset-select")?.addEventListener("change", (e) => {
    const id = e.target.value;
    if (id) populateCustomEpicInputsFromPreset(id);
    else clearCustomEpicInputs();
    refresh();
    document.dispatchEvent(new Event("a2r:preset-sync"));
  });

  section.addEventListener("input", (e) => {
    if (!e.target.classList.contains("epic-custom-input")) return;
    if (
      e.target.type === "number" &&
      e.target.value !== "" &&
      parseFloat(e.target.value) < 0
    ) {
      e.target.value = "0";
    }
    const select = document.getElementById("epic-preset-select");
    if (select) select.value = "";
    refresh();
  });
}
