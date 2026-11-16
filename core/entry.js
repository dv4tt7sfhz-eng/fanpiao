// 饭票排餐引擎（给 iPhone 原生版的 JavaScriptCore 用）。
// 规则全部来自 www/js，和安卓 / 网页版完全一样。所有函数收 JSON 字符串、回 JSON 字符串。
import { blank, allFoods, dateStr, addDays, dayOf, prune } from "../www/js/store.js";
import { targetsOf, sumItems, planItems, SLOTS, SLOT_NAME, GOALS, ACTIVITY, saltOf } from "../www/js/nutrition.js";
import { makePlan } from "../www/js/planner.js";
import { targetsFor, dayInfo, dayLabel, KIND, PLANS, planOf, makeCycle, rhythm, goalName } from "../www/js/plans.js";
import { FOODS, CATS } from "../www/js/foods.js";
import { searchLib, libFood, lib } from "../www/js/lib.js";
import { parseText, preview, FORMAT } from "../www/js/aiimport.js";
import { app } from "./ui-stub.js";

const MODE_S = { out: "外食", cold: "不开火", cook: "自己做" };
const TIERS = ["黑铁", "青铜", "白银", "黄金", "铂金", "钻石", "大师"], ROMAN = ["I", "II", "III"];
const r1 = (n) => Math.round(n * 10) / 10;
const qtyText = (q) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100));

function norm(raw) {
  const b = blank();
  const s = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : b;
  return { ...b, ...s, prefs: { ...b.prefs, ...s.prefs, modes: { ...b.prefs.modes, ...(s.prefs || {}).modes } }, ai: { ...b.ai, ...s.ai }, cloud: { ...b.cloud, ...s.cloud } };
}
function ctx(S, d) {
  const day = dayOf(S, d);
  const foods = allFoods(S);
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  return { day, foods, byId, T: targetsFor(S, d, day), info: dayInfo(S, d), enabled: foods.filter((f) => f.on) };
}
function replan(S, d, variety) {
  const { day, T, info, enabled, byId } = ctx(S, d);
  const locked = {}, avoid = {};
  const prev = day.plan || (S.days[addDays(d, -1)] || {}).plan;
  for (const s of SLOTS) {
    locked[s] = day.plan ? day.plan.meals[s].filter((it) => it.done && byId[it.id]) : [];
    avoid[s] = new Set(prev && (variety || !day.plan) ? prev.meals[s].filter((it) => !it.done).map((it) => it.id) : []);
  }
  const plan = makePlan({ foods: enabled, T, modes: day.modes, budget: S.prefs.budget, snack: S.prefs.snack, locked, avoid, seed: Date.now(), skip: info.skip, plate: info.plate });
  day.plan = { meals: plan.meals }; day.tip = ""; day.src = "local"; day.T = { kcal: T.kcal, protein: T.protein }; day.pv = (day.pv || 0) + 1;
}
function issues(tp, T, budget) {
  const out = [], dk = tp.kcal - T.kcal, tight = budget > 0 && tp.cost >= budget * 0.93, r0 = Math.round;
  if (dk < -150) out.push(tight ? `按 ¥${budget} 的预算，今天的安排比目标少 ${r0(-dk)} 千卡。可以把预算调高一点，或者多勾几样便宜的主食。` : `今天的安排比目标少 ${r0(-dk)} 千卡，可以加点主食。`);
  if (dk > 150) out.push(`今天的安排比目标多 ${r0(dk)} 千卡，主食或坚果可以少一点。`);
  if (tp.p < T.protein - 5) out.push(`蛋白还可以再加 ${r0(T.protein - tp.p)} g。`);
  if (tp.f > T.fatMax + 5) out.push(`脂肪稍多（${r0(tp.f)} g）。`);
  if (tp.f < T.fatMin - 5) out.push(`脂肪稍少（${r0(tp.f)} g），可以加点坚果。`);
  if (budget > 0 && tp.cost > budget + 0.05) out.push(`比预算多 ¥${(Math.round((tp.cost - budget) * 10) / 10).toFixed(1)}。`);
  return out;
}
function streakOf(S, today) {
  const has = (d) => { const x = S.days[d]; return !!(x && x.plan && planItems(x.plan, true).length); };
  let n = 0, d = has(today) ? today : addDays(today, -1);
  while (has(d) && n < 999) { n++; d = addDays(d, -1); }
  return n;
}
function levelOf(S) {
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
const tot = (t) => ({ kcal: Math.round(t.kcal), p: r1(t.p), f: r1(t.f), cb: r1(t.cb), cost: r1(t.cost), na: Math.round(t.na), fb: r1(t.fb), veg: Math.round(t.veg) });
const tgt = (T) => ({ kcal: T.kcal, protein: T.protein, fat: T.fat, carb: T.carb, naMax: T.naMax, fbMin: T.fbMin, goal: T.goal, kind: T.kind || null });
const foodOut = (f) => ({ id: f.id, n: f.n, u: f.u, c: f.c, k: f.k, p: f.p, f: f.f, cb: f.cb, price: f.$, na: f.na || 0, fb: f.fb || 0, on: !!f.on, out: !!f.out, ck: f.ck || 0, custom: !!f.custom });

// 首页要的全部数字。没有今天的饭就先排一份。
function home(S, d) {
  const c0 = ctx(S, d);
  if (!c0.day.plan) replan(S, d, false);
  const { day, byId, T, info } = ctx(S, d);
  const get = (id) => byId[id];
  const tp = sumItems(planItems(day.plan), get), te = sumItems(planItems(day.plan, true), get);
  const meals = SLOTS.filter((s) => S.prefs.snack || s !== "s" || day.plan.meals.s.length).map((s) => {
    const items = day.plan.meals[s].map((it, i) => { const f = get(it.id) || {}; return { i, id: it.id, n: f.n || "（已删除的食物）", u: f.u || "", qty: it.qty, qtyText: qtyText(it.qty),
      kcal: Math.round((f.k || 0) * it.qty), p: r1((f.p || 0) * it.qty), cost: r1((f.$ || 0) * it.qty), done: !!it.done }; });
    return { slot: s, name: SLOT_NAME[s], mode: s === "s" ? "" : MODE_S[day.modes[s]] || "", skip: info.skip.includes(s), items, sum: tot(sumItems(day.plan.meals[s], get)) };
  });
  const p = S.profile;
  return { date: d, T: tgt(T), planned: tot(tp), eaten: tot(te), meals, issues: issues(tp, T, S.prefs.budget), label: dayLabel(S, d), kindName: T.kind ? KIND[T.kind].n : "",
    planName: info.plan.n, planTag: info.plan.tag, goalName: GOALS[T.goal].n, streak: streakOf(S, d), level: levelOf(S),
    profile: p ? { sex: p.sex, age: p.age, height: p.height, weight: p.weight, goal: p.goal } : null, budget: S.prefs.budget, accent: S.prefs.accent || "",
    salt: r1(saltOf(tp.na)) };
}

const api = {
  format: () => FORMAT,
  blank: () => ({ S: blank() }),
  norm: (S) => norm(S),
  hasProfile: (S) => !!norm(S).profile,
  home: (S, d) => { S = norm(S); const v = home(S, d || dateStr()); prune(S); return { S, v }; },
  replan: (S, d) => { S = norm(S); replan(S, d || dateStr(), true); return { S, v: home(S, d || dateStr()) }; },
  toggle: (S, d, slot, i) => { S = norm(S); const day = dayOf(S, d); const it = day.plan && day.plan.meals[slot][i]; if (it) it.done = !it.done; return { S, v: home(S, d) }; },
  removeItem: (S, d, slot, i) => { S = norm(S); const day = dayOf(S, d); if (day.plan) day.plan.meals[slot].splice(i, 1); return { S, v: home(S, d) }; },
  setQty: (S, d, slot, i, q) => { S = norm(S); const day = dayOf(S, d); const it = day.plan && day.plan.meals[slot][i]; if (it && q > 0) it.qty = Math.round(q * 100) / 100; return { S, v: home(S, d) }; },
  addFood: (S, d, slot, id, qty, done) => { S = norm(S); const day = dayOf(S, d); if (!day.plan) day.plan = { meals: { b: [], l: [], d: [], s: [] } };
    const arr = day.plan.meals[slot], hit = arr.find((x) => x.id === id); if (hit) hit.qty = Math.round((hit.qty + qty) * 100) / 100; else arr.push({ id, qty, done: !!done }); return { S, v: home(S, d) }; },
  setMode: (S, d, slot, mode) => { S = norm(S); const day = dayOf(S, d); day.modes[slot] = mode; S.prefs.modes[slot] = mode; replan(S, d, false); return { S, v: home(S, d) }; },
  foods: (S) => { S = norm(S); return { cats: CATS, foods: allFoods(S).filter((f) => f.r !== "manual").map(foodOut) }; },
  setOn: (S, id, on) => { S = norm(S); const c = S.custom.find((f) => f.id === id); if (c) c.on = on; else S.pantry[id] = { ...(S.pantry[id] || {}), on }; return { S }; },
  search: (q) => searchLib(q, 30).map((x) => ({ lid: x.lid, n: x.n, k: Math.round(x.k), p: x.p, cb: x.cb, f: x.f, fb: x.fb, na: Math.round(x.na) })),
  addLib: (S, d, lid, grams, slot, done) => { S = norm(S); const f = libFood(lib()[lid]); if (!S.custom.some((c) => c.id === f.id)) S.custom.push(f);
    return api.addFood(S, d, slot, f.id, Math.round((grams / 100) * 100) / 100, done); },
  // 粘贴 AI 写的数据：先预览，确认后应用
  importPreview: (S, text) => { S = norm(S); app.S = S; const raw = parseText(text); const pv = preview(S, raw); return { rows: pv.rows, warns: pv.warns, note: pv.note || "", next: pv.next }; },
  importApply: (S, next) => { S = norm(S); const n = norm(next); n.ai = S.ai; n.cloud = S.cloud; return { S: n }; },
  setProfile: (S, prof) => { S = norm(S); const fresh = !S.profile; S.profile = { ...(S.profile || {}), ...prof }; if (fresh && !S.weights.length) S.weights = [{ d: dateStr(), kg: prof.weight }];
    const t = S.days[dateStr()]; if (t && t.plan && !planItems(t.plan, true).length) t.plan = null; return { S }; },
  setPrefs: (S, prefs) => { S = norm(S); S.prefs = { ...S.prefs, ...prefs }; const t = S.days[dateStr()]; if (t && t.plan && !planItems(t.plan, true).length) t.plan = null; return { S }; },
  addWeight: (S, kg) => { S = norm(S); const d = dateStr(); S.weights = S.weights.filter((w) => w.d !== d).concat([{ d, kg }]).sort((a, b) => (a.d < b.d ? -1 : 1)); if (S.profile) S.profile.weight = kg; return { S }; },
  records: (S, n) => { S = norm(S); const today = dateStr(); const out = [];
    for (let i = (n || 7) - 1; i >= 0; i--) { const d = addDays(today, -i); const day = S.days[d]; const { byId, T } = ctx(norm(JSON.parse(JSON.stringify(S))), d);
      const te = day && day.plan ? sumItems(planItems(day.plan, true), (id) => byId[id]) : { kcal: 0, p: 0, f: 0, cb: 0, cost: 0, na: 0, fb: 0, veg: 0 }; out.push({ d, T: tgt(T), e: tot(te) }); }
    return { days: out, weights: S.weights.slice(-60), level: levelOf(S), streak: streakOf(S, today) }; },
  plans: (S) => { S = norm(S); const cur = S.cycle ? S.cycle.id : "steady"; return { cur, plans: PLANS.map((p) => ({ id: p.id, g: p.g, n: p.n, tag: p.tag, d: p.d, simple: !p.edit && p.id !== "manual" && !p.ai && !p.kai })),
    rhythm: rhythm(S, dateStr(), 14).map((r) => ({ d: r.d, kind: r.kind, kcal: r.T.kcal })) }; },
  setPlan: (S, id) => { S = norm(S); S.cycle = makeCycle(S, id); const t = S.days[dateStr()]; if (t && t.plan && !planItems(t.plan, true).length) t.plan = null; return { S }; },
  goals: () => ({ goals: Object.entries(GOALS).map(([id, g]) => ({ id, n: g.n, d: g.d })), activity: ACTIVITY }),
};
// Swift 只认字符串：fn 名 + JSON 参数数组 → JSON 结果；出错回 {error}
globalThis.FP = (name, argsJSON) => {
  try {
    const args = JSON.parse(argsJSON || "[]");
    const out = api[name](...args);
    // 状态本身原样当字符串交给 Swift 存，不用 Swift 去解析它
    if (out && typeof out === "object" && !Array.isArray(out)) { if (out.S) out.S = JSON.stringify(out.S); if (out.next) out.next = JSON.stringify(out.next); }
    return JSON.stringify({ ok: out === undefined ? null : out });
  }
  catch (e) { return JSON.stringify({ error: String((e && e.message) || e) }); }
};
