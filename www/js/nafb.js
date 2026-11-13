// 钠和膳食纤维：「今天」页的小卡片 + 点开后的详情
import { html, useState, useEffect, useRef, app, commit, UI, Sheet, Seg, r0 } from "./ui.js";
import { sumItems, planItems, targetsOf, SLOTS, SLOT_NAME, saltOf } from "./nutrition.js";
import { allFoods, dateStr, dayOf } from "./store.js";
import { Roll, useReveal, burst, haptic, calm } from "./fx.js";

const SHAKER = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9.5h8l1 10a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5z" /><path d="M8.6 9.5 9.4 5h5.2l.8 4.5" /><path d="M10.8 6.8h.01M13.2 6.8h.01M12 5.9h.01" /></svg>`;
const LEAF = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path class="lf" d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path class="vein" d="M5 19c3-4 6-7 10-10" /></svg>`;

// 每样食物贡献了多少
export function sources(plan, byId, key) {
  const m = {};
  for (const s of SLOTS) for (const it of (plan && plan.meals[s]) || []) {
    const f = byId[it.id]; if (!f) continue;
    const v = (f[key] || 0) * it.qty; if (v <= 0) continue;
    const k = it.id;
    if (!m[k]) m[k] = { f, v: 0, slots: [] };
    m[k].v += v; if (!m[k].slots.includes(s)) m[k].slots.push(s);
  }
  return Object.values(m).sort((a, b) => b.v - a.v);
}

function useCtx() {
  const S = app.S, day = dayOf(S, dateStr());
  const foods = allFoods(S), byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const T = targetsOf(S.profile, day);
  const plan = day.plan;
  return { S, day, foods, byId, T, plan, tp: sumItems(planItems(plan), (id) => byId[id]), te: sumItems(planItems(plan, true), (id) => byId[id]) };
}

// 记住上一次的值，用来判断「刚刚越过了线」
function usePrev(v) { const r = useRef(v); useEffect(() => { r.current = v; }); return r.current; }

function Meter({ kind, plan, eaten, line, max }) {
  const pw = Math.min(100, (plan / max) * 100), ew = Math.min(100, (eaten / max) * 100), lw = Math.min(100, (line / max) * 100);
  return html`<div class=${"nbar " + kind}>
    <i class="pl" style=${`width:${pw}%`}></i><i class="ea" style=${`width:${ew}%`}></i>
    <i class="mk" style=${`left:${lw}%`}></i>
  </div>`;
}

export function NaFbCard({ tp, te, T }) {
  const ref = useRef(null);
  const fbRef = useRef(null);
  useReveal(ref);
  const naOver = tp.na > T.naMax, fbOk = tp.fb >= T.fbMin;
  const prevNa = usePrev(Math.round(tp.na)), prevOk = usePrev(fbOk);
  const naMax = Math.max(T.naMax * 1.5, tp.na * 1.08), fbMax = Math.max(T.fbMin * 1.3, tp.fb * 1.08);
  // 钠变了：盐瓶抖一下撒盐；纤维刚够：叶子长大、冒粒子
  const shakeKey = prevNa !== Math.round(tp.na) ? Math.round(tp.na) : "s";
  useEffect(() => { if (fbOk && prevOk === false && fbRef.current && !calm()) { burst(fbRef.current, ["#34c759", "#a6e36b", "#5ac8fa"]); haptic(10); } }, [fbOk]);
  return html`<section class=${"nfcard" + (naOver ? " na-over" : "") + (fbOk ? " fb-ok" : "")} ref=${ref} id="nafb">
    <button class="nfhead" onClick=${() => UI.open({ t: "nafb", tab: "na" })}>
      <h3>钠和膳食纤维</h3><span>详情<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></span>
    </button>
    <div class="nfgrid">
      <button class="nfm na" id="nf-na" onClick=${() => UI.open({ t: "nafb", tab: "na" })}>
        <div class="nft"><span class="ico shaker" key=${"k" + shakeKey}>${SHAKER}<i class="g g1"></i><i class="g g2"></i><i class="g g3"></i><i class="g g4"></i></span>钠</div>
        <div class="nfv num"><${Roll} value=${tp.na} id="na-plan" /><small>mg</small></div>
        <div class="nfs">约 ${saltOf(tp.na).toFixed(1)} g 盐 · 上限 ${T.naMax}</div>
        <${Meter} kind="na" plan=${tp.na} eaten=${te.na} line=${T.naMax} max=${naMax} />
        <div class="nfst" key=${naOver ? "o" : "u"}>${naOver ? `多了 ${r0(tp.na - T.naMax)} mg` : `在建议量以内`}</div>
      </button>
      <button class="nfm fb" id="nf-fb" onClick=${() => UI.open({ t: "nafb", tab: "fb" })}>
        <div class="nft"><span class="ico leaf" ref=${fbRef}>${LEAF}<i class="sprout">${LEAF}</i></span>膳食纤维</div>
        <div class="nfv num"><${Roll} value=${tp.fb} id="fb-plan" /><small>g</small></div>
        <div class="nfs">目标 ${T.fbMin} g 以上</div>
        <${Meter} kind="fb" plan=${tp.fb} eaten=${te.fb} line=${T.fbMin} max=${fbMax} />
        <div class="nfst" key=${fbOk ? "y" : "n"}>${fbOk ? "够了" : `还差 ${r0(T.fbMin - tp.fb)} g`}</div>
      </button>
    </div>
    <p class="nflegend"><i class="ea"></i>已吃 <span class="num">${r0(te.na)} mg · ${r0(te.fb)} g</span><i class="pl"></i>今天的安排</p>
  </section>`;
}

// 半圆仪表
function Gauge({ kind, value, line, max, unit, sub }) {
  const q = Math.min(1, value / max), lq = Math.min(1, line / max);
  const R = 92, C = Math.PI * R;
  const ang = (x) => Math.PI * (1 - x);
  const lx = 120 + (R + 14) * Math.cos(ang(lq)), ly = 120 - (R + 14) * Math.sin(ang(lq));
  const lx2 = 120 + (R - 14) * Math.cos(ang(lq)), ly2 = 120 - (R - 14) * Math.sin(ang(lq));
  return html`<div class=${"gauge " + kind}>
    <svg viewBox="0 0 240 132" aria-hidden="true">
      <defs>
        <linearGradient id="g-na" x1="0" x2="1"><stop offset="0" stop-color="#5ac8fa" /><stop offset=".62" stop-color="#7c6cff" /><stop offset="1" stop-color="#ff9f0a" /></linearGradient>
        <linearGradient id="g-fb" x1="0" x2="1"><stop offset="0" stop-color="#c7e86b" /><stop offset="1" stop-color="#1fa855" /></linearGradient>
      </defs>
      <path class="trk" d="M28 120 A92 92 0 0 1 212 120" />
      <path class="val" d="M28 120 A92 92 0 0 1 212 120" stroke=${`url(#g-${kind})`} style=${`stroke-dasharray:${C};stroke-dashoffset:${C * (1 - q)}`} />
      <line class="tick" x1=${lx2} y1=${ly2} x2=${lx} y2=${ly} />
    </svg>
    <div class="gv"><b class="num"><${Roll} value=${value} /></b><small>${unit}</small></div>
    <div class="gs">${sub}</div>
  </div>`;
}

function SourceList({ list, unit, total, color }) {
  if (!list.length) return html`<p class="muted small">今天的安排里还没有。</p>`;
  const top = list[0].v;
  return html`<div class="srcs" style=${"--c:" + color}>${list.slice(0, 8).map((x, i) => html`<div class="src" style=${`--j:${i}`}>
    <div class="sl"><b>${x.f.n}</b><span class="tiny muted">${x.slots.map((s) => SLOT_NAME[s]).join("、")}</span></div>
    <div class="sbar"><i style=${`--w:${Math.max(3, (x.v / top) * 100)}%`}></i></div>
    <div class="sv"><b class="num">${x.v < 10 ? Math.round(x.v * 10) / 10 : r0(x.v)}<small>${unit}</small></b><span class="tiny muted">${total ? "占 " + Math.round((x.v / total) * 100) + "%" : ""}</span></div>
  </div>`)}</div>`;
}

const CURED = ["tea_egg", "duck_leg", "chicken_ready", "chicken_sausage", "dried_tofu", "tuna"];
function naTips(list) {
  const ids = new Set(list.map((x) => x.f.id));
  const out = [];
  if (ids.has("inst_noodle")) out.push("泡面的调料包只放一半、汤不喝完，能少大约 800 mg 钠。");
  if (list.some((x) => x.f.out)) out.push("食堂和外卖的菜，盐大多在汤汁里：夹菜时沥一下，别用汤拌饭。");
  if (list.some((x) => CURED.includes(x.f.id))) out.push("卤蛋、即食鸭腿、鸡肉肠这类即食的钠比较高，可以换一部分成鸡蛋、生鸡胸自己做。");
  out.push("自己做饭时，最后再放盐，用醋、柠檬、葱姜蒜、辣椒提味，盐能少一半。");
  out.push("练得很多、出汗很多的日子，钠可以比平时多一点，但不建议天天超。");
  return out;
}

export function NaFbSheet({ tab: tab0, onClose }) {
  const { S, plan, byId, foods, T, tp, te } = useCtx();
  const [tab, setTab] = useState(tab0 || "na");
  const isNa = tab === "na";
  const list = sources(plan, byId, isNa ? "na" : "fb");
  const inPlan = new Set(planItems(plan).map((x) => x.id));
  // 能补纤维的：勾选了的、纤维多、还没在今天安排里的
  const adds = foods.filter((f) => f.on && f.fb >= 2 && !inPlan.has(f.id) && f.r !== "meal").sort((a, b) => b.fb / Math.max(40, b.k) - a.fb / Math.max(40, a.k)).slice(0, 6);
  const addFood = (f, e) => {
    const el = e.currentTarget;
    const order = f.r === "fruit" || f.r === "fat" || f.r === "dairy" ? ["s", "b", "l", "d"] : ["d", "l", "b", "s"];
    const slot = order.find((s) => f.s.includes(s)) || "s";
    commit((S) => {
      const day = dayOf(S, dateStr());
      if (!day.plan) return;
      const arr = day.plan.meals[slot];
      const hit = arr.find((x) => x.id === f.id);
      if (hit) hit.qty += f.st; else arr.push({ id: f.id, qty: f.st, done: false });
    });
    haptic(10); burst(el, ["#34c759", "#a6e36b", "#5ac8fa"]);
    UI.toast(`已加到${SLOT_NAME[slot]}：${f.n}，纤维 +${r0(f.fb * f.st)} g`);
  };
  const salt = saltOf(tp.na);
  return html`<${Sheet} title="钠和膳食纤维" onClose=${onClose}>
    <${Seg} id="nf-tab" value=${tab} onChange=${setTab} options=${[{ v: "na", n: "钠（盐）" }, { v: "fb", n: "膳食纤维" }]} />
    <div class="card nfdetail" key=${tab}>
      ${isNa ? html`
        <${Gauge} kind="na" value=${tp.na} line=${T.naMax} max=${Math.max(T.naMax * 1.6, tp.na * 1.05)} unit="mg"
          sub=${tp.na > T.naMax ? `比建议上限多 ${r0(tp.na - T.naMax)} mg` : `建议每天不超过 ${T.naMax} mg`} />
        <div class="caps" aria-label=${"约 " + salt.toFixed(1) + " 克盐"}>
          ${Array.from({ length: Math.max(1, Math.ceil(salt / 6)) }, (_, i) => {
            const fill = Math.max(0, Math.min(1, salt / 6 - i));
            return html`<span class="cap" style=${`--i:${i};--f:${fill}`}><i></i></span>`;
          })}
          <p>约 <b class="num">${salt.toFixed(1)}</b> 克盐，差不多 <b class="num">${(salt / 6).toFixed(1)}</b> 个啤酒瓶盖<br /><span class="tiny muted">一平瓶盖盐大约 6 克，建议一天不超过 5 克</span></p>
        </div>`
      : html`
        <${Gauge} kind="fb" value=${tp.fb} line=${T.fbMin} max=${Math.max(T.fbMin * 1.4, tp.fb * 1.05)} unit="g"
          sub=${tp.fb >= T.fbMin ? "够了，肠胃会舒服很多" : `还差 ${r0(T.fbMin - tp.fb)} g 到 ${T.fbMin} g`} />`}
      <div class="kv"><span>已经吃了</span><b class="num">${isNa ? r0(te.na) + " mg" : r0(te.fb) + " g"}</b></div>
      <div class="kv"><span>今天全部安排</span><b class="num">${isNa ? r0(tp.na) + " mg" : r0(tp.fb) + " g"}</b></div>
    </div>
    <div class="card"><h2>主要来自</h2><${SourceList} key=${tab} list=${list} unit=${isNa ? "mg" : "g"} total=${isNa ? tp.na : tp.fb} color=${isNa ? "var(--na)" : "var(--fb)"} /></div>
    ${isNa ? html`<div class="card"><h2>想少一点钠</h2><ul class="tips">${naTips(list).map((t, i) => html`<li style=${`--j:${i}`}>${t}</li>`)}</ul></div>`
    : html`
      ${adds.length && plan ? html`<div class="card"><h2>想多一点纤维，可以加</h2><div class="chips fbadd">
        ${adds.map((f, i) => html`<button class="chip" style=${`--j:${i}`} onClick=${(e) => addFood(f, e)}>${f.n}<b class="num">+${r0(f.fb * f.st)} g</b></button>`)}
      </div><p class="tiny muted" style="margin:10px 0 0">点一下就加进今天合适的那一餐，热量也会跟着变。</p></div>` : null}
      <div class="card"><h2>小知识</h2><ul class="tips">
        <li style="--j:0">纤维让人更饱、更不容易饿，也帮助肠道和控制血糖。主要在粗粮、豆子、蔬菜、水果里，肉、蛋、奶、蛋白粉里几乎没有。</li>
        <li style="--j:1">肚子容易胀气的人，每天比前一天多加 5 g 左右就好，慢慢加，同时多喝水。</li>
        <li style="--j:2">水果整个吃比榨汁好，果汁里的纤维基本没了。</li>
      </ul></div>`}
    <p class="tiny muted">数字是常见食物的典型值。包装食品以营养成分表上的「钠」为准，可以在「食物」页点进去改。</p>
  <//>`;
}
