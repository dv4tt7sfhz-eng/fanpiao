// 饭票排餐引擎（给 iPhone 原生版的 JavaScriptCore 用）。
// 规则全部来自 www/js，和安卓 / 网页版完全一样。所有函数收 JSON 字符串、回 JSON 字符串。
import { blank, allFoods, dateStr, addDays, dayOf, prune } from "../www/js/store.js";
import { targetsOf, sumItems, planItems, SLOTS, SLOT_NAME, GOALS, ACTIVITY, saltOf } from "../www/js/nutrition.js";
import { makePlan, shareOf } from "../www/js/planner.js";
import { targetsFor, dayInfo, dayLabel, KIND, PLANS, planOf, makeCycle, rhythm, goalName } from "../www/js/plans.js";
import { FOODS, CATS } from "../www/js/foods.js";
import { searchLib, libFood, lib } from "../www/js/lib.js";
import { parseText, preview, FORMAT, aiPrompt } from "../www/js/aiimport.js";
import { PROVIDERS, visionCfg, snapPrompt, sanitizeSnap, packPrompt, sanitizePack, packToItem } from "../www/js/ai.js";
import { app } from "./ui-stub.js";
import { IRON, herTargets, herView, herApi } from "./her.js";

const MODE_S = { out: "外食", cold: "不开火", cook: "自己做" };
const TIERS = ["黑铁", "青铜", "白银", "黄金", "铂金", "钻石", "大师"], ROMAN = ["I", "II", "III"];
const r1 = (n) => Math.round(n * 10) / 10;
const qtyText = (q) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100));

function norm(raw) {
  const b = blank();
  const s = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : b;
  return { ...b, ...s, stock: { ...(s.stock || {}) }, prefs: { ...b.prefs, ...s.prefs, modes: { ...b.prefs.modes, ...(s.prefs || {}).modes } }, ai: { ...b.ai, ...s.ai }, cloud: { ...b.cloud, ...s.cloud } };
}
function ctx(S, d) {
  const day = dayOf(S, d);
  const foods = allFoods(S).map((f) => (IRON[f.id] != null && f.fe == null ? { ...f, fe: IRON[f.id] } : f));
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  return { day, foods, byId, T: herTargets(S, d, targetsFor(S, d, day)), info: dayInfo(S, d), enabled: foods.filter((f) => f.on) };
}
function replan(S, d, variety) {
  const { day, T, info, enabled, byId } = ctx(S, d);
  const locked = {}, avoid = {};
  const prev = day.plan || (S.days[addDays(d, -1)] || {}).plan;
  for (const s of SLOTS) {
    locked[s] = day.plan ? day.plan.meals[s].filter((it) => it.done && byId[it.id]) : [];
    avoid[s] = new Set(prev && (variety || !day.plan) ? prev.meals[s].filter((it) => !it.done).map((it) => it.id) : []);
  }
  const stock = S.stock || {};
  const pool = enabled.map((f) => ((stock[f.id] || 0) > 0 ? { ...f, $: 0 } : f));
  const extra = SLOTS.flatMap((s) => locked[s]).map((it) => byId[it.id]).filter(Boolean);
  const plan = makePlan({ foods: pool, T, modes: day.modes, budget: S.prefs.budget, snack: S.prefs.snack, locked, avoid, seed: Date.now(), skip: info.skip, plate: info.plate, extra });
  day.plan = { meals: plan.meals }; day.tip = ""; day.src = "local"; day.T = { kcal: T.kcal, protein: T.protein }; day.pv = (day.pv || 0) + 1;
}
// 记好一餐以后：这一餐和之前的只留真吃了的（打勾的），后面几餐按今天还差多少重新排
function rebalance(S, d, slot) {
  const { day, T, info, enabled, byId } = ctx(S, d);
  if (!day.plan) replan(S, d, false);
  const idx = SLOTS.indexOf(slot), locked = {}, skip = [...(info.skip || [])];
  for (const [k, s] of SLOTS.entries()) {
    const done = day.plan.meals[s].filter((it) => it.done && byId[it.id]);
    if (k <= idx) { day.plan.meals[s] = done; skip.push(s); }
    locked[s] = done;
  }
  const stock = S.stock || {};
  const pool = enabled.map((f) => ((stock[f.id] || 0) > 0 ? { ...f, $: 0 } : f));
  // 后面几餐按原来的比例，分今天还剩的热量
  const base = shareOf(S.prefs.snack, info.skip || []), eatenK = sumItems(SLOTS.flatMap((s) => locked[s]), (id) => byId[id]).kcal;
  const later = SLOTS.filter((s, k) => k > idx && !(info.skip || []).includes(s)), sumB = later.reduce((a, s) => a + (base[s] || 0), 0) || 1;
  const left = Math.max(0, (T.kcal - eatenK) / T.kcal), shareFix = {};
  for (const s of SLOTS) shareFix[s] = later.includes(s) ? ((base[s] || 0) / sumB) * left : 0;
  const plan = makePlan({ foods: pool, T, modes: day.modes, budget: S.prefs.budget, snack: S.prefs.snack, locked, avoid: {}, seed: Date.now(), skip, plate: info.plate, shareFix, extra: SLOTS.flatMap((s) => locked[s]).map((it) => byId[it.id]).filter(Boolean) });
  for (const [k, s] of SLOTS.entries()) if (k > idx) day.plan.meals[s] = plan.meals[s];
  day.src = "rebalance"; day.pv = (day.pv || 0) + 1;
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
// 本周（周一开始）有几天打过勾
function weekOf(S, today) {
  const wd = (new Date(today + "T12:00:00").getDay() + 6) % 7; let n = 0;
  for (let i = 0; i <= wd; i++) { const x = S.days[addDays(today, -i)]; if (x && x.plan && planItems(x.plan, true).length) n++; }
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
const tot = (t) => ({ kcal: Math.round(t.kcal), p: r1(t.p), f: r1(t.f), cb: r1(t.cb), cost: r1(t.cost), na: Math.round(t.na), fb: r1(t.fb), veg: Math.round(t.veg), fe: r1(t.fe || 0) });
const tgt = (T) => ({ kcal: T.kcal, protein: T.protein, fat: T.fat, carb: T.carb, naMax: T.naMax, fbMin: T.fbMin, goal: T.goal, kind: T.kind || null, flex: T.flex || 0, plus: T.plus || 0 });
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
      kcal: Math.round((f.k || 0) * it.qty), p: r1((f.p || 0) * it.qty), cost: r1((f.$ || 0) * it.qty), done: !!it.done, left: S.stock && S.stock[it.id] != null ? r1(S.stock[it.id]) : null }; });
    return { slot: s, name: SLOT_NAME[s], mode: s === "s" ? "" : MODE_S[day.modes[s]] || "", skip: info.skip.includes(s), items, sum: tot(sumItems(day.plan.meals[s], get)) };
  });
  const p = S.profile;
  return { date: d, T: tgt(T), planned: tot(tp), eaten: tot(te), meals, issues: issues(tp, T, S.prefs.budget), label: dayLabel(S, d), kindName: T.kind ? KIND[T.kind].n : "",
    planName: info.plan.n, planTag: info.plan.tag, week: weekOf(S, dateStr()), goalName: GOALS[T.goal].n, streak: streakOf(S, d), level: levelOf(S),
    profile: p ? { sex: p.sex, age: p.age, height: p.height, weight: p.weight, goal: p.goal } : null, budget: S.prefs.budget, accent: S.prefs.accent || "",
    salt: r1(saltOf(tp.na)), her: herView(S, d) };
}

const api = {
  format: () => FORMAT,
  blank: () => ({ S: blank() }),
  norm: (S) => norm(S),
  hasProfile: (S) => !!norm(S).profile,
  home: (S, d) => { S = norm(S); const v = home(S, d || dateStr()); prune(S); return { S, v }; },
  replan: (S, d) => { S = norm(S); replan(S, d || dateStr(), true); return { S, v: home(S, d || dateStr()) }; },
  toggle: (S, d, slot, i) => { S = norm(S); const day = dayOf(S, d); const it = day.plan && day.plan.meals[slot][i];
    if (it) { it.done = !it.done; if (S.stock[it.id] != null) S.stock[it.id] = Math.max(0, r1(S.stock[it.id] + (it.done ? -it.qty : it.qty))); }
    return { S, v: home(S, d) }; },
  rebalance: (S, d, slot) => { S = norm(S); rebalance(S, d, slot); return { S, v: home(S, d) }; },
  // 和昨天一样：今天打过勾的不动，没打勾的换成昨天那一份
  copyDay: (S, d) => { S = norm(S); const prev = (S.days[addDays(d, -1)] || {}).plan; if (!prev || !planItems(prev).length) return { S, v: home(S, d), ok: false };
    const day = dayOf(S, d); if (!day.plan) day.plan = { meals: { b: [], l: [], d: [], s: [] } };
    for (const sl of SLOTS) { const keep = (day.plan.meals[sl] || []).filter((x) => x.done); const ids = new Set(keep.map((x) => x.id));
      day.plan.meals[sl] = keep.concat((prev.meals[sl] || []).filter((x) => !ids.has(x.id)).map((x) => ({ id: x.id, qty: x.qty, done: false }))); }
    day.src = "copy"; return { S, v: home(S, d), ok: true }; },
  // ---------- 拍照识别（用户自己的 AI 密钥，OpenAI 兼容接口） ----------
  aiInfo: (S) => { S = norm(S); const v = visionCfg(S);
    return { providers: PROVIDERS.filter((p) => p.id !== "server").map((p) => ({ id: p.id, n: p.n, base: p.base || "", model: p.model || "", vmodel: p.vmodel || "", site: p.site || "" })),
      provider: S.ai.provider, base: S.ai.base || "", model: S.ai.model || "", key: S.ai.key || "", vmodel: S.ai.vmodel || "",
      vision: { base: v.base, key: v.key, model: v.model }, text: { base: (S.ai.base || (PROVIDERS.find((p) => p.id === S.ai.provider) || {}).base || "").replace(/\/+$/, ""), key: S.ai.key || "", model: S.ai.model || (PROVIDERS.find((p) => p.id === S.ai.provider) || {}).model || "" } }; },
  setAI: (S, patch) => { S = norm(S); S.ai = { ...S.ai, ...patch }; return { S }; },
  snapPrompt: (S, desc, textOnly) => snapPrompt(allFoods(norm(S)), desc || "", !!textOnly),
  snapClean: (S, raw) => { S = norm(S); const byId = Object.fromEntries(allFoods(S).map((f) => [f.id, f])); const r = sanitizeSnap(raw, byId);
    return { items: r.items.map(({ $, ...x }) => ({ ...x, price: $ })), note: r.note }; },
  packPrompt: (two) => packPrompt(!!two),
  packClean: (raw) => { const r = sanitizePack(raw); if (!r.ok) return { ok: false, note: r.note || "", warn: [], items: [] };
    const { $, ...x } = packToItem(r.t); return { ok: true, note: r.note || "", warn: r.warn, items: [{ ...x, price: $ }] }; },
  // 认出来的东西存进食物库，ate=true 就记到这一餐并打勾
  snapSave: (S, d, slot, items, ate) => { S = norm(S); const day = dayOf(S, d); if (!day.plan) replan(S, d, false);
    const plan = dayOf(S, d).plan;
    items.forEach((x, i) => { let id = x.match;
      if (id) { const c = S.custom.find((f) => f.id === id); if (c) c.on = true; else S.pantry[id] = { ...(S.pantry[id] || {}), on: true }; }
      else { id = "u" + Date.now().toString(36) + i; S.custom.push({ id, n: String(x.n).trim(), u: String(x.u || "份").trim() || "份", c: x.c, k: x.k, p: x.p, f: x.f, cb: x.cb, na: x.na, fb: x.fb, $: x.price || 0, ck: x.ck, r: x.r, s: x.s, on: true, out: !!x.out, snap: true, ...(x.pack ? { pack: true } : {}) }); }
      if (!slot) return; const arr = plan.meals[slot]; const hit = arr.find((y) => y.id === id);
      if (hit && ate && !hit.done) { hit.qty = x.qty; hit.done = true; } else if (hit) hit.qty = Math.round((hit.qty + x.qty) * 2) / 2; else arr.push({ id, qty: x.qty || 1, done: !!ate }); });
    return { S, v: home(S, d) }; },
  // 我的柜子
  stock: (S) => { S = norm(S); const today = dateStr(); const { byId, T } = ctx(S, today); const use = {}; let n = 0;
    for (let i = 0; i < 7; i++) { const x = S.days[addDays(today, -i)]; if (!x || !x.plan) continue; n++; for (const it of planItems(x.plan)) use[it.id] = (use[it.id] || 0) + it.qty; }
    let prot = 0; const items = [];
    for (const [id, left] of Object.entries(S.stock)) { const f = byId[id]; if (!f) continue; const per = n ? (use[id] || 0) / n : 0; const daily = per > 0 ? per : f.st || 1;
      prot += left * (f.p || 0); items.push({ id, n: f.n, u: f.u, left: r1(left), price: f.$ || 0, p: f.p || 0, k: f.k || 0, days: Math.floor(left / daily), low: left <= 3 }); }
    items.sort((a, b) => (a.low === b.low ? a.days - b.days : a.low ? -1 : 1));
    return { items, proteinDays: T.protein ? r1(prot / T.protein) : 0 }; },
  // 进货：数量 + 这一批一共多少钱（自动算单价）
  stockIn: (S, id, n, total) => { S = norm(S); S.stock[id] = r1((S.stock[id] || 0) + n);
    const c = S.custom.find((f) => f.id === id), patch = { on: true }; if (total > 0 && n > 0) patch.$ = Math.round((total / n) * 100) / 100;
    if (c) Object.assign(c, patch); else S.pantry[id] = { ...(S.pantry[id] || {}), ...patch }; return { S }; },
  setStock: (S, id, n) => { S = norm(S); if (n > 0) S.stock[id] = r1(n); else delete S.stock[id]; return { S }; },
  // 每元蛋白 / 每元热量
  values: (S) => { S = norm(S); return allFoods(S).filter((f) => (f.on || S.stock[f.id] != null) && f.r !== "manual" && (f.$ || 0) > 0)
    .map((f) => ({ id: f.id, n: f.n, u: f.u, price: f.$, p: f.p || 0, k: f.k || 0, gpy: r1((f.p || 0) / f.$), kpy: Math.round((f.k || 0) / f.$), stocked: S.stock[f.id] != null })); },
  // 记一杯奶茶这类不在食物库里的东西
  addQuick: (S, d, slot, name, k, p, f, cb, cost) => { S = norm(S); const id = "q" + Date.now().toString(36);
    S.custom.push({ id, n: name, u: "杯", c: "other", r: "manual", k, p, f, cb, $: cost, na: 0, fb: 0, st: 1, mx: 1, on: false });
    return api.addFood(S, d, slot, id, 1, true); },
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
  importApply: (S, next) => { S = norm(S); const n = norm(next); n.ai = S.ai; n.cloud = S.cloud; n.her = S.her; return { S: n }; },
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
  // 给 AI 的说明（拍营养成分表、让 AI 帮你填时复制）
  aiPrompt: (S, withMine) => aiPrompt(norm(S), !!withMine),
  // 我的页、成就要的累计数字
  stats: (S) => { S = norm(S); const today = dateStr(); let days = 0, full = 0, items = 0, first = "", last = ""; const months = {};
    for (const [d, day] of Object.entries(S.days)) { if (!day || !day.plan) continue; const it = planItems(day.plan), dn = it.filter((x) => x.done).length;
      if (dn) { days++; items += dn; if (!first || d < first) first = d; if (!last || d > last) last = d; const m = d.slice(0, 7); months[m] = (months[m] || 0) + 1; }
      if (it.length && dn === it.length) full++; }
    const m0 = today.slice(0, 7); let mCost = 0, mProt = 0, mDays = 0;
    for (const [d, day] of Object.entries(S.days)) { if (!day || !day.plan || d.slice(0, 7) !== m0 || d > today) continue; const eaten = planItems(day.plan, true); if (!eaten.length) continue;
      const { byId, T } = ctx(norm(JSON.parse(JSON.stringify(S))), d); const te = sumItems(eaten, (id) => byId[id]); mDays++; mCost += te.cost; if (te.p >= T.protein - 5) mProt++; }
    return { days, full, items, first, last, month: months[today.slice(0, 7)] || 0, week: weekOf(S, today), monthCost: r1(mCost), monthProtein: mProt, monthAvg: mDays ? r1(mCost / mDays) : 0, weights: S.weights.length, custom: S.custom.length, plan: S.cycle ? S.cycle.id : "steady", streak: streakOf(S, today), level: levelOf(S), w: S.weights.slice(-14) }; },
  // 截图、演示用：前 6 天照排好的吃、今天吃了早饭和午饭、7 天体重（不是任何真人的数据）
  demo: (S) => { S = norm(S); const today = dateStr();
    S.stock = { chicken_ready: 8, egg: 11, milk: 2, oats: 6, whey: 15 }; S.pantry.whey = { on: true };
    for (let i = 6; i >= 1; i--) { const d = addDays(today, -i); replan(S, d, false); const day = dayOf(S, d); for (const s of SLOTS) day.plan.meals[s].forEach((it, k) => { if ((i + k) % 6 !== 0) it.done = true; }); }
    home(S, today); const t = dayOf(S, today); for (const s of ["b", "l"]) t.plan.meals[s].forEach((it) => { it.done = true; });
    const w0 = S.profile ? S.profile.weight : 65; S.weights = [];
    for (let i = 6; i >= 0; i--) S.weights.push({ d: addDays(today, -i), kg: Math.round((w0 - i * 0.12 + (i % 2) * 0.1) * 10) / 10 });
    if (S.profile) S.profile.weight = S.weights[S.weights.length - 1].kg;
    return { S }; },
  herSet: (S, d, patch) => { S = norm(S); herApi.herSet(S, patch); return { S, v: home(S, d) }; },
  periodStart: (S, d) => { S = norm(S); herApi.periodStart(S, d); return { S, v: home(S, d) }; },
  periodEnd: (S, d) => { S = norm(S); herApi.periodEnd(S, d); return { S, v: home(S, d) }; },
  periodDelete: (S, d, s) => { S = norm(S); herApi.periodDelete(S, s); return { S, v: home(S, d) }; },
  setSym: (S, d, k, v) => { S = norm(S); herApi.setSym(S, d, k, v); return { S, v: home(S, d) }; },
  herClear: (S, d) => { S = norm(S); herApi.herClear(S); return { S, v: home(S, d) }; },
  herDemo: (S) => { S = norm(S); herApi.herDemo(S, dateStr()); return { S }; },
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
