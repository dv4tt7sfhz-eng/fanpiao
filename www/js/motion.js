// 1.8.0 的动效零件：数字补间、会滑的高中低选择、封面倾斜、均衡器小图标、封面飞到下一页、打字机提示。
// 全部尊重系统的「减少动态效果」（calm()）。
import { html, useState, useEffect, useRef } from "../vendor/preact-htm.js";
import { calm, useTween, haptic, burst } from "./fx.js";

// 数字补间。up：刚出现时从 0 滚上来
export function Num({ v, f, ms = 800, up, wait = 120 }) {
  const [live, setLive] = useState(up ? 0 : v);
  useEffect(() => { const t = setTimeout(() => setLive(v), up ? wait : 0); return () => clearTimeout(t); }, [v]);
  const x = useTween(live, ms);
  return f ? f(x) : String(Math.round(x));
}

// 高中低三色的分段选择：底色块滑过去，到位时像水滴一样挤一下
export function KSeg({ value, options, onChange, wide, id }) {
  const idx = Math.max(0, options.findIndex((o) => o.v === value));
  const cur = options[idx] || {};
  return html`<div class=${"kseg has-thumb" + (wide ? " wide" : "")} id=${id} style=${`--n:${options.length};--at:${idx}`}>
    <i class=${"kthumb k-" + (cur.k || "0")} aria-hidden="true"><i key=${idx}></i></i>
    ${options.map((o) => html`<button type="button" class=${o.k ? "k-" + o.k : ""} aria-pressed=${String(o.v === value)} onClick=${() => { if (o.v !== value) haptic(5); onChange(o.v); }}>${o.n}</button>`)}
  </div>`;
}

// 手指按住封面：微微倾斜，指尖下面有一团光（和首页的大封面一样）
export function tiltProps(ref) {
  const tilt = (e) => {
    const el = ref.current; if (!el || calm()) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%");
    el.style.setProperty("--ry", (x - 0.5) * 7 + "deg"); el.style.setProperty("--rx", (0.5 - y) * 6 + "deg");
    el.classList.add("press");
  };
  const un = () => { const el = ref.current; if (!el) return; el.classList.remove("press"); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
  return { onPointerDown: tilt, onPointerMove: (e) => { if (e.buttons || e.pointerType === "touch") tilt(e); }, onPointerUp: un, onPointerLeave: un, onPointerCancel: un };
}

// 面板里往下滚：封面慢慢缩小、变暗一点（--ps 从 0 到 1）
export function useSheetScroll(ref, range = 220) {
  useEffect(() => {
    const el = ref.current, sb = el && el.closest(".sb");
    if (!sb || calm()) return;
    let raf = 0;
    const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty("--ps", String(Math.min(1, Math.max(0, sb.scrollTop / range)))); }); };
    sb.addEventListener("scroll", on, { passive: true });
    return () => sb.removeEventListener("scroll", on);
  }, []);
}

// 「正在播放」的三根小柱子
export const Eq = ({ cls = "" }) => html`<span class=${"eq " + cls} aria-hidden="true"><i></i><i></i><i></i></span>`;

// 小封面飛到下一页的大封面上（共享元素过场）。from 在点下去的时候记下来。
let coverFrom = null;
export function rememberCover(el) {
  if (!el || calm()) { coverFrom = null; return; }
  const r = el.getBoundingClientRect();
  coverFrom = { r, html: el.outerHTML, t: Date.now() };
}
export function useCoverLanding(ref) {
  useEffect(() => {
    const el = ref.current, from = coverFrom; coverFrom = null;
    if (!el || !from || calm() || Date.now() - from.t > 1500 || !el.animate) return;
    el.style.visibility = "hidden";
    let ghost = null;
    const t = setTimeout(() => {
      const to = el.getBoundingClientRect();
      const box = document.createElement("div");
      box.innerHTML = from.html;
      ghost = box.firstElementChild;
      ghost.classList.add("coverghost");
      ghost.style.cssText = `position:fixed;left:${from.r.left}px;top:${from.r.top}px;width:${from.r.width}px;height:${from.r.height}px;margin:0;z-index:70;pointer-events:none;transform-origin:0 0`;
      document.body.appendChild(ghost);
      const sx = to.width / from.r.width, sy = to.height / from.r.height;
      const a = ghost.animate([
        { transform: "translate(0,0) scale(1)", borderRadius: "16px" },
        { transform: `translate(${(to.left - from.r.left) * 0.55}px,${(to.top - from.r.top) * 0.5 - 14}px) scale(${1 + (sx - 1) * 0.6},${1 + (sy - 1) * 0.6}) rotate(-3deg)`, offset: 0.55 },
        { transform: `translate(${to.left - from.r.left}px,${to.top - from.r.top}px) scale(${sx},${sy})`, borderRadius: "22px" },
      ], { duration: 560, easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" });
      a.onfinish = () => { el.style.visibility = ""; el.classList.add("landed"); if (ghost) ghost.remove(); ghost = null; };
    }, 60);
    return () => { clearTimeout(t); el.style.visibility = ""; if (ghost) ghost.remove(); };
  }, []);
}

// 输入框里的示例一个字一个字打出来、停一下、删掉、换下一句
export function useTypewriter(list, on = true) {
  const [s, setS] = useState(list[0] || "");
  useEffect(() => {
    if (!on || calm() || list.length < 2) { setS(list[0] || ""); return; }
    let i = 0, n = 0, dir = 1, t = 0;
    const step = () => {
      const full = list[i % list.length];
      n += dir;
      setS(full.slice(0, n));
      let wait = dir > 0 ? 70 : 26;
      if (dir > 0 && n >= full.length) { dir = -1; wait = 1700; }
      else if (dir < 0 && n <= 0) { dir = 1; i++; wait = 320; }
      t = setTimeout(step, wait);
    };
    t = setTimeout(step, 600);
    return () => clearTimeout(t);
  }, [on]);
  return s;
}

// 某个元素上冒一圈这个日型颜色的小点
const KCOL = { H: ["#ff3d6e", "#ff8a3d", "#ffc46b", "#ff6482"], M: ["#ff9a3d", "#ffc857", "#fff0a8", "#ffb23d"], L: ["#2f7df6", "#22c8d8", "#7af0d0", "#5ac8fa"], W: ["#6a55e0", "#a99bff", "#d7ccff", "#bf5af2"] };
export function kburst(el, k) { burst(el, KCOL[k] || undefined); }

// 分段选择的底色块到位时挤一下（用独立的 scale 属性，不跟 transform 打架）
export function squish(el) {
  if (!el || calm() || !el.animate) return;
  el.animate([{ scale: "1 1" }, { scale: "1.14 .86", offset: 0.3 }, { scale: ".97 1.04", offset: 0.65 }, { scale: "1 1" }], { duration: 520, easing: "cubic-bezier(.23,1,.32,1)" });
}

// 出错时左右晃一下
export function shake(el) {
  if (!el || calm() || !el.animate) return;
  el.animate([{ translate: "0" }, { translate: "-9px" }, { translate: "8px" }, { translate: "-6px" }, { translate: "4px" }, { translate: "0" }], { duration: 420, easing: "cubic-bezier(.36,.07,.19,.97)" });
  haptic([8, 40, 8]);
}
