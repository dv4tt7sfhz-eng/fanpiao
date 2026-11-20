// 女生模式（4.4）：周期记录、预测、经前热量弹性、补铁。
// 经期数据只放在手机本地的状态里，不发给 AI、不上传。
import { addDays } from "../www/js/store.js";

const dd = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);

// 每样内置食物大约含多少铁（毫克 / 一份），按《中国食物成分表》估算
export const IRON = {
  rice: 0.3, bun: 1.8, oats: 2.3, bread_ww: 1, bread_pro: 1.2, noodle: 3.5, soba: 4, sweetpotato: 1, corn: 1.1, potato: 0.8, baozi_frozen: 1.2, dumpling: 3,
  egg: 1, tea_egg: 1, chicken: 1, chicken_ready: 1, chicken_sausage: 0.6, duck_leg: 2.5, chicken_leg: 1.2, beef: 3, pork: 3, fish: 0.5, shrimp: 1.5, tuna: 1,
  milk: 0.8, milk_skim: 0.8, yogurt: 0.4, soymilk: 1.5, tofu: 5, dried_tofu: 4.9, broccoli: 1.4, cabbage: 1, greens: 4, mushroom: 1.5, tomato: 0.8,
  cucumber: 0.6, carrot: 0.6, pepper: 0.7, lettuce: 1.3, dried_veg: 2, apple: 0.3, banana: 0.4, orange: 0.4, kiwi: 0.3, pear: 0.5, nuts: 1, peanut: 0.4,
  pumpkin_seed: 1.3, peanut_butter: 0.3, oil: 0, inst_noodle: 2, inst_rice: 0.4, onigiri: 0.4, whey: 0.3, protein_bar: 1.5, c_rice: 0.4, c_meat: 2,
  c_veg: 1.5, c_weigh: 0.8, o_baozi: 1.2, o_egg: 1, o_soymilk: 1.5, o_jianbing: 2.5, o_beefnoodle: 4, o_hmj: 3, o_salad: 2.5, o_mlt: 4, o_gaifan: 3,
};

export const herOf = (S) => ({ on: false, nonum: false, pill: false, periods: [], sym: {}, ...(S.her || {}) });

// 第 d 天在周期里的位置
export function cycleAt(S, d) {
  const h = herOf(S);
  const ps = [...h.periods].filter((p) => p && p.s).sort((a, b) => (a.s < b.s ? -1 : 1));
  const lens = [];
  for (let i = 1; i < ps.length; i++) lens.push(dd(ps[i - 1].s, ps[i].s));
  const ok = lens.filter((n) => n >= 15 && n <= 60);
  const last3 = ok.slice(-3);
  const len = last3.length ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length) : 28;
  const pl = ps.filter((p) => p.e).map((p) => dd(p.s, p.e) + 1).filter((n) => n >= 2 && n <= 10);
  const pLen = pl.length ? Math.round(pl.slice(-3).reduce((a, b) => a + b, 0) / pl.slice(-3).length) : 5;
  const cur = ps.filter((p) => p.s <= d).pop();
  const out = { logged: ps.length > 0, len, pLen, day: 0, phase: "", next: "", until: 0, irregular: false, doctor: "", inPeriod: false, open: false, late: 0, start: "", cycles: [] };
  out.cycles = ps.slice(-6).reverse().map((p, i, arr) => ({ s: p.s, e: p.e || "", days: p.e ? dd(p.s, p.e) + 1 : 0 }));
  out.irregular = lens.length >= 2 && (lens.some((n) => n < 21 || n > 35) || Math.max(...lens.slice(-3)) - Math.min(...lens.slice(-3)) > 7);
  if (!cur) return out;
  const day = dd(cur.s, d) + 1, ov = len - 14;
  out.day = day; out.start = cur.s; out.open = !cur.e && day <= 10;
  out.inPeriod = cur.e ? d <= cur.e : day <= pLen;
  out.phase = out.inPeriod ? "period" : day < ov - 1 ? "follicular" : day <= ov + 1 ? "ovulation" : day <= len - 7 ? "luteal" : "pre";
  out.next = addDays(cur.s, len); out.until = dd(d, out.next);
  if (out.until < 0) out.late = -out.until;
  if (ok.length >= 2 && (len < 21 || len > 35)) out.doctor = "range";
  else if (day > 90) out.doctor = "missing";
  else if (Object.entries(h.sym).some(([k, v]) => k >= cur.s && v && v.pain >= 3)) out.doctor = "pain";
  return out;
}

// 黄体期 +100 kcal；经前一周再给 100 kcal「弹性」，在这范围内不算超标。吃短效避孕药的人不加
export function herTargets(S, d, T) {
  const h = herOf(S);
  if (!h.on || h.pill) return { ...T, flex: 0, plus: 0 };
  const c = cycleAt(S, d);
  const up = c.phase === "luteal" || c.phase === "pre";
  if (!up) return { ...T, flex: 0, plus: 0 };
  return { ...T, kcal: T.kcal + 100, carb: T.carb + 25, flex: c.phase === "pre" ? 100 : 0, plus: 100 };
}

export function herView(S, d) {
  const h = herOf(S), c = cycleAt(S, d), sex = S.profile && S.profile.sex;
  return { on: !!h.on, nonum: !!h.nonum, pill: !!h.pill, ...c, sym: h.sym[d] || null, ironT: h.on || sex === "f" ? 18 : 12 };
}

export const herApi = {
  herSet: (S, patch) => { S.her = { ...herOf(S), ...patch }; return S; },
  periodStart: (S, d) => { const h = herOf(S); const open = h.periods.find((p) => !p.e && dd(p.s, d) >= 0 && dd(p.s, d) < 10);
    if (!open && !h.periods.some((p) => p.s === d)) h.periods.push({ s: d });
    h.periods.sort((a, b) => (a.s < b.s ? -1 : 1)); S.her = h; return S; },
  periodEnd: (S, d) => { const h = herOf(S); const cur = h.periods.filter((p) => p.s <= d).pop(); if (cur) cur.e = d; S.her = h; return S; },
  periodDelete: (S, s) => { const h = herOf(S); h.periods = h.periods.filter((p) => p.s !== s); S.her = h; return S; },
  setSym: (S, d, k, v) => { const h = herOf(S); h.sym = { ...h.sym, [d]: { ...(h.sym[d] || {}), [k]: v } }; S.her = h; return S; },
  herClear: (S) => { S.her = { ...herOf(S), periods: [], sym: {} }; return S; },
  herDemo: (S, today) => { S.her = { ...herOf(S), on: true, periods: [{ s: addDays(today, -79), e: addDays(today, -75) }, { s: addDays(today, -51), e: addDays(today, -47) }, { s: addDays(today, -23), e: addDays(today, -19) }] }; return S; },
};
