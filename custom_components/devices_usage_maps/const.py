"""Constants for Devices Usage Maps."""

from __future__ import annotations

DOMAIN = "devices_usage_maps"
NAME = "Devices Maps"
VERSION = "0.1.0"

# Static files (the frontend bundle) are served from this URL.
STATIC_URL = "/devices_usage_maps_static"
FRONTEND_ENTRY = "devices-usage-maps.js"

# Sidebar panel
PANEL_URL_PATH = "devices-usage-maps"
PANEL_COMPONENT = "devices-usage-maps-panel"

# Options
CONF_SHOW_IN_SIDEBAR = "show_in_sidebar"
CONF_SIDEBAR_TITLE = "sidebar_title"
CONF_SIDEBAR_ICON = "sidebar_icon"
CONF_REQUIRE_ADMIN = "require_admin"

DEFAULT_OPTIONS: dict[str, object] = {
    CONF_SHOW_IN_SIDEBAR: True,
    CONF_SIDEBAR_TITLE: NAME,
    CONF_SIDEBAR_ICON: "mdi:graph-outline",
    # Reading automation/script configs and the "related" search requires admin.
    CONF_REQUIRE_ADMIN: True,
}
