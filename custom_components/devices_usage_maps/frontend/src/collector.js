// Devices Usage Maps — live data collection.
// Everything comes from Home Assistant's WebSocket API; nothing is stored.
import { findBroken } from "./broken.js?v=1.2.0";
import { fetchDrops, computeHealth } from "./health.js?v=1.2.0";

const ENTITY_ID_RE = /\b([a-z_][a-z0-9_]*)\.([a-z0-9_]+)\b/g;
const RUNNABLE_DOMAINS = ["automation", "script", "scene"];
const PROTOCOL_DOMAINS = new Set([
  "zwave_js", "zwave_me", "zha", "mqtt", "matter", "thread", "bluetooth", "deconz",
  "knx", "insteon", "rfxtrx", "modbus", "enocean", "homekit_controller", "esphome_bt",
]);
// Entity domains that never represent "a device being used" on their own.
const TECH_DOMAINS = new Set(["button", "update", "event", "image", "conversation", "tts", "stt", "wake_word"]);

/** Run async tasks with a concurrency limit. */
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await worker(items[idx], idx); } catch (e) { out[idx] = undefined; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

function findIds(value, known) {
  const found = new Set();
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  for (const m of text.matchAll(ENTITY_ID_RE)) {
    const id = `${m[1]}.${m[2]}`;
    if (known.has(id)) found.add(id);
  }
  return found;
}

/**
 * Collect everything needed to draw the maps.
 * @param {object} hass Home Assistant object given to cards/panels
 * @param {(step:string, done:number, total:number)=>void} [onProgress]
 */
export async function collect(hass, onProgress = () => {}) {
  const ws = (type, extra = {}) => hass.callWS({ type, ...extra });
  const safe = (p, fallback) => p.catch(() => fallback);

  onProgress("registries", 0, 1);
  const [devices, entityReg, areas, entries, manifests, dashboards, energy, floors, labels] = await Promise.all([
    ws("config/device_registry/list"),
    ws("config/entity_registry/list"),
    safe(ws("config/area_registry/list"), []),
    safe(ws("config_entries/get"), []),
    safe(ws("manifest/list"), []),
    safe(ws("lovelace/dashboards/list"), []),
    safe(ws("energy/get_prefs"), null),
    safe(ws("config/floor_registry/list"), []),
    safe(ws("config/label_registry/list"), []),
  ]);

  const states = hass.states;
  const known = new Set([...Object.keys(states), ...entityReg.map((e) => e.entity_id)]);
  const entryById = new Map(entries.map((e) => [e.entry_id, e]));
  const manifestByDomain = new Map(manifests.map((m) => [m.domain, m]));
  const areaById = new Map(areas.map((a) => [a.area_id, a]));
  const regByEntity = new Map(entityReg.map((e) => [e.entity_id, e]));

  // ---------- groups (any entity exposing an entity_id list) ----------
  const groups = new Map();
  for (const [eid, st] of Object.entries(states)) {
    const dom = eid.split(".")[0];
    const members = st.attributes?.entity_id;
    if (Array.isArray(members) && !["person", "zone", "scene"].includes(dom)) groups.set(eid, members);
  }
  const expand = (eid, seen = new Set()) => {
    const out = [];
    for (const m of groups.get(eid) || []) {
      if (seen.has(m)) continue;
      seen.add(m);
      out.push(m, ...expand(m, seen));
    }
    return out;
  };

  // ---------- automations / scripts / scenes ----------
  const runnableIds = Object.keys(states).filter((e) => RUNNABLE_DOMAINS.includes(e.split(".")[0]));
  const runnables = {};
  const configs = new Map(); // runnable id -> stored configuration
  let done = 0;
  await pool(runnableIds, 6, async (eid) => {
    const dom = eid.split(".")[0];
    const [related, cfg] = await Promise.all([
      safe(ws("search/related", { item_type: dom, item_id: eid }), {}),
      dom === "automation" ? safe(ws("automation/config", { entity_id: eid }), null)
        : dom === "script" ? safe(ws("script/config", { entity_id: eid }), null) : Promise.resolve(null),
    ]);
    const st = states[eid];
    const reg = regByEntity.get(eid);
    if (cfg) configs.set(eid, cfg.config ?? cfg);
    else if (dom === "scene" && Array.isArray(st?.attributes?.entity_id)) configs.set(eid, { entity_id: st.attributes.entity_id });
    const direct = new Set((related.entity || []).filter((e) => e !== eid));
    const fromTemplates = cfg ? [...findIds(cfg.config ?? cfg, known)].filter((e) => e !== eid && !direct.has(e)) : [];
    runnables[eid] = {
      id: eid,
      domain: dom,
      name: st?.attributes?.friendly_name || eid,
      on: dom !== "automation" || st?.state === "on",
      configId: st?.attributes?.id ?? reg?.unique_id ?? null,
      objectId: eid.split(".")[1],
      entities: [...direct],
      templateEntities: fromTemplates,
      devices: related.device || [],
      scripts: (related.script || []).filter((s) => s !== eid),
    };
    onProgress("automations", ++done, runnableIds.length);
  });

  // entity -> usages
  const use = new Map();
  const addUse = (e, u) => { if (!use.has(e)) use.set(e, []); use.get(e).push(u); };
  for (const r of Object.values(runnables)) {
    for (const e of r.entities) {
      addUse(e, { by: r.id, via: null });
      for (const m of expand(e)) addUse(m, { by: r.id, via: e });
    }
    for (const e of r.templateEntities) addUse(e, { by: r.id, via: "template" });
    // automation -> script calls also count as "used"
    for (const s of r.scripts) addUse(s, { by: r.id, via: null });
  }
  const deviceUse = new Map();
  for (const r of Object.values(runnables)) for (const d of r.devices) {
    if (!deviceUse.has(d)) deviceUse.set(d, new Set());
    deviceUse.get(d).add(r.id);
  }

  // ---------- dashboards ----------
  onProgress("dashboards", 0, 1);
  const boards = [{ url_path: null, title: null }, ...dashboards];
  const boardCfgs = await pool(boards, 4, (b) => safe(ws("lovelace/config", b.url_path ? { url_path: b.url_path } : {}), null));
  const views = []; // {key, board, boardTitle, title, path, index}
  const dash = new Map(); // entity -> Set(viewKey)
  boards.forEach((b, bi) => {
    const cfg = boardCfgs[bi];
    if (!cfg || !Array.isArray(cfg.views)) return;
    cfg.views.forEach((v, vi) => {
      const key = `${b.url_path || "lovelace"}/${v.path || vi}`;
      views.push({
        key, board: b.url_path || "lovelace", boardTitle: b.title || null,
        title: v.title || v.path || null, icon: v.icon || null, path: v.path ?? String(vi), index: vi,
      });
      for (const e of findIds(v, known)) {
        if (!dash.has(e)) dash.set(e, new Set());
        dash.get(e).add(key);
      }
    });
  });
  const dashVia = new Map();
  for (const [e, vs] of dash) for (const m of expand(e)) {
    if (!dashVia.has(m)) dashVia.set(m, new Set());
    vs.forEach((v) => dashVia.get(m).add(v));
  }

  // ---------- broken references ----------
  const brokenItems = [];
  for (const [eid, config] of configs) {
    const r = runnables[eid];
    if (r) brokenItems.push({ source: { kind: r.domain, id: eid, name: r.name, on: r.on, nav: `run:${eid}` }, config });
  }
  boards.forEach((b, bi) => {
    const cfg = boardCfgs[bi];
    if (!cfg || !Array.isArray(cfg.views)) return;
    cfg.views.forEach((v, vi) => {
      const key = `${b.url_path || "lovelace"}/${v.path || vi}`;
      brokenItems.push({ source: { kind: "dashboard", id: key, name: key, on: true, nav: `view:${key}` }, config: { views: v } });
    });
  });
  const broken = findBroken({ states, services: hass.services, entityReg, devices, areas, floors, labels }, brokenItems);

  // ---------- energy ----------
  const energySet = energy ? findIds(energy, known) : new Set();

  // ---------- build devices ----------
  const inGroups = new Map();
  for (const g of groups.keys()) for (const m of expand(g)) {
    if (!inGroups.has(m)) inGroups.set(m, []);
    inGroups.get(m).push(g);
  }
  const entityRecord = (eid, reg) => {
    const st = states[eid];
    const dom = eid.split(".")[0];
    return {
      id: eid,
      name: st?.attributes?.friendly_name || reg?.name || reg?.original_name || eid,
      state: st?.state ?? "—",
      lastChanged: st?.last_changed || null,
      deviceClass: st?.attributes?.device_class || null,
      unit: st?.attributes?.unit_of_measurement || null,
      restored: !!st?.attributes?.restored,
      tech: !!reg?.entity_category || TECH_DOMAINS.has(dom),
      uses: use.get(eid) || [],
      views: [...(dash.get(eid) || [])],
      viewsVia: [...(dashVia.get(eid) || [])].filter((v) => !(dash.get(eid) || new Set()).has(v)),
      energy: energySet.has(eid),
      groups: inGroups.get(eid) || [],
    };
  };

  const integrationName = (domain) => manifestByDomain.get(domain)?.name || domain || "—";
  const outDevices = [];
  const entitiesByDevice = new Map();
  for (const e of entityReg) {
    if (e.disabled_by || !e.device_id) continue;
    if (!entitiesByDevice.has(e.device_id)) entitiesByDevice.set(e.device_id, []);
    entitiesByDevice.get(e.device_id).push(e);
  }
  for (const d of devices) {
    if (d.disabled_by) continue;
    const entry = entryById.get(d.primary_config_entry || d.config_entries?.[0]);
    const domain = entry?.domain || "";
    const ents = (entitiesByDevice.get(d.id) || []).map((r) => entityRecord(r.entity_id, r));
    outDevices.push({
      id: d.id,
      name: d.name_by_user || d.name || d.id,
      model: d.model || "",
      manufacturer: d.manufacturer || "",
      areaId: d.area_id || null,
      area: areaById.get(d.area_id)?.name || null,
      domain,
      integration: integrationName(domain),
      service: d.entry_type === "service",
      virtual: false,
      directUses: [...(deviceUse.get(d.id) || [])],
      entities: ents,
    });
  }
  // entities without device, grouped by integration
  const noDev = new Map();
  for (const eid of Object.keys(states)) {
    const reg = regByEntity.get(eid);
    if (reg?.device_id) continue;
    if (RUNNABLE_DOMAINS.includes(eid.split(".")[0])) continue;
    const platform = reg?.platform || eid.split(".")[0];
    if (!noDev.has(platform)) noDev.set(platform, []);
    noDev.get(platform).push(entityRecord(eid, reg));
  }
  for (const [platform, ents] of noDev) {
    outDevices.push({
      id: `virtual:${platform}`, name: integrationName(platform), model: "", manufacturer: "",
      areaId: null, area: null, domain: platform, integration: integrationName(platform),
      service: false, virtual: true, directUses: [], entities: ents,
    });
  }

  // usage summary per device
  for (const d of outDevices) {
    const autos = new Set(d.directUses);
    const vs = new Set();
    let en = false;
    for (const e of d.entities) {
      e.uses.forEach((u) => autos.add(u.by));
      e.views.forEach((v) => vs.add(v));
      e.viewsVia.forEach((v) => vs.add(v));
      if (e.energy) en = true;
    }
    d.usedBy = [...autos];
    d.inViews = [...vs];
    d.inEnergy = en;
    d.unused = !autos.size && !vs.size && !en;
  }

  // ---------- integrations ----------
  const integrations = new Map();
  for (const d of outDevices) {
    const m = manifestByDomain.get(d.domain);
    if (!integrations.has(d.domain)) {
      integrations.set(d.domain, {
        domain: d.domain, name: d.integration, devices: 0, used: 0, unused: 0,
        category: d.virtual ? "helper" : categorize(d.domain, m),
        iotClass: m?.iot_class || null,
        hasCamera: false,
      });
    }
    const it = integrations.get(d.domain);
    it.devices++;
    if (d.unused) it.unused++; else it.used++;
    if (d.entities.some((e) => e.id.startsWith("camera."))) it.hasCamera = true;
  }
  for (const it of integrations.values()) if (it.category !== "protocol" && it.category !== "helper" && it.hasCamera) it.category = "camera";

  // ---------- health ----------
  onProgress("health", 0, 1);
  const drops = await fetchDrops(hass, outDevices).catch(() => null);
  const health = computeHealth(outDevices, drops);

  return {
    generatedAt: new Date(),
    health,
    historyOk: drops !== null,
    version: hass.config?.version || "",
    devices: outDevices,
    runnables,
    views,
    broken,
    integrations: [...integrations.values()],
    areas: areas.map((a) => ({ id: a.area_id, name: a.name })),
    entityCount: known.size,
  };
}

function categorize(domain, manifest) {
  if (PROTOCOL_DOMAINS.has(domain)) return "protocol";
  if (manifest?.integration_type === "helper") return "helper";
  const iot = manifest?.iot_class || "";
  if (iot.startsWith("cloud")) return "cloud";
  if (iot.startsWith("local")) return "local";
  return "system";
}

/** Registry/config events after which the maps should be rebuilt. */
export const REFRESH_EVENTS = [
  "device_registry_updated",
  "entity_registry_updated",
  "area_registry_updated",
  "automation_reloaded",
  "script_reloaded",
  "scene_reloaded",
  "lovelace_updated",
  "component_loaded",
];
