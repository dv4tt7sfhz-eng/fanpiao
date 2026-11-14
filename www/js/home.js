// 1.9.0 新的结构：今日（封面卡 + 快捷栏 + 身体数据 + 打卡等级）、点封面展开的两个详情页、计划、发现、我的
import { html, useState, useEffect, useRef, app, commit, UI, Sheet, r0, yuan, num } from "./ui.js";
import { sumItems, planItems, SLOTS, SLOT_NAME, GOALS, targetsOf } from "./nutrition.js";
import { allFoods, dateStr, addDays } from "./store.js";
import { context, replanLocal, issues, streakOf, MEAL_ICON, Meal } from "./today.js";
import { NaFbCard } from "./nafb.js";
import { Calendar, Records } from "./records.js";
import { PlanList } from "./plansview.js";
import { KIND, planOf, rhythm, dayInfo, dayLabel, targetsFor } from "./plans.js";
import { FoodsView } from "./foodsview.js";
import { searchLib, LibRow, libSize } from "./lib.js";
import { CATS } from "./foods.js";
import { haptic, burst, fullFx, Roll, calm } from "./fx.js";
import { Num, KSeg } from "./motion.js";
import { Me } from "./me.js";

const WK = "日一二三四五六";
const WD = "一二三四五六日";
const I = {
  edit: "M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM14 7l3 3",
  arrow: "M5 12h14M13 6l6 6-6 6",
  down: "M6 9l6 6 6-6",
  chev: "M9 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  stats: "M5 20V12M10 20V6M15 20v-9M20 20V4",
  fav: "M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z",
  cal: "M5 6.5h14v13H5zM5 10.5h14M9 4v4M15 4v4",
  plan: "M5 19V13M10 19V8M15 19v-4M20 19V5",
  lib: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4.5 4.5",
  cam: "M4 8.5h3.5L9 6h6l1.5 2.5H20V19H4zM12 16.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z",
  ai: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  rank: "M12 3l7 5-7 13L5 8zM5 8h14M9.5 8 12 21l2.5-13M9 3.5 9.5 8M15 3.5 14.5 8",
  theme: "M12 4a8 8 0 1 0 0 16c1.6 0 1.8-1.4 1.2-2.2-.8-1 .1-2.3 1.4-2.3H17a3 3 0 0 0 3-3.2C19.6 7.5 16.2 4 12 4zM8 11h.01M11 8h.01M15 8.5h.01",
  flame: "M12 3c.8 3.2 5 5 5 10a5 5 0 0 1-10 0c0-2.2 1.1-3.6 2.2-4.6.2 1.6 1 2.6 1.9 3 0-3.2 0-5.4.9-8.4z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2 1.2l-.3 2h-4l-.3-2a7 7 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3L2.6 9.3l2-3.4 1.9.7a7 7 0 0 1 2-1.2l.3-2h4l.3 2a7 7 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3z",
  x: "M7 7l10 10M17 7L7 17",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  say: "M5 6.5h14v9.5H10l-4 3.5v-3.5H5z",
};
export const Ic = ({ d, cls }) => html`<svg class=${cls} viewBox="0 0 24 24" aria-hidden="true"><path d=${d} /></svg>`;
const fmt = (n) => Math.round(n).toLocaleString("en-US");

// ---------- 打卡等级（对应 Norg 的段位）：吃了一天 +10，全吃完再 +10，记一次体重 +5 ----------
const TIERS = ["黑铁", "青铜", "白银", "黄金", "铂金", "钻石", "大师"];
const ROMAN = ["I", "II", "III"];
export function levelOf(S) {
  let xp = 0;
  for (const day of Object.values(S.days)) {
    if (!day || !day.plan) continue;
    const it = planItems(day.plan), done = it.filter((x) => x.done).length;
    if (done) xp += 10;
    if (it.length && done === it.length) xp += 10;
  }
  xp += S.weights.length * 5;
  let lv = 0, need = 120, left = xp;
  while (left >= need && lv < TIERS.length * 3 - 1) { left -= need; lv++; need = 120 + lv * 40; }
  const name = (i) => TIERS[Math.floor(i / 3)] + " " + ROMAN[i % 3];
  return { xp, lv, cur: left, need, name: name(lv), next: lv < TIERS.length * 3 - 1 ? name(lv + 1) : "", tier: Math.floor(lv / 3) };
}
const RANKC = ["#8a8f9c", "#c4834e", "#c9d2e0", "#f2c14e", "#62e0d0", "#7ab8ff", "#c58bff"];
export function RankGem({ tier = 0, size = 46 }) {
  const c = RANKC[tier] || RANKC[0], id = "rg" + tier;
  return html`<svg class="gem" width=${size} height=${size} viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id=${id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:#fff" /><stop offset=".45" style=${"stop-color:" + c} /><stop offset="1" style=${"stop-color:" + c + ";stop-opacity:.35"} /></linearGradient></defs>
    <path d="M24 3 43 17 24 45 5 17z" fill=${`url(#${id})`} opacity=".9" />
    <path d="M24 3 33 17 24 45 15 17zM5 17h38" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" />
    <path d="M24 3 33 17H15z" fill="rgba(255,255,255,.35)" />
  </svg>`;
}

// ---------- 封面上的插画：饮食面是一碗饭，计划面是一排发光的柱子 ----------
const BowlArt = () => html`<svg class="art bowl" viewBox="0 0 220 220" aria-hidden="true">
  <defs>
    <radialGradient id="ricg" cx="40%" cy="30%" r="70%"><stop offset="0" style="stop-color:#fff" /><stop offset=".55" style="stop-color:#f1ece4" /><stop offset="1" style="stop-color:#b9b2a8" /></radialGradient>
    <linearGradient id="bwlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#3a3a44" /><stop offset=".5" style="stop-color:#1a1a20" /><stop offset="1" style="stop-color:#0a0a0d" /></linearGradient>
    <linearGradient id="bwrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:rgba(255,255,255,.1)" /><stop offset=".35" style="stop-color:rgba(255,255,255,.75)" /><stop offset="1" style="stop-color:rgba(255,255,255,.08)" /></linearGradient>
    <radialGradient id="egg" cx="45%" cy="40%" r="60%"><stop offset="0" style="stop-color:#ffd36b" /><stop offset=".7" style="stop-color:#ff9a2e" /><stop offset="1" style="stop-color:#c4561a" /></radialGradient>
    <radialGradient id="brc" cx="40%" cy="35%" r="70%"><stop offset="0" style="stop-color:#b8f07a" /><stop offset="1" style="stop-color:#1f7a3a" /></radialGradient>
    <radialGradient id="glw" cx="50%" cy="50%" r="50%"><stop offset="0" style="stop-color:var(--g1);stop-opacity:.7" /><stop offset="1" style="stop-color:var(--g1);stop-opacity:0" /></radialGradient>
  </defs>
  <ellipse cx="110" cy="128" rx="104" ry="80" fill="url(#glw)" />
  <g class="steam"><path d="M86 52c-8-10 8-16 0-28" /><path d="M110 46c-8-10 8-16 0-28" /><path d="M134 52c-8-10 8-16 0-28" /></g>
  <path d="M60 104c-6 6-10 14-10 20" fill="none" />
  <ellipse cx="110" cy="104" rx="76" ry="22" fill="#121216" />
  <path d="M42 102c4-26 30-46 68-46s64 20 68 46z" fill="url(#ricg)" />
  <g class="tops">
    <ellipse cx="88" cy="80" rx="18" ry="11" fill="#fbfaf6" /><ellipse cx="90" cy="80" rx="9" ry="7" fill="url(#egg)" />
    <circle cx="128" cy="76" r="9" fill="url(#brc)" /><circle cx="138" cy="84" r="8" fill="url(#brc)" /><circle cx="122" cy="86" r="7" fill="url(#brc)" />
    <path d="M100 92c10-6 22-6 30 0" stroke="#ff7a5a" stroke-width="6" stroke-linecap="round" fill="none" />
  </g>
  <path d="M34 104h152c-4 44-36 72-76 72s-72-28-76-72z" fill="url(#bwlg)" />
  <path d="M34 104h152" stroke="url(#bwrim)" stroke-width="3" stroke-linecap="round" />
  <path d="M52 120c8 26 30 42 58 44" stroke="rgba(255,255,255,.2)" stroke-width="3" stroke-linecap="round" fill="none" />
  <path d="M88 176h44l-4 10H92z" fill="#0e0e12" />
  <g class="sticks"><path d="M150 30 196 96" stroke="#d9b98a" stroke-width="5" stroke-linecap="round" /><path d="M162 26 204 90" stroke="#c9a678" stroke-width="5" stroke-linecap="round" /></g>
</svg>`;

const BarsArt = ({ seq }) => {
  const H = { H: 1, M: 0.66, L: 0.42 };
  const s = (seq || "LLLHLLL").slice(0, 7).padEnd(7, "M");
  return html`<svg class="art bars" viewBox="0 0 220 220" aria-hidden="true">
    <defs>
      <linearGradient id="bhf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#fff" /><stop offset=".55" style="stop-color:#ffd2a8" /><stop offset="1" style="stop-color:#ff6a4a" /></linearGradient>
      <linearGradient id="bnf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:rgba(255,255,255,.55)" /><stop offset="1" style="stop-color:rgba(255,255,255,.06)" /></linearGradient>
      <radialGradient id="bglw" cx="50%" cy="60%" r="50%"><stop offset="0" style="stop-color:#ff8a5c;stop-opacity:.55" /><stop offset="1" style="stop-color:#ff8a5c;stop-opacity:0" /></radialGradient>
    </defs>
    <ellipse cx="120" cy="150" rx="90" ry="60" fill="url(#bglw)" />
    ${[...s].map((k, i) => { const h = 34 + H[k] * 120, x = 30 + i * 24, y = 190 - h - i * 4; const hi = k === "H";
      return html`<g class="bar3" style=${`--i:${i}`}>
        <path d=${`M${x} ${y + 6}l10-6 10 6v${h}l-10 6-10-6z`} fill=${hi ? "url(#bhf)" : "url(#bnf)"} opacity=${hi ? 1 : 0.85} />
        <path d=${`M${x} ${y + 6}l10-6 10 6-10 6z`} fill=${hi ? "#fff" : "rgba(255,255,255,.6)"} />
        <path d=${`M${x + 10} ${y + 12}v${h}l10-6v-${h}z`} fill="rgba(0,0,0,.28)" />
      </g>`; })}
  </svg>`;
};

// ---------- 今日页 ----------
export function Today() {
  const { S, d, day, byId, T, info } = context();
  useEffect(() => { if (!day.plan) replanLocal(false); }, [d, !!day.plan]);
  const plan = day.plan, get = (id) => byId[id];
  const tp = sumItems(planItems(plan), get), te = sumItems(planItems(plan, true), get);
  const streak = streakOf(S, d);
  const lv = levelOf(S);
  return html`
    <header class="nhead">
      <span class="logo"><${Logo} />饭票</span>
      <span class="nhr"><span class="probadge">${KIND[T.kind] ? KIND[T.kind].s : GOALS[T.goal].n}</span>
        <button class="flame" id="streak" onClick=${() => UI.go("me")} aria-label=${"连续记录 " + streak + " 天"}><${Ic} d=${I.flame} /><b class="num">${streak}</b></button></span>
    </header>
    <${Cover} S=${S} d=${d} T=${T} info=${info} tp=${tp} te=${te} plan=${plan} />
    <${Dock} />
    <${BodyData} S=${S} te=${te} T=${T} />
    <button class="rankcard" id="rank-card" onClick=${() => UI.open({ t: "rank" })}>
      <${RankGem} tier=${lv.tier} />
      <span class="rk"><small>打卡等级</small><b>${lv.name}</b><span>吃完一样打个勾，就能涨经验</span>
        <span class="xpbar"><i style=${`--v:${Math.min(1, lv.cur / lv.need)}`}></i></span>
        <span class="xpl num"><span>${lv.cur} / ${lv.need} XP</span><span>${lv.next}</span></span></span>
      <${Ic} d=${I.chev} cls="chev" />
    </button>
    <p class="hint">点上面的大卡片，看今天吃什么、记录饮食。</p>`;
}

const Logo = () => html`<svg class="logomark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5z" /><path class="cut" d="M9 5v14" /></svg>`;

function Cover({ S, d, T, info, tp, te, plan }) {
  const [face, setFace] = useState(() => (app.coverFace || "diet"));
  const box = useRef(null), sw = useRef(null);
  const set = (f) => { if (f === face) return; haptic(5); app.coverFace = f; setFace(f); };
  const meals = plan ? SLOTS.filter((s) => plan.meals[s].some((it) => it.done)).length : 0;
  const pct = T.kcal ? Math.min(1, te.kcal / T.kcal) : 0;
  const left = Math.max(0, T.kcal - te.kcal);
  const open = (e) => {
    if (e.target.closest("button")) return;
    if (sw.current && sw.current.moved) return;
    const r = box.current.getBoundingClientRect();
    UI.page({ t: face, from: r });
  };
  // 左右滑换面
  const down = (e) => { sw.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const move = (e) => { const s = sw.current; if (!s) return; if (Math.abs(e.clientX - s.x) > 12) s.moved = true; };
  const up = (e) => { const s = sw.current; if (!s) return; const dx = e.clientX - s.x; if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(e.clientY - s.y)) set(dx < 0 ? "plan" : "diet"); setTimeout(() => { sw.current = null; }, 0); };
  const rows = rhythm(S, d, 7);
  const lab = dayLabel(S, d);
  const pname = S.cycle && S.cycle.name ? S.cycle.name : info.plan.n;
  const kd = face === "plan" ? (T.kind || "N") : "D";
  return html`<section class=${"cover kd-" + kd} ref=${box} id="cover" onClick=${open} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${() => { sw.current = null; }} aria-label="今天">
    <div class="cv-bg" aria-hidden="true"><i class="l1"></i><i class="l2"></i><i class="l3"></i></div>
    <div class="cv-art" key=${face}>${face === "diet" ? html`<${BowlArt} />` : html`<${BarsArt} seq=${rows.map((r) => r.kind || "M").join("")} />`}</div>
    <div class="cv-sheen" aria-hidden="true"></div>
    <div class="cv-top">
      <div class="fsw" role="tablist" style=${`--at:${face === "plan" ? 1 : 0}`}>
        <i class="th" aria-hidden="true"><i key=${face}></i></i>
        <button role="tab" id="face-diet" aria-selected=${String(face === "diet")} onClick=${() => set("diet")}>饮食</button>
        <button role="tab" id="face-plan" aria-selected=${String(face === "plan")} onClick=${() => set("plan")}>计划</button>
      </div>
      <button class="cv-ic" id="goal-chip" onClick=${() => UI.open({ t: "target" })} aria-label="今天的目标"><${Ic} d=${I.edit} /><span class="sr">${T.kind ? KIND[T.kind].n : GOALS[T.goal].n + "目标"}</span></button>
    </div>
    ${face === "diet" ? html`<div class="cv-face" key="diet">
      <div class="cv-big"><b class="num" id="kcal-eaten"><${Num} v=${te.kcal} f=${fmt} up /></b><em>kcal</em></div>
      <span class="cv-sub">已记录 ${meals} 餐 · 还可以吃 <b class="num" id="kcal-left">${fmt(left)}</b></span>
      <div class="cv-bar"><span class="trk"><i style=${`--v:${pct.toFixed(3)}`}></i></span><b class="num">${Math.round(pct * 100)}%</b></div>
      <div class="cv-mac">
        ${[["蛋白质", te.p, T.protein], ["碳水", te.cb, T.carb], ["脂肪", te.f, T.fat]].map(([n, v, t], i) => html`<div style=${`--i:${i}`}><small>${n}</small><b class="num">${r0(v)}g</b><i style=${`--v:${t ? Math.min(1, v / t).toFixed(3) : 0}`}></i></div>`)}
      </div>
      <div class="cv-arc"><svg viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="M2 38Q150 -14 298 38" /></svg><span>建议 <b class="num" id="kcal-target">${fmt(T.kcal)}</b> kcal</span></div>
    </div>` : html`<div class="cv-face" key="plan">
      <span class="cv-sub up">${pname}</span>
      <h2 class="cv-title">${T.kind ? KIND[T.kind].n : "照常吃"}</h2>
      <span class="cv-sub">${lab || (T.kind ? KIND[T.kind].d : "每天一样，稳稳来")}</span>
      <div class="cv-days">${rows.map((r, i) => html`<span class=${"k-" + (r.kind || "N") + (i === 0 ? " now" : "")} style=${`--i:${i}`}><i></i><small>${i === 0 ? "今" : WK[new Date(r.d + "T12:00:00").getDay()]}</small></span>`)}</div>
      <button class="cv-cta" id="cover-cta" onClick=${() => UI.open({ t: "plan" })}>换计划<i><${Ic} d=${I.arrow} /></i></button>
    </div>`}
  </section>`;
}

// 封面下面一排：中间大、两边小，可以左右滑
const DOCK = [
  { n: "日历", d: I.cal, go: () => UI.page({ t: "diet", cal: true }) },
  { n: "饮食计划", d: I.plan, go: () => UI.go("plan") },
  { n: "打卡等级", d: I.rank, go: () => UI.open({ t: "rank" }) },
  { n: "主题色", d: I.theme, go: () => UI.open({ t: "theme" }) },
  { n: "食物库", d: I.lib, go: () => UI.go("find") },
  { n: "拍一下", d: I.cam, go: () => UI.open({ t: "snap" }) },
  { n: "AI 排餐", d: I.ai, go: () => UI.open({ t: "ai" }) },
];
function Dock() {
  const ref = useRef(null);
  const [mid, setMid] = useState(2);
  const calc = () => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2; let best = 0, bd = 9;
    [...el.children].forEach((c, i) => { const b = c.getBoundingClientRect(), dd = Math.min(1.6, Math.abs(b.left + b.width / 2 - cx) / 84); c.style.setProperty("--d", dd.toFixed(3)); if (dd < bd) { bd = dd; best = i; } });
    setMid(best);
  };
  useEffect(() => { const el = ref.current; if (!el) return; el.scrollLeft = 2 * 84; calc(); }, []);
  return html`<div class="dock" ref=${ref} onScroll=${calc}>
    ${DOCK.map((x, i) => html`<button class=${"dk" + (i === mid ? " mid" : "")} style=${`--i:${i}`} id=${"dock-" + i} onClick=${(e) => {
      const el = e.currentTarget; el.classList.remove("tap"); void el.offsetWidth; el.classList.add("tap"); haptic(6);
      if (i !== mid) { el.scrollIntoView({ inline: "center", block: "nearest", behavior: calm() ? "auto" : "smooth" }); setTimeout(x.go, 260); } else x.go();
    }}><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d=${x.d} pathLength="1" /></svg></span><b>${x.n}</b></button>`)}
  </div>`;
}

// ---------- 身体数据卡片 ----------
const CARDS = {
  weight: { n: "今天体重", g: "身体" },
  macro: { n: "三大营养", g: "饮食" },
  na: { n: "钠", g: "饮食" },
  fb: { n: "膳食纤维", g: "饮食" },
  cost: { n: "今天花费", g: "饮食" },
  streak: { n: "连续记录", g: "身体" },
};
const CARD_GROUPS = ["常用", "饮食", "身体"];
const COMMON = ["weight", "macro", "na", "streak"];

function weekRows(S, n = 7) {
  const byId = Object.fromEntries(allFoods(S).map((f) => [f.id, f])), today = dateStr(), out = [];
  for (let i = n - 1; i >= 0; i--) { const d = addDays(today, -i), day = S.days[d]; out.push({ d, t: day && day.plan ? sumItems(planItems(day.plan, true), (id) => byId[id]) : null }); }
  return out;
}

export function DataCard({ k, S, te, T, demo }) {
  const c = CARDS[k];
  let body = null;
  if (k === "weight") {
    const ws = S.weights.slice(-7);
    const kg = ws.length ? ws[ws.length - 1].kg : S.profile.weight;
    const diff = ws.length > 1 ? ws[ws.length - 1].kg - ws[0].kg : 0;
    const vs = ws.length > 1 ? ws.map((w) => w.kg) : [kg, kg];
    const lo = Math.min(...vs) - 0.3, hi = Math.max(...vs) + 0.3;
    const pts = vs.map((v, i) => [2 + (i * 134) / (vs.length - 1), 6 + (1 - (v - lo) / (hi - lo)) * 32]);
    const dd = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const last = pts[pts.length - 1];
    body = html`<span class="wv num">${kg.toFixed(1)}<small>kg</small></span>
      ${ws.length > 1 ? html`<span class=${"delta" + (diff > 0 ? " up" : "")}>${diff > 0 ? "+" : ""}${diff.toFixed(1)} 这周</span>` : html`<span class="delta mute">记两次就有趋势</span>`}
      <svg class="spk" viewBox="0 0 140 44"><defs><linearGradient id="spkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tint);stop-opacity:.28" /><stop offset="1" style="stop-color:var(--tint);stop-opacity:0" /></linearGradient></defs>
        <path class="ar" d=${dd + ` V44 H2z`} fill="url(#spkg)" /><path class="ln" pathLength="1" d=${dd} />
        <circle class="halo" cx=${last[0]} cy=${last[1]} r="4" /><circle class="pt" cx=${last[0]} cy=${last[1]} r="4" /></svg>`;
  } else if (k === "macro") {
    const e = te.p * 4 + te.cb * 4 + te.f * 9;
    const parts = e > 0 ? [te.p * 4 / e, te.cb * 4 / e, te.f * 9 / e] : [0.3, 0.45, 0.25];
    let acc = 0;
    body = html`<div class="tri"><svg viewBox="0 0 86 86"><circle class="tr" cx="43" cy="43" r="34" />
      ${parts.map((p, i) => { const g = 0.025, st = acc; acc += p; return html`<circle class="a" cx="43" cy="43" r="34" pathLength="1" style=${`--i:${i};--len:${Math.max(0, p - g).toFixed(3)};stroke:var(${["--c-p", "--c-cb", "--c-fat"][i]});transform:rotate(${st * 360}deg);transform-origin:center;opacity:${e > 0 ? 1 : 0.3}`} />`; })}
      </svg><b class="num">${r0(te.kcal)}<small>kcal</small></b></div>
      <div class="legend"><span><i style="--i:0;background:var(--c-p)"></i>${r0(te.p)}<small>蛋白</small></span><span><i style="--i:1;background:var(--c-cb)"></i>${r0(te.cb)}<small>碳水</small></span><span><i style="--i:2;background:var(--c-fat)"></i>${r0(te.f)}<small>脂肪</small></span></div>`;
  } else if (k === "na") {
    const v = Math.min(1, (te.na || 0) / (T.naMax || 2000));
    body = html`<span class="wv num">${fmt(te.na || 0)}<small>/ ${fmt(T.naMax || 2000)} mg</small></span>
      <div class="gauge" style=${`--v:${v.toFixed(3)}`}><svg viewBox="0 0 120 60"><path class="tk" d="M12 56 A48 48 0 0 1 108 56" /><path class="fl" pathLength="1" d="M12 56 A48 48 0 0 1 108 56" />
        <g class="nd"><path d="M60 56 L60 20" /><circle cx="60" cy="56" r="5" /></g></svg></div>`;
  } else if (k === "fb") {
    const rows = weekRows(S), mx = Math.max(T.fbMin || 25, ...rows.map((r) => (r.t ? r.t.fb : 0)));
    body = html`<span class="wv num">${r0(te.fb || 0)}<small>/ ${r0(T.fbMin || 25)} g</small></span>
      <div class="leafbar">${rows.map((r, i) => { const v = r.t ? r.t.fb : 0; return html`<i class=${v >= (T.fbMin || 25) ? "ok" : ""} style=${`--h:${Math.max(0.06, v / mx).toFixed(3)};--i:${i}`}></i>`; })}</div>`;
  } else if (k === "cost") {
    const b = S.prefs.budget || 0;
    body = html`<span class="wv num">¥${yuan(te.cost || 0)}<small>${b ? "/ " + b + " 元" : ""}</small></span>
      <div class="cbar"><i style=${`--v:${b ? Math.min(1, (te.cost || 0) / b).toFixed(3) : 0.3}`}></i></div><span class="mini">${b ? (te.cost > b ? "超出预算" : "预算还剩 ¥" + yuan(b - (te.cost || 0))) : "没设预算"}</span>`;
  } else if (k === "streak") {
    const n = streakOf(S, dateStr()), rows = weekRows(S);
    body = html`<span class="wv num">${n}<small>天</small></span>
      <div class="sdots">${rows.map((r, i) => html`<i class=${r.t && r.t.kcal > 0 ? "on" : ""} style=${`--i:${i}`}></i>`)}</div>`;
  }
  return html`<div class=${"wcard k-" + k + (demo ? " demo" : "")}>
    <span class="wt">${c.n}<${Ic} d=${I.chev} /></span>${body}</div>`;
}

function BodyData({ S, te, T }) {
  const [edit, setEdit] = useState(false);
  const cards = S.prefs.cards || ["weight", "macro"];
  const tap = (k) => {
    if (edit) return;
    if (k === "na" || k === "fb") UI.open({ t: "nafb", tab: k });
    else if (k === "macro") UI.open({ t: "target" });
    else if (k === "weight" || k === "streak") UI.go("me");
    else UI.page({ t: "diet" });
  };
  const rm = (k) => commit((S) => { S.prefs.cards = cards.filter((x) => x !== k); });
  return html`<section class="bdata">
    <div class="sech"><h2><i class="dot"></i>身体数据</h2><button class="lnk" id="cards-edit" onClick=${() => setEdit(!edit)}>${edit ? "完成" : "编辑"}</button></div>
    <div class=${"wgrid" + (edit ? " editing" : "")}>
      ${cards.map((k, i) => html`<div class="wslot" key=${k} style=${`--r:${Math.floor(i / 2)};--c:${i % 2}`} onClick=${() => tap(k)}>
        <${DataCard} k=${k} S=${S} te=${te} T=${T} />
        ${edit ? html`<button class="rmx" aria-label=${"去掉" + CARDS[k].n} onClick=${(e) => { e.stopPropagation(); rm(k); }}><${Ic} d="M6 12h12" /></button>` : null}
      </div>`)}
      <button class="wadd" id="cards-add" style=${`--r:${Math.floor(cards.length / 2)};--c:${cards.length % 2}`} onClick=${() => UI.open({ t: "cards" })} aria-label="添加数据卡片"><${Ic} d=${I.plus} /></button>
    </div>
  </section>`;
}

export function CardsSheet({ onClose }) {
  const { S, T, byId, day } = context();
  const te = sumItems(planItems(day.plan, true), (id) => byId[id]);
  const [g, setG] = useState("常用");
  const cards = S.prefs.cards || ["weight", "macro"];
  const list = Object.keys(CARDS).filter((k) => (g === "常用" ? COMMON.includes(k) : CARDS[k].g === g));
  const add = (k) => { haptic(8); commit((S) => { const c = S.prefs.cards || ["weight", "macro"]; S.prefs.cards = c.includes(k) ? c.filter((x) => x !== k) : [...c, k]; }); };
  return html`<${Sheet} title="添加数据卡片" onClose=${onClose}>
    <div class="utabs">${CARD_GROUPS.map((x) => html`<button aria-pressed=${String(g === x)} onClick=${() => setG(x)}>${x}<small>${x === "常用" ? COMMON.length : Object.keys(CARDS).filter((k) => CARDS[k].g === x).length}</small></button>`)}</div>
    <p class="tiny muted">示例数据，轻点卡片添加或移除</p>
    <div class="wgrid pick" key=${g}>
      ${list.map((k, i) => html`<div class="wslot" style=${`--r:${Math.floor(i / 2)};--c:${i % 2}`}>
        <button class="wpick" onClick=${() => add(k)} aria-pressed=${String(cards.includes(k))}><${DataCard} k=${k} S=${S} te=${te} T=${T} demo /></button>
        <span class="wst">${cards.includes(k) ? html`<${Ic} d="M5 12.5l4.5 4.5L19 7.5" />已添加` : html`<${Ic} d=${I.plus} />添加`}</span>
      </div>`)}
    </div>
    <button class="btn primary block" onClick=${onClose}>完成</button>
  <//>`;
}

export function RankSheet({ onClose }) {
  const S = app.S, lv = levelOf(S);
  return html`<${Sheet} title="打卡等级" onClose=${onClose}>
    <div class="rankhero"><${RankGem} tier=${lv.tier} size=${96} /><b>${lv.name}</b><span class="num">一共 ${lv.xp} XP</span>
      <span class="xpbar big"><i style=${`--v:${Math.min(1, lv.cur / lv.need)}`}></i></span><span class="small muted num">离 ${lv.next || "满级"} 还差 ${lv.need - lv.cur} XP</span></div>
    <div class="card"><div class="kv"><span>这一天吃了东西（打了勾）</span><b class="num">+10</b></div><div class="kv"><span>这一天的都吃完了</span><b class="num">+10</b></div><div class="kv"><span>记一次体重</span><b class="num">+5</b></div></div>
    <div class="ranks">${TIERS.map((t, i) => html`<div class=${"rk" + (i === lv.tier ? " on" : i < lv.tier ? " got" : "")}><${RankGem} tier=${i} size=${40} /><small>${t}</small></div>`)}</div>
  <//>`;
}

// ---------- 主题色（对应 Norg 的主题市场） ----------
export const ACCENTS = [["", "海", "#4ea1ff", "深海里透上来的蓝"], ["berry", "莓", "#ff5c7a", "熟透的树莓"], ["pine", "松", "#2fd6a0", "雨后的松针"], ["iris", "藤", "#9b85ff", "傍晚的紫藤"], ["persimmon", "柿", "#ff9a3c", "挂在枝头的柿子"]];
export function setAccent(id, at) {
  const go = () => commit((S) => { S.prefs.accent = id; });
  const root = document.documentElement;
  if (at) { root.style.setProperty("--tx", at.x + "px"); root.style.setProperty("--ty", at.y + "px"); root.style.setProperty("--tr", Math.ceil(Math.hypot(Math.max(at.x, innerWidth - at.x), Math.max(at.y, innerHeight - at.y))) + "px"); }
  if (document.startViewTransition && !calm()) document.startViewTransition(() => { go(); root.dataset.accent = id; }); else go();
}
export function ThemePicker() {
  const S = app.S, cur = S.prefs.accent || "";
  return html`<div class="tmarket">
    <div class="tdots card">${ACCENTS.map(([id, n, c], i) => html`<button class="tdot" style=${`--i:${i};--c:${c}`} aria-pressed=${String(cur === id)} aria-label=${n} onClick=${(e) => { const r = e.currentTarget.getBoundingClientRect(); haptic(8); setAccent(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }}><i></i></button>`)}</div>
    <h3 class="subh">主题卡片</h3>
    <div class="tcards">${ACCENTS.map(([id, n, c, d], i) => html`<button class="tcard" style=${`--i:${i};--c:${c}`} aria-pressed=${String(cur === id)} onClick=${(e) => { const r = e.currentTarget.getBoundingClientRect(); setAccent(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }}>
      <span class="tcv"><span class="tsw"></span><${BowlArt} /></span><b>${n}</b><small>${d}</small>${cur === id ? html`<span class="ck"><${Ic} d="M5 12.5l4.5 4.5L19 7.5" /></span>` : null}</button>`)}</div>
  </div>`;
}
export function ThemeSheet({ onClose }) {
  return html`<${Sheet} title="主题色" onClose=${onClose}><p class="small muted">按钮、图标、选中的东西都会换成这个颜色。</p><${ThemePicker} /><//>`;
}

// ---------- 详情页外壳：从封面卡片的位置长成整页 ----------
export function DPage({ pg, onClose }) {
  const [on, setOn] = useState(false);
  const r = pg.from;
  const st = r ? `--it:${r.top}px;--il:${r.left}px;--ir:${innerWidth - r.right}px;--ib:${Math.max(0, innerHeight - r.bottom)}px` : "--it:100%;--il:0px;--ir:0px;--ib:0px";
  useEffect(() => { const a = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true))); return () => cancelAnimationFrame(a); }, []);
  const Body = pg.t === "plan" ? PlanPage : DietPage;
  return html`<div class=${"dpage" + (on && !pg.closing ? " on" : "") + (pg.closing ? " out" : "") + (r ? " exp" : "")} style=${st} role="dialog" aria-modal="true">
    <${Body} pg=${pg} onClose=${onClose} />
  </div>`;
}

function PHead({ onClose, right }) {
  const n = new Date();
  return html`<div class="phead rv" style="--i:0">
    <button class="pclose" id="page-close" onClick=${onClose} aria-label="收起"><${Ic} d=${I.down} /></button>
    <span class="pdate">${n.getMonth() + 1}月${n.getDate()}日 · 今日</span>
    <span class="pr">${right}</span>
  </div>`;
}

// 一周日期条，往下拉（或点小横条）展开成整个月
function WeekStrip({ S, open, setOpen }) {
  const today = dateStr(), base = new Date(today + "T12:00:00"), mon = addDays(today, -((base.getDay() + 6) % 7));
  const ds = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const ate = (d) => { const x = S.days[d]; return !!(x && x.plan && planItems(x.plan, true).length); };
  const y0 = useRef(null);
  return html`<div class=${"wstrip" + (open ? " open" : "")} onPointerDown=${(e) => { y0.current = e.clientY; }} onPointerUp=${(e) => { if (y0.current != null && e.clientY - y0.current > 40) setOpen(true); if (y0.current != null && e.clientY - y0.current < -40) setOpen(false); y0.current = null; }}>
    ${open ? html`<div class="wcal"><${Calendar} /></div>` : html`<div class="wdays">${ds.map((d, i) => { const k = dayInfo(S, d).kind; return html`<span class=${"wd" + (d === today ? " now" : "") + (d > today ? " fut" : "") + (k ? " k-" + k : "")} style=${`--i:${i}`}>
      <small>${WD[i]}</small><b class="num">${+d.slice(8)}</b><i class=${ate(d) ? "on" : ""}></i></span>`; })}</div>`}
    <button class="grabber" id="cal-toggle" onClick=${() => setOpen(!open)} aria-label=${open ? "收起日历" : "展开日历"}><i></i></button>
  </div>`;
}

function DietPage({ pg, onClose }) {
  const { S, d, day, byId, T } = context();
  const [cal, setCal] = useState(!!pg.cal);
  const [tipOff, setTipOff] = useState(false);
  const plan = day.plan, get = (id) => byId[id];
  const tp = sumItems(planItems(plan), get), te = sumItems(planItems(plan, true), get);
  const pct = T.kcal ? Math.min(1, te.kcal / T.kcal) : 0;
  const meals = plan ? SLOTS.filter((s) => plan.meals[s].some((it) => it.done)).length : 0;
  const prob = plan ? issues(tp, T, S.prefs.budget) : [];
  const items = planItems(plan), allDone = items.length > 0 && items.every((it) => it.done);
  return html`<div class="pbody2">
    <${PHead} onClose=${onClose} right=${html`<button class="pic" id="tgt-open" onClick=${() => UI.open({ t: "target" })} aria-label="目标怎么算的"><${Ic} d=${I.stats} /></button>`} />
    <div class="dsum rv" style="--i:1">
      <div class="cv-big"><b class="num"><${Num} v=${te.kcal} f=${fmt} /></b><em>kcal</em></div>
      <span class="cv-sub">已记录 ${meals} 餐</span>
      <div class="cv-bar"><span class="trk"><i style=${`--v:${pct.toFixed(3)}`}></i></span><b class="num">${Math.round(pct * 100)}%</b></div>
      <div class="cv-mac">${[["蛋白质", te.p, T.protein], ["碳水", te.cb, T.carb], ["脂肪", te.f, T.fat]].map(([n, v, t], i) => html`<div style=${`--i:${i}`}><small>${n}</small><b class="num">${r0(v)}g<em> / ${r0(t)}</em></b><i style=${`--v:${t ? Math.min(1, v / t).toFixed(3) : 0}`}></i></div>`)}</div>
      <div class="cv-arc big"><svg viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="M2 38Q150 -14 298 38" /></svg><span>建议 <b class="num">${fmt(T.kcal)}</b> kcal</span></div>
    </div>
    <div class="rv" style="--i:2"><${WeekStrip} S=${S} open=${cal} setOpen=${setCal} /></div>
    ${!tipOff ? html`<div class="smart rv" style="--i:3">
      <div class="sm-h"><b>饭票智能排餐</b><button class="pic sm" onClick=${() => setTipOff(true)} aria-label="收起"><${Ic} d=${I.x} /></button></div>
      <span class="small muted">按你的目标${S.prefs.budget ? "和 ¥" + S.prefs.budget + " 预算" : ""}，一键排好今天吃什么</span>
      <div class="row">
        <button class="btn grow" id="btn-replan" onClick=${(e) => { haptic(8); if (!fullFx(S)) { replanLocal(true); return UI.toast("换了一种搭配"); } const r = e.currentTarget.getBoundingClientRect(); UI.fs({ t: "wipe", x: r.left + r.width / 2, y: r.top + r.height / 2, onMid: () => replanLocal(true) }); }}>换一份</button>
        <button class="btn primary grow" id="btn-ai" onClick=${() => UI.open({ t: "ai" })}><${Ic} d=${I.ai} />AI 排餐</button>
      </div>
    </div>` : null}
    ${day.tip ? html`<div class="note ai rv" style="--i:4" id="ai-tip"><b>AI 的建议</b>${day.tip}</div>` : null}
    ${plan && !allDone ? (prob.length ? html`<div class="note rv" style="--i:4" id="issues">${prob.join(" ")}</div>` : html`<div class="note ok rv" style="--i:4" id="issues"><${Ic} d="M5 12.5l4.5 4.5L19 7.5" />热量、蛋白、预算都对上了，照着吃就行。</div>`) : null}
    ${plan ? html`<div class="rv" style="--i:5"><${NaFbCard} tp=${tp} te=${te} T=${T} /></div>` : null}
    <div class="meals rv" style="--i:6" key=${day.pv || 0}>
      ${plan ? SLOTS.map((s, i) => (s === "s" && !S.prefs.snack && !plan.meals.s.length ? null : html`<${Meal} key=${s} slot=${s} idx=${i} items=${plan.meals[s]} mode=${day.modes[s]} byId=${byId} />`)) : html`<p class="empty2">这一天还没有餐食记录</p>`}
    </div>
    <div class="logbar">
      <button class="lb-main" id="log-open" onClick=${() => UI.open({ t: "log" })}>记录饮食</button>
      <button class="lb-ic" id="log-add" onClick=${() => UI.open({ t: "log" })} aria-label="记录饮食"><${Ic} d=${I.plus} /></button>
      <button class="lb-ic" id="log-fav" onClick=${() => UI.open({ t: "fav" })} aria-label="我的食物"><${Ic} d=${I.fav} /></button>
    </div>
  </div>`;
}

function PlanPage({ onClose }) {
  const S = app.S, today = dateStr(), info = dayInfo(S, today), T = targetsFor(S, today);
  const rows = rhythm(S, today, 7);
  const pname = S.cycle && S.cycle.name ? S.cycle.name : info.plan.n;
  const lab = dayLabel(S, today);
  return html`<div class="pbody2">
    <${PHead} onClose=${onClose} right=${html`<button class="pic" onClick=${() => UI.open({ t: "planedit", id: info.plan.id })} aria-label="改这个计划"><${Ic} d=${I.edit} /></button><button class="pic" onClick=${() => UI.page({ t: "diet", cal: true })} aria-label="日历"><${Ic} d=${I.cal} /></button>`} />
    <div class="ptitle rv" style="--i:1"><h1>${T.kind ? KIND[T.kind].n : pname}</h1><span class="muted">${pname}${lab ? " · " + lab : ""}</span><span class="muted">今天 ${fmt(T.kcal)} 千卡 · 蛋白 ${T.protein} g · 碳水 ${T.carb} g · 脂肪 ${T.fat} g</span></div>
    <div class="wdays big rv" style="--i:2">${rows.map((r, i) => html`<span class=${"wd" + (i === 0 ? " now" : "") + (r.kind ? " k-" + r.kind : "")} style=${`--i:${i}`}><small>${WK[new Date(r.d + "T12:00:00").getDay()]}</small><b class="num">${+r.d.slice(8)}</b><i class="on"></i></span>`)}</div>
    <div class="sech rv" style="--i:3"><h2>接下来 7 天 <small class="num">${rows.length}</small></h2><button class="lnk" onClick=${() => UI.open({ t: "plan" })}><${Ic} d=${I.plus} />换计划</button></div>
    ${rows.map((r, i) => html`<div class=${"prow rv k-" + (r.kind || "M")} style=${`--i:${i + 4}`}>
      <span class="no num">${i + 1}</span>
      <span class="tx"><b class="num">${fmt(r.T.kcal)} 千卡</b><span class="num">${i === 0 ? "今天 · " : ""}蛋白 ${r.T.protein}　碳水 ${r.T.carb}　脂肪 ${r.T.fat}</span></span>
      <span class="pill">${r.kind ? KIND[r.kind].s : "照常"}</span></div>`)}
    <p class="tiny muted rv" style="--i:12">${planOf(info.plan.id).d}</p>
    <div class="logbar one"><button class="cv-cta wide" id="plan-cta" onClick=${() => UI.open({ t: "planedit", id: info.plan.id })}>调整这个计划<i><${Ic} d=${I.arrow} /></i></button></div>
  </div>`;
}

// ---------- 记录饮食：早午晚加四格 ----------
export function LogSheet({ onClose }) {
  const { day, byId } = context();
  const kc = (s) => (day.plan ? r0(sumItems(day.plan.meals[s].filter((it) => it.done), (id) => byId[id]).kcal) : 0);
  const COL = { b: "#ffb547", l: "#ff6a4a", d: "#9b85ff", s: "#40e0c8" };
  return html`<${Sheet} title="记录饮食" onClose=${onClose}>
    <div class="slots">${SLOTS.map((s, i) => html`<button class="slot" id=${"log-" + s} style=${`--i:${i};--c:${COL[s]}`} onClick=${() => UI.open({ t: "pick", slot: s })}>
      <span class="si"><${Ic} d=${MEAL_ICON[s]} /></span><b>${SLOT_NAME[s]}</b><small class="num">${kc(s) ? kc(s) + " 千卡" : "还没吃"}</small></button>`)}</div>
    <div class="row">
      <button class="btn grow" id="log-snap" onClick=${() => UI.open({ t: "snap" })}><${Ic} d=${I.cam} />拍一下</button>
      <button class="btn grow" id="log-say" onClick=${() => UI.open({ t: "snap", mode: "say" })}><${Ic} d=${I.say} />说一句</button>
    </div>
  <//>`;
}

// ---------- 我的食物（对应 Norg 的全部收藏）：左边一条分类栏 ----------
export function FavSheet({ onClose }) {
  const S = app.S, foods = allFoods(S).filter((f) => f.on || f.custom);
  const [cat, setCat] = useState("全部");
  const h = new Date().getHours(), slot0 = h < 10 ? "b" : h < 15 ? "l" : h < 21 ? "d" : "s";
  const [slot, setSlot] = useState(slot0);
  const list = foods.filter((f) => cat === "全部" || f.c === cat);
  const add = (f) => {
    commit((S) => { const day = S.days[dateStr()]; if (!day || !day.plan) return; const arr = day.plan.meals[slot]; const hit = arr.find((x) => x.id === f.id); if (hit) hit.qty += f.st; else arr.push({ id: f.id, qty: f.st, done: true }); });
    haptic(8); UI.toast("已记到" + SLOT_NAME[slot] + "：" + f.n);
  };
  const cats = ["全部", ...CATS.filter((c) => foods.some((f) => f.c === c))];
  return html`<${Sheet} title="我的食物" onClose=${onClose}>
    <div class="chips">${SLOTS.map((s) => html`<button class="chip" aria-pressed=${String(slot === s)} onClick=${() => setSlot(s)}>${SLOT_NAME[s]}</button>`)}</div>
    <div class="favwrap">
      <div class="rail">${cats.map((c) => html`<button aria-pressed=${String(cat === c)} onClick=${() => setCat(c)}>${c === "全部" ? html`<${Ic} d=${I.fav} />` : c.slice(0, 2)}</button>`)}</div>
      <div class="favlist" key=${cat}>${list.length ? list.map((f, i) => html`<button class="frow" style=${`--i:${Math.min(i, 12)}`} onClick=${() => add(f)}><b>${f.n}</b><span class="num">${f.u} · ${r0(f.k)} 千卡 · 蛋白 ${f.p}g</span><i><${Ic} d=${I.plus} /></i></button>`)
        : html`<div class="empty2"><${Ic} d=${I.fav} />暂无食物</div>`}</div>
    </div>
    <div class="row favbot">
      <button class="btn grow" id="fav-snap" onClick=${() => UI.open({ t: "snap", mode: "pack" })}><${Ic} d=${I.cam} />拍照存入</button>
      <button class="btn sq" id="fav-new" onClick=${() => UI.open({ t: "food", id: null })} aria-label="手动加食物"><${Ic} d=${I.plus} /></button>
    </div>
  <//>`;
}

// ---------- 计划页（对应 Norg 的训练页） ----------
export function PlanTab() {
  const S = app.S, info = dayInfo(S, dateStr());
  return html`
    <header class="nhead"><h1 class="bigt">计划</h1></header>
    <div class="qbtns">
      <button class="qb" id="plan-new" onClick=${() => UI.open({ t: "planedit", id: "custom" })}><${Ic} d=${I.plus} />新计划</button>
      <button class="qb" id="plan-why" onClick=${() => UI.open({ t: "target" })}><${Ic} d=${I.stats} />目标怎么算</button>
    </div>
    <button class="qrow" id="plan-today" onClick=${(e) => UI.page({ t: "plan", from: e.currentTarget.getBoundingClientRect() })}><${Ic} d=${I.arrow} /><span>看今天的安排</span><small>${dayLabel(S, dateStr()) || info.plan.n}</small></button>
    <div class="sech"><h2><${Ic} d=${I.down} />全部计划</h2></div>
    <${PlanList} />`;
}

// ---------- 发现页（对应 Norg 的发现：推荐 / 好友 / 主题市场） ----------
const QUICK = ["鸡胸", "鸡蛋", "牛奶", "米饭", "燕麦", "豆腐", "西兰花", "香蕉", "牛肉", "虾"];
export function FindView() {
  const [tab, setTab] = useState(app.findTab || "lib");
  const [q, setQ] = useState("鸡胸");
  const go = (t) => { app.findTab = t; setTab(t); };
  const res = searchLib(q, 30);
  return html`
    <header class="nhead"><span class="logo"><${Logo} />发现</span>
      <span class="nhr"><button class="pic" onClick=${() => { go("lib"); setTimeout(() => { const el = document.getElementById("find-q"); if (el) el.focus(); }, 50); }} aria-label="搜索"><${Ic} d=${I.lib} /></button><button class="pic" onClick=${() => UI.open({ t: "shop" })} aria-label="采购清单"><${Ic} d=${I.bell} /></button></span></header>
    <div class="utabs line" style=${`--at:${["lib", "mine", "theme"].indexOf(tab)}`}>
      ${[["lib", "食物库"], ["mine", "我的食物"], ["theme", "主题色"]].map(([k, n]) => html`<button id=${"find-" + k} aria-pressed=${String(tab === k)} onClick=${() => go(k)}>${n}</button>`)}<i class="ul"></i></div>
    <div class="fpane" key=${tab}>
    ${tab === "lib" ? html`
      <input class="inp" id="find-q" placeholder=${"在 " + libSize() + " 种食物里搜"} value=${q} onInput=${(e) => setQ(e.target.value)} />
      <div class="chips">${QUICK.map((x) => html`<button class="chip" aria-pressed=${String(q === x)} onClick=${() => setQ(x)}>${x}</button>`)}</div>
      <div class="card" id="find-res"><div class="list">${res.map((x, i) => html`<div style=${`--i:${Math.min(i, 14)}`} class="lin"><${LibRow} key=${x.lid} x=${x} onPick=${(x) => UI.open({ t: "lib", lid: x.lid })} /></div>`)}
        ${!res.length ? html`<p class="muted">没找到。换个说法试试，或者到「我的食物」里手动加。</p>` : null}</div></div>
      <p class="tiny muted">数据来自《中国食物成分表》，每 100 克的典型值。</p>`
    : tab === "mine" ? html`<${FoodsView} />` : html`<${ThemePicker} />`}
    </div>`;
}

// ---------- 我的（大头图 + 统计 + 记录 + 设置） ----------
const TicketArt = () => html`<svg class="art ticket" viewBox="0 0 320 220" aria-hidden="true">
  <defs>
    <linearGradient id="tk1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--tint) 70%,#fff)" /><stop offset=".5" style="stop-color:var(--tint)" /><stop offset="1" style="stop-color:color-mix(in srgb,var(--tint) 40%,#000)" /></linearGradient>
    <linearGradient id="tk2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:rgba(255,255,255,0)" /><stop offset=".5" style="stop-color:rgba(255,255,255,.55)" /><stop offset="1" style="stop-color:rgba(255,255,255,0)" /></linearGradient>
  </defs>
  <g class="tkb" transform="rotate(-12 160 110)"><path d="M60 50h200a12 12 0 0 1 12 12v22a18 18 0 0 0 0 36v22a12 12 0 0 1-12 12H60a12 12 0 0 1-12-12v-22a18 18 0 0 0 0-36V62a12 12 0 0 1 12-12z" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)" /></g>
  <g class="tkf" transform="rotate(6 160 110)">
    <path d="M60 50h200a12 12 0 0 1 12 12v22a18 18 0 0 0 0 36v22a12 12 0 0 1-12 12H60a12 12 0 0 1-12-12v-22a18 18 0 0 0 0-36V62a12 12 0 0 1 12-12z" fill="url(#tk1)" />
    <path d="M200 58v104" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-dasharray="5 6" />
    <text x="76" y="104" fill="#fff" font-size="30" font-weight="800">饭票</text>
    <text x="78" y="132" fill="rgba(255,255,255,.75)" font-size="13" font-weight="700" letter-spacing="2">MEAL · TICKET</text>
    <text x="214" y="118" fill="#fff" font-size="22" font-weight="800">№1</text>
    <rect class="tsheen" x="40" y="40" width="70" height="140" fill="url(#tk2)" />
  </g>
</svg>`;

export function MeView() {
  const S = app.S, p = S.profile, T = targetsOf(p), lv = levelOf(S);
  const logged = Object.entries(S.days).filter(([, day]) => day && day.plan && planItems(day.plan, true).length);
  const month = dateStr().slice(0, 7);
  const byId = Object.fromEntries(allFoods(S).map((f) => [f.id, f]));
  const mrows = logged.filter(([d]) => d.startsWith(month)).map(([, day]) => sumItems(planItems(day.plan, true), (id) => byId[id]).kcal);
  const avg = mrows.length ? mrows.reduce((a, b) => a + b, 0) / mrows.length : 0;
  const name = S.prefs.nick || "饭票同学";
  return html`
    <section class="mehero">
      <div class="mh-bg" aria-hidden="true"><i class="l1"></i><i class="l2"></i></div>
      <${TicketArt} />
      <div class="mh-ic"><button class="pic" onClick=${() => UI.open({ t: "theme" })} aria-label="主题色"><${Ic} d=${I.theme} /></button><button class="pic" id="me-edit" onClick=${() => UI.open({ t: "profile" })} aria-label="改资料"><${Ic} d=${I.edit} /></button><button class="pic" onClick=${() => { const el = document.getElementById("me-set"); if (el) el.scrollIntoView({ behavior: calm() ? "auto" : "smooth" }); }} aria-label="设置"><${Ic} d=${I.gear} /></button></div>
      <div class="mh-id">
        <span class="avatar">${name.slice(0, 1)}</span>
        <h1>${name}</h1>
        <div class="mh-stats"><span><b class="num">${logged.length}</b>记录天数</span><span><b class="num">${streakOf(S, dateStr())}</b>连续</span><span><b class="num">${S.weights.length}</b>体重记录</span></div>
        <button class="mh-bio" onClick=${() => UI.open({ t: "profile" })}>${GOALS[T.goal].n} · 每天 ${fmt(T.kcal)} 千卡 · ${p.height} cm ${p.weight} kg</button>
      </div>
    </section>
    <div class="metiles">
      <button class="mt" onClick=${() => UI.open({ t: "rank" })}><${RankGem} tier=${lv.tier} size=${38} /><b>${lv.name}</b></button>
      <button class="mt" onClick=${() => UI.page({ t: "diet", cal: true })}><span class="mtb"><${Ic} d=${I.cal} /></span><small>日历</small></button>
      <div class="mt"><small>本月平均</small><b class="num">${fmt(avg)}<small> 千卡</small></b><small class="muted">${mrows.length} 天有记录</small></div>
    </div>
    <div class="sech"><h2>我的记录</h2></div>
    <div class="merec"><${Records} /></div>
    <div class="sech" id="me-set"><h2>设置</h2></div>
    <div class="meset"><${Me} /></div>`;
}
