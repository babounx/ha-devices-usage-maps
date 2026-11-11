// Devices Usage Maps — sidebar panel (registered by the integration when
// "Show in the sidebar" is enabled in its options).
import "./view.js";
import { translator } from "./i18n.js";

class DevicesUsageMapsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; background: var(--primary-background-color); color: var(--primary-text-color); }
        .toolbar {
          display: flex; align-items: center; gap: 8px; height: var(--header-height, 56px);
          padding: 0 max(12px, env(safe-area-inset-left, 0px));
          background: var(--app-header-background-color, var(--primary-color));
          color: var(--app-header-text-color, var(--text-primary-color, #fff));
          border-bottom: var(--app-header-border-bottom, none);
          font-size: 20px; font-weight: 400;
        }
        .content { height: calc(100% - var(--header-height, 56px)); overflow-y: auto; }
        devices-usage-maps-view { max-width: 1600px; margin: 0 auto; }
      </style>
      <div class="toolbar"><ha-menu-button></ha-menu-button><span class="title"></span></div>
      <div class="content"><devices-usage-maps-view></devices-usage-maps-view></div>`;
    this._view = this.shadowRoot.querySelector("devices-usage-maps-view");
    this._view.setConfig({ view: "overview", mode: "panel" });
  }

  set hass(hass) {
    this._hass = hass;
    const menu = this.shadowRoot.querySelector("ha-menu-button");
    menu.hass = hass;
    menu.narrow = this._narrow;
    this.shadowRoot.querySelector(".title").textContent = this._panel?.title || translator(hass)("title");
    this._view.hass = hass;
  }

  set narrow(v) {
    this._narrow = v;
    const menu = this.shadowRoot.querySelector("ha-menu-button");
    if (menu) menu.narrow = v;
  }

  set panel(p) {
    this._panel = p;
    if (this._hass) this.shadowRoot.querySelector(".title").textContent = p?.title || translator(this._hass)("title");
  }
}

if (!customElements.get("devices-usage-maps-panel")) customElements.define("devices-usage-maps-panel", DevicesUsageMapsPanel);
