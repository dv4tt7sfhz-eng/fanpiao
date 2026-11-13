// 「今天」页：一条从早到晚的弧线（吃了多少、还差多少）+ 每餐一张卡片 + 各种弹出面板
import { html, useState, useEffect, useRef, app, commit, UI, Sheet, Seg, r0, yuan, qtyText, num, MODE } from "./ui.js";
import { targetsOf, sumItems, planItems, SLOTS, SLOT_NAME, GOALS } from "./nutrition.js";
import { makePlan, candidates, sanitizePlan } from "./planner.js";
import { allFoods, dateStr, addDays, dayOf } from "./store.js";
import { aiReady, chatJSON, planMessages, planToText } from "./ai.js";
import { CATS, CK_LABEL, ROLE_LABEL } from "./foods.js";
import { useTween, burst, confetti, haptic, fullFx, Roll, useReveal, calm } from "./fx.js";
import { skyOf } from "./fullscreen.js";
import { NaFbCard } from "./nafb.js";

const WEEK = "日一二三四五六";

function context() {
  const S = app.S, d = dateStr(), day = dayOf(S, d);
  const foods = allFoods(S);
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const T = targetsOf(S.profile, day);
  return { S, d, day, foods, byId, T, enabled: foods.filter((f) => f.on) };
}

// 本地重排。已经打勾（吃了）的保留不动。
export function replanLocal(variety) {
  const { S, d, day, T, enabled, byId } = context();
  const locked = {}, avoid = {};
  const prev = day.plan || (S.days[addDays(d, -1)] || {}).plan;
  for (const s of SLOTS) {
    locked[s] = day.plan ? day.plan.meals[s].filter((it) => it.done && byId[it.id]) : [];
    avoid[s] = new Set(prev && (variety || !day.plan) ? prev.meals[s].filter((it) => !it.done).map((it) => it.id) : []);
  }
  const plan = makePlan({ foods: enabled, T, modes: day.modes, budget: S.prefs.budget, snack: S.prefs.snack, locked, avoid, seed: Date.now() });
  commit(() => { day.plan = { meals: plan.meals }; day.tip = ""; day.src = "local"; day.T = { kcal: T.kcal, protein: T.protein }; day.pv = (day.pv || 0) + 1; });
}

function issues(tp, T, budget) {
  const out = [];
  const dk = tp.kcal - T.kcal;
  const tight = budget > 0 && tp.cost >= budget * 0.93;
  if (dk < -150) out.push(tight ? `按 ¥${budget} 的预算，今天的安排比目标少 ${r0(-dk)} 千卡。可以把预算调高一点，或者多勾几样便宜的主食（米饭、馒头、燕麦）。` : `今天的安排比目标少 ${r0(-dk)} 千卡，可以加点主食。`);
  if (dk > 150) out.push(`今天的安排比目标多 ${r0(dk)} 千卡，主食或坚果可以少一点。`);
  if (tp.p < T.protein - 5) out.push(`蛋白还可以再加 ${r0(T.protein - tp.p)} g。`);
  if (tp.f > T.fatMax + 5) out.push(`脂肪稍多（${r0(tp.f)} g）。`);
  if (tp.f < T.fatMin - 5) out.push(`脂肪稍少（${r0(tp.f)} g），可以加点坚果。`);
  if (tp.veg < 300) out.push(`蔬菜 ${r0(tp.veg)} g，再加一份到 300 g 更好。`);
  if (budget > 0 && tp.cost > budget + 0.05) out.push(`比预算多 ¥${yuan(tp.cost - budget)}。`);
  return out;
}

// 连续几天有记录
function streakOf(S, today) {
  const has = (d) => { const x = S.days[d]; return !!(x && x.plan && planItems(x.plan, true).length); };
  let n = 0, d = has(today) ? today : addDays(today, -1);
  while (has(d) && n < 999) { n++; d = addDays(d, -1); }
  return n;
}


function Hero({ S, day, T, tp, te, plan, byId, onAct, act }) {
  const now = new Date();
  const [drawn, setDrawn] = useState(false);
  // 如果是从全屏动画收进来的，等它收完再开始画圆环
  useEffect(() => { const wait = app.heroDelay || 0; app.heroDelay = 0; const t = setTimeout(() => requestAnimationFrame(() => setDrawn(true)), wait + 30); return () => clearTimeout(t); }, []);
  const box = useRef(null);
  // 手指按住卡片：微微倾斜，指尖下有一团光
  const tilt = (e) => {
    const el = box.current; if (!el || calm()) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%");
    el.style.setProperty("--ry", (x - 0.5) * 6 + "deg"); el.style.setProperty("--rx", (0.5 - y) * 5 + "deg");
    el.classList.add("press");
  };
  const untilt = () => { const el = box.current; if (!el) return; el.classList.remove("press"); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
  const left = Math.max(0, T.kcal - te.kcal);
  const items = planItems(plan);
  const allDone = items.length > 0 && items.every((it) => it.done);
  const streak = streakOf(S, dateStr());
  const q = (a, b) => (b > 0 ? a / b : 0);
  const kq = (v, t) => (drawn ? Math.max(0, Math.min(1, q(v, t))) : 0).toFixed(3);
  const tiles = [
    { k: "p", n: "蛋白质", e: te.p, pl: tp.p, t: T.protein },
    { k: "cb", n: "碳水", e: te.cb, pl: tp.cb, t: T.carb },
    { k: "f", n: "脂肪", e: te.f, pl: tp.f, t: T.fat },
  ];
  // 吃的东西变了：泡泡挤扁一下，进度条上扫过一道光
  const track = useRef(null), lastE = useRef(null);
  useEffect(() => {
    const el = track.current; if (!el || !drawn) return;
    if (lastE.current === te.kcal) return;
    lastE.current = te.kcal;
    el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
  }, [te.kcal, drawn]);
  const say = allDone ? "今天的都吃完了，做得好" : left > 0 ? "今天还可以吃" : "今天吃够了，剩下的可以不吃";
  return html`<section class=${"hero main cov tod-" + skyOf(now.getHours())} ref=${box} aria-label="今天的进度"
      onPointerDown=${tilt} onPointerMove=${(e) => { if (e.buttons || e.pointerType === "touch") tilt(e); }} onPointerUp=${untilt} onPointerLeave=${untilt} onPointerCancel=${untilt}>
    <div class="mesh" aria-hidden="true"><i class="m1"></i><i class="m2"></i><i class="m3"></i><i class="m4"></i></div>
    <div class="cshade" aria-hidden="true"></div>
    <div class="ctop">
      <span class="hdate">${now.getMonth() + 1}月${now.getDate()}日 周${WEEK[now.getDay()]}</span>
      <button class="cchip gl" id="goal-chip" onClick=${() => UI.open({ t: "target" })}>${GOALS[T.goal].n}目标
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
    </div>
    <div class="cbig">
      <span class="lab" key=${say}>${say}</span>
      <div class="row"><b class="num"><${Roll} value=${left} id="kcal-left" /></b><em>千卡</em></div>
    </div>
    <div class="ctrack gl" ref=${track} style=${`--v:${kq(te.kcal, T.kcal)};--vp:${kq(tp.kcal, T.kcal)}`}>
      <div class="clip"><i class="plan"></i><i class="fill"></i></div><div class="kw"><i class="knob"></i></div>
    </div>
    <div class="ctl"><span>已吃 <b class="num"><${Roll} value=${te.kcal} id="kcal-eaten" /></b></span><span>目标 <span class="num" id="kcal-target">${T.kcal.toLocaleString("en-US")}</span> 千卡</span></div>
    <div class="ctiles">
      ${tiles.map((x, i) => html`<div class=${"ctile gl" + (x.e >= x.t && x.t > 0 ? " full" : "")} style=${`--i:${i};--v:${kq(x.e, x.t)};--vp:${kq(x.pl, x.t)}`}>
        <span class="tn">${x.n}</span>
        <span class="tv"><b class="num"><${Roll} value=${x.e} /></b><em>/${r0(x.t)} 克</em></span>
        <span class="bar"><i class="pl"></i><i class="ea"></i></span>
      </div>`)}
    </div>
    <div class="hfoot">
      <div class="stat gl"><span>今天安排</span><b class="num"><span id="kcal-plan">${r0(tp.kcal)}</span><small>千卡</small></b></div>
      <div class="stat gl"><span>${S.prefs.budget > 0 ? "花费/预算" + S.prefs.budget : "花费"}</span><b class="num" id="cost-plan">¥${yuan(tp.cost)}</b></div>
      <label class="stat gl"><span>手表活动千卡</span>
        <input id="act-kcal" class="num" type="text" inputmode="numeric" placeholder="不填" value=${act} onInput=${(e) => onAct(e.target.value)} /></label>
    </div>
    ${streak > 1 ? html`<div class="streak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.8 3.2 5 5 5 10a5 5 0 0 1-10 0c0-2.2 1.1-3.6 2.2-4.6.2 1.6 1 2.6 1.9 3 0-3.2 0-5.4.9-8.4z" /></svg>已经连续记录 <b class="num">${streak}</b> 天</div>` : null}
  </section>`;
}

export function Today() {
  const { S, d, day, byId, T, enabled } = context();
  const [act, setAct] = useState(day.activeKcal == null ? "" : String(day.activeKcal));
  useEffect(() => { if (!day.plan) replanLocal(false); }, [d, !!day.plan]);
  const plan = day.plan;
  const get = (id) => byId[id];
  const tp = sumItems(planItems(plan), get), te = sumItems(planItems(plan, true), get);
  const saveAct = (v) => {
    setAct(v);
    const n = v === "" ? null : num(v, null);
    if (n !== day.activeKcal && (n === null || (n >= 0 && n <= 5000))) commit(() => { day.activeKcal = n; });
  };
  const prob = plan ? issues(tp, T, S.prefs.budget) : [];
  const items = planItems(plan);
  const allDone = items.length > 0 && items.every((it) => it.done);
  // 全部吃完的那一刻庆祝一次
  useEffect(() => {
    if (allDone && !day.cele) {
      commit(() => { day.cele = true; });
      if (fullFx(S)) setTimeout(() => UI.fs({ t: "cele", stats: { kcal: r0(te.kcal), p: r0(te.p), cost: yuan(te.cost), streak: streakOf(S, dateStr()) } }), 650);
      else { confetti(); haptic([12, 60, 18]); UI.toast("今天的都吃完了，做得好"); }
    }
  }, [allDone]);
  const drift = day.activeKcal != null && plan && Math.abs(tp.kcal - T.kcal) > 150 && !allDone;
  return html`
    <div class="top"><h1>今天</h1></div>
    <${Hero} S=${S} day=${day} T=${T} tp=${tp} te=${te} plan=${plan} byId=${byId} act=${act} onAct=${saveAct} />

    <div class="actions">
      <button class="btn grow" id="btn-replan" onClick=${(e) => {
        haptic(8);
        if (!fullFx(S)) { replanLocal(true); return UI.toast("换了一种搭配"); }
        const r = e.currentTarget.getBoundingClientRect();
        UI.fs({ t: "wipe", x: r.left + r.width / 2, y: r.top + r.height / 2, onMid: () => { window.scrollTo(0, 0); replanLocal(true); } });
      }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" /></svg>换一份</button>
      <button class="btn primary grow shine" id="btn-ai" onClick=${() => UI.open({ t: "ai" })}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>AI 排餐</button>
    </div>

    ${drift ? html`<button class="note tap" onClick=${() => { replanLocal(false); UI.toast("已按新目标重排"); }}>目标变成了 ${T.kcal} 千卡。点这里按新目标重排。</button>` : null}
    ${day.tip ? html`<div class="note ai" id="ai-tip"><b>AI 的建议</b>${day.tip}</div>` : null}
    ${plan && !allDone ? (prob.length ? html`<div class="note" id="issues">${prob.join(" ")}</div>`
      : html`<div class="note ok" id="issues"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>热量、蛋白、预算都对上了，照着吃就行。</div>`) : null}

    ${plan ? html`<${NaFbCard} tp=${tp} te=${te} T=${T} />` : null}

    <div class="meals" key=${day.pv || 0}>
      ${plan ? SLOTS.map((s, i) => (s === "s" && !S.prefs.snack && !plan.meals.s.length ? null : html`<${Meal} key=${s} slot=${s} idx=${i} items=${plan.meals[s]} mode=${day.modes[s]} byId=${byId} />`)) : html`<div class="card muted">正在排今天的饭…</div>`}
    </div>
    ${enabled.length < 6 ? html`<div class="note">食物库里勾选的太少，排不出好的搭配。去「食物」页多勾几样。</div>` : null}
    <p class="hint">吃完一样，点它前面的圆圈。点食物可以改数量或换成别的。</p>
  `;
}

const MEAL_ICON = {
  b: "M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8",
  l: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8",
  d: "M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z",
  s: "M12 21c-4.5 0-7-3.4-7-7.2C5 10.6 7.2 8.5 9.6 8.5c1 0 1.7.4 2.4.4s1.4-.4 2.4-.4c2.4 0 4.6 2.1 4.6 5.3 0 3.8-2.5 7.2-7 7.2zM12 8.5c0-2 1-3.6 3-4.5",
};

function Meal({ slot, items, mode, byId, idx }) {
  const mt = sumItems(items, (id) => byId[id]);
  const m = MODE[mode] || MODE.cold;
  const done = items.length > 0 && items.every((it) => it.done);
  const ref = useRef(null);
  useReveal(ref);
  const toggle = (i, e) => {
    const btn = e.currentTarget;
    const was = items[i].done;
    commit((S) => { const it = S.days[dateStr()].plan.meals[slot][i]; it.done = !it.done; });
    if (!was) { haptic(10); burst(btn.querySelector("svg")); }
  };
  return html`<section class=${"meal" + (done ? " alldone" : "")} ref=${ref} id=${"meal-" + slot} style=${`--i:${idx}`}>
    <header class="mh">
      <span class=${"mi mi-" + slot} aria-hidden="true"><svg viewBox="0 0 24 24"><path d=${MEAL_ICON[slot]} /></svg></span>
      <div class="mt"><h3>${SLOT_NAME[slot]}</h3><span class="num">${r0(mt.kcal)} 千卡　蛋白 ${r0(mt.p)} g</span></div>
      ${done ? html`<span class="donebadge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>吃完了</span>`
        : slot !== "s" ? html`<button class="modebtn" onClick=${() => UI.open({ t: "mode", slot })}>${m.s}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg></button>` : null}
    </header>
    ${items.length ? html`<ul class="items">
      ${items.map((it, i) => {
        const f = byId[it.id];
        if (!f) return null;
        return html`<li class=${"item" + (it.done ? " done" : "")} key=${it.id} style=${`--j:${i}`}>
          <button class="check" aria-label=${(it.done ? "取消已吃：" : "标记已吃：") + f.n} aria-pressed=${String(!!it.done)} onClick=${(e) => toggle(i, e)}>
            <svg viewBox="0 0 28 28" aria-hidden="true"><circle class="ring" cx="14" cy="14" r="11" /><circle class="fill" cx="14" cy="14" r="12" /><path class="tick" d="M8.6 14.6l3.6 3.6 7.2-8" pathLength="1" /></svg></button>
          <button class="body" onClick=${() => UI.open({ t: "item", slot, i })}>
            <div class="nm"><b><span>${f.n}</span></b><small>${qtyText(it.qty)} ${f.u}</small></div>
            <div class="rt"><b class="num">${r0(f.k * it.qty)}<small> 千卡</small></b><small class="num">蛋白 ${r0(f.p * it.qty)} g　¥${yuan(f.$ * it.qty)}</small></div>
          </button>
        </li>`;
      })}
    </ul>` : html`<div class="empty">这一餐还没有安排。</div>`}
    <footer class="mf">
      <button class="addbtn" onClick=${() => UI.open({ t: "pick", slot })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>加食物</button>
      <span class="num">碳水 ${r0(mt.cb)} g　脂肪 ${r0(mt.f)} g　¥${yuan(mt.cost)}</span>
    </footer>
  </section>`;
}

// ---------- 弹出面板 ----------
export function TargetSheet({ onClose }) {
  const { T, S, day } = context();
  const p = S.profile;
  return html`<${Sheet} title="今天的目标怎么算的" onClose=${onClose}>
    <div class="card">
      <div class="kv"><span>基础代谢（躺一天也会消耗）</span><b class="num">${T.rest} 千卡</b></div>
      <div class="kv"><span>${T.basis === "watch" ? `加上手表活动 ${day.activeKcal} 千卡` : "乘以平时活动量 " + p.activity}</span><b class="num">${T.tdee} 千卡</b></div>
      <div class="kv"><span>${GOALS[T.goal].n}${T.adj > 0 ? "，多吃" : T.adj < 0 ? "，少吃" : "，不加不减"}</span><b class="num">${T.adj > 0 ? "+" : ""}${T.adj} 千卡</b></div>
      <div class="kv"><span>今天的热量目标</span><b class="num">${T.kcal} 千卡</b></div>
    </div>
    <div class="card">
      <div class="kv"><span>蛋白质（每公斤体重 ${T.ppk} g）</span><b class="num">${T.protein} g</b></div>
      <div class="kv"><span>脂肪（约占热量的 25%）</span><b class="num">${T.fat} g</b></div>
      <div class="kv"><span>碳水（剩下的热量）</span><b class="num">${T.carb} g</b></div>
    </div>
    ${T.floored ? html`<div class="note warn">算出来的数低于安全下限，已经按下限 ${T.kcal} 千卡来排。吃得太少会掉肌肉、没力气。</div>` : null}
    ${p.age < 18 ? html`<div class="note warn">你未满 18 岁，还在长身体，这里不按减脂来算。</div>` : null}
    <p class="small muted">基础代谢用 Mifflin-St Jeor 公式估算。手表的数字和公式都有误差，最准的办法是看两周的体重：
      想增肌但体重没涨，就把目标调高一点；想减脂但没掉，就调低一点。在「我的 → 我的资料」里可以直接改。</p>
    <button class="btn block" onClick=${() => { onClose(); UI.open({ t: "profile" }); }}>改我的资料和目标</button>
  <//>`;
}

export function ModeSheet({ slot, onClose }) {
  const { day } = context();
  const pick = (m) => { commit(() => { day.modes[slot] = m; }); replanLocal(false); onClose(); };
  const desc = { out: "食堂或外面买。只安排「食堂外食」里的食物。", cold: "只安排即食的，或者用热水就能冲泡的。", cook: "有锅能开火。生肉、蔬菜、面条都能安排。" };
  return html`<${Sheet} title=${SLOT_NAME[slot] + "怎么吃"} onClose=${onClose}>
    ${["out", "cold", "cook"].map((m) => html`<button class="opt" id=${"mode-" + m} aria-pressed=${String(day.modes[slot] === m)} onClick=${() => pick(m)}>
      <div><b>${MODE[m].n}</b><span>${desc[m]}</span></div></button>`)}
    <p class="small muted">换了吃法，这一餐会重新安排。已经打勾吃掉的不会动。</p>
  <//>`;
}

export function ItemSheet({ slot, i, onClose }) {
  const { day, byId, enabled } = context();
  const it = day.plan && day.plan.meals[slot][i];
  const f = it && byId[it.id];
  useEffect(() => { if (!f) onClose(); });
  if (!f) return null;
  const setQty = (q) => commit(() => { it.qty = Math.max(f.st, Math.round(q * 100) / 100); });
  const others = candidates(slot, day.modes[slot] || "cold", enabled).filter((c) => c.r === f.r && !day.plan.meals[slot].some((x) => x.id === c.id));
  const swap = (c) => { commit(() => { it.id = c.id; it.qty = Math.max(c.st, Math.round(it.qty / c.st) * c.st); it.done = false; }); onClose(); };
  const remove = () => { commit(() => { day.plan.meals[slot].splice(i, 1); }); onClose(); };
  return html`<${Sheet} title=${f.n} onClose=${onClose}>
    <div class="card stack">
      <div class="stepper">
        <button aria-label="减少" id="qty-minus" onClick=${() => setQty(it.qty - f.st)} disabled=${it.qty <= f.st}>−</button>
        <div class="q num" id="qty-val" key=${it.qty}>${qtyText(it.qty)}</div>
        <button aria-label="增加" id="qty-plus" onClick=${() => setQty(it.qty + f.st)}>＋</button>
      </div>
      <div class="muted" style="text-align:center">${f.u}</div>
      <div class="tiles">
        <div class="tile"><div class="v num">${r0(f.k * it.qty)}</div><div class="l">千卡</div></div>
        <div class="tile"><div class="v num">${r0(f.p * it.qty)} g</div><div class="l">蛋白质</div></div>
        <div class="tile"><div class="v num">¥${yuan(f.$ * it.qty)}</div><div class="l">花费</div></div>
      </div>
      <div class="small muted">碳水 ${r0(f.cb * it.qty)} g　脂肪 ${r0(f.f * it.qty)} g　${f.out ? "外食" : CK_LABEL[f.ck]}</div>
      <div class="nfmini">
        <span class=${(f.na || 0) * it.qty >= 600 ? "hi" : ""}><i class="d na"></i>钠 <b class="num">${r0((f.na || 0) * it.qty)}</b> mg</span>
        <span class=${(f.fb || 0) * it.qty >= 4 ? "good" : ""}><i class="d fb"></i>膳食纤维 <b class="num">${Math.round((f.fb || 0) * it.qty * 10) / 10}</b> g</span>
      </div>
    </div>
    ${others.length ? html`<div class="card"><h2>换成别的${ROLE_LABEL[f.r] || ""}</h2><div class="list">
      ${others.map((c) => html`<div class="lrow"><button class="main" onClick=${() => swap(c)}><b>${c.n}</b>
        <span class="num">每${c.u}：${c.k} 千卡　蛋白 ${c.p}g　钠 ${c.na || 0}mg　纤维 ${c.fb || 0}g　¥${yuan(c.$)}</span></button><span class="side">换 ›</span></div>`)}
    </div></div>` : null}
    <div class="row"><button class="btn danger grow" id="item-remove" onClick=${remove}>从这一餐去掉</button><button class="btn primary grow" onClick=${onClose}>好了</button></div>
  <//>`;
}

export function PickSheet({ slot, onClose }) {
  const { day, foods } = context();
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const list = foods.filter((f) => (all || f.on) && (!q || f.n.includes(q.trim())));
  const add = (f) => {
    commit(() => {
      const arr = day.plan.meals[slot];
      const hit = arr.find((x) => x.id === f.id);
      if (hit) hit.qty += f.st; else arr.push({ id: f.id, qty: f.st, done: false });
    });
    UI.toast("已加到" + SLOT_NAME[slot] + "：" + f.n);
  };
  return html`<${Sheet} title=${"加到" + SLOT_NAME[slot]} onClose=${onClose}>
    <button class="snapcta sm" id="pick-snap" onClick=${() => UI.open({ t: "snap", slot })}>
      <span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-1.8h5.2L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.4" r="3.6" /></svg></span>
      <span class="tx"><b>拍一下</b><span>拍你正在吃的，直接记到${SLOT_NAME[slot]}</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    <input class="inp" id="pick-q" placeholder="搜食物名字" value=${q} onInput=${(e) => setQ(e.target.value)} />
    <label class="switch small"><span>也显示没勾选的食物</span><input type="checkbox" checked=${all} onChange=${(e) => setAll(e.target.checked)} /></label>
    ${CATS.map((c) => {
      const fs = list.filter((f) => f.c === c);
      return fs.length ? html`<div class="card"><h2>${c}</h2><div class="list">
        ${fs.map((f) => html`<div class="lrow"><button class="main" onClick=${() => add(f)}><b>${f.n}</b>
          <span class="num">每${f.u}：${f.k} 千卡　蛋白 ${f.p}g　¥${yuan(f.$)}</span></button><span class="side">＋</span></div>`)}
      </div></div>` : null;
    })}
    ${!list.length ? html`<p class="muted">没找到。可以到「食物」页添加自己的食物。</p>` : null}
  <//>`;
}

const ASK_PRESETS = ["今天练腿，多安排点碳水", "吃腻了，换点不一样的", "想吃清淡一点", "今天不想吃蛋白粉"];

export function AISheet({ onClose }) {
  const { S, day, T, enabled, byId } = context();
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const ctl = useRef(null);
  const ready = aiReady(S);
  const run = async () => {
    setBusy(true); setMsg("AI 正在排，一般要十几秒到一分钟…");
    ctl.current = new AbortController();
    const big = fullFx(S);
    if (big) UI.fs({ t: "ai", names: enabled.map((f) => f.n).sort(() => Math.random() - 0.5), onStop: () => ctl.current && ctl.current.abort() });
    try {
      const doneSlots = SLOTS.filter((s) => day.plan && day.plan.meals[s].some((it) => it.done));
      const usable = enabled.filter((f) => SLOTS.some((s) => !doneSlots.includes(s) && candidates(s, day.modes[s] || "cold", [f]).length));
      let extra = ask.trim();
      if (doneSlots.length) extra += `（${doneSlots.map((s) => SLOT_NAME[s]).join("、")}已经吃完了：${doneSlots.map((s) => day.plan.meals[s].map((it) => byId[it.id].n + "×" + it.qty).join("、")).join("；")}。这几餐输出空数组，只排剩下的餐，让全天总量达标。）`;
      const raw = await chatJSON(S, planMessages({ profile: S.profile, T, modes: day.modes, budget: S.prefs.budget || 999, snack: S.prefs.snack, foods: usable, ask: extra, prevText: day.plan ? planToText(day.plan, byId) : "" }), ctl.current.signal);
      const clean = sanitizePlan(raw, Object.fromEntries(usable.map((f) => [f.id, f])));
      if (!clean) throw new Error("AI 给的方案里没有能用的食物，再试一次。");
      for (const s of doneSlots) clean.meals[s] = day.plan.meals[s].map((it) => ({ ...it }));
      // AI 定搭配，本地算法把数量调准
      const tuned = makePlan({ foods: enabled, T, modes: day.modes, budget: S.prefs.budget, snack: S.prefs.snack, start: clean.meals, seed: Date.now() });
      commit(() => { day.plan = { meals: tuned.meals }; day.tip = typeof raw.tip === "string" ? raw.tip.slice(0, 200) : ""; day.src = "ai"; day.T = { kcal: T.kcal, protein: T.protein }; day.pv = (day.pv || 0) + 1; });
      if (big) { window.scrollTo(0, 0); UI.fsOut(); } else UI.toast("AI 排好了");
      onClose();
    } catch (e) { if (big) UI.fs(null); setMsg(e.message || "出错了，再试一次。"); }
    finally { setBusy(false); }
  };
  return html`<${Sheet} title="AI 排餐" onClose=${() => { if (ctl.current) ctl.current.abort(); onClose(); }}>
    ${ready ? html`
      <p class="small muted">AI 会按你勾选的食物、今天的目标和预算来选搭配，每次都不一样。选好以后，饭票再把每样的数量算准。</p>
      <label class="field">今天有什么特别要求（可以不写）
        <textarea id="ai-ask" value=${ask} onInput=${(e) => setAsk(e.target.value)} placeholder="例如：晚上想吃面；今天只剩 2 个鸡蛋"></textarea></label>
      <div class="chips">${ASK_PRESETS.map((a) => html`<button class="chip" onClick=${() => setAsk(a)}>${a}</button>`)}</div>
      ${msg ? (busy ? html`<div class="aibusy" id="ai-msg">AI 正在挑搭配<span class="dots"><i></i><i></i><i></i></span><div class="small muted">一般要十几秒到一分钟</div></div>` : html`<div class="note bad" id="ai-msg">${msg}</div>`) : null}
      <div class="row">
        ${busy ? html`<button class="btn grow" onClick=${() => ctl.current && ctl.current.abort()}>停止</button>` : null}
        <button class="btn primary grow" id="ai-run" disabled=${busy} onClick=${run}>${busy ? "正在排…" : "开始排"}</button>
      </div>
      <p class="tiny muted">会把你的身高体重、目标和勾选的食物发给你选的 AI 服务商。${S.ai.key ? "每次调用会用掉一点你账户里的额度。" : ""}</p>
    ` : html`
      <div class="note warn">还没接入 AI。你需要一个自己的模型密钥（比如 DeepSeek），填一次就行。</div>
      <p class="small muted">不接 AI 也能用：点「换一份」，饭票自带的算法会直接排好。</p>
      <button class="btn primary block" id="ai-setup" onClick=${() => { onClose(); UI.open({ t: "aiset" }); }}>去填 AI 密钥</button>
    `}
  <//>`;
}
