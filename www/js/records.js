// 「记录」页：最近吃了多少、花了多少、体重变化
import { html, useState, useEffect, app, commit, UI, Seg, r0, yuan, num } from "./ui.js";
import { useTween } from "./fx.js";

// 数字从 0 滚上来
function Tw({ v, f }) {
  const [live, setLive] = useState(0);
  useEffect(() => { const t = setTimeout(() => setLive(v), 80); return () => clearTimeout(t); }, [v]);
  const x = useTween(live, 900);
  return f ? f(x) : String(Math.round(x));
}
import { allFoods, dateStr, addDays } from "./store.js";
import { sumItems, planItems, targetsOf } from "./nutrition.js";

function BarChart({ rows, target, unit, color, tl = "目标" }) {
  const W = 320, H = 150, L = 34, R = 6, T = 12, B = 22;
  const max = Math.max(target || 0, ...rows.map((r) => r.v), 1) * 1.12;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const bw = (W - L - R) / rows.length;
  const every = rows.length > 14 ? 5 : rows.length > 7 ? 2 : 1;
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label=${"最近 " + rows.length + " 天的柱状图"}>
    <line x1=${L} y1=${y(0)} x2=${W - R} y2=${y(0)} stroke="var(--sep)" />
    ${[0.5, 1].map((k) => html`<g><line x1=${L} y1=${y(max * k / 1.12)} x2=${W - R} y2=${y(max * k / 1.12)} stroke="var(--sep)" stroke-dasharray="2 4" />
      <text x=${L - 4} y=${y(max * k / 1.12) + 3} text-anchor="end">${r0(max * k / 1.12)}</text></g>`)}
    ${rows.map((r, i) => html`<g>
      <rect class="col" x=${L + i * bw + bw * 0.2} y=${T} width=${bw * 0.6} height=${y(0) - T} rx=${Math.min(5, bw * 0.3)} />
      <rect class="bar" style=${"--k:" + i} x=${L + i * bw + bw * 0.2} y=${y(r.v)} width=${bw * 0.6} height=${Math.max(0, y(0) - y(r.v))} rx=${Math.min(5, bw * 0.3)} fill=${r.v ? color : "none"} />
      ${i % every === 0 || i === rows.length - 1 ? html`<text x=${L + i * bw + bw / 2} y=${H - 7} text-anchor="middle">${r.label}</text>` : null}
    </g>`)}
    ${target ? html`<g><line x1=${L} y1=${y(target)} x2=${W - R} y2=${y(target)} stroke="var(--ink)" stroke-width="1" stroke-dasharray="5 3" />
      <text x=${W - R} y=${y(target) - 4} text-anchor="end" fill="var(--ink)">${tl} ${r0(target)}${unit}</text></g>` : null}
  </svg>`;
}

function LineChart({ pts }) {
  const W = 320, H = 130, L = 34, R = 10, T = 12, B = 22;
  const vs = pts.map((p) => p.kg);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const x = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : ((W - L - R) * i) / (pts.length - 1));
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const d = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.kg).toFixed(1)).join(" ");
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="体重变化折线图">
    ${[lo, hi].map((v) => html`<g><line x1=${L} y1=${y(v)} x2=${W - R} y2=${y(v)} stroke="var(--sep)" stroke-dasharray="2 4" /><text x=${L - 4} y=${y(v) + 3} text-anchor="end">${v.toFixed(1)}</text></g>`)}
    <path class="line" d=${d} pathLength="1" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    ${pts.map((p, i) => html`<circle class="pt" style=${"--k:" + i} cx=${x(i)} cy=${y(p.kg)} r=${i === pts.length - 1 ? 4.5 : 2.5} fill="var(--green)" />`)}
    <text x=${x(0)} y=${H - 7} text-anchor="start">${pts[0].d.slice(5)}</text>
    ${pts.length > 1 ? html`<text x=${x(pts.length - 1)} y=${H - 7} text-anchor="end">${pts[pts.length - 1].d.slice(5)}</text>` : null}
  </svg>`;
}

export function Records() {
  const S = app.S;
  const [n, setN] = useState(7);
  const [metric, setMetric] = useState("kcal");
  const [kg, setKg] = useState("");
  const byId = Object.fromEntries(allFoods(S).map((f) => [f.id, f]));
  const today = dateStr();
  const rows = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const day = S.days[d];
    const t = day && day.plan ? sumItems(planItems(day.plan, true), (id) => byId[id]) : null;
    rows.push({ d, label: String(Number(d.slice(8))), t });
  }
  const logged = rows.filter((r) => r.t && r.t.kcal > 0);
  const avg = (k) => (logged.length ? logged.reduce((a, r) => a + r.t[k], 0) / logged.length : 0);
  const T = targetsOf(S.profile);
  const M = { kcal: { k: "kcal", target: T.kcal, unit: "", color: "var(--c-kcal)", n: "热量" }, p: { k: "p", target: T.protein, unit: "g", color: "var(--c-p)", n: "蛋白" }, cost: { k: "cost", target: S.prefs.budget || 0, unit: "元", color: "var(--accent)", n: "花费" },
    na: { k: "na", target: T.naMax, unit: "mg", color: "var(--na)", n: "钠" }, fb: { k: "fb", target: T.fbMin, unit: "g", color: "var(--fb)", n: "纤维" } }[metric];
  const month = today.slice(0, 7);
  const monthCost = Object.entries(S.days).filter(([d]) => d.startsWith(month)).reduce((a, [, day]) => a + (day.plan ? sumItems(planItems(day.plan, true), (id) => byId[id]).cost : 0), 0);
  const ws = S.weights.slice(-30);
  const saveKg = () => {
    const v = num(kg);
    if (!(v >= 30 && v <= 250)) return UI.toast("体重请填 30–250 之间的数字");
    commit((S) => {
      const i = S.weights.findIndex((w) => w.d === today);
      if (i >= 0) S.weights[i].kg = v; else S.weights.push({ d: today, kg: v });
      S.weights.sort((a, b) => (a.d < b.d ? -1 : 1));
      S.profile.weight = v;
    });
    setKg(""); UI.toast("已记录，目标也按新体重更新了");
  };
  const diff = ws.length > 1 ? ws[ws.length - 1].kg - ws[0].kg : 0;
  return html`
    <div class="top"><div><h1>记录</h1><p class="sub">只统计打了勾（真的吃了）的食物。</p></div></div>
    <${Seg} value=${n} onChange=${setN} options=${[{ v: 7, n: "最近 7 天" }, { v: 30, n: "最近 30 天" }]} />
    <div class="card stack">
      <div class="tiles">
        <div class="tile"><div class="v num" id="avg-kcal" data-v=${r0(avg("kcal"))}><${Tw} v=${avg("kcal")} /></div><div class="l">日均千卡</div></div>
        <div class="tile"><div class="v num"><${Tw} v=${avg("p")} /> g</div><div class="l">日均蛋白</div></div>
        <div class="tile"><div class="v num">¥<${Tw} v=${avg("cost")} f=${yuan} /></div><div class="l">日均花费</div></div>
      </div>
      <${Seg} id="rec-metric" value=${metric} onChange=${setMetric} options=${[{ v: "kcal", n: "热量" }, { v: "p", n: "蛋白" }, { v: "na", n: "钠" }, { v: "fb", n: "纤维" }, { v: "cost", n: "花费" }]} />
      ${logged.length ? html`<${BarChart} key=${metric + n} rows=${rows.map((r) => ({ label: r.label, v: r.t ? r.t[M.k] : 0 }))} target=${M.target} unit=${M.unit} color=${M.color} tl=${metric === "na" ? "上限" : "目标"} />`
        : html`<p class="muted">这几天还没有记录。在「今天」页吃完一样就打个勾，这里就会有图。</p>`}
      ${metric === "na" || metric === "fb" ? html`<p class="tiny muted" style="margin:0">${metric === "na" ? `虚线是建议上限 ${T.naMax} mg，柱子低于它更好。` : `虚线是建议量 ${T.fbMin} g，柱子高过它更好。`}</p>` : null}
      <div class="kv"><span>日均钠 / 日均膳食纤维</span><b class="num" id="avg-nafb">${r0(avg("na"))} mg / ${r0(avg("fb"))} g</b></div>
      <div class="kv"><span>有记录的天数</span><b class="num">${logged.length} / ${n} 天</b></div>
      <div class="kv"><span>${Number(month.slice(5))} 月到现在吃饭一共花了</span><b class="num" id="month-cost">¥${yuan(monthCost)}</b></div>
    </div>
    <div class="card stack">
      <h2>体重</h2>
      ${ws.length ? html`<${LineChart} pts=${ws} />` : html`<p class="muted">还没有体重记录。</p>`}
      ${ws.length > 1 ? html`<div class="kv"><span>从 ${ws[0].d.slice(5)} 到现在</span><b class="num">${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg</b></div>` : null}
      <div class="row" style="flex-wrap:nowrap">
        <input class="inp grow" id="kg-in" inputmode="decimal" placeholder="今天的体重 kg" value=${kg} onInput=${(e) => setKg(e.target.value)} />
        <button class="btn primary" id="kg-save" onClick=${saveKg}>记一下</button>
      </div>
      <p class="tiny muted">建议每周固定一天早上、空腹、上完厕所后称。看两周的趋势，别看一天的涨落。</p>
    </div>`;
}
