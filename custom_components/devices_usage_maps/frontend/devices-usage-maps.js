// Devices Usage Maps — entry point.
// Loaded on every Home Assistant page by the integration (no dashboard
// resource needed). Registers the card, its editor and the sidebar panel.
import "./src/card.js";
import "./src/panel.js";

const VERSION = "0.2.0";

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "devices-usage-maps-card")) {
  window.customCards.push({
    type: "devices-usage-maps-card",
    name: "Devices Usage Maps",
    description: "How devices and entities are used by automations, scripts, scenes, dashboards and Energy.",
    preview: false,
    documentationURL: "https://github.com/babounx/ha-devices-usage-maps",
  });
}

console.info(`%c DEVICES-USAGE-MAPS %c ${VERSION} `, "color:#fff;background:#03a9f4;font-weight:600", "color:#03a9f4;background:#fff");
