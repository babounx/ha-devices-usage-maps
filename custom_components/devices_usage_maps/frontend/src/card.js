// Devices Usage Maps — Lovelace card: type "custom:devices-usage-maps-card".
import "./view.js";
import "./editor.js";

class DevicesUsageMapsCard extends HTMLElement {
  setConfig(config) {
    this._config = { view: "overview", show_services: false, ...config };
    if (!this._view) {
      this._view = document.createElement("devices-usage-maps-view");
      const card = document.createElement("ha-card");
      card.style.overflow = "hidden";
      if (this._config.height) card.style.height = `${Number(this._config.height)}px`;
      card.appendChild(this._view);
      this.appendChild(card);
      this._card = card;
    }
    if (this._card) {
      this._card.style.height = this._config.height ? `${Number(this._config.height)}px` : "";
      this._card.style.overflowY = this._config.height ? "auto" : "";
    }
    this._view.setConfig({ ...this._config, mode: "card" });
  }

  set hass(hass) {
    if (this._view) this._view.hass = hass;
  }

  getCardSize() { return 12; }

  // Sections view: take the full width by default.
  getGridOptions() { return { columns: "full", min_columns: 12 }; }

  static getConfigElement() { return document.createElement("devices-usage-maps-card-editor"); }

  static getStubConfig() { return { view: "overview", show_services: false }; }
}

if (!customElements.get("devices-usage-maps-card")) customElements.define("devices-usage-maps-card", DevicesUsageMapsCard);
