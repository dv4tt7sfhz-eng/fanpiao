// 所有数据只存在这台设备上（localStorage）。云端同步是预留功能，默认关闭。
import { FOODS } from "./foods.js";

const KEY = "fanpiao.v1";
const pad = (n) => String(n).padStart(2, "0");
export const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return dateStr(d); };

export function blank() {
  return {
    v: 1,
    profile: null, // {sex, age, height, weight, goal, activity, restKcal?, proteinPerKg?, kcalOverride?}
    prefs: { modes: { b: "cold", l: "out", d: "cook" }, snack: true, budget: 30 },
    pantry: {}, // 对内置食物的改动：{id: {on, $, k, p, f, cb}}
    custom: [], // 自己加的食物
    days: {}, // {"2026-11-12": {modes, activeKcal, plan:{meals}, tip, src, kind?}}
    weights: [], // [{d, kg}]
    cycle: null, // 饮食周期计划，见 plans.js；null = 稳稳来
    ai: { provider: "deepseek", base: "", model: "", key: "", vprovider: "", vbase: "", vmodel: "", vkey: "" },
    cloud: { url: "", token: "", user: "", last: "" },
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    const b = blank();
    return { ...b, ...s, prefs: { ...b.prefs, ...s.prefs, modes: { ...b.prefs.modes, ...(s.prefs || {}).modes } }, ai: { ...b.ai, ...s.ai }, cloud: { ...b.cloud, ...s.cloud } };
  } catch (e) { return blank(); }
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
export function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }

// 内置食物 + 用户改动 + 自定义食物
export function allFoods(s) {
  const base = FOODS.map((f) => ({ ...f, ...(s.pantry[f.id] || {}) }));
  return base.concat(s.custom.map((f) => ({ v: 0, st: 1, mx: 3, out: false, on: true, na: 0, fb: 0, custom: true, ...f })));
}
export const enabledFoods = (s) => allFoods(s).filter((f) => f.on);

export function dayOf(s, d) {
  if (!s.days[d]) s.days[d] = { modes: { ...s.prefs.modes }, activeKcal: null, plan: null, tip: "", src: "" };
  return s.days[d];
}
// 只保留最近 120 天，防止越存越大
export function prune(s) {
  const keys = Object.keys(s.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 120))) delete s.days[k];
}
