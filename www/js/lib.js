// 食物库：1700 种常见食物（每 100 克）。搜到了可以直接记到某一餐，或者存成自己的食物。
import { html, useState, app, commit, UI, Sheet, r0, num } from "./ui.js";
import { LIB_RAW } from "./fooddb.js";
import { dateStr, dayOf } from "./store.js";
import { SLOT_NAME } from "./nutrition.js";

let LIB = null;
export function lib() {
  if (!LIB) LIB = LIB_RAW.split("\n").map((l, i) => {
    const [n, k, p, cb, f, fb, na] = l.split("|");
    return { lid: i, n, k: +k, p: +p, cb: +cb, f: +f, fb: +fb, na: +na };
  });
  return LIB;
}
export const libSize = () => LIB_RAW.split("\n").length;

// 搜索：名字开头对上的排前面，名字短的排前面（「鸡蛋」比「鸡蛋黄粉」更可能是想要的）
export function searchLib(q, n = 20) {
  const w = String(q || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return [];
  const hits = [];
  for (const x of lib()) {
    if (!w.every((t) => x.n.includes(t))) continue;
    const sc = (x.n.startsWith(w[0]) ? 0 : 10) + x.n.length + (x.n.includes("(") ? 3 : 0);
    hits.push([sc, x]);
  }
  return hits.sort((a, b) => a[0] - b[0]).slice(0, n).map((h) => h[1]);
}

function roleOf(x) {
  const e = Math.max(1, x.p * 4 + x.cb * 4 + x.f * 9);
  if ((x.p * 4) / e >= 0.3) return "protein";
  if ((x.f * 9) / e >= 0.6) return "fat";
  if (x.k < 45 && x.fb >= 1) return "veg";
  return "staple";
}
const CAT = { protein: "肉蛋水产", fat: "坚果", veg: "蔬菜", staple: "主食" };

// 变成「自己的食物」：单位是 100 克，每次加减 50 克。默认不勾选，排餐不会自动用它（没有价格）。
export function libFood(x) {
  const r = roleOf(x);
  return { id: "lib" + x.lid, n: x.n.slice(0, 24), u: "100g", c: CAT[r], k: x.k, p: x.p, f: x.f, cb: x.cb, na: Math.round(x.na), fb: x.fb, $: 0,
    ck: 0, r, s: "blds", st: 0.5, mx: 5, v: r === "veg" ? 100 : 0, on: false, out: false, lib: true };
}

export function LibRow({ x, onPick }) {
  return html`<div class="lrow"><button class="main" onClick=${() => onPick(x)}><b>${x.n}</b>
    <span class="num">每 100 克：${r0(x.k)} 千卡　蛋白 ${x.p}g　碳水 ${x.cb}g　脂肪 ${x.f}g</span></button><span class="side">＋</span></div>`;
}

// 选好克数，记到某一餐
export function LibSheet({ lid, slot: slot0, onClose }) {
  const x = lib()[lid];
  const [g, setG] = useState("100");
  const [slot, setSlot] = useState(slot0 || "l");
  const [ate, setAte] = useState(true);
  const q = Math.max(0, num(g, 0)) / 100;
  const add = () => {
    if (!(q > 0 && q <= 20)) return UI.toast("克数请填 1–2000 之间的数字");
    const f = libFood(x);
    commit((S) => {
      if (!S.custom.some((c) => c.id === f.id)) S.custom.push(f);
      const day = dayOf(S, dateStr());
      if (!day.plan) day.plan = { meals: { b: [], l: [], d: [], s: [] } };
      const arr = day.plan.meals[slot];
      const hit = arr.find((it) => it.id === f.id);
      if (hit) hit.qty = Math.round((hit.qty + q) * 100) / 100; else arr.push({ id: f.id, qty: Math.round(q * 100) / 100, done: ate });
    });
    UI.toast(`已记到今天${SLOT_NAME[slot]}：${x.n} ${r0(q * 100)} 克`);
    onClose();
  };
  const keep = () => { onClose(); UI.open({ t: "food", id: null, pre: libFood(x) }); };
  const v = (k) => r0(x[k] * q * 10) / 10;
  return html`<${Sheet} title=${x.n} onClose=${onClose}>
    <div class="card stack">
      <label class="field">吃了多少克
        <input id="lib-g" inputmode="decimal" value=${g} onInput=${(e) => setG(e.target.value)} /></label>
      <div class="chips">${[50, 100, 150, 200, 300].map((n) => html`<button class="chip" aria-pressed=${String(num(g) === n)} onClick=${() => setG(String(n))}>${n} 克</button>`)}</div>
      <div class="tiles">
        <div class="tile"><div class="v num">${r0(x.k * q)}</div><div class="l">千卡</div></div>
        <div class="tile"><div class="v num">${v("p")} g</div><div class="l">蛋白质</div></div>
        <div class="tile"><div class="v num">${v("cb")} g</div><div class="l">碳水</div></div>
      </div>
      <div class="small muted">脂肪 ${v("f")} g　膳食纤维 ${v("fb")} g　钠 ${r0(x.na * q)} mg</div>
    </div>
    <div class="card stack">
      <div class="field">记到今天的
        <div class="chips">${["b", "l", "d", "s"].map((s) => html`<button class="chip" aria-pressed=${String(slot === s)} onClick=${() => setSlot(s)}>${SLOT_NAME[s]}</button>`)}</div></div>
      <label class="switch"><span>已经吃了（直接打勾）</span><input type="checkbox" checked=${ate} onChange=${(e) => setAte(e.target.checked)} /></label>
    </div>
    <div class="row">
      <button class="btn grow" id="lib-keep" onClick=${keep}>存成我的食物</button>
      <button class="btn primary grow" id="lib-add" onClick=${add}>记到${SLOT_NAME[slot]}</button>
    </div>
    <p class="tiny muted">数据来自《中国食物成分表》，是生重或常见做法的典型值。存成自己的食物以后，填上价格、勾上，排餐才会用到它。</p>
  <//>`;
}
