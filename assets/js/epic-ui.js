import {
  COMBAT_LABELS,
  COMBAT_TYPES,
  RPS_EPIC_BEATS,
  RPS_EPIC_BEATS_LABEL,
  loadEpicsCatalog,
  readEpicTargetState,
} from "./epics.js";

function formatNum(n) {
  if (!n) return "—";
  return Number(n).toLocaleString();
}

function squadFeatureText(squad) {
  if (!squad.combatType || !squad.features) return "—";
  const vs = RPS_EPIC_BEATS[squad.combatType];
  const v = vs ? squad.features[vs] : undefined;
  if (typeof v !== "number") return "—";
  return `vs ${COMBAT_LABELS[vs]} ${(v * 100).toFixed(0)}%`;
}

/**
 * @param {ReturnType<typeof readEpicTargetState>} state
 */
function renderEpicInfoPanel(state) {
  const accordion = document.getElementById("epic-info-accordion");
  const body = document.getElementById("epic-info-body");
  const btn = document.getElementById("epic-info-accordion-btn");
  const contentTpl = document.getElementById("epic-info-content-template");
  const rowTpl = document.getElementById("epic-squad-row-template");
  if (!accordion || !body || !contentTpl || !rowTpl) return;

  if (state.mode === "none") {
    accordion.classList.add("d-none");
    body.replaceChildren();
    return;
  }

  accordion.classList.remove("d-none");
  if (btn) {
    const label = btn.querySelector(".epic-info-accordion-label");
    if (label) {
      label.textContent = state.name
        ? `Epic squad details — ${state.name}`
        : "Epic squad details";
    }
  }

  const content = contentTpl.content.cloneNode(true);
  content.querySelector(".epic-info-name").textContent = state.name ?? "Epic";

  if (state.layerCount > 1) {
    const badge = content.querySelector(".epic-info-layer-badge");
    badge.textContent = `×${state.layerCount} layers / waves`;
    badge.classList.remove("d-none");
  }

  const tbody = content.querySelector(".epic-squad-tbody");
  state.squads.forEach((squad) => {
    const row = rowTpl.content.cloneNode(true);
    row.querySelector(".epic-squad-unit").textContent = squad.name ?? "";
    row.querySelector(".epic-squad-type").textContent = squad.combatType
      ? COMBAT_LABELS[squad.combatType]
      : "—";
    row.querySelector(".epic-squad-strength").textContent = formatNum(
      squad.strength,
    );
    row.querySelector(".epic-squad-hp").textContent = formatNum(squad.hp);
    row.querySelector(".epic-squad-feature").textContent =
      squadFeatureText(squad);
    tbody.appendChild(row);
  });

  body.replaceChildren();
  body.appendChild(content);
}

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

function syncEpicPanels() {
  const preset = document.getElementById("epic-mode-preset")?.checked;
  const presetPanel = document.getElementById("epic-preset-panel");
  const customPanel = document.getElementById("epic-custom-panel");
  if (presetPanel) presetPanel.classList.toggle("d-none", !preset);
  if (customPanel) customPanel.classList.toggle("d-none", preset);
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
    syncEpicPanels();
    renderEpicInfoPanel(readEpicTargetState());
    onChange();
  }

  document.getElementById("epic-mode-preset")?.addEventListener("change", refresh);
  document.getElementById("epic-mode-custom")?.addEventListener("change", refresh);
  document.getElementById("epic-preset-select")?.addEventListener("change", refresh);

  section.addEventListener("input", (e) => {
    if (!e.target.classList.contains("epic-custom-input")) return;
    if (
      e.target.type === "number" &&
      e.target.value !== "" &&
      parseFloat(e.target.value) < 0
    ) {
      e.target.value = "0";
    }
    refresh();
  });

  syncEpicPanels();
  renderEpicInfoPanel(readEpicTargetState());
}

/** Updates epic mode panels and squad-details accordion after preset load. */
export function syncEpicTargetDisplay() {
  syncEpicPanels();
  renderEpicInfoPanel(readEpicTargetState());
}
