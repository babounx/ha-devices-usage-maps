"""WebSocket API of Devices Usage Maps.

``devices_usage_maps/search`` looks for a text (an entity id, part of one, any
word) in the places the frontend cannot read by itself:

* the YAML files of the configuration folder (configuration.yaml, packages,
  scripts.yaml, templates, sensors…), with file, line number and line text;
* the options of config entries, which is where UI helpers keep their setup
  (groups, templates, min/max, threshold, switch_as_x, utility meters…).

Read-only, administrators only. ``secrets.yaml`` and credentials are never read
or returned.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

# Folders of the configuration directory that are never scanned.
SKIP_DIRS = {
    ".storage", ".cloud", ".git", ".github", ".vscode", "__pycache__", "custom_components",
    "deps", "tts", "backups", "backup", "node_modules", "www", "media", "image", "share",
    "esphome", "zigbee2mqtt", ".esphome", "trash",
}
SKIP_FILES = {"secrets.yaml", "known_devices.yaml"}
YAML_EXT = (".yaml", ".yml")
MAX_FILE_SIZE = 2 * 1024 * 1024
MAX_HITS = 300
MAX_LINE = 240
MIN_QUERY = 3


def _search_files(config_dir: str, query: str) -> dict[str, Any]:
    """Search YAML files under the configuration folder (runs in the executor)."""
    needle = query.lower()
    hits: list[dict[str, Any]] = []
    scanned = 0
    truncated = False
    root = Path(config_dir)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.startswith("."))
        for name in sorted(filenames):
            if not name.endswith(YAML_EXT) or name in SKIP_FILES:
                continue
            path = Path(dirpath) / name
            try:
                if path.stat().st_size > MAX_FILE_SIZE:
                    continue
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            scanned += 1
            if needle not in text.lower():
                continue
            rel = str(path.relative_to(root))
            for num, line in enumerate(text.splitlines(), start=1):
                if needle in line.lower():
                    hits.append({"file": rel, "line": num, "text": line.strip()[:MAX_LINE]})
                    if len(hits) >= MAX_HITS:
                        truncated = True
                        return {"files": hits, "scanned": scanned, "truncated": truncated}
    return {"files": hits, "scanned": scanned, "truncated": truncated}


@callback
def _search_entries(hass: HomeAssistant, query: str) -> list[dict[str, Any]]:
    """Search the options of config entries (UI helpers live there)."""
    needle = query.lower()
    out: list[dict[str, Any]] = []
    for entry in hass.config_entries.async_entries():
        if not entry.options:
            continue
        try:
            blob = json.dumps(entry.options, default=str, ensure_ascii=False).lower()
        except (TypeError, ValueError):
            continue
        if needle in blob:
            out.append({"entry_id": entry.entry_id, "domain": entry.domain, "title": entry.title})
    return out


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/search",
        vol.Required("query"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_search(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Search YAML files and config entry options."""
    query = msg["query"].strip()
    if len(query) < MIN_QUERY:
        connection.send_result(msg["id"], {"files": [], "entries": [], "scanned": 0, "truncated": False})
        return
    files = await hass.async_add_executor_job(_search_files, hass.config.config_dir, query)
    files["entries"] = _search_entries(hass, query)
    connection.send_result(msg["id"], files)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the WebSocket commands (once per Home Assistant run)."""
    websocket_api.async_register_command(hass, ws_search)
