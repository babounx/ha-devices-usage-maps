// Devices Usage Maps — broken references.
// Finds entities, devices, areas, floors, labels and actions (services) that an
// automation, script, scene or dashboard refers to but that no longer exist.

const ENTITY_ID = /^([a-z_][a-z0-9_]*)\.([a-z0-9_]+)$/;
const REGISTRY_ID = /^[0-9a-f]{32}$/;
const IN_TEMPLATE = /(?:states|is_state|state_attr|is_state_attr|has_value|expand|area_name|device_id)\(\s*['"]([a-z_][a-z0-9_]*\.[a-z0-9_]+)['"]|\bstates\.([a-z_][a-z0-9_]*)\.([a-z0-9_]+)\b/g;

// Keys whose value is an entity reference (string, list of strings, or list of {entity}).
const ENTITY_KEYS = new Set(["entity_id", "entity", "entities", "scene", "camera_image", "camera"]);
// Keys whose value is an action ("domain.service").
const ACTION_KEYS = new Set(["action", "service", "perform_action"]);
// Keys whose string values are never entity ids.
const SKIP_KEYS = new Set([
  "platform", "trigger", "condition", "domain", "type", "event_type", "event", "icon", "url",
  "url_path", "navigation_path", "path", "media_content_id", "media_content_type", "file", "filename",
  "image", "unit_of_measurement", "attribute", "mode", "id", "alias", "description", "name", "title",
  "message", "subtype", "discovery_id", "config_entry_id", "language", "option", "state",
]);
// Domains that hold actions, not entities: a "script.x" or "scene.x" value can be both.
const NON_ENTITY_DOMAINS = new Set(["homeassistant", "persistent_notification", "system_log", "logger", "recorder", "frontend", "hassio"]);
const SPECIAL = new Set(["all", "none"]);

const isTemplate = (s) => typeof s === "string" && (s.includes("{{") || s.includes("{%"));

/** Light similarity used to suggest what a missing entity was probably renamed to. */
function suggest(missing, candidatesByDomain) {
  const [dom, obj] = missing.split(".");
  const cands = candidatesByDomain.get(dom);
  if (!cands) return null;
  const base = obj.replace(/_\d+$/, "");
  const tokens = new Set(base.split("_").filter((x) => x.length > 1));
  let best = null, bestScore = 0;
  for (const c of cands) {
    const cobj = c.split(".")[1];
    const cbase = cobj.replace(/_\d+$/, "");
    let score = 0;
    if (cbase === base) score = 1;
    else {
      const ct = new Set(cbase.split("_").filter((x) => x.length > 1));
      const inter = [...tokens].filter((x) => ct.has(x)).length;
      const union = new Set([...tokens, ...ct]).size || 1;
      score = inter / union;
      if (cbase.startsWith(base) || base.startsWith(cbase)) score = Math.max(score, 0.6);
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 0.5 ? best : null;
}

/**
 * @param {object} ctx { states, services, entityReg, devices, areas, floors, labels }
 * @param {Array<{source, config}>} items source = {kind:'automation'|'script'|'scene'|'dashboard', id, name, on, nav}
 * @returns {Array} broken references
 */
export function findBroken(ctx, items) {
  const { states, services } = ctx;
  const regByEntity = new Map(ctx.entityReg.map((e) => [e.entity_id, e]));
  const regIds = new Set(ctx.entityReg.map((e) => e.id).filter(Boolean));
  const deviceIds = new Set(ctx.devices.map((d) => d.id));
  const areaIds = new Set(ctx.areas.map((a) => a.area_id));
  const floorIds = new Set((ctx.floors || []).map((f) => f.floor_id));
  const labelIds = new Set((ctx.labels || []).map((l) => l.label_id));
  const allIds = new Set([...Object.keys(states), ...regByEntity.keys()]);
  const entityDomains = new Set([...allIds].map((e) => e.split(".")[0]));
  [
    "light", "switch", "sensor", "binary_sensor", "climate", "cover", "fan", "media_player", "person",
    "device_tracker", "input_boolean", "input_number", "input_select", "input_text", "input_datetime",
    "input_button", "timer", "counter", "group", "zone", "sun", "weather", "camera", "lock", "alarm_control_panel",
    "vacuum", "remote", "notify", "calendar", "todo", "number", "select", "button", "scene", "script", "automation",
  ].forEach((d) => entityDomains.add(d));
  NON_ENTITY_DOMAINS.forEach((d) => entityDomains.delete(d));

  const byDomain = new Map();
  for (const e of allIds) {
    const d = e.split(".")[0];
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(e);
  }

  const out = [];
  const seen = new Set();

  for (const { source, config } of items) {
    const add = (kind, ref, where, extra = {}) => {
      const key = `${source.kind}|${source.id}|${kind}|${ref}`;
      if (seen.has(key)) {
        // Keep the reference active if any occurrence is active.
        if (!where.disabled) {
          const prev = out.find((b) => b.key === key);
          if (prev && prev.disabled) { prev.disabled = false; prev.step = where.step; prev.section = where.section; }
        }
        return;
      }
      seen.add(key);
      out.push({ key, source, kind, ref, section: where.section, step: where.step, disabled: where.disabled, ...extra });
    };

    const checkEntity = (value, where, inTemplate = false) => {
      if (typeof value !== "string" || isTemplate(value) || SPECIAL.has(value)) return;
      const v = value.trim();
      if (REGISTRY_ID.test(v)) {
        if (!regIds.has(v)) add("registry_entity", v, where);
        return;
      }
      const m = ENTITY_ID.exec(v);
      if (!m || !entityDomains.has(m[1])) return;
      if (!allIds.has(v)) {
        add("entity", v, where, { inTemplate, suggestion: suggest(v, byDomain) });
        return;
      }
      const st = states[v];
      const reg = regByEntity.get(v);
      if (st?.attributes?.restored && st.state === "unavailable") add("orphan_entity", v, where, { platform: reg?.platform || null });
    };
    const checkIds = (value, set, kind, where) => {
      for (const v of [].concat(value)) {
        if (typeof v !== "string" || isTemplate(v) || !v) continue;
        if (!set.has(v)) add(kind, v, where);
      }
    };
    const checkAction = (value, where) => {
      if (typeof value !== "string" || isTemplate(value)) return;
      const m = ENTITY_ID.exec(value);
      if (!m) return;
      const [dom, svc] = [m[1], m[2]];
      if (!services || !Object.keys(services).length) return;
      if (!services[dom] || !services[dom][svc]) add("action", value, where);
    };
    const scanTemplate = (text, where) => {
      for (const m of text.matchAll(IN_TEMPLATE)) {
        const id = m[1] || `${m[2]}.${m[3]}`;
        if (!entityDomains.has(id.split(".")[0])) continue;
        if (!allIds.has(id)) add("entity", id, where, { inTemplate: true, suggestion: suggest(id, byDomain) });
      }
    };

    const walk = (node, where, key) => {
      if (node == null) return;
      if (Array.isArray(node)) { node.forEach((n) => walk(n, where, key)); return; }
      if (typeof node === "string") {
        if (isTemplate(node)) { scanTemplate(node, where); return; }
        if (key && (SKIP_KEYS.has(key) || ACTION_KEYS.has(key))) return;
        checkEntity(node, where);
        return;
      }
      if (typeof node !== "object") return;
      const here = {
        section: where.section,
        step: where.root ? null : (node.alias || where.step),
        disabled: where.disabled || node.enabled === false,
      };
      for (const [k, v] of Object.entries(node)) {
        const w = where.root ? { ...here, section: k, root: false } : here;
        if (ENTITY_KEYS.has(k)) {
          for (const x of [].concat(v)) {
            if (x && typeof x === "object") walk(x, w, k);
            else checkEntity(x, w);
          }
        } else if (k === "device_id") checkIds(v, deviceIds, "device", w);
        else if (k === "area_id") checkIds(v, areaIds, "area", w);
        else if (k === "floor_id") checkIds(v, floorIds, "floor", w);
        else if (k === "label_id") checkIds(v, labelIds, "label", w);
        else if (ACTION_KEYS.has(k) && typeof v === "string") checkAction(v, w);
        else walk(v, w, k);
      }
    };

    walk(config, { section: null, step: null, disabled: false, root: true }, null);
  }
  return out;
}
