// Devices Usage Maps — flow diagram (columns of nodes joined by curves).
// Nodes carry data-nav targets so every box is clickable.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * @param {Array<Array<{id,label,title?,kind?,off?,nav?}>>} cols
 * @param {string[]} heads column titles
 * @param {Array<{from,to,kind?,via?,off?}>} edges
 * kind: "integration" | "device" | "automation" | "script" | "scene" | "dashboard" | "energy" | undefined (entity)
 */
export function flowDiagram(cols, heads, edges) {
  const H = 30, G = 8, padY = 16, gap = cols.length >= 4 ? 48 : 80;
  const widths = cols.length >= 4 ? [150, 180, 220, 230] : cols.length === 2 ? [160, 200] : [230, 240, 240];
  const xs = [];
  let x = 16;
  widths.forEach((w) => { xs.push(x); x += w + gap; });
  const W = x - gap + 16;
  const rows = Math.max(1, ...cols.map((c) => c.length));
  const Ht = padY * 2 + rows * (H + G) + 18;
  const pos = {};
  cols.forEach((arr, c) => {
    const off = ((rows - arr.length) * (H + G)) / 2;
    arr.forEach((n, i) => { pos[n.id] = { x: xs[c], y: padY + 18 + off + i * (H + G), w: widths[c], n }; });
  });

  let s = `<svg class="flow" viewBox="0 0 ${W} ${Ht}" style="min-width:${Math.round(W * 0.78)}px;max-width:${W}px" role="img">`;
  heads.forEach((t, i) => {
    s += `<text class="head" x="${xs[i]}" y="${padY + 4}">${esc(t.toUpperCase())}</text>`;
  });
  for (const e of edges) {
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) continue;
    const x1 = a.x + a.w, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
    s += `<path class="edge k-${e.kind || "entity"}${e.via ? " via" : ""}${e.off ? " off" : ""}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
  }
  for (const p of Object.values(pos)) {
    const n = p.n;
    const max = Math.floor(p.w / 7.2);
    const label = n.label.length > max ? `${n.label.slice(0, max - 1)}…` : n.label;
    const nav = n.nav ? ` data-nav="${esc(n.nav)}" tabindex="0" role="link"` : "";
    s += `<g class="node k-${n.kind || "entity"}${n.off ? " off" : ""}${n.nav ? " link" : ""}"${nav}>`
      + `<title>${esc(n.title || n.label)}</title>`
      + `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${H}" rx="5"/>`
      + `<text x="${p.x + 9}" y="${p.y + 19}">${esc(label)}</text></g>`;
  }
  return `${s}</svg>`;
}
