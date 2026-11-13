// Devices Usage Maps — visual card editor (uses Home Assistant's ha-form).
import { translator } from "./i18n.js?v=1.3.0";

class DevicesUsageMapsCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { view: "overview", show_services: false, ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    const t = translator(this._hass);
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        const value = { ...ev.detail.value };
        if (value.height === "" || value.height == null) delete value.height;
        this._config = { ...this._config, ...value };
        if (!("height" in value)) delete this._config.height;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = [
      {
        name: "view",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "overview", label: t("tabs.overview") },
              { value: "devices", label: t("tabs.devices") },
              { value: "automations", label: t("tabs.automations") },
              { value: "health", label: t("tabs.health") },
              { value: "broken", label: t("tabs.broken") },
            ],
          },
        },
      },
      { name: "show_services", selector: { boolean: {} } },
      { name: "height", selector: { number: { min: 300, max: 3000, step: 50, mode: "box", unit_of_measurement: "px" } } },
    ];
    this._form.computeLabel = (s) => t(`editor.${s.name}`);
  }
}

if (!customElements.get("devices-usage-maps-card-editor")) customElements.define("devices-usage-maps-card-editor", DevicesUsageMapsCardEditor);
