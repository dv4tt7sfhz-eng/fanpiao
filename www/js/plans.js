// 饮食周期计划：每天的目标不再一成不变，按计划算出这一天是高碳、中碳还是低碳，再给出这一天的热量和三大营养素。
// S.cycle = null（稳稳来）或 { id, start, ...参数 }
// S.days[d].kind = "H" | "M" | "L"：在日历上手动改过某一天
import { targetsOf, GOALS } from "./nutrition.js";
import { dateStr, addDays } from "./store.js";

export const KIND = {
  H: { n: "高碳日", s: "高碳", d: "多吃主食，脂肪少一点" },
  M: { n: "中碳日", s: "中碳", d: "和平时一样" },
  L: { n: "低碳日", s: "低碳", d: "主食减半，脂肪多一点" },
};
const WEEKDAY = "一二三四五六日";

// 计划清单。strip 是卡片上那一排小柱子的样子（不代表实际天数）
export const PLANS = [
  { id: "steady", g: "基础", n: "稳稳来", tag: "新手首选", d: "每天一样的目标。先把记录的习惯养起来，最不容易放弃。", strip: "MMMMMMM" },
  { id: "taper", g: "基础", n: "碳水渐调", tag: "看体重自动调", d: "每周看一次体重：减脂没掉就少吃一点碳水，增肌没涨就多吃一点。", strip: "MMMLLLL", taper: true },
  { id: "manual", g: "基础", n: "自己定目标", tag: "按克数 / 按比例", d: "已经有教练或自己的数，直接填蛋白、碳水、脂肪。", strip: "MMMMMMM" },
  { id: "c3l1h", g: "碳循环", n: "三低一高", tag: "4 天一轮", d: "3 天低碳 + 1 天高碳。短周期冲刺，适合减脂平台期。", seq: "LLLH" },
  { id: "c112113", g: "碳循环", n: "低低中低低高", tag: "6 天一轮", d: "按 1 1 2 1 1 3 走：1 是低碳、2 是中碳、3 是高碳。", seq: "LLMLLH" },
  { id: "train", g: "碳循环", n: "跟着训练走", tag: "按星期排", d: "练腿、练背那天高碳，练胸肩手中碳，休息日低碳。", week: true },
  { id: "custom", g: "碳循环", n: "自定义碳循环", tag: "2–14 天一轮", d: "自己定几天一轮，每天点一下切换高、中、低。", seq: "LMHLMH", edit: true },
  { id: "kai", g: "网红方案", n: "凯圣王碳循环", tag: "网传版", d: "一周 2 高 3 中 2 低。碳水按一周总量 50% / 35% / 15% 分，脂肪反过来。", week: true, kai: true },
  { id: "plate211", g: "网红方案", n: "211 餐盘法", tag: "不用算数", d: "每餐 2 份蔬菜、1 份蛋白、1 份主食。照着盘子装就行。", strip: "MMMMMMM", plate: true },
  { id: "if168", g: "网红方案", n: "16+8 轻断食", tag: "8 小时内吃完", d: "一天只在 8 小时里吃，另外 16 小时不吃。饭票只排窗口里的那几餐。", strip: "MMMMMMM", fast: true },
  { id: "ai", g: "AI", n: "AI 定制计划", tag: "说说你的情况", d: "告诉 AI 你的训练和作息，它帮你排一个长期的高中低碳节奏。", seq: "MHLMHLL", ai: true },
];
export const planOf = (id) => PLANS.find((p) => p.id === id) || PLANS[0];
export const DEFAULT_WEEK = ["H", "M", "L", "H", "M", "M", "L"]; // 周一练腿、周二练胸、周三休息、周四练背、周五练肩、周六练手、周日休息

const days = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const wdIndex = (d) => (new Date(d + "T12:00:00").getDay() + 6) % 7; // 周一 = 0
export const weekdayName = (d) => "周" + WEEKDAY[wdIndex(d)];

// 这一天在计划里是第几天、是什么日型
export function dayInfo(S, d) {
  const c = S.cycle;
  const p = c ? planOf(c.id) : PLANS[0];
  const over = S.days[d] && S.days[d].kind;
  let kind = null, idx = -1, len = 0;
  if (c && d >= c.start) {
    if (p.week) { kind = (c.week || DEFAULT_WEEK)[wdIndex(d)]; idx = wdIndex(d); len = 7; }
    else if (c.seq) { len = c.seq.length; idx = days(c.start, d) % len; kind = c.seq[idx]; }
  }
  if (over && c && (p.week || c.seq)) kind = over;
  return { plan: p, kind, idx, len, over: !!over, skip: c && p.fast ? [c.skip || "b"] : [], plate: !!(c && p.plate), on: !!c && d >= c.start };
}

// 碳水渐调：每过一周，看这一周的平均体重比上一周（第一周比开始那天）变了多少
export function taperMul(S, d) {
  const c = S.cycle, goal = S.profile.goal;
  if (!c || c.id !== "taper" || goal === "keep") return { mul: 1, week: 0, log: [] };
  const today = dateStr();
  const until = d < today ? d : today;
  const weeks = Math.max(0, Math.floor(days(c.start, until) / 7));
  const avg = (a, b) => { const ws = S.weights.filter((w) => w.d >= a && w.d <= b); return ws.length ? ws.reduce((x, w) => x + w.kg, 0) / ws.length : null; };
  let mul = 1;
  const log = [];
  for (let k = 1; k <= weeks; k++) {
    const prev = k === 1 ? c.w0 : avg(addDays(c.start, 7 * (k - 2)), addDays(c.start, 7 * (k - 1) - 1));
    const cur = avg(addDays(c.start, 7 * (k - 1)), addDays(c.start, 7 * k - 1));
    const ch = prev && cur ? (cur - prev) / prev : null;
    const ok = ch != null && (goal === "cut" ? ch <= -0.003 : ch >= 0.0015);
    if (!ok) mul = goal === "cut" ? Math.max(0.6, mul - 0.1) : Math.min(1.4, mul + 0.08);
    log.push({ k, ch, ok, mul: Math.round(mul * 100) / 100 });
  }
  return { mul: Math.round(mul * 100) / 100, week: weeks + 1, log };
}

function finish(T, p, kcal0) {
  const floor = p.sex === "f" ? 1200 : 1500;
  let carb = Math.max(30, Math.round(T.carb));
  const fat = Math.round(T.fat);
  let kcal = T.protein * 4 + carb * 4 + fat * 9;
  let floored = false;
  if (kcal < floor) { carb += Math.ceil((floor - kcal) / 4); kcal = T.protein * 4 + carb * 4 + fat * 9; floored = true; }
  return { ...T, carb, fat, kcal: Math.round(kcal), fatMin: Math.round(fat * 0.8), fatMax: Math.round(fat * 1.25), floored: floored || T.floored, base: kcal0 };
}

// 凯圣王碳循环（网传版）：碳水、脂肪先按体型算出每天的量，乘 7 得到一周总量，
// 再按高 50% / 中 35% / 低 15%（脂肪反过来 15% / 35% / 50%）分给对应的日子。蛋白每天一样。
export function kaiDay(S, kind) {
  const c = S.cycle, p = S.profile;
  const ecto = c.body !== "endo";
  const C = (ecto ? 3 : 2) * p.weight, F = (ecto ? 1.1 : 0.8) * p.weight;
  const ppk = c.ppk || 1.5;
  const wk = c.week || DEFAULT_WEEK;
  const n = { H: 0, M: 0, L: 0 };
  for (const k of wk) n[k]++;
  const cs = { H: 0.5, M: 0.35, L: 0.15 }, fs = { H: 0.15, M: 0.35, L: 0.5 };
  // 没有高碳日（没训练）就把高碳那份并进中碳；没有低碳日同理；没有中碳日就对半分给高、低
  const fix = (sh) => {
    const s = { ...sh };
    if (!n.H) { s.M += s.H; s.H = 0; }
    if (!n.L) { s.M += s.L; s.L = 0; }
    if (!n.M) { s.H += s.M / 2; s.L += s.M / 2; s.M = 0; }
    return s;
  };
  const c2 = fix(cs), f2 = fix(fs);
  const k = n[kind] ? kind : "M";
  return { protein: Math.round(p.weight * ppk), carb: (7 * C * c2[k]) / n[k], fat: (7 * F * f2[k]) / n[k], ppk };
}

// 某一天的目标（所有地方都用这个）
export function targetsFor(S, d = dateStr(), day = S.days[d] || {}) {
  const p = S.profile;
  const T = targetsOf(p, day);
  const c = S.cycle;
  if (!c) return { ...T, kind: null };
  const info = dayInfo(S, d);
  if (!info.on) return { ...T, kind: null };
  if (c.id === "manual") {
    const m = c.macro || {};
    return finish({ ...T, protein: Math.round(m.p || T.protein), carb: m.cb || T.carb, fat: m.f || T.fat, basis: "manual" }, p, T.kcal);
  }
  if (c.id === "taper") {
    const { mul } = taperMul(S, d);
    return { ...finish({ ...T, carb: T.carb * mul }, p, T.kcal), kind: null, mul };
  }
  if (c.id === "kai") {
    const k = kaiDay(S, info.kind || "M");
    return { ...finish({ ...T, ...k }, p, T.kcal), kind: info.kind || "M", ppk: k.ppk, basis: "kai" };
  }
  if (!info.kind || info.kind === "M") return { ...T, kind: info.kind };
  const lo = info.kind === "L";
  return { ...finish({ ...T, carb: T.carb * (lo ? 0.5 : 1.5), fat: T.fat * (lo ? 1.25 : 0.7) }, p, T.kcal), kind: info.kind };
}

// 「今天第 3 天 · 低碳日」这类说明
export function dayLabel(S, d) {
  const i = dayInfo(S, d);
  if (!i.on) return "";
  const c = S.cycle;
  if (c.id === "taper") { const t = taperMul(S, d); return `第 ${t.week} 周 · 碳水 ×${t.mul}`; }
  if (c.id === "if168") return c.skip === "d" ? "进食窗口 8:00–16:00" : "进食窗口 12:00–20:00";
  if (c.id === "plate211") return "每餐 2 菜 1 肉 1 饭";
  if (c.id === "manual") return "自己定的目标";
  if (!i.kind) return "";
  const where = i.plan.week ? weekdayName(d) : `第 ${i.idx + 1}/${i.len} 天`;
  return `${where} · ${KIND[i.kind].n}${i.over ? "（改过）" : ""}`;
}

// 接下来几天的节奏（计划卡片、日历用）
export function rhythm(S, from, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i);
    const T = targetsFor(S, d, S.days[d] || {});
    out.push({ d, kind: dayInfo(S, d).kind, T });
  }
  return out;
}

// 用一份临时的设置算预览，不改真实数据
export function withCycle(S, cycle) {
  return { ...S, cycle };
}

// 新设一个计划：默认从今天开始
export function makeCycle(S, id, opt = {}) {
  const p = planOf(id);
  const today = dateStr();
  if (id === "steady") return null;
  const c = { id, start: today };
  if (p.seq) c.seq = opt.seq || p.seq;
  if (p.week) c.week = opt.week || DEFAULT_WEEK.slice();
  if (p.kai) { c.body = opt.body || "ecto"; c.ppk = opt.ppk || 1.5; }
  if (p.fast) c.skip = opt.skip || "b";
  if (p.taper) c.w0 = (S.weights.length ? S.weights[S.weights.length - 1].kg : S.profile.weight);
  if (id === "manual") c.macro = opt.macro;
  if (p.ai) { c.name = opt.name || "AI 定制计划"; c.note = opt.note || ""; }
  // 「今天是这一轮的第几天」：往前挪开始日期
  if (c.seq && opt.at > 0) c.start = addDays(today, -opt.at);
  return c;
}

export const goalName = (S) => GOALS[S.profile.goal === "cut" && S.profile.age < 18 ? "keep" : S.profile.goal].n;

// ---------- AI 定制计划 ----------
export function aiPlanMessages(S, ask) {
  const p = S.profile;
  return [
    { role: "system", content: `你是健身营养教练。根据用户的情况，设计一个长期的「碳水循环」节奏：每天是高碳日 H、中碳日 M 或低碳日 L。饭票 App 会按这个节奏自动算每天的热量（中碳日就是用户平时的目标，低碳日主食减半、脂肪多一点，高碳日主食多一半、脂肪少一点）。
规则：
- 节奏长度 4 到 14 天，循环重复。
- 高碳日放在练腿、练背这类大肌群训练日，或者强度大、时间长的有氧日；低碳日放在休息日；中碳日放小肌群训练日。
- 减脂的人低碳日可以多一些；增肌的人高碳、中碳日多一些，低碳日最多每周 2 天。
- 未满 18 岁、或者用户说肠胃不好、睡眠差的，不要连续 3 天以上低碳。
- 不要建议极低热量、断食或任何药物。
只输出 JSON：{"name":"不超过 10 个字的计划名","seq":"例如 HMLHMML","note":"不超过 80 字，用简单的中文说这个节奏怎么用、为什么这样排"}` },
    { role: "user", content: `我的情况：${p.sex === "f" ? "女" : "男"}，${p.age} 岁，${p.height} cm，${p.weight} kg，目标：${GOALS[p.goal].n}。\n${String(ask || "").trim().slice(0, 600) || "没有特别说明，按常见的一周 4 练来排。"}` },
  ];
}
export function sanitizeAIPlan(raw) {
  const seq = String((raw && raw.seq) || "").toUpperCase().replace(/[^LMH]/g, "").slice(0, 14);
  if (seq.length < 2) throw new Error("AI 给的节奏读不出来，再试一次。");
  return { seq, name: String((raw && raw.name) || "AI 定制计划").trim().slice(0, 12) || "AI 定制计划", note: String((raw && raw.note) || "").trim().slice(0, 120) };
}
