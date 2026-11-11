"""Devices Usage Maps.

Serves a frontend bundle that provides:
  * a Lovelace card  (``custom:devices-usage-maps-card``), always available;
  * a sidebar panel  (``devices-usage-maps-panel``), toggled from the options.

All data is read live by the frontend through Home Assistant's WebSocket API,
so this integration has no entities, polling or storage of its own.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_REQUIRE_ADMIN,
    CONF_SHOW_IN_SIDEBAR,
    CONF_SIDEBAR_ICON,
    CONF_SIDEBAR_TITLE,
    DEFAULT_OPTIONS,
    DOMAIN,
    FRONTEND_ENTRY,
    PANEL_COMPONENT,
    PANEL_URL_PATH,
    STATIC_URL,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).parent / "frontend"
MODULE_URL = f"{STATIC_URL}/{FRONTEND_ENTRY}?v={VERSION}"


def _options(entry: ConfigEntry) -> dict:
    return {**DEFAULT_OPTIONS, **entry.options}


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Devices Usage Maps from a config entry."""
    data = hass.data.setdefault(DOMAIN, {})

    # Static path can only be registered once per HA run.
    if not data.get("static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
        )
        data["static_registered"] = True

    # Load the bundle on every frontend page so the card works without
    # adding a dashboard resource by hand.
    frontend.add_extra_js_url(hass, MODULE_URL)

    opts = _options(entry)
    if opts[CONF_SHOW_IN_SIDEBAR]:
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL_PATH,
            webcomponent_name=PANEL_COMPONENT,
            module_url=MODULE_URL,
            sidebar_title=str(opts[CONF_SIDEBAR_TITLE]),
            sidebar_icon=str(opts[CONF_SIDEBAR_ICON]),
            require_admin=bool(opts[CONF_REQUIRE_ADMIN]),
            config={},
            embed_iframe=False,
        )

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    _LOGGER.debug("Devices Usage Maps %s loaded (sidebar=%s)", VERSION, opts[CONF_SHOW_IN_SIDEBAR])
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
    frontend.remove_extra_js_url(hass, MODULE_URL)
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Re-apply options (show/hide the sidebar panel, title, icon)."""
    await hass.config_entries.async_reload(entry.entry_id)
