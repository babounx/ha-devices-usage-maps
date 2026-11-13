// Devices Usage Maps — device health.
// Ranks devices by what is wrong with them: offline, partly offline, unstable
// (drops out often), dead Z-Wave node, low battery, entities no longer provided.

const BAD = new Set(["unavailable"]);
export const BATTERY_LOW = 20;
export const BATTERY_CRITICAL = 10;
export const UNSTABLE_DROPS = 3;
const HISTORY_HOURS = 24;

/** Pick the entity used to follow a device's availability over time. */
const STATELESS = new Set(["notify", "button", "input_button", "event", "scene", "update", "image", "tts", "stt", "conversation"]);
function probeEntity(device) {
  const ents = device.entities.filter((e) => e.state !== "—");
  const good = ents.filter((e) => !STATELESS.has(e.id.split(".")[0]) && e.state !== "unknown");
  return (good.find((e) => !e.tech) || good[0] || ents.find((e) => !e.tech) || ents[0])?.id || null;
}

/**
 * Read the last 24 h of history for one probe entity per device and count how
 * many times each one became unavailable.
 * @returns {Map<string, number>} entity_id -> number of drops
 */
export async function fetchDrops(hass, devices) {
  const probes = new Map();
  for (const d of devices) {
    if (d.virtual || d.service) continue;
    const p = probeEntity(d);
    if (p) probes.set(p, d.id);
  }
  const ids = [...probes.keys()];
  const drops = new Map();
  const start = new Date(Date.now() - HISTORY_HOURS * 3600 * 1000).toISOString();
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    let res;
    try {
      res = await hass.callWS({
        type: "history/history_during_period",
        start_time: start,
        entity_ids: chunk,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
    } catch (e) {
      return null; // history unavailable (recorder off, non-admin…): skip instability
    }
    for (const [eid, rows] of Object.entries(res || {})) {
      let n = 0, prev = null;
      for (const r of rows) {
        const s = r.s ?? r.state;
        if (BAD.has(s) && prev !== null && !BAD.has(prev)) n++;
        prev = s;
      }
      drops.set(eid, n);
    }
  }
  const byDevice = new Map();
  for (const [eid, devId] of probes) byDevice.set(devId, drops.get(eid) ?? 0);
  return byDevice;
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * @param {Array} devices model devices (with entity records)
 * @param {Map|null} drops device id -> drops in the last 24 h
 * @returns {Array<{device, problems:Array<{kind, level, ...}>, score}>}
 */
export function computeHealth(devices, drops) {
  const out = [];
  const now = Date.now();
  for (const d of devices) {
    if (d.virtual) continue;
    const ents = d.entities.filter((e) => e.state !== "—");
    if (!ents.length) continue;
    const problems = [];
    const used = d.usedBy.length > 0 || d.inViews.length > 0;

    const main = ents.filter((e) => !e.tech);
    const pool = main.length ? main : ents;
    const down = pool.filter((e) => BAD.has(e.state));
    const since = (list) => {
      const ts = list.map((e) => Date.parse(e.lastChanged)).filter(Number.isFinite);
      return ts.length ? Math.max(...ts) : null;
    };
    if (down.length && down.length === pool.length) {
      const s = since(down);
      problems.push({ kind: "offline", level: used ? 3 : 2, since: s, hours: s ? (now - s) / 3600000 : null });
    } else if (down.length) {
      problems.push({ kind: "partial", level: used ? 2 : 1, count: down.length, total: pool.length, entities: down.map((e) => e.id), since: since(down) });
    }

    const nodeStatus = ents.find((e) => /_node_status$/.test(e.id));
    if (nodeStatus && nodeStatus.state === "dead") problems.push({ kind: "dead", level: 3, entity: nodeStatus.id });

    const n = drops?.get(d.id) ?? 0;
    if (n >= UNSTABLE_DROPS) problems.push({ kind: "unstable", level: n >= 10 ? 2 : 1, drops: n });

    for (const e of ents) {
      if (e.deviceClass !== "battery") continue;
      if (e.id.startsWith("binary_sensor.")) {
        if (e.state === "on") problems.push({ kind: "battery", level: 2, low: true, entity: e.id });
        continue;
      }
      const v = num(e.state);
      if (v !== null && e.unit === "%" && v < BATTERY_LOW) {
        problems.push({ kind: "battery", level: v < BATTERY_CRITICAL ? 2 : 1, value: v, entity: e.id });
      }
    }

    const orphans = ents.filter((e) => e.restored && BAD.has(e.state));
    if (orphans.length && !(down.length === pool.length)) problems.push({ kind: "orphan", level: 1, count: orphans.length, entities: orphans.map((e) => e.id) });

    if (!problems.length) continue;
    const score = Math.max(...problems.map((p) => p.level)) * 10 + problems.length + (used ? 5 : 0);
    out.push({ device: d, problems, used, score });
  }
  out.sort((a, b) => b.score - a.score || a.device.name.localeCompare(b.device.name));
  return out;
}
