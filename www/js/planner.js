// 本地排餐：不联网。随机生成一份，再反复小改（加一点、减一点、换一样），
// 每次只留下更接近目标的那一版。目标：热量、蛋白、脂肪对上，不超预算，有菜，不重样。
import { SLOTS, sumItems } from "./nutrition.js";

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 某一餐、某种吃法下能用哪些食物
export function candidates(slot, mode, foods) {
  return foods.filter((f) => {
    if (!f.s.includes(slot) || f.r === "manual") return false;
    if (slot === "s") return !f.out && f.ck <= 1;
    if (mode === "out") return f.out;
    return !f.out && f.ck <= (mode === "cook" ? 2 : 1);
  });
}

const SHARE = { withSnack: { b: 0.25, l: 0.35, d: 0.3, s: 0.1 }, noSnack: { b: 0.28, l: 0.38, d: 0.34, s: 0 } };

// 轻断食跳过的那一餐不分热量，其余几餐按比例分
export function shareOf(snack, skip = []) {
  const base = { ...(snack ? SHARE.withSnack : SHARE.noSnack) };
  if (!skip.length) return base;
  let gone = 0;
  for (const s of skip) { gone += base[s]; base[s] = 0; }
  const left = SLOTS.filter((s) => s !== "s" && base[s] > 0);
  const sum = left.reduce((a, s) => a + base[s], 0);
  for (const s of left) base[s] += (gone * base[s]) / sum;
  return base;
}

export function scorePlan(meals, ctx) {
  const { T, budget, byId, cand, avoid, snack, skip = [], plate, shareFix } = ctx;
  const get = (id) => byId[id];
  const all = SLOTS.flatMap((s) => meals[s]);
  const t = sumItems(all, get);
  let sc = 0;
  const eK = (t.kcal - T.kcal) / T.kcal;
  sc += (shareFix ? 1500 : 600) * eK * eK;
  if (t.p < T.protein) { const e = (T.protein - t.p) / T.protein; sc += 1500 * e * e + 4 * e; }
  else if (t.p > 1.35 * T.protein) { const e = (t.p - 1.35 * T.protein) / T.protein; sc += 200 * e * e; }
  if (t.f < T.fatMin) { const e = (T.fatMin - t.f) / T.fat; sc += 300 * e * e; }
  if (t.f > T.fatMax) { const e = (t.f - T.fatMax) / T.fat; sc += 300 * e * e; }
  if (t.veg < 300) sc += 8 * ((300 - t.veg) / 300);
  // 钠超过建议量、膳食纤维不够，都轻轻扣分（不会为了这两项牺牲热量和蛋白）
  if (T.naMax && t.na > T.naMax) { const e = (t.na - T.naMax) / T.naMax; sc += 30 * e * e + 4 * e; }
  if (T.fbMin && t.fb < T.fbMin) { const e = (T.fbMin - t.fb) / T.fbMin; sc += 14 * e * e + 4 * e; }
  if (budget > 0) {
    if (t.cost > budget) { const e = (t.cost - budget) / budget; sc += 2000 * e * e + 5; }
    sc += (3 * t.cost) / budget;
  }
  // shareFix：记好前面几餐后，后面几餐分「今天还剩的热量」
  const share = shareFix || shareOf(snack, skip);
  const seen = {};
  for (const s of SLOTS) {
    const items = meals[s];
    const mt = sumItems(items, get);
    if (skip.includes(s)) { sc += 40 * items.filter((it) => !it.lock).length; continue; }
    if (s !== "s" || shareFix) { const d = mt.kcal / T.kcal - share[s]; sc += 150 * d * d; }
    else if (!snack && items.length) sc += 6 * items.length;
    const roles = new Set(items.map((it) => get(it.id).r));
    const has = (r) => roles.has(r) || roles.has("meal");
    const can = (r) => cand[s].some((f) => f.r === r || f.r === "meal");
    if (s !== "s") {
      if (!has("staple") && can("staple")) sc += 4;
      if (s !== "b" && !has("protein") && can("protein")) sc += 4;
      if (s !== "b" && mt.veg < 100 && cand[s].some((f) => f.v > 0)) sc += 2;
      // 211 餐盘：午饭、晚饭蔬菜两份（约 200 g），主食只占一小份
      if (plate && s !== "b" && cand[s].some((f) => f.v > 0)) {
        if (mt.veg < 200) sc += 6 * ((200 - mt.veg) / 200);
        const stK = sumItems(items.filter((it) => get(it.id).r === "staple"), get).kcal;
        if (mt.kcal > 0 && stK / mt.kcal > 0.38) sc += 12 * (stK / mt.kcal - 0.38);
      }
      if (items.length > 4) sc += 2 * (items.length - 4);
      const nStaple = items.filter((it) => get(it.id).r === "staple").length;
      if (nStaple > 1) sc += 1.2 * (nStaple - 1);
    } else if (items.length > 2) sc += items.length - 2;
    for (const it of items) {
      const f = get(it.id);
      const nice = f.mx >= 3 ? 2 : f.mx;
      if (it.qty > nice) sc += 0.6 * (it.qty - nice) ** 2;
      if (f.junk) sc += 1.5 * it.qty;
      if (f.supp && it.qty > 1) sc += 0.8 * (it.qty - 1);
      if (seen[it.id]) sc += f.r === "staple" ? 0.5 : 1.2;
      seen[it.id] = (seen[it.id] || 0) + it.qty;
      if (avoid && avoid[s] && avoid[s].has(it.id)) sc += 1.2;
    }
  }
  for (const id in seen) if (seen[id] > byId[id].mx) sc += 50 * (seen[id] - byId[id].mx);
  return sc;
}

// opts: foods(已勾选的食物) T(目标) modes{b,l,d} budget snack seed locked{slot:[items]} avoid{slot:Set}
// start: 给一份现成的搭配（比如 AI 排的），只调数量不换食物，让数字对上目标
export function makePlan(opts) {
  const { foods, T, modes, budget = 0, snack = true, seed = Date.now(), locked = {}, avoid = null, start = null, skip = [], plate = false, shareFix = null, extra = [] } = opts;
  // extra：已经吃了、但不在可选食物里的东西（比如记的一杯奶茶），只用来算数，不会被排进去
  const byId = Object.fromEntries([...extra, ...foods].map((f) => [f.id, f]));
  const cand = {};
  for (const s of SLOTS) cand[s] = candidates(s, modes[s] || "cold", foods);
  if (!snack) cand.s = [];
  for (const s of skip) cand[s] = [];
  const ctx = { T, budget, byId, cand, avoid, snack, skip, plate, shareFix };
  const lockedOk = (s) => (locked[s] || []).filter((it) => byId[it.id]).map((it) => ({ ...it, lock: true }));
  const R = rng(seed);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const ofRole = (s, r) => cand[s].filter((f) => f.r === r);
  const TEMPLATE = { b: ["staple", "protein|dairy"], l: ["staple", "protein", "veg"], d: ["staple", "protein", "veg"], s: ["fruit|dairy|fat"] };

  function initial() {
    const meals = {};
    for (const s of SLOTS) {
      meals[s] = lockedOk(s);
      const have = new Set(meals[s].map((it) => it.id));
      if (s !== "s" && R() < 0.35) {
        const whole = ofRole(s, "meal").filter((f) => !have.has(f.id));
        if (whole.length) { meals[s].push({ id: pick(whole).id, qty: 1 }); continue; }
      }
      for (const slotRoles of TEMPLATE[s]) {
        const pool = slotRoles.split("|").flatMap((r) => ofRole(s, r)).filter((f) => !have.has(f.id));
        if (!pool.length) continue;
        const f = pick(pool);
        meals[s].push({ id: f.id, qty: f.st }); have.add(f.id);
      }
    }
    return meals;
  }
  const clone = (m) => Object.fromEntries(SLOTS.map((s) => [s, m[s].map((it) => ({ ...it }))]));

  function fromStart() {
    const meals = {};
    for (const s of SLOTS) meals[s] = (start[s] || []).filter((it) => byId[it.id]).map((it) => ({ id: it.id, qty: it.qty, done: !!it.done, lock: !!it.done }));
    return meals;
  }
  function tune(m) {
    const s = pick(SLOTS);
    const free = m[s].filter((it) => !it.lock);
    if (!free.length) return;
    const it = pick(free); const f = byId[it.id];
    const q = Math.round((it.qty + (R() < 0.5 ? f.st : -f.st)) * 100) / 100;
    if (q >= f.st && q <= f.mx) it.qty = q;
  }
  function mutate(m) {
    if (start) return tune(m);
    const s = pick(SLOTS);
    const items = m[s];
    const free = items.filter((it) => !it.lock);
    const kind = R();
    if (kind < 0.45 && free.length) {
      const it = pick(free); const f = byId[it.id];
      const q = Math.round((it.qty + (R() < 0.5 ? f.st : -f.st)) * 100) / 100;
      if (q <= 0) items.splice(items.indexOf(it), 1);
      else if (q <= f.mx) it.qty = q;
    } else if (kind < 0.7 && free.length) {
      const it = pick(free); const f = byId[it.id];
      const pool = cand[s].filter((c) => c.r === f.r && !items.some((x) => x.id === c.id));
      if (pool.length) { const c = pick(pool); it.id = c.id; it.qty = Math.min(c.mx, Math.max(c.st, Math.round(it.qty / c.st) * c.st)); }
    } else if (kind < 0.9) {
      const pool = cand[s].filter((c) => !items.some((x) => x.id === c.id));
      if (pool.length && items.length < 5) { const c = pick(pool); items.push({ id: c.id, qty: c.st }); }
    } else if (free.length) items.splice(items.indexOf(pick(free)), 1);
  }

  // 模拟退火：前期允许暂时变差一点，避免卡在「差一点点」的搭配上
  let best = null, bestSc = Infinity;
  const runs = start ? 1 : 8, iters = start ? 2500 : 2600;
  for (let r = 0; r < runs; r++) {
    let cur = start ? fromStart() : initial(), sc = scorePlan(cur, ctx);
    if (sc < bestSc) { best = cur; bestSc = sc; }
    for (let i = 0; i < iters; i++) {
      const temp = start ? 0 : 2.5 * (1 - i / iters) ** 2;
      const nx = clone(cur); mutate(nx);
      const s2 = scorePlan(nx, ctx);
      if (s2 <= sc || (temp > 0.01 && R() < Math.exp((sc - s2) / temp))) {
        cur = nx; sc = s2;
        if (sc < bestSc) { best = cur; bestSc = sc; }
      }
    }
  }
  for (const s of SLOTS) best[s] = best[s].map(({ id, qty, done }) => ({ id, qty, done: !!done }));
  return { meals: best, score: bestSc };
}

// 把 AI 或服务器给的方案洗干净：只留认识的食物，数量合法
export function sanitizePlan(raw, byId, modes) {
  const meals = { b: [], l: [], d: [], s: [] };
  const src = raw && raw.meals ? raw.meals : {};
  for (const s of SLOTS) {
    const arr = Array.isArray(src[s]) ? src[s] : [];
    for (const it of arr) {
      const f = it && byId[String(it.id)];
      if (!f) continue;
      let q = Number(it.qty);
      if (!Number.isFinite(q) || q <= 0) continue;
      q = Math.min(f.mx * 1.5, Math.max(f.st, Math.round(q / f.st) * f.st));
      const hit = meals[s].find((x) => x.id === f.id);
      if (hit) hit.qty += q; else meals[s].push({ id: f.id, qty: q, done: false });
    }
  }
  const n = SLOTS.reduce((a, s) => a + meals[s].length, 0);
  return n ? { meals } : null;
}
