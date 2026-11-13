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
import { sumItems, planItems, targetsOf, SLOTS, SLOT_NAME } from "./nutrition.js";
import { targetsFor, dayInfo, dayLabel, KIND } from "./plans.js";

const WD = "一二三四五六日";
const pad = (n) => String(n).padStart(2, "0");

// 减脂 / 增肌日历：每天的计划日型、有没有记饮食、有没有称体重；点一天看那天的详情，也能改那天是高碳还是低碳
function Calendar() {
  const S = app.S, today = dateStr();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [kg, setKg] = useState("");
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  const first = new Date(y, m - 1, 1), lead = (first.getDay() + 6) % 7, dim = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(`${ym}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const shift = (n) => { const d = new Date(y, m - 1 + n, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const byId = Object.fromEntries(allFoods(S).map((f) => [f.id, f]));
  const ate = (d) => { const x = S.days[d]; return !!(x && x.plan && planItems(x.plan, true).length); };
  const wOf = (d) => S.weights.find((w) => w.d === d);
  const cyc = !!S.cycle;

  // 选中那一天
  const day = S.days[sel] || {};
  const info = dayInfo(S, sel), T = targetsFor(S, sel, day);
  const te = day.plan ? sumItems(planItems(day.plan, true), (id) => byId[id]) : null;
  const w = wOf(sel);
  const canKind = cyc && info.on && (!!info.plan.week || !!S.cycle.seq);
  const setKind = (k) => commit((S) => {
    const x = S.days[sel] || (S.days[sel] = { modes: { ...S.prefs.modes }, activeKcal: null, plan: null, tip: "", src: "" });
    if (k) x.kind = k; else delete x.kind;
    // 改的是今天、而且还没打勾：按新日型重排
    if (sel === today && x.plan && !planItems(x.plan, true).length) x.plan = null;
  });
  const saveKg = () => {
    const v = num(kg);
    if (!(v >= 30 && v <= 250)) return UI.toast("体重请填 30–250 之间的数字");
    commit((S) => {
      const i = S.weights.findIndex((w) => w.d === sel);
      if (i >= 0) S.weights[i].kg = v; else S.weights.push({ d: sel, kg: v });
      S.weights.sort((a, b) => (a.d < b.d ? -1 : 1));
      if (sel === S.weights[S.weights.length - 1].d) S.profile.weight = v;
    });
    setKg(""); UI.toast(`${+sel.slice(5, 7)} 月 ${+sel.slice(8)} 日的体重记好了`);
  };
  const meals = day.plan ? SLOTS.map((s) => [s, day.plan.meals[s].filter((it) => it.done && byId[it.id])]).filter(([, a]) => a.length) : [];
  const pctK = te && T.kcal ? Math.min(1, te.kcal / T.kcal) : 0;
  const future = sel > today;
  return html`<div class="card cal" id="cal">
    <div class="calh">
      <button class="calnav" aria-label="上个月" onClick=${() => shift(-1)}><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
      <b>${y} 年 ${m} 月</b>
      <button class="calnav" aria-label="下个月" onClick=${() => shift(1)}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg></button>
      ${ym !== today.slice(0, 7) || sel !== today ? html`<button class="caltoday" onClick=${() => { setYm(today.slice(0, 7)); setSel(today); }}>回到今天</button>` : null}
    </div>
    <div class="calgrid" role="grid" aria-label=${`${y} 年 ${m} 月`}>
      ${[...WD].map((w) => html`<span class="calwd">${w}</span>`)}
      ${cells.map((d) => {
        if (!d) return html`<span class="calc empty"></span>`;
        const k = cyc ? dayInfo(S, d).kind : null;
        return html`<button class=${"calc" + (d === today ? " today" : "") + (d === sel ? " sel" : "") + (d > today ? " fut" : "") + (k ? " k-" + k : "")} aria-pressed=${String(d === sel)}
          aria-label=${`${+d.slice(8)} 日${k ? " " + KIND[k].n : ""}${ate(d) ? "，有饮食记录" : ""}${wOf(d) ? "，称了体重" : ""}`} onClick=${() => setSel(d)}>
          <span class="dn num">${+d.slice(8)}</span>
          <span class="mk">${k ? html`<i class="kb"></i>` : null}${ate(d) ? html`<i class="dot eat"></i>` : null}${wOf(d) ? html`<i class="dot wt"></i>` : null}</span>
        </button>`;
      })}
    </div>
    <div class="callegend">
      ${cyc ? html`<span><i class="kb k-H"></i>高碳</span><span><i class="kb k-M"></i>中碳</span><span><i class="kb k-L"></i>低碳</span>` : null}
      <span><i class="dot eat"></i>饮食</span><span><i class="dot wt"></i>体重</span>
    </div>

    <div class="calday" id="cal-day" key=${sel}>
      <div class="cdh"><b>${+sel.slice(5, 7)} 月 ${+sel.slice(8)} 日 周${WD[(new Date(sel + "T12:00:00").getDay() + 6) % 7]}</b>
        ${T.kind ? html`<span class=${"kpill k-" + T.kind}>${KIND[T.kind].n}</span>` : null}</div>
      ${dayLabel(S, sel) ? html`<p class="tiny muted" style="margin:2px 0 0">${(S.cycle && S.cycle.name) || info.plan.n} · ${dayLabel(S, sel)}</p>` : null}
      <div class="cdgrid">
        <div class="cdring" style=${`--v:${pctK}`}><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="tr" cx="32" cy="32" r="27" /><circle class="fl" cx="32" cy="32" r="27" pathLength="1" /></svg>
          <span><b class="num">${te ? r0(pctK * 100) : "–"}</b><small>${te ? "%" : ""}</small></span></div>
        <div class="cdnums">
          <div><span>${future ? "那天的目标" : "吃了 / 目标"}</span><b class="num">${future || !te ? "" : r0(te.kcal) + " / "}${T.kcal} 千卡</b></div>
          <div class="num small muted">蛋白 ${te && !future ? r0(te.p) + "/" : ""}${T.protein}　碳水 ${te && !future ? r0(te.cb) + "/" : ""}${T.carb}　脂肪 ${te && !future ? r0(te.f) + "/" : ""}${T.fat} g</div>
        </div>
      </div>
      ${meals.length ? html`<div class="cdmeals">${meals.map(([s, a]) => html`<div><span>${SLOT_NAME[s]}</span><p>${a.map((it) => byId[it.id].n).join("、")}</p></div>`)}</div>`
        : !future ? html`<p class="small muted" style="margin:6px 0 0">${sel === today ? "今天还没打勾。吃完一样，在「今天」页点它前面的圆圈。" : "这天没有饮食记录。"}</p>` : null}
      ${canKind ? html`<div class="field" style="margin-top:12px">这一天改成
        <div class="kseg wide">${[["", "跟计划"], ["H", "高碳"], ["M", "中碳"], ["L", "低碳"]].map(([k, n]) => html`<button class=${k ? "k-" + k : ""} aria-pressed=${String((day.kind || "") === k)} onClick=${() => setKind(k)}>${n}</button>`)}</div></div>` : null}
      ${!future ? html`<div class="cdw">
        <span>体重</span>${w ? html`<b class="num">${w.kg} kg</b>` : html`<em>未记录</em>`}
        <input class="inp" id="cal-kg" inputmode="decimal" placeholder=${w ? "改一下" : "填 kg"} value=${kg} onInput=${(e) => setKg(e.target.value)} />
        <button class="btn sm" id="cal-kg-save" onClick=${saveKg}>记</button>
      </div>` : null}
    </div>
  </div>`;
}

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
    <${Calendar} />
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
