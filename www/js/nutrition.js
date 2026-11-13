// 目标计算：基础代谢 → 一天消耗 → 按目标加减 → 蛋白、脂肪、碳水
export const ACTIVITY = [
  { v: 1.2, n: "几乎不动", d: "上课上班坐着，很少走路" },
  { v: 1.375, n: "轻度活动", d: "每周运动 1–3 次" },
  { v: 1.55, n: "中度活动", d: "每周运动 3–5 次" },
  { v: 1.725, n: "活动量大", d: "每周运动 6–7 次，或体力工作" },
];
export const GOALS = {
  gain: { n: "增肌", ppk: 1.8, d: "比消耗多吃一点，蛋白吃够" },
  cut: { n: "减脂", ppk: 2.0, d: "比消耗少吃一点，蛋白更高来保住肌肉" },
  keep: { n: "保持", ppk: 1.4, d: "吃和消耗差不多" },
};

// Mifflin-St Jeor 公式
export function bmrOf(p) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return Math.round(base + (p.sex === "f" ? -161 : 5));
}

// day.activeKcal：今天手表上的活动千卡（可不填）
export function targetsOf(p, day = {}) {
  const bmr = bmrOf(p);
  const rest = p.restKcal > 500 ? p.restKcal : bmr;
  const hasWatch = Number.isFinite(day.activeKcal) && day.activeKcal >= 0;
  const tdee = Math.round(hasWatch ? rest + day.activeKcal : bmr * (p.activity || 1.375));
  const goal = p.age < 18 && p.goal === "cut" ? "keep" : p.goal || "keep";
  let adj = 0;
  if (goal === "gain") adj = Math.min(350, Math.max(150, Math.round(tdee * 0.1)));
  if (goal === "cut") adj = -Math.min(500, Math.round(tdee * 0.18));
  const floor = p.sex === "f" ? 1200 : 1500;
  let kcal = Math.max(floor, tdee + adj);
  if (p.kcalOverride > 800) kcal = Math.round(p.kcalOverride);
  const ppk = p.proteinPerKg > 0 ? p.proteinPerKg : GOALS[goal].ppk;
  // 体重很大时按体重算蛋白会偏多，最多占总热量的 35%
  const protein = Math.round(Math.min(p.weight * ppk, (0.35 * kcal) / 4));
  let fat = Math.round(Math.max(0.7 * p.weight, (0.25 * kcal) / 9));
  fat = Math.min(fat, Math.round((0.35 * kcal) / 9));
  const carb = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  // 钠：中国居民膳食指南建议成人每天不超过 2000 mg（约 5 g 盐）
  // 膳食纤维：建议每天 25–30 g；吃得多的人按每 1000 千卡 12 g 算，最多 35 g
  const naMax = 2000;
  const fbMin = Math.max(25, Math.min(35, Math.round((kcal / 1000) * 12)));
  return {
    bmr, rest, tdee, adj, kcal, protein, fat, carb, goal, ppk, naMax, fbMin,
    fatMin: Math.round(fat * 0.8), fatMax: Math.round(fat * 1.25),
    basis: hasWatch ? "watch" : "formula", floored: kcal === floor && tdee + adj < floor,
  };
}

export function sumItems(items, getFood) {
  const t = { kcal: 0, p: 0, f: 0, cb: 0, cost: 0, veg: 0, na: 0, fb: 0 };
  for (const it of items) {
    const fd = getFood(it.id);
    if (!fd) continue;
    t.kcal += fd.k * it.qty; t.p += fd.p * it.qty; t.f += fd.f * it.qty;
    t.cb += fd.cb * it.qty; t.cost += fd.$ * it.qty; t.veg += (fd.v || 0) * it.qty;
    t.na += (fd.na || 0) * it.qty; t.fb += (fd.fb || 0) * it.qty;
  }
  return t;
}
export const SLOTS = ["b", "l", "d", "s"];
export const SLOT_NAME = { b: "早餐", l: "午餐", d: "晚餐", s: "加餐" };
export function planItems(plan, onlyDone) {
  const out = [];
  if (!plan) return out;
  for (const s of SLOTS) for (const it of plan.meals[s] || []) if (!onlyDone || it.done) out.push(it);
  return out;
}

// 钠换算成盐：1 g 盐 ≈ 393 mg 钠
export const saltOf = (na) => na / 393;
