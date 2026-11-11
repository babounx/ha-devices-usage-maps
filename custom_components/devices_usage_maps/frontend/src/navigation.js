// Devices Usage Maps — links into Home Assistant.
// A target is a string "<kind>:<id>" stored in data-nav attributes.

export function navigate(path) {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}

export function openMoreInfo(node, entityId) {
  node.dispatchEvent(new CustomEvent("hass-more-info", {
    detail: { entityId }, bubbles: true, composed: true,
  }));
}

/**
 * Resolve a nav target to an action.
 * @param {string} target e.g. "device:abc", "entity:light.x", "run:automation.y"
 * @param {object} model collected model (for automation config ids)
 */
export function resolve(target, model) {
  const i = target.indexOf(":");
  const kind = target.slice(0, i);
  const id = target.slice(i + 1);
  switch (kind) {
    case "device":
      return id.startsWith("virtual:")
        ? { path: `/config/integrations/integration/${encodeURIComponent(id.slice(8))}` }
        : { path: `/config/devices/device/${encodeURIComponent(id)}` };
    case "entity":
      return { moreInfo: id };
    case "integration":
      return { path: `/config/integrations/integration/${encodeURIComponent(id)}` };
    case "area":
      return { path: `/config/areas/area/${encodeURIComponent(id)}` };
    case "view": {
      const [board, ...rest] = id.split("/");
      return { path: `/${board}/${rest.join("/")}` };
    }
    case "energy":
      return { path: "/energy" };
    case "run": {
      const r = model?.runnables?.[id];
      const dom = id.split(".")[0];
      if (dom === "automation") {
        return r?.configId ? { path: `/config/automation/edit/${encodeURIComponent(r.configId)}` } : { moreInfo: id };
      }
      if (dom === "script") return { path: `/config/script/edit/${encodeURIComponent(r?.objectId || id.split(".")[1])}` };
      if (dom === "scene") {
        return r?.configId ? { path: `/config/scene/edit/${encodeURIComponent(r.configId)}` } : { moreInfo: id };
      }
      return { moreInfo: id };
    }
    default:
      return null;
  }
}

export function follow(node, target, model) {
  const action = resolve(target, model);
  if (!action) return;
  if (action.moreInfo) openMoreInfo(node, action.moreInfo);
  else if (action.path) navigate(action.path);
}
