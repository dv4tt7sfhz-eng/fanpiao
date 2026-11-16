// iPhone 原生版用的替身：引擎里不需要界面，只留下纯计算会用到的小工具
export const html = () => null;
export const useState = (v) => [v, () => {}];
export const useEffect = () => {};
export const useRef = (v) => ({ current: v });
export const app = { S: null, rerender() {} };
export const UI = { open() {}, close() {}, toast() {}, go() {}, page() {} };
export function commit(fn) { fn(app.S); }
export const Sheet = () => null;
export async function copyText() {}
export const r0 = (n) => Math.round(n);
export const yuan = (n) => (Math.round(n * 10) / 10).toFixed(1);
export const qtyText = (q) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100));
export const num = (v, d = NaN) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : d; };
export const MODE = { out: { n: "食堂 / 外面吃", s: "外食", c: "out" }, cold: { n: "不开火", s: "不开火", c: "cold" }, cook: { n: "自己做", s: "自己做", c: "cook" } };
