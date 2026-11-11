"""Config flow for Devices Usage Maps."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_REQUIRE_ADMIN,
    CONF_SHOW_IN_SIDEBAR,
    CONF_SIDEBAR_ICON,
    CONF_SIDEBAR_TITLE,
    DEFAULT_OPTIONS,
    DOMAIN,
    NAME,
)


def _schema(values: dict[str, Any]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_SHOW_IN_SIDEBAR, default=values[CONF_SHOW_IN_SIDEBAR]): selector.BooleanSelector(),
            vol.Required(CONF_SIDEBAR_TITLE, default=values[CONF_SIDEBAR_TITLE]): selector.TextSelector(),
            vol.Required(CONF_SIDEBAR_ICON, default=values[CONF_SIDEBAR_ICON]): selector.IconSelector(),
            vol.Required(CONF_REQUIRE_ADMIN, default=values[CONF_REQUIRE_ADMIN]): selector.BooleanSelector(),
        }
    )


class DevicesUsageMapsConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the initial setup (a single click)."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title=NAME, data={}, options=user_input)
        return self.async_show_form(step_id="user", data_schema=_schema(dict(DEFAULT_OPTIONS)))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return DevicesUsageMapsOptionsFlow()


class DevicesUsageMapsOptionsFlow(OptionsFlow):
    """Toggle the sidebar panel and tune its title/icon."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        current = {**DEFAULT_OPTIONS, **self.config_entry.options}
        return self.async_show_form(step_id="init", data_schema=_schema(current))
