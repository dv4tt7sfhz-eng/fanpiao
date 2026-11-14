// 公用小零件：全局数据、保存、弹出面板、分段选择
import { html, render, useState, useEffect, useReducer, useRef, useMemo } from "../vendor/preact-htm.js";
import { load, save, prune } from "./store.js";
export { html, render, useState, useEffect, useReducer, useRef, useMemo };

export const app = { S: load(), rerender() {} };
export const UI = { open() {}, close() {}, toast() {}, go() {} };

// 改数据都走这里：改完自动保存并刷新界面
export function commit(fn) {
  if (fn) fn(app.S);
  prune(app.S);
  save(app.S);
  app.rerender();
}

export const r0 = (n) => Math.round(n);
export const yuan = (n) => (Math.round(n * 10) / 10).toFixed(1);
export const qtyText = (q) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100));
export const num = (v, d = NaN) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : d; };
export const MODE = { out: { n: "食堂 / 外面吃", s: "外食", c: "out" }, cold: { n: "不开火", s: "不开火", c: "cold" }, cook: { n: "自己做", s: "自己做", c: "cook" } };

// 底部弹出的面板。可以点空白处、点 ×、或者按住顶部往下拖来关闭。
export function Sheet({ title, onClose, children, right, still, cls }) {
  const ref = useRef(null);
  const drag = useRef(null);
  // 拖动：手指和面板 1:1 跟着走；往上拉有橡皮筋阻力；松手时按速度判断，快速往下一甩就关
  const band = (x, d = 600, c = 0.55) => (x * d * c) / (d + c * Math.abs(x));
  const down = (e) => { drag.current = { y: e.clientY, dy: 0, hist: [[e.clientY, e.timeStamp]] }; ref.current.style.transition = "none"; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const raw = e.clientY - d.y;
    d.dy = raw;
    d.hist.push([e.clientY, e.timeStamp]); if (d.hist.length > 5) d.hist.shift();
    ref.current.style.transform = `translateY(${raw >= 0 ? raw : band(raw)}px)`;
  };
  const up = () => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]];
    const v = b[1] > a[1] ? (b[0] - a[0]) / (b[1] - a[1]) : 0; // 像素/毫秒，往下为正
    ref.current.style.transition = "";
    if (d.dy > 110 || (d.dy > 12 && v > 0.35)) onClose(); else ref.current.style.transform = "";
  };
  return html`<div class=${"shade" + (still ? " still" : "")} onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class=${"sheet" + (still ? " still" : "") + (cls ? " " + cls : "")} ref=${ref} role="dialog" aria-label=${title}>
      <div class="grab" onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}><i></i></div>
      <div class="sh"><h2>${title}</h2>${right || html`<button class="x" aria-label="关闭" onClick=${onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg></button>`}</div>
      <div class="sb">${children}</div>
    </div>
  </div>`;
}

// 分段选择，选中的底色会滑过去
export function Seg({ value, options, onChange, id }) {
  const idx = Math.max(0, options.findIndex((o) => o.v === value));
  return html`<div class="seg" id=${id}>
    <i class="thumb" style=${`width:calc((100% - 4px) / ${options.length});transform:translateX(${idx * 100}%)`}></i>
    ${options.map((o) => html`<button type="button" disabled=${!!o.disabled} aria-pressed=${String(o.v === value)} onClick=${() => onChange(o.v)}>${o.n}</button>`)}
  </div>`;
}

export function Field({ label, value, onInput, type = "text", mode, placeholder, id, hint }) {
  return html`<label class="field">${label}
    <input id=${id} type=${type} inputmode=${mode} placeholder=${placeholder} value=${value} onInput=${(e) => onInput(e.target.value)} />
    ${hint ? html`<span class="tiny">${hint}</span>` : null}
  </label>`;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}
