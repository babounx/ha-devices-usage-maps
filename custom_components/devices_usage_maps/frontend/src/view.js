// Devices Usage Maps — core view shared by the card and the sidebar panel.
import { collect, REFRESH_EVENTS } from "./collector.js?v=1.3.0";
import { flowDiagram, esc } from "./diagram.js?v=1.3.0";
import { translator } from "./i18n.js?v=1.3.0";
import { follow } from "./navigation.js?v=1.3.0";
import { styles } from "./styles.js?v=1.3.0";

const CAT_ORDER = ["protocol", "camera", "local", "cloud", "system", "helper"];
const RUN_KIND = { automation: "automation", script: "script", scene: "scene" };

export class DevicesUsageMapsView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { view: "overview", show_services: false };
    this._state = {
      tab: null, selected: null,
      q: "", area: "", integ: "", usage: "all", services: false, autoFilter: "all", gq: "",
    };
    this._yaml = null;
    this._yamlTimer = null;
    this._model = null;
    this._loading = false;
    this._progress = null;
    this._error = null;
    this._unsubs = [];
    this._onClick = this._onClick.bind(this);
    this._onInput = this._onInput.bind(this);
    this._onKey = this._onKey.bind(this);
  }

  // ---------- lifecycle ----------
  setConfig(config) {
    this._config = { view: "overview", show_services: false, ...config };
    this._state.services = !!this._config.show_services;
    if (!this._state.tab) this._state.tab = this._config.view || "overview";
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    this.t = translator(hass);
    if (first) {
      if (!this._state.tab) this._state.tab = this._config.view || "overview";
      this._load();
      this._subscribe();
    }
  }

  get hass() { return this._hass; }

  connectedCallback() {
    this.shadowRoot.addEventListener("click", this._onClick);
    this.shadowRoot.addEventListener("input", this._onInput);
    this.shadowRoot.addEventListener("change", this._onInput);
    this.shadowRoot.addEventListener("keydown", this._onKey);
    this._ro = new ResizeObserver(() => this._applyWidth());
    this._ro.observe(this);
    if (this._hass && !this._unsubs.length) this._subscribe();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._onClick);
    this.shadowRoot.removeEventListener("input", this._onInput);
    this.shadowRoot.removeEventListener("change", this._onInput);
    this.shadowRoot.removeEventListener("keydown", this._onKey);
    this._ro?.disconnect();
    this._unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } });
    this._unsubs = [];
    clearTimeout(this._refreshTimer);
  }

  async _subscribe() {
    const conn = this._hass?.connection;
    if (!conn || !this.isConnected) return;
    for (const type of REFRESH_EVENTS) {
      try {
        const unsub = await conn.subscribeEvents(() => this._scheduleRefresh(), type);
        this._unsubs.push(unsub);
      } catch (e) { /* non-admin users cannot subscribe to some events */ }
    }
  }

  _scheduleRefresh() {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this._load(true), 2500);
  }

  async _load(silent = false) {
    if (this._loading || !this._hass) return;
    this._loading = true;
    this._error = null;
    if (!silent) { this._progress = { step: "registries" }; this._render(); }
    try {
      this._model = await collect(this._hass, (step, done, total) => {
        if (silent) return;
        this._progress = { step, done, total };
        this._renderProgress();
      });
    } catch (e) {
      this._error = e?.code === "unauthorized" ? this.t("admin_required") : this.t("error", { msg: e?.message || e?.code || String(e) });
    }
    this._loading = false;
    this._progress = null;
    this._render();
  }

  _applyWidth() {
    const narrow = this.clientWidth < 760;
    if (narrow !== this._narrow) {
      this._narrow = narrow;
      this.shadowRoot.querySelector(".main")?.classList.toggle("narrow", narrow);
    }
  }

  // ---------- events ----------
  _onKey(ev) {
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches?.("[data-nav][tabindex], [data-integ][tabindex]")) {
      ev.preventDefault();
      ev.target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    }
  }

  _onInput(ev) {
    const el = ev.target;
    if (el.hasAttribute?.("data-gsearch")) { if (ev.type === "input") this._onSearch(el.value); return; }
    const key = el.dataset?.filter;
    if (!key) return;
    this._state[key] = el.type === "checkbox" ? el.checked : el.value;
    if (key === "q" && ev.type === "change") return;
    if (this._state.tab === "health") { if (ev.type === "change") this._render(); return; }
    this._renderExplorer();
  }

  _onClick(ev) {
    const path = ev.composedPath();
    const find = (attr) => path.find((n) => n instanceof Element && n.hasAttribute?.(attr));
    let el;
    if ((el = find("data-nav"))) { ev.stopPropagation(); follow(this, el.getAttribute("data-nav"), this._model); return; }
    if ((el = find("data-refresh"))) { this._load(); return; }
    if ((el = find("data-tab"))) { this._state.tab = el.getAttribute("data-tab"); this._state.selected = null; this._state.gq = ""; this._render(); return; }
    if ((el = find("data-gclear"))) { this._state.gq = ""; this._render(); return; }
    if ((el = find("data-brokenfilter"))) { this._state.brokenAll = !this._state.brokenAll; this._render(); return; }
    if ((el = find("data-stat"))) { this._applyStat(el.getAttribute("data-stat")); return; }
    if ((el = find("data-integ"))) {
      Object.assign(this._state, { tab: "devices", integ: el.getAttribute("data-integ"), area: "", q: "", usage: "all", services: true, selected: null });
      this._render();
      return;
    }
    if ((el = find("data-consumer"))) {
      const k = el.getAttribute("data-consumer");
      if (k === "energy") { follow(this, "energy:", this._model); return; }
      if (k === "dashboard") { Object.assign(this._state, { tab: "devices", usage: "dash", q: "", area: "", integ: "", services: false, selected: null }); }
      else { Object.assign(this._state, { tab: "automations", q: "", autoFilter: "all", kindFilter: k, selected: null }); }
      this._render();
      return;
    }
    if ((el = find("data-select"))) { this._state.selected = el.getAttribute("data-select"); this._renderExplorer(); }
  }

  _applyStat(k) {
    this._state.gq = "";
    if (k === "broken" || k === "health") { Object.assign(this._state, { tab: k, selected: null }); this._render(); return; }
    if (k === "on") Object.assign(this._state, { tab: "automations", autoFilter: "on", kindFilter: "automation", q: "", selected: null });
    else Object.assign(this._state, { tab: "devices", usage: k, q: "", area: "", integ: "", services: false, selected: null });
    this._render();
  }

  // ---------- helpers ----------
  _runName(id) { return this._model?.runnables[id]?.name || id; }

  _viewLabel(key) {
    const v = this._model.views.find((x) => x.key === key);
    if (!v) return key;
    const board = v.boardTitle ? `${v.boardTitle} › ` : "";
    return `${board}${v.title || `#${v.index + 1}`}`;
  }

  _stats() {
    const m = this._model;
    const phys = m.devices.filter((d) => !d.virtual && !d.service);
    const autos = Object.values(m.runnables).filter((r) => r.domain === "automation");
    return {
      phys: phys.length,
      auto: phys.filter((d) => d.usedBy.length).length,
      dash: phys.filter((d) => d.inViews.length).length,
      none: phys.filter((d) => d.unused).length,
      autosOn: autos.filter((r) => r.on).length,
      autos: autos.length,
      broken: (m.broken || []).filter((b) => !b.disabled && b.source.on).length,
      sick: (m.health || []).filter((h) => !h.device.service).length,
    };
  }

  _filteredDevices() {
    const s = this._state;
    const q = s.q.trim().toLowerCase();
    return this._model.devices.filter((d) => {
      if (!s.services && d.service && !s.integ) return false;
      if (s.usage !== "all" && d.virtual) return false;
      if (s.usage !== "all" && s.usage !== "phys" && d.service && !s.services) return false;
      if (s.area && (d.area || "") !== (s.area === "__none" ? "" : s.area)) return false;
      if (s.integ && d.domain !== s.integ) return false;
      if (s.usage === "auto" && !d.usedBy.length) return false;
      if (s.usage === "dash" && !d.inViews.length) return false;
      if (s.usage === "none" && !d.unused) return false;
      if (q && !`${d.name} ${d.model} ${d.manufacturer} ${d.entities.map((e) => `${e.id} ${e.name}`).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  _filteredRunnables() {
    const s = this._state;
    const q = s.q.trim().toLowerCase();
    return Object.values(this._model.runnables).filter((r) => {
      if (s.kindFilter && s.kindFilter !== "all" && r.domain !== s.kindFilter) return false;
      if (s.autoFilter === "on" && !r.on) return false;
      if (s.autoFilter === "off" && r.on) return false;
      if (q && !`${r.id} ${r.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // ---------- render ----------
  _render() {
    const t = this.t || ((k) => k);
    const root = this.shadowRoot;
    const h = this._config.height ? `--dum-list-h:${Number(this._config.height) - 220}px;` : "";
    let body;
    if (this._error) body = `<div class="box center error">${esc(this._error)}</div>`;
    else if (!this._model) body = `<div class="box center" id="progress">${esc(this._progressText())}</div>`;
    else if (this._searching()) body = `<div class="box detail" id="sres">${this._searchHtml()}</div>`;
    else if (this._state.tab === "overview") body = this._overviewHtml();
    else if (this._state.tab === "broken") body = this._brokenHtml();
    else if (this._state.tab === "health") body = this._healthHtml();
    else body = `<div class="main${this._narrow ? " narrow" : ""}"><aside class="side"><div class="filters" id="filters"></div><div class="list" id="list"></div></aside><section class="box detail" id="detail"></section></div>`;

    const tab = (k) => `<button class="tab" data-tab="${k}" aria-pressed="${!this._searching() && this._state.tab === k}">${esc(t(`tabs.${k}`))}</button>`;
    const time = this._model ? this._model.generatedAt.toLocaleTimeString(this._hass?.locale?.language || undefined, { hour: "2-digit", minute: "2-digit" }) : "";
    root.innerHTML = `<style>${styles}</style>
      <div class="wrap" style="${h}">
        <div class="top">
          ${this._config.mode === "panel" ? "" : `<h1>${esc(this._config.title || t("title"))}</h1>`}
          ${time ? `<span class="updated">${esc(t("updated", { time }))}</span>` : ""}
          <button class="iconbtn" data-refresh title="${esc(t("refresh"))}" aria-label="${esc(t("refresh"))}">⟳</button>
          ${this._model ? `<div class="gsearch"><input type="search" id="dum-gq" data-gsearch autocomplete="off" spellcheck="false" placeholder="${esc(t("search.placeholder"))}" value="${esc(this._state.gq)}" aria-label="${esc(t("search.placeholder"))}"></div>` : ""}
          <div class="tabs" role="group">${tab("overview")}${tab("devices")}${tab("automations")}${tab("health")}${tab("broken")}</div>
        </div>
        ${this._model ? this._statsHtml() : ""}
        ${body}
      </div>`;
    if (this._model && !this._searching() && (this._state.tab === "devices" || this._state.tab === "automations")) this._renderExplorer(true);
  }

  _progressText() {
    const p = this._progress;
    if (!p) return this.t ? this.t("loading") : "…";
    return this.t(`loading_step.${p.step}`, { done: p.done ?? 0, total: p.total ?? "…" });
  }

  _renderProgress() {
    const el = this.shadowRoot.getElementById("progress");
    if (el) el.textContent = this._progressText();
  }

  _statsHtml() {
    const t = this.t, s = this._stats(), st = this._state;
    const clean = !st.q && !st.area && !st.integ && !st.services && st.tab === "devices";
    const b = (k, n, label, pressed) => `<button class="stat" data-stat="${k}" aria-pressed="${pressed}"><b>${n}</b>${esc(label)}</button>`;
    return `<div class="stats">
      ${b("phys", s.phys, t("stats.devices"), clean && st.usage === "phys")}
      ${b("auto", s.auto, t("stats.automated"), clean && st.usage === "auto")}
      ${b("dash", s.dash, t("stats.dashboard"), clean && st.usage === "dash")}
      ${b("none", s.none, t("stats.unused"), clean && st.usage === "none")}
      ${b("on", `${s.autosOn}/${s.autos}`, t("stats.automations"), st.tab === "automations" && st.autoFilter === "on")}
      <button class="stat${s.sick ? " bad" : " good"}" data-stat="health" aria-pressed="${st.tab === "health"}"><b>${s.sick}</b>${esc(t("stats.sick"))}</button>
      <button class="stat${s.broken ? " bad" : " good"}" data-stat="broken" aria-pressed="${st.tab === "broken"}"><b>${s.broken}</b>${esc(t("stats.broken"))}</button>
    </div>`;
  }

  _overviewHtml() {
    const t = this.t, m = this._model;
    const runs = Object.values(m.runnables);
    const autos = runs.filter((r) => r.domain === "automation");
    const energyN = new Set(m.devices.flatMap((d) => d.entities.filter((e) => e.energy).map((e) => e.id))).size;
    const consumers = [
      ["automation", "--dum-auto", t("consumers.automations"), t("consumers.n_enabled", { on: autos.filter((r) => r.on).length, n: autos.length })],
      ["script", "--dum-script", t("consumers.scripts"), String(runs.filter((r) => r.domain === "script").length)],
      ["scene", "--dum-scene", t("consumers.scenes"), String(runs.filter((r) => r.domain === "scene").length)],
      ["dashboard", "--dum-dash", t("consumers.dashboards"), t("consumers.n_views", { n: m.views.length })],
      ["energy", "--dum-energy", t("consumers.energy"), t("consumers.n_sensors", { n: energyN })],
    ];
    const devCount = m.devices.filter((d) => !d.virtual).length;
    const cats = CAT_ORDER.map((c) => {
      const items = m.integrations.filter((i) => i.category === c).sort((a, b) => b.devices - a.devices);
      if (!items.length) return "";
      const total = items.reduce((s, i) => s + i.devices, 0);
      const bubbles = items.map((i) => {
        const pct = i.devices ? Math.round((100 * i.used) / i.devices) : 0;
        const size = Math.round(Math.max(36, Math.min(64, 26 + Math.sqrt(i.devices) * 5)));
        const tip = `${i.name} — ${i.devices} · ${i.used} ✓ · ${i.unused} ✗`;
        return `<button class="bubble" data-integ="${esc(i.domain)}" title="${esc(tip)}">
          <span class="ring" style="--p:${pct};--s:${size}px"><i>${i.devices}</i></span>
          <small>${esc(i.name)}</small></button>`;
      }).join("");
      return `<section class="cat" style="--c:var(--dum-${c})"><h3>${esc(t(`categories.${c}`))}<span>${esc(t("overview.devices_n", { n: total }))}</span></h3><div class="bubbles">${bubbles}</div></section>`;
    }).join("");
    const rows = [...m.integrations].sort((a, b) => b.devices - a.devices).map((i) => {
      const devs = m.devices.filter((d) => d.domain === i.domain);
      return `<tr class="click" data-integ="${esc(i.domain)}" tabindex="0">
        <td><button class="lnk" data-nav="integration:${esc(i.domain)}" title="${esc(t("overview.open_integration"))}">${esc(i.name)}</button></td>
        <td>${i.devices}</td><td>${devs.filter((d) => d.usedBy.length).length}</td>
        <td>${devs.filter((d) => d.inViews.length).length}</td><td>${i.unused}</td></tr>`;
    }).join("");
    return `<div class="box" style="display:flex;flex-direction:column;gap:14px">
      <div><b>${esc(t("overview.heading"))}</b> <span class="muted">${esc(t("overview.hint"))}</span></div>
      <div class="hub">
        <div class="hubcircle"><b>Home Assistant</b><span>${esc(m.version)}</span><span>${esc(t("overview.devices_n", { n: devCount }))}</span><span>${m.entityCount} ${esc(t("overview.entities"))}</span></div>
        <div class="note">${esc(t("overview.consumers"))}</div>
        <div class="consumers">${consumers.map(([k, c, l, v]) => `<button class="consumer" data-consumer="${k}" style="--c:var(${c})"><b>${esc(l)}</b><span>${esc(v)}</span></button>`).join("")}</div>
      </div>
      <div class="note">${esc(t("overview.used_arc"))}</div>
      <div class="cats">${cats}</div>
      <div class="tbl"><table><thead><tr><th>${esc(t("overview.table_integration"))}</th><th>${esc(t("overview.table_devices"))}</th><th>${esc(t("overview.table_automated"))}</th><th>${esc(t("overview.table_dashboard"))}</th><th>${esc(t("overview.table_unused"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }

  _ago(ts) {
    const t = this.t;
    if (!ts) return "";
    const min = Math.max(0, (Date.now() - ts) / 60000);
    if (min < 90) return t("health.ago_min", { n: Math.round(min) });
    if (min < 48 * 60) return t("health.ago_h", { n: Math.round(min / 60) });
    return t("health.ago_d", { n: Math.round(min / 1440) });
  }

  _problemHtml(p) {
    const t = this.t;
    const lvl = p.level >= 3 ? "bad" : p.level === 2 ? "warn" : "";
    let txt, title = "";
    switch (p.kind) {
      case "offline": txt = p.since ? t("health.p.offline_since", { ago: this._ago(p.since) }) : t("health.p.offline"); break;
      case "partial": txt = t("health.p.partial", { n: p.count, total: p.total }); title = p.entities.join("\n"); break;
      case "dead": txt = t("health.p.dead"); title = p.entity; break;
      case "unstable": txt = t("health.p.unstable", { n: p.drops }); break;
      case "battery": txt = p.low ? t("health.p.battery_low") : t("health.p.battery", { v: Math.round(p.value) }); title = p.entity; break;
      case "orphan": txt = t("health.p.orphan", { n: p.count }); title = p.entities.join("\n"); break;
      default: txt = p.kind;
    }
    const nav = p.entity ? ` data-nav="entity:${esc(p.entity)}"` : "";
    return `<${nav ? "button" : "span"} class="pill ${lvl}"${nav}${title ? ` title="${esc(title)}"` : ""}>${esc(txt)}</${nav ? "button" : "span"}>`;
  }

  _healthHtml() {
    const t = this.t, m = this._model, st = this._state;
    const f = st.healthFilter || "all";
    const all = (m.health || []).filter((h) => st.services || !h.device.service);
    const list = all.filter((h) => {
      if (st.healthUsed && !h.used) return false;
      if (f === "all") return true;
      if (f === "offline") return h.problems.some((p) => p.kind === "offline" || p.kind === "dead");
      if (f === "partial") return h.problems.some((p) => p.kind === "partial" || p.kind === "orphan");
      return h.problems.some((p) => p.kind === f);
    });
    const count = (k) => all.filter((h) => h.problems.some((p) => (Array.isArray(k) ? k.includes(p.kind) : p.kind === k))).length;
    const opt = (v, l) => `<option value="${v}"${v === f ? " selected" : ""}>${esc(l)}</option>`;
    const head = `<div class="dh"><h2>${esc(t("health.heading"))}</h2></div>
      <div class="note">${esc(t("health.hint", { low: 20, drops: 3 }))}${m.historyOk ? "" : ` ${esc(t("health.no_history"))}`}</div>
      <div class="frow hfilters">
        <select data-filter="healthFilter">
          ${opt("all", t("health.f.all", { n: all.length }))}
          ${opt("offline", t("health.f.offline", { n: count(["offline", "dead"]) }))}
          ${opt("unstable", t("health.f.unstable", { n: count("unstable") }))}
          ${opt("partial", t("health.f.partial", { n: count(["partial", "orphan"]) }))}
          ${opt("battery", t("health.f.battery", { n: count("battery") }))}
        </select>
        <label class="chk"><input type="checkbox" data-filter="healthUsed"${st.healthUsed ? " checked" : ""}> ${esc(t("health.only_used"))}</label>
        <label class="chk"><input type="checkbox" data-filter="services"${st.services ? " checked" : ""}> ${esc(t("filters.show_services"))}</label>
      </div>`;
    if (!list.length) return `<div class="box detail">${head}<div class="center ok">✓ ${esc(t("health.none"))}</div></div>`;
    const rows = list.map(({ device: d, problems, used }) => {
      const runs = d.usedBy.slice(0, 6).map((id) => `<button class="tag ${RUN_KIND[id.split(".")[0]] || "automation"}" data-nav="run:${esc(id)}">${esc(this._runName(id))}</button>`).join("")
        + (d.usedBy.length > 6 ? `<span class="none"> +${d.usedBy.length - 6}</span>` : "")
        + d.inViews.slice(0, 3).map((v) => `<button class="tag dashboard" data-nav="view:${esc(v)}">${esc(this._viewLabel(v))}</button>`).join("");
      return `<tr>
        <td><button class="lnk" data-nav="device:${esc(d.id)}">${esc(d.name)}</button><div class="eid">${esc([d.manufacturer, d.model].filter(Boolean).join(" · "))}</div></td>
        <td>${d.area ? `<button class="lnk" data-nav="area:${esc(d.areaId)}">${esc(d.area)}</button>` : `<span class="none">—</span>`}</td>
        <td><button class="lnk" data-nav="integration:${esc(d.domain)}">${esc(d.integration)}</button></td>
        <td><div class="pills">${problems.map((p) => this._problemHtml(p)).join("")}</div></td>
        <td>${used ? runs : `<span class="none">${esc(t("stats.unused"))}</span>`}</td>
      </tr>`;
    }).join("");
    return `<div class="box detail">${head}
      <div class="tbl"><table><thead><tr><th>${esc(t("detail.device"))}</th><th>${esc(t("detail.area"))}</th><th>${esc(t("detail.integration"))}</th><th>${esc(t("health.col_problems"))}</th><th>${esc(t("health.col_used"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }

  // ---------- global search ----------
  _searching() { return !!this._model && this._state.gq.trim().length >= 2; }

  _onSearch(value) {
    const was = this._searching();
    this._state.gq = value;
    const now = this._searching();
    if (was !== now) {
      this._render();
      const inp = this.shadowRoot.getElementById("dum-gq");
      if (inp) { inp.focus(); inp.setSelectionRange(value.length, value.length); }
    } else if (now) {
      const box = this.shadowRoot.getElementById("sres");
      if (box) box.innerHTML = this._searchHtml();
    }
    clearTimeout(this._yamlTimer);
    const q = value.trim();
    if (q.length >= 3) this._yamlTimer = setTimeout(() => this._searchFiles(q), 400);
  }

  async _searchFiles(q) {
    if (this._yaml && this._yaml.q === q && !this._yaml.error) return;
    this._yaml = { q, loading: true };
    this._refreshSearch(q);
    try {
      const res = await this._hass.callWS({ type: "devices_usage_maps/search", query: q });
      this._yaml = { q, ...res };
    } catch (e) {
      this._yaml = { q, error: e?.code === "unknown_command" ? "old" : (e?.message || String(e)) };
    }
    this._refreshSearch(q);
  }

  _refreshSearch(q) {
    if (this._state.gq.trim() !== q) return;
    const box = this.shadowRoot.getElementById("sres");
    if (box) box.innerHTML = this._searchHtml();
  }

  _hl(text, q) {
    const s = String(text ?? "");
    const i = s.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return esc(s);
    return esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + q.length)) + "</mark>" + esc(s.slice(i + q.length));
  }

  _searchHtml() {
    const t = this.t, m = this._model;
    const q = this._state.gq.trim();
    const ql = q.toLowerCase();
    const LIMIT = 40;
    const sec = (title, n, html) => `<h3 class="sh">${esc(title)} <span class="cnt">${n}</span></h3>${html}`;
    const out = [];

    // entities
    const ents = [];
    for (const d of m.devices) for (const e of d.entities) {
      if (e.id.toLowerCase().includes(ql) || String(e.name).toLowerCase().includes(ql)) ents.push({ e, d });
    }
    ents.sort((a, b) => (b.e.id.toLowerCase() === ql) - (a.e.id.toLowerCase() === ql) || a.e.id.localeCompare(b.e.id));
    if (ents.length) {
      const rows = ents.slice(0, LIMIT).map(({ e, d }) => {
        const [u, v] = this._usageTags(e);
        const dev = d.virtual
          ? `<button class="lnk" data-nav="integration:${esc(d.domain)}">${esc(d.integration)}</button>`
          : `<button class="lnk" data-nav="device:${esc(d.id)}">${esc(d.name)}</button>`;
        return `<tr><td><button class="lnk" data-nav="entity:${esc(e.id)}">${this._hl(e.name, q)}</button><div class="eid">${this._hl(e.id, q)}</div></td>
          <td>${dev}${d.area ? `<div class="none">${esc(d.area)}</div>` : ""}</td><td>${esc(e.state)}</td><td>${u}</td><td>${v}</td></tr>`;
      }).join("");
      out.push(sec(t("search.entities"), ents.length, `<div class="tbl"><table><thead><tr><th>${esc(t("detail.entity"))}</th><th>${esc(t("detail.device"))}</th><th>${esc(t("detail.state"))}</th><th>${esc(t("detail.automations_scripts"))}</th><th>${esc(t("detail.dashboard_energy"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`
        + (ents.length > LIMIT ? `<div class="note">${esc(t("search.more", { n: ents.length - LIMIT }))}</div>` : "")));
    }

    // automations, scripts, scenes, dashboard views mentioning the text
    const runs = [], views = [];
    for (const [nav, text] of Object.entries(m.configText || {})) {
      const isView = nav.startsWith("view:");
      const id = nav.slice(nav.indexOf(":") + 1);
      const name = isView ? this._viewLabel(id) : this._runName(id);
      const inName = String(name).toLowerCase().includes(ql) || id.toLowerCase().includes(ql);
      if (!inName && !text.includes(ql)) continue;
      (isView ? views : runs).push({ nav, id, name, inName });
    }
    for (const r of Object.values(m.runnables)) {
      if (m.configText?.[`run:${r.id}`] !== undefined) continue;
      if (String(r.name).toLowerCase().includes(ql) || r.id.toLowerCase().includes(ql)) runs.push({ nav: `run:${r.id}`, id: r.id, name: r.name, inName: true });
    }
    if (runs.length) {
      runs.sort((a, b) => a.name.localeCompare(b.name));
      out.push(sec(t("search.runnables"), runs.length, `<div class="pills sl">${runs.map((r) => {
        const rr = m.runnables[r.id];
        const kind = RUN_KIND[r.id.split(".")[0]] || "automation";
        return `<button class="tag ${kind}${rr && !rr.on ? " off" : ""}" data-nav="${esc(r.nav)}" title="${esc(r.id)}">${this._hl(r.name, q)}</button>`;
      }).join("")}</div><div class="note">${esc(t("search.runnables_hint"))}</div>`));
    }
    if (views.length) {
      out.push(sec(t("search.views"), views.length, `<div class="pills sl">${views.map((v) => `<button class="tag dashboard" data-nav="${esc(v.nav)}">${this._hl(v.name, q)}</button>`).join("")}</div>`));
    }

    // devices
    const devs = m.devices.filter((d) => !d.virtual && [d.name, d.model, d.manufacturer].some((x) => String(x || "").toLowerCase().includes(ql)));
    if (devs.length) {
      out.push(sec(t("search.devices"), devs.length, `<div class="pills sl">${devs.slice(0, LIMIT).map((d) => `<button class="tag device" data-nav="device:${esc(d.id)}">${this._hl(d.name, q)}${d.area ? ` · ${esc(d.area)}` : ""}</button>`).join("")}</div>`));
    }

    // YAML files and helpers (backend)
    const y = this._yaml;
    let yhtml;
    if (q.length < 3) yhtml = `<div class="note">${esc(t("search.yaml_min"))}</div>`;
    else if (!y || y.q !== q || y.loading) yhtml = `<div class="note">${esc(t("search.yaml_loading"))}</div>`;
    else if (y.error) yhtml = `<div class="note">${esc(y.error === "old" ? t("search.yaml_old") : t("search.yaml_error", { error: y.error }))}</div>`;
    else {
      const byFile = new Map();
      for (const h of y.files || []) { if (!byFile.has(h.file)) byFile.set(h.file, []); byFile.get(h.file).push(h); }
      const files = [...byFile].map(([f, hs]) => `<div class="yfile"><div class="yname">📄 ${esc(f)}</div>${hs.map((h) => `<div class="yline"><span class="ln">${h.line}</span><code>${this._hl(h.text, q)}</code></div>`).join("")}</div>`).join("");
      const entries = (y.entries || []).map((e) => `<button class="tag helper" data-nav="integration:${esc(e.domain)}" title="${esc(e.domain)}">${this._hl(e.title || e.domain, q)} <span class="none">(${esc(e.domain)})</span></button>`).join("");
      const n = (y.files || []).length + (y.entries || []).length;
      yhtml = n
        ? `${files}${entries ? `<div class="sub">${esc(t("search.helpers"))}</div><div class="pills sl">${entries}</div>` : ""}${y.truncated ? `<div class="note">${esc(t("search.truncated"))}</div>` : ""}`
        : `<div class="note">${esc(t("search.yaml_none", { n: y.scanned ?? 0 }))}</div>`;
      out.push(sec(t("search.yaml"), n, yhtml));
      yhtml = null;
    }
    if (yhtml) out.push(sec(t("search.yaml"), "…", yhtml));

    const found = ents.length + runs.length + views.length + devs.length;
    return `<div class="dh"><h2>${esc(t("search.heading", { q }))}</h2><button class="iconbtn" data-gclear title="${esc(t("search.clear"))}" aria-label="${esc(t("search.clear"))}">✕</button></div>
      ${found || (y && y.q === q && ((y.files || []).length || (y.entries || []).length)) ? "" : `<div class="center">${esc(t("search.none"))}</div>`}
      ${out.join("")}`;
  }

  _brokenWhere(b) {
    const t = this.t;
    const parts = [];
    if (b.source.kind !== "dashboard" && b.section) {
      const sec = t(`broken.section.${b.section}`);
      parts.push(sec.startsWith("broken.") ? b.section : sec);
    }
    if (b.step) parts.push(`“${b.step}”`);
    let html = esc(parts.join(" › ") || "—");
    if (b.inTemplate) html += ` <span class="tag via">${esc(t("detail.via_template"))}</span>`;
    if (b.disabled) html += ` <span class="tag off">${esc(t("broken.disabled_step"))}</span>`;
    return html;
  }

  _brokenRef(b) {
    const t = this.t;
    let html = `<div class="eid">${esc(b.ref)}</div>`;
    if (b.kind === "orphan_entity") html = `<button class="lnk" data-nav="entity:${esc(b.ref)}">${esc(b.ref)}</button>${b.platform ? ` <span class="none">(${esc(b.platform)})</span>` : ""}`;
    if (b.suggestion) html += `<div class="note">${esc(t("broken.maybe"))} <button class="lnk" data-nav="entity:${esc(b.suggestion)}">${esc(b.suggestion)}</button></div>`;
    return html;
  }

  _brokenHtml() {
    const t = this.t, m = this._model, st = this._state;
    const all = m.broken || [];
    const list = st.brokenAll ? all : all.filter((b) => !b.disabled && b.source.on);
    const hidden = all.length - list.length;
    const head = `<div class="dh"><h2>${esc(t("broken.heading"))}</h2></div>
      <div class="note">${esc(t("broken.hint"))}</div>
      ${hidden || st.brokenAll ? `<label class="chk"><input type="checkbox" data-brokenfilter${st.brokenAll ? " checked" : ""}> ${esc(t("broken.show_all", { n: all.filter((b) => b.disabled || !b.source.on).length }))}</label>` : ""}`;
    if (!list.length) return `<div class="box detail">${head}<div class="center ok">✓ ${esc(t("broken.none"))}</div></div>`;
    const kindOrder = { automation: 0, script: 1, scene: 2, dashboard: 3 };
    const bySrc = new Map();
    for (const b of list) {
      const k = `${b.source.kind}|${b.source.id}`;
      if (!bySrc.has(k)) bySrc.set(k, { source: b.source, items: [] });
      bySrc.get(k).items.push(b);
    }
    const groups = [...bySrc.values()].sort((a, b) => (kindOrder[a.source.kind] - kindOrder[b.source.kind]) || (b.source.on - a.source.on) || a.source.name.localeCompare(b.source.name));
    const rows = groups.map(({ source, items }) => {
      const kind = source.kind;
      const label = kind === "dashboard" ? this._viewLabel(source.id) : source.name;
      const typeLabel = t(`detail.${kind}`);
      return items.map((b, i) => `<tr>
        ${i === 0 ? `<td rowspan="${items.length}"><button class="tag ${kind}${source.on ? "" : " off"}" data-nav="${esc(source.nav)}" title="${esc(source.id)}">${esc(label)}</button><div class="none">${esc(typeLabel)}${source.on ? "" : ` · ${esc(t("detail.disabled"))}`}</div></td>` : ""}
        <td>${this._brokenRef(b)}</td>
        <td><span class="pill bad">${esc(t(`broken.kind.${b.kind}`))}</span></td>
        <td>${this._brokenWhere(b)}</td>
      </tr>`).join("");
    }).join("");
    return `<div class="box detail">${head}
      <div class="tbl"><table class="broken"><thead><tr><th>${esc(t("broken.col_source"))}</th><th>${esc(t("broken.col_ref"))}</th><th>${esc(t("broken.col_kind"))}</th><th>${esc(t("broken.col_where"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }

  _renderExplorer(fullFilters = false) {
    const root = this.shadowRoot;
    if (!root.getElementById("list")) { this._render(); return; }
    if (fullFilters || !root.getElementById("filters").childElementCount) root.getElementById("filters").innerHTML = this._filtersHtml();
    // refresh stat highlight
    const statsEl = root.querySelector(".stats");
    if (statsEl) statsEl.outerHTML = this._statsHtml();
    if (this._state.tab === "devices") this._renderDeviceList();
    else this._renderRunList();
  }

  _filtersHtml() {
    const t = this.t, s = this._state, m = this._model;
    const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`;
    const search = `<input type="search" id="dum-q" data-filter="q" placeholder="${esc(t("filters.search"))}" value="${esc(s.q)}">`;
    if (s.tab === "automations") {
      return `${search}
        <div class="frow"><select id="dum-kind" data-filter="kindFilter">
          ${opt("all", "—", s.kindFilter || "all")}${opt("automation", t("groups.automations"), s.kindFilter)}${opt("script", t("groups.scripts"), s.kindFilter)}${opt("scene", t("groups.scenes"), s.kindFilter)}
        </select><select id="dum-auto" data-filter="autoFilter">
          ${opt("all", t("filters.auto_all"), s.autoFilter)}${opt("on", t("filters.auto_on"), s.autoFilter)}${opt("off", t("filters.auto_off"), s.autoFilter)}
        </select></div>`;
    }
    const areas = [...new Set(m.devices.map((d) => d.area).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const integs = [...m.integrations].sort((a, b) => a.name.localeCompare(b.name));
    return `${search}
      <div class="frow">
        <select id="dum-area" data-filter="area">${opt("", t("filters.all_areas"), s.area)}${areas.map((a) => opt(a, a, s.area)).join("")}${opt("__none", t("no_area"), s.area)}</select>
        <select id="dum-integ" data-filter="integ">${opt("", t("filters.all_integrations"), s.integ)}${integs.map((i) => opt(i.domain, i.name, s.integ)).join("")}</select>
      </div>
      <select id="dum-usage" data-filter="usage">
        ${opt("all", t("filters.usage_all"), s.usage)}${opt("phys", t("filters.usage_physical"), s.usage)}${opt("auto", t("filters.usage_auto"), s.usage)}${opt("dash", t("filters.usage_dash"), s.usage)}${opt("none", t("filters.usage_none"), s.usage)}
      </select>
      <label class="chk"><input type="checkbox" id="dum-svc" data-filter="services"${s.services ? " checked" : ""}> ${esc(t("filters.show_services"))}</label>`;
  }

  _renderDeviceList() {
    const t = this.t, root = this.shadowRoot;
    const ds = this._filteredDevices();
    const by = new Map();
    for (const d of ds) {
      const k = d.virtual ? t("no_device") : d.area || t("no_area");
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(d);
    }
    const tail = new Set([t("no_area"), t("no_device")]);
    const keys = [...by.keys()].sort((a, b) => (tail.has(a) - tail.has(b)) || a.localeCompare(b));
    if (!ds.find((d) => d.id === this._state.selected)) {
      this._state.selected = (ds.find((d) => d.usedBy.length && !d.virtual) || ds[0])?.id || null;
    }
    root.getElementById("list").innerHTML = ds.length ? keys.map((k) => `<div class="grp">${esc(k)} · ${by.get(k).length}</div>`
      + by.get(k).sort((a, b) => a.name.localeCompare(b.name)).map((d) => `
        <button class="item" data-select="${esc(d.id)}" aria-current="${d.id === this._state.selected}">
          <span class="nm">${esc(d.name)}<span class="md">${esc([d.manufacturer, d.model].filter(Boolean).join(" · ") || d.integration)}</span></span>
          <span class="dots"><i class="dot ${d.usedBy.length ? "a" : ""}"></i><i class="dot ${d.inViews.length ? "d" : ""}"></i><i class="dot ${d.inEnergy ? "e" : ""}"></i></span>
        </button>`).join("")).join("") : `<div class="center">${esc(t("no_results"))}</div>`;
    root.getElementById("detail").innerHTML = this._deviceDetailHtml(ds.find((d) => d.id === this._state.selected));
  }

  _renderRunList() {
    const t = this.t, root = this.shadowRoot;
    const rs = this._filteredRunnables();
    if (!rs.find((r) => r.id === this._state.selected)) this._state.selected = rs[0]?.id || null;
    const groups = [["automation", t("groups.automations")], ["script", t("groups.scripts")], ["scene", t("groups.scenes")]];
    const counts = this._deviceCountByRunnable();
    root.getElementById("list").innerHTML = rs.length ? groups.map(([k, label]) => {
      const items = rs.filter((r) => r.domain === k).sort((a, b) => a.name.localeCompare(b.name));
      if (!items.length) return "";
      return `<div class="grp">${esc(label)} · ${items.length}</div>${items.map((r) => `
        <button class="item" data-select="${esc(r.id)}" aria-current="${r.id === this._state.selected}">
          <span class="nm">${esc(r.name)}<span class="md">${r.on ? "" : `${esc(t("detail.disabled"))} · `}${esc(t("detail.entities_n", { n: counts.get(r.id) || 0 }))}</span></span>
        </button>`).join("")}`;
    }).join("") : `<div class="center">${esc(t("no_results"))}</div>`;
    root.getElementById("detail").innerHTML = this._runDetailHtml(this._model.runnables[this._state.selected]);
  }

  _deviceCountByRunnable() {
    const c = new Map();
    for (const d of this._model.devices) for (const e of d.entities) for (const u of e.uses) c.set(u.by, (c.get(u.by) || 0) + 1);
    return c;
  }

  _legendHtml() {
    const t = this.t;
    const i = (v, l) => `<span><i style="background:var(${v})"></i>${esc(l)}</span>`;
    return `<div class="legend">${i("--dum-auto", t("legend.automation"))}${i("--dum-script", t("legend.script"))}${i("--dum-scene", t("legend.scene"))}${i("--dum-dash", t("legend.dashboard"))}${i("--dum-energy", t("legend.energy"))}<span>${esc(t("legend.dashed"))}</span></div>`;
  }

  _usageTags(e) {
    const t = this.t;
    const runs = e.uses.map((u) => {
      const r = this._model.runnables[u.by];
      const kind = RUN_KIND[u.by.split(".")[0]] || "automation";
      const via = u.via === "template" ? ` (${t("detail.via_template")})` : u.via ? ` (${t("detail.via_group")})` : "";
      return `<button class="tag ${kind}${r && !r.on ? " off" : ""}${u.via ? " via" : ""}" data-nav="run:${esc(u.by)}" title="${esc(u.by)}${u.via && u.via !== "template" ? ` ← ${esc(u.via)}` : ""}">${esc(this._runName(u.by))}${esc(via)}</button>`;
    }).join("");
    const views = e.views.map((v) => `<button class="tag dashboard" data-nav="view:${esc(v)}">${esc(this._viewLabel(v))}</button>`).join("")
      + e.viewsVia.map((v) => `<button class="tag dashboard via" data-nav="view:${esc(v)}">${esc(this._viewLabel(v))} (${esc(t("detail.via_group"))})</button>`).join("")
      + (e.energy ? `<button class="tag energy" data-nav="energy:">${esc(t("detail.energy"))}</button>` : "");
    return [runs || `<span class="none">—</span>`, views || `<span class="none">—</span>`];
  }

  _entityTable(ents) {
    const t = this.t;
    return `<div class="tbl"><table><thead><tr><th>${esc(t("detail.entity"))}</th><th>${esc(t("detail.state"))}</th><th>${esc(t("detail.automations_scripts"))}</th><th>${esc(t("detail.dashboard_energy"))}</th></tr></thead><tbody>
      ${ents.map((e) => { const [u, d] = this._usageTags(e); return `<tr><td><button class="lnk" data-nav="entity:${esc(e.id)}">${esc(e.name)}</button><div class="eid">${esc(e.id)}</div></td><td>${esc(e.state)}</td><td>${u}</td><td>${d}</td></tr>`; }).join("")}
    </tbody></table></div>`;
  }

  _deviceDetailHtml(d) {
    const t = this.t;
    if (!d) return `<div class="center">${esc(t("pick_device"))}</div>`;
    const used = d.entities.filter((e) => e.uses.length || e.views.length || e.viewsVia.length || e.energy);
    const integ = [{ id: "I", label: d.integration, kind: "integration", nav: `integration:${d.domain}` }];
    const dev = [{ id: "D", label: d.name, kind: "device", nav: `device:${d.id}`, title: [d.manufacturer, d.model].filter(Boolean).join(" ") || d.name }];
    const mid = used.map((e) => ({ id: `E:${e.id}`, label: e.name, title: e.id, nav: `entity:${e.id}` }));
    const right = [];
    const seen = new Set();
    const edges = [{ from: "I", to: "D", kind: "integration" }];
    const addR = (n) => { if (!seen.has(n.id)) { seen.add(n.id); right.push(n); } };
    for (const e of used) {
      edges.push({ from: "D", to: `E:${e.id}`, kind: "device" });
      for (const u of e.uses) {
        const r = this._model.runnables[u.by];
        const kind = RUN_KIND[u.by.split(".")[0]] || "automation";
        addR({ id: `R:${u.by}`, label: this._runName(u.by), kind, off: r && !r.on, nav: `run:${u.by}`, title: u.by });
        edges.push({ from: `E:${e.id}`, to: `R:${u.by}`, kind, via: !!u.via, off: r && !r.on });
      }
      for (const v of [...e.views, ...e.viewsVia]) {
        addR({ id: `V:${v}`, label: this._viewLabel(v), kind: "dashboard", nav: `view:${v}` });
        edges.push({ from: `E:${e.id}`, to: `V:${v}`, kind: "dashboard", via: !e.views.includes(v) });
      }
      if (e.energy) { addR({ id: "EN", label: t("detail.energy"), kind: "energy", nav: "energy:" }); edges.push({ from: `E:${e.id}`, to: "EN", kind: "energy" }); }
    }
    for (const id of d.directUses) {
      const r = this._model.runnables[id];
      const kind = RUN_KIND[id.split(".")[0]] || "automation";
      addR({ id: `R:${id}`, label: this._runName(id), kind, off: r && !r.on, nav: `run:${id}`, title: id });
      edges.push({ from: "D", to: `R:${id}`, kind, off: r && !r.on });
    }
    const kindOrder = { automation: 0, script: 1, scene: 2, dashboard: 3, energy: 4 };
    right.sort((a, b) => (kindOrder[a.kind] - kindOrder[b.kind]) || a.label.localeCompare(b.label));
    const diag = used.length || d.directUses.length
      ? flowDiagram([integ, dev, mid, right], [t("detail.integration"), t("detail.device"), t("detail.entities_used"), t("detail.used_by")], edges)
      : flowDiagram([integ, dev], [t("detail.integration"), t("detail.device")], [{ from: "I", to: "D", kind: "integration" }]) + `<div class="center">${esc(t("detail.not_used"))}</div>`;
    const main = d.entities.filter((e) => !e.tech);
    const tech = d.entities.filter((e) => e.tech);
    const area = d.area
      ? `<button class="pill area" data-nav="area:${esc(d.areaId)}">${esc(d.area)}</button>`
      : `<span class="pill">${esc(d.virtual ? t("no_device") : t("no_area"))}</span>`;
    return `<div class="dh"><h2>${esc(d.name)}</h2><div class="pills">
        ${area}
        ${d.manufacturer || d.model ? `<span class="pill">${esc([d.manufacturer, d.model].filter(Boolean).join(" · "))}</span>` : ""}
        <button class="pill" data-nav="integration:${esc(d.domain)}">${esc(d.integration)}</button>
        <span class="pill">${esc(t("detail.entities_n", { n: d.entities.length }))}</span>
        <button class="pill" data-nav="device:${esc(d.id)}">↗ ${esc(t("detail.open"))}</button>
      </div></div>
      ${this._legendHtml()}
      <div class="diagram">${diag}</div>
      ${d.directUses.length ? `<div class="note">${esc(t("detail.targeted_directly"))} ${d.directUses.map((id) => `<button class="tag ${RUN_KIND[id.split(".")[0]] || "automation"}" data-nav="run:${esc(id)}">${esc(this._runName(id))}</button>`).join("")}</div>` : ""}
      ${main.length ? this._entityTable(main) : ""}
      ${tech.length ? `<details><summary>${esc(t("detail.tech_n", { n: tech.length }))}</summary>${this._entityTable(tech)}</details>` : ""}`;
  }

  _runDetailHtml(r) {
    const t = this.t;
    if (!r) return `<div class="center">${esc(t("pick_automation"))}</div>`;
    const kind = RUN_KIND[r.domain];
    const byDev = new Map();
    for (const d of this._model.devices) {
      const ents = [];
      for (const e of d.entities) for (const u of e.uses) if (u.by === r.id) ents.push({ e, via: u.via });
      const direct = d.directUses.includes(r.id);
      if (ents.length || direct) byDev.set(d.id, { d, ents, direct });
    }
    const rows = [...byDev.values()].sort((a, b) => (a.d.area || "~").localeCompare(b.d.area || "~") || a.d.name.localeCompare(b.d.name));
    const left = [], mid = [], edges = [];
    const right = [{ id: "R", label: r.name, kind, off: !r.on, nav: `run:${r.id}`, title: r.id }];
    for (const { d, ents, direct } of rows) {
      left.push({ id: `D:${d.id}`, label: d.area ? `${d.name} · ${d.area}` : d.name, kind: "device", nav: `device:${d.id}`, title: d.name });
      if (direct) edges.push({ from: `D:${d.id}`, to: "R", kind });
      for (const { e, via } of ents) {
        const id = `E:${e.id}`;
        if (!mid.find((x) => x.id === id)) mid.push({ id, label: e.name, nav: `entity:${e.id}`, title: e.id });
        edges.push({ from: `D:${d.id}`, to: id, kind: "device" });
        edges.push({ from: id, to: "R", kind, via: !!via });
      }
    }
    const typeLabel = t(`detail.${kind}`);
    const diag = rows.length
      ? flowDiagram([left, mid, right], [t("detail.device"), t("detail.entities_used"), typeLabel], edges)
      : `<div class="center">${esc(t("detail.no_targets"))}</div>`;
    return `<div class="dh"><h2>${esc(r.name)}</h2><div class="pills">
        <span class="pill">${esc(r.id)}</span>
        <span class="pill${r.on ? " area" : ""}">${esc(kind === "automation" ? (r.on ? t("detail.enabled") : t("detail.disabled")) : typeLabel)}</span>
        <button class="pill" data-nav="run:${esc(r.id)}">↗ ${esc(t("detail.open"))}</button>
      </div></div>
      <div class="diagram">${diag}</div>
      ${rows.length ? `<div class="tbl"><table><thead><tr><th>${esc(t("detail.device"))}</th><th>${esc(t("detail.area"))}</th><th>${esc(t("detail.entities_used"))}</th></tr></thead><tbody>
        ${rows.map(({ d, ents }) => `<tr>
          <td><button class="lnk" data-nav="device:${esc(d.id)}">${esc(d.name)}</button></td>
          <td>${d.area ? `<button class="lnk" data-nav="area:${esc(d.areaId)}">${esc(d.area)}</button>` : `<span class="none">—</span>`}</td>
          <td>${ents.map(({ e, via }) => `<div><button class="lnk" data-nav="entity:${esc(e.id)}">${esc(e.name)}</button> <span class="eid">${esc(e.id)}</span>${via === "template" ? ` <span class="tag ${kind} via">${esc(t("detail.via_template"))}</span>` : via ? ` <span class="tag ${kind} via">${esc(t("detail.via_group"))}: ${esc(via)}</span>` : ""}</div>`).join("") || `<span class="none">${esc(t("detail.targeted_directly"))}</span>`}</td>
        </tr>`).join("")}</tbody></table></div>` : ""}`;
  }
}

if (!customElements.get("devices-usage-maps-view")) customElements.define("devices-usage-maps-view", DevicesUsageMapsView);
