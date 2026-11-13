// Devices Usage Maps — styles. Built on Home Assistant theme variables
// so the card follows every user's theme (light, dark, custom).
export const styles = `
:host {
  --dum-bg: var(--primary-background-color, #f5f6f7);
  --dum-panel: var(--card-background-color, #fff);
  --dum-fg: var(--primary-text-color, #1c2427);
  --dum-muted: var(--secondary-text-color, #5d6b71);
  --dum-line: var(--divider-color, #dde3e6);
  --dum-accent: var(--primary-color, #03a9f4);
  --dum-auto: var(--warning-color, #c27c0e);
  --dum-script: #8e5bb5;
  --dum-scene: #c2577a;
  --dum-dash: var(--info-color, #3d6fd1);
  --dum-energy: var(--success-color, #2e8b47);
  --dum-protocol: var(--primary-color, #03a9f4);
  --dum-camera: #c0483b;
  --dum-local: #3d6fd1;
  --dum-cloud: #2a8f8f;
  --dum-system: #8e5bb5;
  --dum-helper: #7a7f85;
  --dum-bad: var(--error-color, #db4437);
  display: block;
  color: var(--dum-fg);
  font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, system-ui, sans-serif));
  font-size: 14px;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; color: inherit; }
a { color: var(--dum-accent); }
.wrap { display: flex; flex-direction: column; gap: 12px; padding: 16px; min-height: 100%; }
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.top h1 { font-size: 20px; font-weight: 500; margin: 0; }
.updated { color: var(--dum-muted); font-size: 12px; }
.tabs { display: flex; gap: 4px; margin-left: auto; flex-wrap: wrap; }
.tab, .iconbtn {
  border: 1px solid var(--dum-line); background: var(--dum-panel); border-radius: 6px;
  padding: 6px 12px; cursor: pointer; font-size: 13px;
}
.tab[aria-pressed="true"] { background: var(--dum-accent); color: var(--text-primary-color, #fff); border-color: var(--dum-accent); }
.iconbtn { padding: 6px 10px; }
.stats { display: flex; flex-wrap: wrap; gap: 8px; }
.stat {
  border: 1px solid var(--dum-line); background: var(--dum-panel); border-radius: 6px;
  padding: 6px 10px; font-size: 12px; color: var(--dum-muted); cursor: pointer; text-align: left;
}
.stat b { font-size: 15px; color: var(--dum-fg); margin-right: 4px; font-variant-numeric: tabular-nums; }
.stat:hover { border-color: var(--dum-accent); }
.stat[aria-pressed="true"] { border-color: var(--dum-accent); color: var(--dum-accent); }
.stat.bad b { color: var(--dum-bad); }
.stat.bad { border-color: color-mix(in srgb, var(--dum-bad) 55%, var(--dum-line)); }
.pill.warn { color: var(--dum-auto); background: color-mix(in srgb, var(--dum-auto) 14%, transparent); border-color: transparent; }
.gsearch { flex: 1 1 240px; min-width: 0; max-width: 460px; }
.gsearch input { width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid var(--dum-line); border-radius: 6px; background: var(--dum-bg); color: var(--dum-fg); font: inherit; font-size: 14px; }
.gsearch input:focus { outline: 2px solid var(--dum-accent); outline-offset: -1px; }
h3.sh { font-size: 14px; font-weight: 600; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; }
h3.sh .cnt { font-weight: 500; font-size: 12px; color: var(--dum-muted); border: 1px solid var(--dum-line); border-radius: 10px; padding: 0 7px; }
.pills.sl { display: flex; flex-wrap: wrap; gap: 6px; }
mark { background: color-mix(in srgb, var(--dum-accent) 28%, transparent); color: inherit; border-radius: 2px; padding: 0 1px; }
.yfile { border: 1px solid var(--dum-line); border-radius: 6px; margin: 0 0 8px; overflow: hidden; }
.yname { font-weight: 600; font-size: 13px; padding: 6px 10px; background: color-mix(in srgb, var(--dum-line) 45%, transparent); overflow-wrap: anywhere; }
.yline { display: flex; gap: 10px; padding: 3px 10px; font-size: 12.5px; align-items: baseline; }
.yline .ln { color: var(--dum-muted); min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums; flex: none; }
.yline code { white-space: pre-wrap; overflow-wrap: anywhere; min-width: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.sub { font-size: 12px; color: var(--dum-muted); margin: 10px 0 6px; }
.dh .iconbtn { margin-left: auto; }
.hfilters { flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.hfilters select { padding: 6px 8px; border: 1px solid var(--dum-line); border-radius: 5px; background: var(--dum-bg); color: var(--dum-fg); font: inherit; font-size: 13px; max-width: 100%; }
.pill.bad { color: var(--dum-bad); background: color-mix(in srgb, var(--dum-bad) 12%, transparent); border-color: transparent; }
.center.ok { color: var(--dum-energy); }
table.broken td:first-child { border-right: 1px solid var(--dum-line); }
.box { background: var(--dum-panel); border: 1px solid var(--dum-line); border-radius: 8px; padding: 16px; min-width: 0; }
.muted { color: var(--dum-muted); }
.note { color: var(--dum-muted); font-size: 12px; }
.center { padding: 32px; text-align: center; color: var(--dum-muted); }
.error { color: var(--error-color, #c62828); }

/* overview */
.hub { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.hubcircle {
  width: 132px; height: 132px; border-radius: 50%; border: 2px solid var(--dum-fg);
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  background: var(--dum-panel);
}
.hubcircle b { font-size: 14px; }
.hubcircle span { font-size: 11px; color: var(--dum-muted); }
.consumers { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.consumer {
  border: 1px solid var(--c); border-radius: 6px; background: var(--dum-panel);
  padding: 6px 12px; min-width: 140px; text-align: left; cursor: pointer;
}
.consumer b { display: block; color: var(--c); font-size: 12.5px; }
.consumer span { color: var(--dum-muted); font-size: 11.5px; }
.cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.cat { border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); border-radius: 8px; padding: 12px; background: var(--dum-panel); }
.cat h3 { margin: 0 0 8px; font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: var(--c); display: flex; justify-content: space-between; gap: 8px; }
.cat h3 span { color: var(--dum-muted); text-transform: none; letter-spacing: 0; font-weight: 400; }
.bubbles { display: flex; flex-wrap: wrap; gap: 10px 6px; }
.bubble { background: none; border: 0; padding: 4px; width: 96px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; border-radius: 6px; }
.bubble:hover { background: var(--dum-bg); }
.ring {
  --p: 0; width: var(--s); height: var(--s); border-radius: 50%;
  background: conic-gradient(var(--c) calc(var(--p) * 1%), color-mix(in srgb, var(--c) 18%, transparent) 0);
  display: flex; align-items: center; justify-content: center;
}
.ring i { width: calc(var(--s) - 8px); height: calc(var(--s) - 8px); border-radius: 50%; background: var(--dum-panel); display: flex; align-items: center; justify-content: center; font-style: normal; font-weight: 600; font-size: 13px; font-variant-numeric: tabular-nums; }
.bubble small { font-size: 11px; line-height: 1.2; text-align: center; max-width: 92px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

/* explorer */
.main { display: grid; grid-template-columns: minmax(240px, 320px) 1fr; gap: 12px; min-height: 0; }
.main.narrow { grid-template-columns: 1fr; }
.side { background: var(--dum-panel); border: 1px solid var(--dum-line); border-radius: 8px; display: flex; flex-direction: column; min-height: 0; max-height: var(--dum-list-h, 70vh); }
.filters { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-bottom: 1px solid var(--dum-line); }
.filters input[type=search], .filters select { width: 100%; min-width: 0; padding: 6px 8px; border: 1px solid var(--dum-line); border-radius: 5px; background: var(--dum-bg); color: var(--dum-fg); font: inherit; font-size: 13px; }
.frow { display: flex; gap: 6px; }
.chk { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: var(--dum-muted); }
.list { overflow-y: auto; flex: 1; }
.grp { position: sticky; top: 0; background: var(--dum-panel); padding: 10px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--dum-muted); }
.item { display: flex; gap: 8px; align-items: center; width: 100%; border: 0; border-left: 3px solid transparent; background: none; text-align: left; padding: 6px 12px; cursor: pointer; }
.item:hover { background: var(--dum-bg); }
.item[aria-current="true"] { border-left-color: var(--dum-accent); background: color-mix(in srgb, var(--dum-accent) 12%, transparent); }
.item .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.item .md { display: block; font-size: 11px; color: var(--dum-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dots { display: flex; gap: 3px; flex: none; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dum-line); }
.dot.a { background: var(--dum-auto); } .dot.d { background: var(--dum-dash); } .dot.e { background: var(--dum-energy); }
.detail { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dh { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.dh h2 { margin: 0; font-size: 18px; font-weight: 500; }
.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { font-size: 11.5px; padding: 2px 8px; border-radius: 99px; border: 1px solid var(--dum-line); color: var(--dum-muted); background: var(--dum-bg); white-space: nowrap; }
button.pill, .pill.link { cursor: pointer; }
button.pill:hover { border-color: var(--dum-accent); color: var(--dum-accent); }
.pill.area { background: color-mix(in srgb, var(--dum-accent) 14%, transparent); color: var(--dum-accent); border-color: transparent; }
.legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--dum-muted); }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
.diagram { overflow-x: auto; border: 1px solid var(--dum-line); border-radius: 6px; background: var(--dum-bg); }
svg.flow { display: block; width: 100%; height: auto; font-family: inherit; }
svg.flow .head { fill: var(--dum-muted); font-size: 11px; font-weight: 600; letter-spacing: .06em; }
svg.flow .edge { fill: none; stroke-width: 1.5; opacity: .7; stroke: var(--dum-line); }
svg.flow .edge.k-device, svg.flow .edge.k-entity, svg.flow .edge.k-integration { stroke: var(--dum-accent); }
svg.flow .edge.k-automation { stroke: var(--dum-auto); } svg.flow .edge.k-script { stroke: var(--dum-script); }
svg.flow .edge.k-scene { stroke: var(--dum-scene); } svg.flow .edge.k-dashboard { stroke: var(--dum-dash); }
svg.flow .edge.k-energy { stroke: var(--dum-energy); }
svg.flow .edge.via { stroke-dasharray: 5 4; } svg.flow .edge.off { opacity: .35; }
svg.flow .node rect { fill: var(--dum-panel); stroke: var(--dum-line); }
svg.flow .node text { fill: var(--dum-fg); font-size: 12px; }
svg.flow .node.k-integration rect, svg.flow .node.k-device rect { fill: color-mix(in srgb, var(--dum-accent) 14%, var(--dum-panel)); stroke: var(--dum-accent); }
svg.flow .node.k-automation rect { stroke: var(--dum-auto); fill: color-mix(in srgb, var(--dum-auto) 12%, var(--dum-panel)); } svg.flow .node.k-automation text { fill: var(--dum-auto); }
svg.flow .node.k-script rect { stroke: var(--dum-script); fill: color-mix(in srgb, var(--dum-script) 12%, var(--dum-panel)); } svg.flow .node.k-script text { fill: var(--dum-script); }
svg.flow .node.k-scene rect { stroke: var(--dum-scene); fill: color-mix(in srgb, var(--dum-scene) 12%, var(--dum-panel)); } svg.flow .node.k-scene text { fill: var(--dum-scene); }
svg.flow .node.k-dashboard rect { stroke: var(--dum-dash); fill: color-mix(in srgb, var(--dum-dash) 12%, var(--dum-panel)); } svg.flow .node.k-dashboard text { fill: var(--dum-dash); }
svg.flow .node.k-energy rect { stroke: var(--dum-energy); fill: color-mix(in srgb, var(--dum-energy) 12%, var(--dum-panel)); } svg.flow .node.k-energy text { fill: var(--dum-energy); }
svg.flow .node.off rect { stroke-dasharray: 3 3; } svg.flow .node.off text { text-decoration: line-through; opacity: .7; }
svg.flow .node.link { cursor: pointer; }
svg.flow .node.link:hover rect, svg.flow .node.link:focus rect { stroke-width: 2.5; }
svg.flow .node:focus { outline: none; }
.tbl { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--dum-muted); padding: 6px 8px; border-bottom: 1px solid var(--dum-line); }
td { padding: 6px 8px; border-bottom: 1px solid var(--dum-line); vertical-align: top; }
tr.click { cursor: pointer; } tr.click:hover td { background: var(--dum-bg); }
.eid { font-family: var(--code-font-family, ui-monospace, Menlo, Consolas, monospace); font-size: 11.5px; color: var(--dum-muted); word-break: break-all; }
.lnk { background: none; border: 0; padding: 0; color: var(--dum-accent); cursor: pointer; text-align: left; }
.lnk:hover { text-decoration: underline; }
.tag { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 4px; margin: 1px 3px 1px 0; white-space: nowrap; border: 0; cursor: pointer; }
.tag.automation { background: color-mix(in srgb, var(--dum-auto) 16%, transparent); color: var(--dum-auto); }
.tag.script { background: color-mix(in srgb, var(--dum-script) 16%, transparent); color: var(--dum-script); }
.tag.scene { background: color-mix(in srgb, var(--dum-scene) 16%, transparent); color: var(--dum-scene); }
.tag.dashboard { background: color-mix(in srgb, var(--dum-dash) 16%, transparent); color: var(--dum-dash); }
.tag.energy { background: color-mix(in srgb, var(--dum-energy) 16%, transparent); color: var(--dum-energy); }
.tag.device, .tag.helper { background: color-mix(in srgb, var(--dum-accent) 12%, transparent); color: var(--dum-accent); }
.pills.sl .tag { font-size: 12.5px; padding: 3px 9px; white-space: normal; text-align: left; }
.tag.off { text-decoration: line-through; opacity: .75; }
.tag.via { font-style: italic; }
.tag:hover { filter: brightness(.95); text-decoration: underline; }
.none { color: var(--dum-muted); font-size: 12px; }
details summary { cursor: pointer; color: var(--dum-muted); font-size: 12.5px; padding: 4px 0; }
button:focus-visible, select:focus-visible, input:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--dum-accent); outline-offset: 1px; }
`;
