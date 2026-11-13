// 「让 AI 帮你填」：给任何 AI 一份说明，它按 fanpiao.ai/1 格式写出一段数据；
// 粘贴回饭票，先给用户看要改什么，确认后才写进去。
// 程序也可以用链接直接打开这一页（同样只预览、不会自动写入）：
//   fanpiao://import?data=<base64url 编码的 JSON>
//   fanpiao://import?json=<URL 编码的 JSON>
//   网页版：index.html#ai-import=<base64url 编码的 JSON>
// 完整格式见 docs/AI接口.md 和 docs/fanpiao-ai-1.schema.json
import { html, useState, useEffect, useRef, app, commit, UI, Sheet, copyText, MODE } from "./ui.js";
import { FOODS, CATS } from "./foods.js";
import { ACTIVITY, GOALS, targetsOf, sumItems, planItems, SLOTS, SLOT_NAME } from "./nutrition.js";
import { allFoods, dateStr, addDays, dayOf } from "./store.js";
import { sanitizePlan } from "./planner.js";
import { aiReady, chatJSON } from "./ai.js";

export const FORMAT = "fanpiao.ai/1";
const ROLES = ["staple", "protein", "dairy", "veg", "fruit", "fat", "meal"];
const ROLE_CAT = { staple: "主食", protein: "肉蛋水产", dairy: "奶和豆", veg: "蔬菜", fruit: "水果", fat: "坚果", meal: "食堂外食" };
const ROLE_S = { staple: "bld", protein: "ld", dairy: "bs", veg: "ld", fruit: "bs", fat: "bs", meal: "ld" };
const KNOWN = ["format", "profile", "prefs", "foods", "weights", "today", "plan", "plans", "note"];
const SEX = { m: "m", male: "m", man: "m", 男: "m", f: "f", female: "f", woman: "f", 女: "f" };
const GOAL = { gain: "gain", bulk: "gain", 增肌: "gain", cut: "cut", lose: "cut", 减脂: "cut", keep: "keep", maintain: "keep", 保持: "keep" };
const MODE_IN = { out: "out", 食堂: "out", "食堂/外面吃": "out", 外食: "out", 外面吃: "out", cold: "cold", 不开火: "cold", cook: "cook", 自己做: "cook", 开火: "cook" };
const ACT_IN = { 几乎不动: 1.2, 轻度活动: 1.375, 轻度: 1.375, 中度活动: 1.55, 中度: 1.55, 活动量大: 1.725, 大: 1.725 };

const isDate = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
const N = (x) => (typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN);
const r1 = (x) => Math.round(x * 10) / 10;
const str = (x, n) => (typeof x === "string" ? x.trim().slice(0, n) : "");
const norm = (x) => String(x || "").trim().toLowerCase().replace(/\s+/g, "");
const yes = (x) => !(x === false || x === 0 || /^(false|no|0|否|不要|不)$/i.test(String(x).trim()));
const md = (d) => `${+d.slice(5, 7)} 月 ${+d.slice(8, 10)} 日`;
const has = (o, k) => o && o[k] !== undefined && o[k] !== null && o[k] !== "";

// ---------- 链接和文字 → JSON ----------
function b64urlDecode(s) {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
export function encodePack(obj) {
  let bin = "";
  for (const b of new TextEncoder().encode(JSON.stringify(obj))) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// 从链接里取出数据文字。不是饭票的导入链接就返回 null。
export function fromLink(url) {
  const u = String(url || "");
  let m = u.match(/(?:[?&]data=|#ai-import=)([A-Za-z0-9_\-+/=%]+)/);
  if (m) return b64urlDecode(decodeURIComponent(m[1]));
  m = u.match(/[?&]json=([^&#]+)/);
  if (m) return decodeURIComponent(m[1].replace(/\+/g, " "));
  return null;
}

export function parseText(text) {
  let t = String(text || "").trim();
  if (!t) throw new Error("还没粘贴内容。");
  const link = t.match(/fanpiao:\/\/import\S*|\S*#ai-import=\S+/);
  if (link) { try { const d = fromLink(link[0]); if (d) t = d; } catch (e) { throw new Error("这个链接里的数据读不出来，可能复制得不完整。"); } }
  // AI 常把 JSON 放在 ```json 代码块里，前后还有说明文字
  for (const m of t.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)) if (m[1].includes("{")) { t = m[1]; break; }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("没找到数据。AI 写的那段应该是用 { 开头、} 结尾的。");
  t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch (e) {}
  // 常见的小毛病：中文引号、多余的逗号、// 注释
  const fixed = t.replace(/[“”]/g, '"').replace(/^\s*\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(fixed); } catch (e) { throw new Error("这段数据的格式有错，读不了。可以跟 AI 说「只输出一个 json 代码块，检查一下格式」，让它再发一次。"); }
}

// ---------- 检查数据，算出导入以后的样子（不改现在的数据） ----------
function pickActivity(x) {
  if (typeof x === "string" && ACT_IN[x.trim()]) return ACT_IN[x.trim()];
  const v = N(x);
  if (!Number.isFinite(v)) return NaN;
  if (v >= 1.1 && v <= 2) return ACTIVITY.reduce((a, b) => (Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a)).v;
  if (v >= 0 && v <= 14) return v < 1 ? 1.2 : v <= 2 ? 1.375 : v <= 5 ? 1.55 : 1.725; // 当成「每周运动几次」
  return NaN;
}
function guessRole(k, p, f, cb) {
  const e = Math.max(1, p * 4 + f * 9 + cb * 4);
  if ((p * 4) / e >= 0.3) return "protein";
  if ((f * 9) / e >= 0.6) return "fat";
  return "staple";
}

export function preview(S0, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("数据应该是用 { } 包起来的一整段。");
  if (raw.v === 1 && raw.pantry) throw new Error("这是饭票「导出」的完整备份，请到「我的 → 导出、导入、清空数据」里导入。");
  const S = JSON.parse(JSON.stringify(S0));
  const today = dateStr();
  const rows = [], warns = [];
  const row = (k, v) => rows.push([k, v]);
  let changed = false, replan = false;
  if (raw.format && raw.format !== FORMAT) warns.push(`数据写的格式是「${String(raw.format).slice(0, 20)}」，这个版本的饭票认的是 ${FORMAT}，有些内容可能导不进来。`);
  const unknown = Object.keys(raw).filter((k) => !KNOWN.includes(k));
  if (unknown.length) warns.push(`这些内容饭票不认识，跳过了：${unknown.slice(0, 6).join("、")}`);

  // 1. 资料和目标
  const oldT = S0.profile ? targetsOf(S0.profile) : null;
  if (raw.profile && typeof raw.profile === "object") {
    const p = raw.profile, np = { ...(S.profile || {}) }, bad = [];
    if (has(p, "sex")) { const v = SEX[norm(p.sex)]; if (v) np.sex = v; else bad.push("性别"); }
    const rng = (key, name, lo, hi, dec) => {
      if (!has(p, key)) return;
      const v = N(p[key]);
      if (v >= lo && v <= hi) np[key] = dec ? r1(v) : Math.round(v); else bad.push(`${name}（要在 ${lo}–${hi} 之间）`);
    };
    rng("age", "年龄", 14, 90); rng("height", "身高", 120, 220, true); rng("weight", "体重", 30, 250, true);
    if (has(p, "goal")) { const v = GOAL[norm(p.goal)]; if (v) np.goal = v; else bad.push("目标"); }
    if (has(p, "activity")) { const v = pickActivity(p.activity); if (v) np.activity = v; else bad.push("活动量"); }
    // 进阶项：填 0 或 null 表示清掉，回到自动
    const opt = (key, name, lo, hi, dec) => {
      if (!(key in p)) return;
      const v = N(p[key]);
      if (p[key] === null || v === 0) delete np[key];
      else if (v >= lo && v <= hi) np[key] = dec ? r1(v) : Math.round(v);
      else bad.push(`${name}（要在 ${lo}–${hi} 之间）`);
    };
    opt("proteinPerKg", "每公斤蛋白", 0.8, 2.5, true);
    opt("kcalOverride", "自定热量", (np.sex === "f" ? 1200 : 1500), 6000);
    opt("restKcal", "静息千卡", 800, 4000);
    const miss = [["sex", "性别"], ["age", "年龄"], ["height", "身高"], ["weight", "体重"]].filter(([k]) => !np[k]).map((x) => x[1]);
    if (miss.length) throw new Error(`还缺${miss.join("、")}（或者写得不对），饭票算不出你该吃多少。请让 AI 补上再发一次。`);
    np.goal = np.goal || "keep";
    np.activity = np.activity || 1.375;
    if (np.age < 18 && np.goal === "cut") { np.goal = "keep"; warns.push("未满 18 岁不提供减脂目标，先按「保持」算。"); }
    if (bad.length) warns.push(`这几项写得不对，没改：${bad.join("、")}`);
    if (JSON.stringify(np) !== JSON.stringify(S.profile)) {
      S.profile = np; changed = replan = true;
      const act = ACTIVITY.find((a) => a.v === np.activity) || ACTIVITY[1];
      row(S0.profile ? "资料" : "建档", `${np.sex === "f" ? "女" : "男"}　${np.age} 岁　${np.height} cm　${np.weight} kg`);
      row("目标", `${GOALS[np.goal].n}　${act.n}${np.proteinPerKg ? `　每公斤 ${np.proteinPerKg} g 蛋白` : ""}`);
      const T = targetsOf(np);
      row("每天热量", oldT && oldT.kcal !== T.kcal ? `${oldT.kcal} → ${T.kcal} 千卡` : `${T.kcal} 千卡`);
      row("蛋白 / 脂肪 / 碳水", `${T.protein} / ${T.fat} / ${T.carb} g`);
    }
  } else if (!S.profile) throw new Error("你还没建档，数据里要有 profile（性别、年龄、身高、体重）。");

  // 2. 三餐和预算
  if (raw.prefs && typeof raw.prefs === "object") {
    const q = raw.prefs, before = JSON.stringify(S.prefs);
    if (has(q, "budget")) { const v = N(q.budget); if (v >= 0 && v <= 1000) S.prefs.budget = r1(v); else warns.push("预算要填 0–1000 的数字（0 是不限），没改。"); }
    if (has(q, "snack")) S.prefs.snack = yes(q.snack);
    if (q.modes && typeof q.modes === "object") for (const k of ["b", "l", "d"]) {
      if (!has(q.modes, k)) continue;
      const v = MODE_IN[norm(q.modes[k])];
      if (v) S.prefs.modes[k] = v; else warns.push(`${SLOT_NAME[k]}的吃法「${String(q.modes[k]).slice(0, 10)}」不认识，没改。`);
    }
    if (JSON.stringify(S.prefs) !== before || !S0.profile) {
      changed = replan = true;
      row("三餐", ["b", "l", "d"].map((k) => MODE[S.prefs.modes[k]].s).join(" / ") + (S.prefs.snack ? " + 加餐" : "，不加餐"));
      row("每天预算", S.prefs.budget > 0 ? "¥" + S.prefs.budget : "不限");
    }
  }

  if (!S0.profile && !(raw.prefs && typeof raw.prefs === "object")) {
    row("三餐（默认）", ["b", "l", "d"].map((k) => MODE[S.prefs.modes[k]].s).join(" / ") + (S.prefs.snack ? " + 加餐" : ""));
    row("每天预算（默认）", S.prefs.budget > 0 ? "¥" + S.prefs.budget : "不限");
  }

  // 3. 食物
  const lookup = () => {
    const all = allFoods(S);
    const byId = Object.fromEntries(all.map((f) => [f.id, f]));
    const byName = {};
    for (const f of all) { byName[norm(f.n)] = f; for (const part of f.n.split("/")) if (!byName[norm(part)]) byName[norm(part)] = f; }
    return { all, byId, find: (x) => (typeof x === "string" ? byId[x.trim()] || byName[norm(x)] || null : null) };
  };
  const setOn = (f, on) => {
    if (f.custom) { const c = S.custom.find((x) => x.id === f.id); if (c) c.on = on; }
    else S.pantry[f.id] = { ...(S.pantry[f.id] || {}), on };
  };
  const fd = raw.foods;
  if (fd && typeof fd === "object") {
    const onBefore = new Set(allFoods(S).filter((f) => f.on).map((f) => f.id));
    const added = [], updated = [], missing = [];
    let priced = 0;
    if (fd.only === true) for (const f of allFoods(S)) setOn(f, false);
    const adds = Array.isArray(fd.add) ? fd.add.slice(0, 80) : [];
    if (Array.isArray(fd.add) && fd.add.length > 80) warns.push("一次最多加 80 样新食物，后面的没加。");
    adds.forEach((a, i) => {
      if (!a || typeof a !== "object") return;
      const n = str(a.n || a.name, 24);
      if (!n) return warns.push(`第 ${i + 1} 样新食物没有名字，跳过了。`);
      const k = N(a.k ?? a.kcal), p = N(a.p ?? a.protein), f = N(a.f ?? a.fat), cb = N(a.cb ?? a.carb);
      if (![k, p, f, cb].every((x) => x >= 0) || k > 3000 || p > 300 || f > 300 || cb > 300) return warns.push(`「${n}」的热量、蛋白、脂肪、碳水没写全或不对，跳过了。`);
      let price = N(a.price ?? a.$);
      if (!(price >= 0 && price <= 500)) { price = 0; warns.push(`「${n}」没写价格，先按 0 元算，排餐会偏爱它。可以到「食物」页点它改价格。`); }
      const calc = p * 4 + cb * 4 + f * 9;
      if (k > 30 && Math.abs(calc - k) > Math.max(40, k * 0.3)) warns.push(`「${n}」写的是 ${r1(k)} 千卡，按蛋白、脂肪、碳水算出来约 ${Math.round(calc)} 千卡，对不上。建议照包装核对一下。`);
      const r = ROLES.includes(a.r) ? a.r : guessRole(k, p, f, cb);
      const c = CATS.includes(a.c) ? a.c : a.out === true ? "食堂外食" : ROLE_CAT[r];
      const out = has(a, "out") ? yes(a.out) : c === "食堂外食";
      const ck = [0, 1, 2].includes(N(a.ck)) ? N(a.ck) : 0;
      const s = [...new Set(String(a.s || "").replace(/[^blds]/g, ""))].join("") || ROLE_S[r];
      const st = [0.25, 0.5, 1].includes(N(a.st)) ? N(a.st) : 1;
      const mx = N(a.mx) >= st && N(a.mx) <= 20 ? N(a.mx) : 3;
      const v = N(a.v) >= 0 && N(a.v) <= 1000 ? N(a.v) : r === "veg" ? 150 : 0;
      const na = N(a.na) >= 0 && N(a.na) <= 20000 ? Math.round(N(a.na)) : 0;
      const fb = N(a.fb) >= 0 && N(a.fb) <= 100 ? r1(N(a.fb)) : 0;
      const on = has(a, "on") ? yes(a.on) : true;
      const nums = { k: r1(k), p: r1(p), f: r1(f), cb: r1(cb), $: r1(price), na, fb };
      const L = lookup(), hit = L.find(n);
      const sameUnit = !str(a.u || a.unit, 16) || (hit && norm(a.u || a.unit) === norm(hit.u));
      if (hit && !hit.custom && sameUnit) { S.pantry[hit.id] = { ...(S.pantry[hit.id] || {}), ...nums, on }; updated.push(hit.n); return; }
      const rec = { n, u: str(a.u || a.unit, 16) || "份", c, ...nums, ck, r, s, v, st, mx, on, out, ai: true, ...(c === "补剂" ? { supp: true } : {}) };
      if (hit && hit.custom) { Object.assign(S.custom.find((x) => x.id === hit.id), rec); updated.push(n); }
      else { S.custom.push({ id: "ai" + Date.now().toString(36) + i, ...rec }); added.push(n); }
    });
    const L = lookup();
    const ids = (x) => (Array.isArray(x) ? x.slice(0, 200) : []);
    for (const id of ids(fd.enable)) { const f = L.find(id); if (f) setOn(f, true); else missing.push(String(id).slice(0, 16)); }
    for (const id of ids(fd.disable)) { const f = L.find(id); if (f) setOn(f, false); else missing.push(String(id).slice(0, 16)); }
    if (fd.only === true) for (const n of added.concat(updated)) { const f = L.find(n); if (f) setOn(f, true); }
    if (fd.price && typeof fd.price === "object") for (const [id, val] of Object.entries(fd.price).slice(0, 200)) {
      const f = L.find(id), v = N(val);
      if (!f) { missing.push(String(id).slice(0, 16)); continue; }
      if (!(v >= 0 && v <= 500)) continue;
      if (f.custom) S.custom.find((x) => x.id === f.id).$ = r1(v); else S.pantry[f.id] = { ...(S.pantry[f.id] || {}), $: r1(v) };
      priced++;
    }
    const onAfter = new Set(allFoods(S).filter((f) => f.on).map((f) => f.id));
    const turnedOn = [...onAfter].filter((id) => !onBefore.has(id) && !added.some((n) => L.find(n) && L.find(n).id === id)).length;
    const turnedOff = [...onBefore].filter((id) => !onAfter.has(id)).length;
    const list = (a) => a.slice(0, 8).join("、") + (a.length > 8 ? ` 等 ${a.length} 样` : "");
    if (added.length) row(`新加 ${added.length} 样食物`, list(added));
    if (updated.length) row(`更新 ${updated.length} 样食物`, list(updated));
    if (turnedOn) row("打开（勾上）", `${turnedOn} 样`);
    if (turnedOff) row("关掉（不勾）", `${turnedOff} 样`);
    if (priced) row("改价格", `${priced} 样`);
    if (missing.length) warns.push(`这些食物饭票里没有，跳过了：${[...new Set(missing)].slice(0, 8).join("、")}`);
    if (added.length || updated.length || turnedOn || turnedOff || priced) changed = replan = true;
    if (onAfter.size < 6) warns.push(`导入后只勾了 ${onAfter.size} 样食物，可能排不出一天的饭。`);
  }

  // 4. 体重
  const upsertW = (d, kg) => {
    const i = S.weights.findIndex((w) => w.d === d);
    if (i >= 0) S.weights[i].kg = kg; else S.weights.push({ d, kg });
  };
  let wn = 0;
  if (Array.isArray(raw.weights)) for (const w of raw.weights.slice(-400)) {
    const kg = N(w && (w.kg ?? w.weight)), d = w && (isDate(w.d) ? w.d : isDate(w.date) ? w.date : today);
    if (!(kg >= 30 && kg <= 250) || d > today) continue;
    upsertW(d, r1(kg)); wn++;
  }
  if (!wn && S.profile && (!S0.profile || S0.profile.weight !== S.profile.weight)) { upsertW(today, S.profile.weight); wn = -1; }
  if (wn) { S.weights.sort((a, b) => (a.d < b.d ? -1 : 1)); changed = true; row("体重记录", wn > 0 ? `${wn} 条` : `今天 ${S.profile.weight} kg`); }

  // 5. 今天的手表热量、吃法
  const td = raw.today;
  if (td && typeof td === "object") {
    const day = dayOf(S, today);
    if (has(td, "activeKcal")) { const v = N(td.activeKcal); if (v >= 0 && v <= 5000) { day.activeKcal = Math.round(v); row("今天手表活动", `${day.activeKcal} 千卡`); changed = true; } }
    if (td.modes && typeof td.modes === "object") for (const k of ["b", "l", "d"]) { const v = MODE_IN[norm(td.modes[k])]; if (v) { day.modes[k] = v; changed = true; } }
  }

  // 6. 饭菜安排（最多 7 天，前后一周以内）
  const plans = raw.plans || raw.plan;
  const arr = (Array.isArray(plans) ? plans : plans && typeof plans === "object" ? [plans] : []).slice(0, 7);
  const planned = new Set();
  if (arr.length) {
    const L = lookup();
    for (const pl of arr) {
      if (!pl || typeof pl !== "object") continue;
      const d = isDate(pl.date) ? pl.date : isDate(pl.d) ? pl.d : today;
      if (d < addDays(today, -7) || d > addDays(today, 7)) { warns.push(`${d} 离今天太远，这一天的安排没导入（只收前后 7 天）。`); continue; }
      const src = pl.meals && typeof pl.meals === "object" ? pl.meals : pl;
      const meals = {}, miss = [];
      for (const s of SLOTS) {
        meals[s] = [];
        for (const it of Array.isArray(src[s]) ? src[s] : []) {
          const ref = typeof it === "string" ? it : it && (it.id ?? it.food ?? it.name ?? it.n);
          const f = L.find(ref);
          if (!f) { if (ref) miss.push(String(ref).slice(0, 16)); continue; }
          meals[s].push({ id: f.id, qty: has(it, "qty") ? N(it.qty) : f.st || 1 });
        }
      }
      if (miss.length) warns.push(`${md(d)}的安排里有饭票没有的食物，跳过了：${[...new Set(miss)].slice(0, 6).join("、")}。可以把它们写进 foods.add。`);
      const sp = sanitizePlan({ meals }, L.byId);
      if (!sp) { warns.push(`${md(d)}的安排里没有能用的食物，没导入。`); continue; }
      const day = dayOf(S, d);
      if (pl.modes && typeof pl.modes === "object") for (const k of ["b", "l", "d"]) { const v = MODE_IN[norm(pl.modes[k])]; if (v) day.modes[k] = v; }
      // 已经打勾（吃了）的保留
      if (day.plan) for (const s of SLOTS) {
        const done = (day.plan.meals[s] || []).filter((it) => it.done);
        sp.meals[s] = done.concat(sp.meals[s].filter((it) => !done.some((x) => x.id === it.id)));
      }
      const T = targetsOf(S.profile, day);
      day.plan = { meals: sp.meals };
      day.tip = str(pl.tip, 200);
      day.src = "ai"; day.T = { kcal: T.kcal, protein: T.protein }; day.pv = (day.pv || 0) + 1;
      const tot = sumItems(planItems(day.plan), (id) => L.byId[id]);
      const dayName = d === today ? "今天" : md(d);
      row(`${dayName}的饭`, `${planItems(day.plan).length} 样，约 ${Math.round(tot.kcal)} 千卡、蛋白 ${Math.round(tot.p)} g`);
      const gap = Math.round(tot.kcal - T.kcal);
      if (Math.abs(gap) > 300) warns.push(`${dayName}的安排比目标${gap < 0 ? "少" : "多"} ${Math.abs(gap)} 千卡。导入后可以在「今天」页加减分量，或点「换一份」让饭票重排。`);
      planned.add(d); changed = true;
    }
  }
  // 资料、吃法或食物变了，而今天还没打勾：今天的饭按新设置重排
  const tday = S.days[today];
  if (replan && !planned.has(today) && tday && tday.plan) {
    if (!planItems(tday.plan, true).length) { tday.plan = null; tday.modes = { ...S.prefs.modes }; row("今天的饭", "按新设置重新排"); }
    else warns.push("今天已经打勾的饭没动。想按新设置排，导入后点「换一份」。");
  }
  if (!S.weights.length && S.profile) S.weights = [{ d: today, kg: S.profile.weight }];
  return { next: S, rows, warns, note: str(raw.note, 300), changed, fresh: !S0.profile };
}

export function applyPreview(pv) {
  commit((S) => { const keepAi = S.ai, keepCloud = S.cloud; Object.assign(S, pv.next); S.ai = keepAi; S.cloud = keepCloud; });
}

// ---------- 给 AI 看的说明 ----------
const EXAMPLE = {
  format: FORMAT,
  profile: { sex: "m", age: 20, height: 175, weight: 65, goal: "gain", activity: 1.55 },
  prefs: { budget: 35, snack: true, modes: { b: "out", l: "out", d: "cold" } },
  foods: {
    enable: ["egg", "milk", "c_rice", "c_meat", "c_veg", "banana"],
    disable: ["chicken", "broccoli"],
    add: [{ n: "某牌无糖豆浆粉", u: "袋(30g)", c: "奶和豆", r: "dairy", k: 128, p: 9, f: 4.5, cb: 13, na: 40, fb: 2, price: 1.2, ck: 1, s: "bs", mx: 2 }],
    price: { c_meat: 8 },
  },
  weights: [{ d: "YYYY-MM-DD", kg: 65 }],
  plan: { date: "YYYY-MM-DD", meals: { b: [{ id: "o_baozi", qty: 2 }, { id: "milk", qty: 1 }], l: [{ id: "c_rice", qty: 1 }, { id: "c_meat", qty: 1 }, { id: "c_veg", qty: 1 }], d: [], s: [{ id: "某牌无糖豆浆粉", qty: 1 }] }, tip: "一两句今天这样吃的要点" },
  note: "给用户的一两句话",
};

export function aiPrompt(S, withMine) {
  const today = dateStr();
  const foods = FOODS.filter((f) => f.r !== "manual").map((f) => `${f.id}|${f.n}|${f.u}|${f.k}|${f.p}|${f.f}|${f.cb}|${f.$}|${f.c}${f.on ? "|默认勾选" : ""}`).join("\n");
  let mine = "";
  if (withMine && S.profile) {
    const all = allFoods(S);
    mine = `\n\n## 用户现在在饭票里的设置\n在这个基础上改，没变的部分可以不写。\n${JSON.stringify({
      profile: S.profile, prefs: { budget: S.prefs.budget, snack: S.prefs.snack, modes: S.prefs.modes },
      勾选的内置食物: all.filter((f) => f.on && !f.custom).map((f) => f.id),
      自己加的食物: S.custom.map((f) => ({ n: f.n, u: f.u, k: f.k, p: f.p, f: f.f, cb: f.cb, price: f.$, on: f.on })),
    })}`;
  }
  return `你是「饭票」App 的数据助手。饭票会按用户的身高、体重、目标、预算，自动排好每天的早午晚饭和加餐。请帮用户写一段导入数据，用户会把它粘贴进饭票（我的 → 让 AI 帮你填），饭票会先给用户看要改什么，确认后才写进去。今天是 ${today}。

## 第一步：先问清楚
缺什么问什么，尽量一次问完，不要猜：
1. 性别、年龄、身高（厘米）、体重（公斤）
2. 目标：增肌、减脂还是保持
3. 每周运动几次
4. 早饭、午饭、晚饭分别怎么吃：食堂或外面买 / 不开火（只有热水、微波炉）/ 自己开火做
5. 每天吃饭预算多少钱，要不要加餐
6. 平时常吃、买得到的东西；不吃或过敏的东西；在喝的补剂、饮料（最好有牌子和包装上的营养成分表）

## 第二步：只输出一个 json 代码块
用户回答后，只输出一个 \`\`\`json 代码块，不要别的文字。格式像这样（用不到的字段整个省略；YYYY-MM-DD 换成真实日期）：
\`\`\`json
${JSON.stringify(EXAMPLE, null, 1)}
\`\`\`

## 字段说明
- format：固定写 "${FORMAT}"
- profile.sex："m" 男 / "f" 女；age 岁；height 厘米；weight 公斤
- profile.goal："gain" 增肌 / "cut" 减脂 / "keep" 保持
- profile.activity：1.2 几乎不动 / 1.375 每周运动 1–3 次 / 1.55 每周 3–5 次 / 1.725 每周 6–7 次或体力工作
- profile.proteinPerKg（可选）：每公斤体重吃多少克蛋白，0.8–2.5。不写就按目标默认（增肌 1.8，减脂 2.0，保持 1.4）
- profile.kcalOverride（可选，一般别写）：自己定每天热量。写了 App 就不再自动算
- profile.restKcal（可选）：手表上的静息千卡
- prefs.modes：b 早饭 / l 午饭 / d 晚饭，值是 "out" 食堂或外面买 / "cold" 不开火 / "cook" 自己做
- prefs.budget：每天预算（元），0 表示不限；prefs.snack：要不要加餐（true / false）
- foods.enable / foods.disable：打开或关掉下面「内置食物」里的 id。排餐只会用打开的食物
- foods.only（可选）：true 表示除了 enable 和 add 里的，别的全部关掉
- foods.add：内置里没有的才放这里。n 名称，u 单位（如 "勺(30g)"），c 分类（${CATS.join(" / ")}），r 角色（staple 主食 / protein 蛋白 / dairy 奶和豆浆 / veg 蔬菜 / fruit 水果 / fat 坚果油脂 / meal 一整份饭），k 千卡、p 蛋白 g、f 脂肪 g、cb 碳水 g、na 钠 mg、fb 膳食纤维 g（全部是「每 1 个单位」的值），price 1 个单位多少元，ck 0 即食 / 1 要热水 / 2 要开火，s 适合哪几餐（b 早 l 午 d 晚 s 加餐，如 "bs"），mx 一天最多几个单位，st 每次加减多少（1 或 0.5），v 算多少克蔬菜（只有蔬菜写），out 是不是食堂或外面买的
- foods.price：改内置食物的价格，{"id": 元}
- weights：体重记录，d 是日期
- plan（可选）：某一天的饭。meals 里 b / l / d / s 是早、午、晚、加餐，每项 {"id": 内置 id 或 foods.add 里的名称, "qty": 几个单位}。也可以是数组，最多 7 天。不写的话饭票会自己排
- note：给用户的一两句话，会显示在导入预览里

## 规则
- 数字只写数字，不带单位
- 包装食品照营养成分表换算到「1 个单位」：表上是每 100 g、1 个单位是 30 g，就乘 0.3；能量是 kJ 的除以 4.184 换成千卡
- 不知道的数值宁可不写，不要编；price 不知道就按当地常见价格估
- 内置食物里有的，用 id，不要重复加
- 未满 18 岁不能选减脂
- 这只是一般饮食参考，不是医疗建议。用户有慢性病、在怀孕或哺乳、有进食障碍史，请提醒他先问医生或营养师

## 内置食物
每行：id|名称|单位|千卡|蛋白g|脂肪g|碳水g|价格元|分类
${foods}${mine}`;
}

// ---------- 面板 ----------
export function AIImportSheet({ onClose, text: initial }) {
  const S = app.S;
  const [withMine, setWithMine] = useState(!!S.profile);
  const [shown, setShown] = useState("");
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState(initial || "");
  const [pv, setPv] = useState(null);
  const [err, setErr] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef(null);
  const check = (t = text) => {
    setErr(""); setPv(null);
    try {
      const r = preview(app.S, parseText(t));
      if (!r.changed) return setErr("这段数据和你现在的设置一样，没有要改的。");
      setPv(r);
      setTimeout(() => { const el = document.getElementById("aiim-preview"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    } catch (e) { setErr(e.message || "读不了这段数据。"); }
  };
  useEffect(() => { if (initial) check(initial); return () => abort.current && abort.current.abort(); }, []);
  const copy = async () => {
    const t = aiPrompt(app.S, withMine);
    const ok = await copyText(t);
    setCopied(ok); setShown(ok ? "" : t);
    UI.toast(ok ? "已复制。去粘贴给你的 AI 吧" : "复制不了，请长按下面的文字全选复制");
  };
  const askInApp = async () => {
    if (!desc.trim()) return setErr("先用几句话说说你的情况。");
    setBusy(true); setErr(""); setPv(null);
    const ac = new AbortController(); abort.current = ac;
    try {
      const sys = aiPrompt(app.S, withMine) + "\n\n## 这次的特别说明\n用户已经在下面说了自己的情况，这次不要提问，直接输出 JSON。没说到的用常见的默认值，并在 note 里说清楚哪些是猜的、用户可以去哪里改。";
      const r = await chatJSON(app.S, [{ role: "system", content: sys }, { role: "user", content: desc.trim().slice(0, 2000) }], ac.signal);
      const t = JSON.stringify(r, null, 1);
      setText(t); check(t);
    } catch (e) { setErr(e.message || "AI 暂时用不了。"); }
    finally { setBusy(false); abort.current = null; }
  };
  const apply = () => {
    const fresh = pv.fresh;
    applyPreview(pv);
    onClose();
    if (fresh) UI.go && UI.go("today");
    UI.toast(fresh ? "建好档了，今天的饭已经排好" : "已导入。今天的饭按新设置排好了");
  };
  return html`<${Sheet} title="让 AI 帮你填" onClose=${onClose}>
    <p class="small muted">任何 AI 都行（DeepSeek、豆包、Kimi、ChatGPT、Claude……）。它先问你几个问题，再把你的身高体重、目标、三餐在哪吃、常吃的食物和补剂写成一段数据，粘贴回来就填好了。导入前会先给你看要改什么。</p>
    <div class="card stack">
      <h2>第一步：把说明发给 AI</h2>
      <p class="small muted" style="margin:0">说明里有饭票的数据格式和内置食物表。复制后粘贴给 AI，回答它的问题。</p>
      ${S.profile ? html`<label class="switch"><span>附上我现在的设置<br /><small class="muted">AI 在这个基础上改。会把你的资料一起发给它</small></span>
        <input id="aiim-mine" type="checkbox" checked=${withMine} onChange=${(e) => setWithMine(e.target.checked)} /></label>` : null}
      <button class="btn primary" id="aiim-copy" onClick=${copy}>${copied ? "再复制一次" : "复制给 AI 的说明"}</button>
      ${shown ? html`<pre class="code" id="aiim-prompt">${shown}</pre>` : null}
    </div>
    <div class="card stack">
      <h2>第二步：把 AI 写的粘贴回来</h2>
      <label class="field">AI 最后发的那段（连着说明文字一起粘也行）
        <textarea id="aiim-text" rows="5" placeholder='{"format":"fanpiao.ai/1", …}' value=${text} onInput=${(e) => { setText(e.target.value); setPv(null); setErr(""); }}></textarea></label>
      <button class="btn" id="aiim-check" disabled=${!text.trim()} onClick=${() => check()}>看看要改什么</button>
    </div>
    ${aiReady(S) ? html`<div class="card stack">
      <h2>或者：直接让饭票里的 AI 写</h2>
      <label class="field">用大白话说说你的情况
        <textarea id="aiim-desc" rows="3" placeholder="比如：男，20 岁，175 cm，65 kg，想增肌，一周练 4 次，三餐都在食堂，一天 35 块，每天喝一勺乳清蛋白" value=${desc} onInput=${(e) => setDesc(e.target.value)}></textarea></label>
      <button class="btn" id="aiim-ask" disabled=${busy} onClick=${askInApp}>${busy ? "AI 正在写…" : "让 AI 写"}</button>
    </div>` : null}
    ${err ? html`<div class="note bad" role="alert" id="aiim-err">${err}</div>` : null}
    ${pv ? html`<div class="card" id="aiim-preview">
      <h2>导入后会这样改</h2>
      ${pv.rows.map(([k, v]) => html`<div class="kv"><span>${k}</span><b>${v}</b></div>`)}
      ${pv.note ? html`<div class="note ai" style="margin-top:12px"><b>AI 说</b>${pv.note}</div>` : null}
    </div>
    ${pv.warns.length ? html`<div class="note warn" id="aiim-warns">${pv.warns.map((w) => html`<div>· ${w}</div>`)}</div>` : null}
    <div class="row">
      <button class="btn grow" onClick=${() => setPv(null)}>先不导入</button>
      <button class="btn primary grow" id="aiim-apply" onClick=${apply}>确认导入</button>
    </div>` : null}
    <p class="tiny muted">AI 写的营养数值可能不准，包装食品以营养成分表为准。饭票给的是一般饮食参考，不是医疗建议。给开发者：别的程序可以用 fanpiao://import?data=… 链接打开这一页，格式说明在 docs/AI接口.md。</p>
  <//>`;
}
