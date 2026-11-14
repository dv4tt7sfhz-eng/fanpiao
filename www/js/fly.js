// 过场引擎（2.1.0）——照 Norg 录屏：
// 1. 大框：新面板 / 整页从「刚点的那个框」里长出来；关的时候缩回那个框。
// 2. 小框：带 data-fly="名字" 的东西，从旧位置飞到新位置（同名配对）；关的时候飞回去。
//    data-fly-m="w"：飞的时候宽高一起变（长条按钮，字不变形）；默认按高度等比缩放（数字、标题）。
// 时间和曲线是从录屏一帧一帧量出来的（60 帧录屏，30 帧取样）。
import { calm } from "./fx.js";

export const EASE = {
  fly: "cubic-bezier(.2,.6,.25,1)",     // 小框飞：33ms 走 19%，100ms 46%，233ms 87%，0.4s 落定
  box: "cubic-bezier(.1,.8,.05,1)",     // 大框长：33ms 就长了 47%，66ms 74%，后面慢慢贴边
  back: "cubic-bezier(.2,.6,0,1)",      // 收起时小框飞回去：比打开快
  close: "cubic-bezier(.4,0,.2,1)",
};
const T_FLY = 400, T_BOX = 460, T_BACK = 300;

// ---------- 记住刚点的是哪个框 ----------
let tap = null;
const PICK = "button,[role=button],a,.wslot,.frow,.lrow,.item,.prow,.calc,.cover";
export function installTap() {
  const rec = (e) => { const el = e.target && e.target.closest && e.target.closest(PICK); if (el) tap = { el, t: performance.now() }; };
  document.addEventListener("pointerdown", rec, { capture: true, passive: true });
  document.addEventListener("click", (e) => { rec(e); kick(e); }, { capture: true, passive: true });
  // c1 按住缩、松手弹（只给原来没有按下效果的几种）
  let held = null;
  const PRESS = ".pill2,.metile,.wslot,.lrow .main,.slotpick,.hist,.lnk,.fsw button,.flame";
  document.addEventListener("pointerdown", (e) => {
    if (calm()) return; const el = e.target.closest && e.target.closest(PRESS); if (!el) return;
    held = el; try { el.__pr && el.__pr.cancel(); el.__pr = el.animate([{ scale: "1" }, { scale: ".95" }], { duration: 120, easing: "ease-out", fill: "forwards" }); } catch (er) {}
  }, { capture: true, passive: true });
  const up = () => { const el = held; held = null; if (!el || !el.__pr) return; try { el.__pr.cancel(); el.__pr = el.animate([{ scale: ".95" }, { scale: "1.025", offset: 0.55 }, { scale: "1" }], { duration: 380, easing: "ease-out" }); } catch (er) {} };
  document.addEventListener("pointerup", up, { capture: true, passive: true });
  document.addEventListener("pointercancel", up, { capture: true, passive: true });
}

// ---------- 点击小动画（c1–c150，样式在 styles.css 的「2.1.0 点击小动画」）----------
// 被点的东西打上 data-tk（它外面一层打上 data-tkp），CSS 按种类各播各的小动作；手指点的位置记在 --tx / --ty。
const TK = "button,[role=button],label.switch,.wslot,.frow,.lrow,.calc";
const pulse = (el, a, ms = 1000) => { el.removeAttribute(a); void el.offsetWidth; el.setAttribute(a, ""); clearTimeout(el["__" + a]); el["__" + a] = setTimeout(() => el.removeAttribute(a), ms); };
function kick(e) {
  if (calm()) return;
  const el = e.target && e.target.closest && e.target.closest(TK); if (!el || el.disabled) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--tx", Math.round(e.clientX - r.left) + "px"); el.style.setProperty("--ty", Math.round(e.clientY - r.top) + "px");
  pulse(el, "data-tk"); if (el.parentElement) pulse(el.parentElement, "data-tkp");
  // c2 手指点的地方冒一圈光（在最上层，面板长出来时也看得见）
  if (e.clientX || e.clientY) { const i = document.createElement("i"); i.className = "tapring"; i.style.left = e.clientX + "px"; i.style.top = e.clientY + "px"; document.body.appendChild(i); setTimeout(() => i.remove(), 600); }
}
// 不是手指直接点出来的（比如底部标签栏是按住滑着选的），也照样播被点的小动画
export function kickEl(el) { if (!el || calm()) return; pulse(el, "data-tk"); if (el.parentElement) pulse(el.parentElement, "data-tkp"); }
// 面板缩回按钮里以后，按钮「接住」它弹一下（c149 / c150）
export function caught(el, after = 250) { if (!el || calm()) return; setTimeout(() => { if (el.isConnected) pulse(el, "data-back", 700); }, after); }
// 0.8 秒内点过的框：位置、圆角、颜色、上面的字在哪
export function source(ms = 800) {
  if (!tap || performance.now() - tap.t > ms || !tap.el.isConnected) return null;
  return describe(tap.el);
}
export function describe(el) {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const cs = getComputedStyle(el);
  const rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 12, r.height / 2, r.width / 2);
  return { el, r: rect(r), rad, bg: paintOf(el), lab: labelRect(el) };
}
const rect = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
function paintOf(el) {
  const pick = (cs) => {
    if (!cs) return null;
    if (cs.backgroundImage && cs.backgroundImage !== "none") return cs.backgroundImage;
    const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor || ""); if (!m) return null;
    const p = m[1].split(",").map(parseFloat); return (p.length < 4 || p[3] > 0.15) ? cs.backgroundColor : null;
  };
  return pick(getComputedStyle(el)) || pick(getComputedStyle(el, "::before")) || null;
}
// 框一开始的颜色：按钮本身是实心色（红按钮、卡片）就用它；透明 / 半透明的按钮用一层亮一点的玻璃，不然在变暗的背景上看不出框在长
const GLASS = "linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.09))";
function boxPaint(bg) {
  if (!bg) return GLASS;
  if (bg.includes("gradient")) return bg;
  const m = /rgba?\(([^)]+)\)/.exec(bg); if (!m) return GLASS;
  const p = m[1].split(",").map(parseFloat);
  return p.length < 4 || p[3] > 0.6 ? bg : GLASS;
}
// 按钮上的字（没有字就用图标）在屏幕上的位置
function labelRect(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.textContent.trim() || (n.parentElement && n.parentElement.closest(".sr,[aria-hidden=true]"))) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect(); if (r.width > 1 && r.height > 1) return rect(r);
  }
  const s = el.querySelector("svg"); if (s) { const r = s.getBoundingClientRect(); if (r.width > 1) return rect(r); }
  return null;
}
const seen = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) return false; return !el.closest(".off,.face[aria-hidden=true]") && +getComputedStyle(el).opacity > 0.05; };

function stop(el) { (el.__fly || []).forEach((a) => { try { a.cancel(); } catch (e) {} }); el.__fly = []; }
function keep(el, a) { (el.__fly || (el.__fly = [])).push(a); return a; }

// ---------- 小框：从 r0 飞到自己现在的位置 ----------
export function flyFrom(el, r0, o = {}) {
  if (calm() || !el || !r0) return;
  const r1 = o.r1 || el.getBoundingClientRect(); if (!r1.width || !r1.height) return;
  const lift = o.lift || 0;   // 外层容器同时也在动（面板往上滑）：先把那段抵消掉
  const dx = r0.left - r1.left, dy = r0.top - r1.top - lift;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(r0.width - r1.width) < 1) return;
  const opt = { duration: o.dur || T_FLY, easing: o.ease || EASE.fly, delay: o.delay || 0, fill: "backwards" };
  el.classList.add("flying");
  let a;
  if ((el.dataset.flyM || o.m) === "w") {
    a = el.animate([{ transform: `translate(${dx}px,${dy}px)`, width: r0.width + "px", height: r0.height + "px" }, { transform: "translate(0,0)", width: r1.width + "px", height: r1.height + "px" }], opt);
  } else {
    const s = Math.max(0.2, Math.min(5, r0.height / r1.height));
    a = el.animate([{ transformOrigin: "0 0", transform: `translate(${dx}px,${dy}px) scale(${s})` }, { transformOrigin: "0 0", transform: "translate(0,0) scale(1)" }], opt);
  }
  keep(el, a).finished.then(() => el.classList.remove("flying"), () => el.classList.remove("flying"));
}
// ---------- 小框：从自己现在的位置飞到 r1（关的时候用），停在那里等着被拿掉 ----------
export function flyTo(el, r1, o = {}) {
  if (calm() || !el || !r1) return;
  const r0 = o.r0 || el.getBoundingClientRect(); if (!r0.width || !r0.height) return;
  const dx = r1.left - r0.left, dy = r1.top - r0.top - (o.lift || 0);
  const opt = { duration: o.dur || T_BACK, easing: o.ease || EASE.back, fill: "forwards" };
  el.classList.add("flying");
  if ((el.dataset.flyM || o.m) === "w") keep(el, el.animate([{ transform: "translate(0,0)", width: r0.width + "px", height: r0.height + "px" }, { transform: `translate(${dx}px,${dy}px)`, width: r1.width + "px", height: r1.height + "px" }], opt));
  else { const s = Math.max(0.2, Math.min(5, r1.height / r0.height)); keep(el, el.animate([{ transformOrigin: "0 0", transform: "translate(0,0) scale(1)" }, { transformOrigin: "0 0", transform: `translate(${dx}px,${dy}px) scale(${s})` }], opt)); }
}

// 打开前：记下外面所有 data-fly 小框的位置
export function snap(scope = document) {
  const m = new Map();
  scope.querySelectorAll("[data-fly]").forEach((el) => { if (!m.has(el.dataset.fly) && seen(el)) m.set(el.dataset.fly, { el, r: rect(el.getBoundingClientRect()) }); });
  return m;
}
// 打开后：新容器里同名的小框从旧位置飞过来
export function land(box, before, o = {}) {
  if (calm() || !box || !before) return 0;
  let n = 0;
  box.querySelectorAll("[data-fly]").forEach((el) => { const s = before.get(el.dataset.fly); if (!s || box.contains(s.el)) return; flyFrom(el, s.r, { ...o, delay: (o.delay || 0) + n * 18 }); n++; });
  return n;
}
// 关之前：容器里的小框飞回外面同名的位置；不飞的东西淡掉
export function leave(box, o = {}) {
  if (calm() || !box) return [];
  const out = [];
  box.querySelectorAll("[data-fly]").forEach((el) => {
    let to = null;
    document.querySelectorAll(`[data-fly="${CSS.escape(el.dataset.fly)}"]`).forEach((x) => { if (!to && !box.contains(x) && seen(x)) to = x; });
    if (to) { flyTo(el, rect(to.getBoundingClientRect()), o); out.push(el); caught(to, (o.dur || T_BACK) - 20); }
  });
  return out;
}
// 把容器里除了正在飞的以外都淡掉
export function fadeRest(box, flyers, dur = 220) {
  const walk = (p) => [...p.children].forEach((c) => {
    if (flyers.includes(c)) return;
    if (flyers.some((f) => c.contains(f))) walk(c);
    else keep(c, c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: "ease", fill: "forwards" }));
  });
  walk(box);
}

const FADE = ".grab,.sb,.sh>:not(h2),.cam-in>:not(.cam-h),.cam-h>:not(span),.sp-h~*,.sp-h>:not(b)";
// 给一批东西加淡入淡出，但正在飞的小框和装着它的那几层不淡（只淡它旁边的）
function parts(list, flyers, kf, opt) {
  const go = (c) => {
    if (flyers.includes(c)) return;
    if (flyers.some((f) => c.contains(f))) [...c.children].forEach(go);
    else keep(c, c.animate(kf, opt));
  };
  list.forEach(go);
}

// ---------- 大框：面板 / 整页从按钮的框里长出来 ----------
// 面板（底部弹出）：先挪到按钮那一行、只露出按钮那么大一块，再一边长大一边回原位，上面的字飞成标题。
export function grow(el, src, o = {}) {
  if (calm() || !el || !src) return false;
  stop(el);
  // 先关掉它自己原来的进场动画，再量位置（不然量到的是还在屏幕下面的位置）
  el.classList.add("grown", "growing");
  const R = el.getBoundingClientRect(); if (!R.height) { el.classList.remove("grown", "growing"); return false; }
  const r = src.r, full = !!o.full;
  const dy = full ? 0 : r.top - R.top;
  const cl = (v) => Math.max(0, v);
  const c0 = `inset(${cl(full ? r.top - R.top : 0)}px ${cl(R.right - r.right)}px ${cl(full ? R.bottom - r.bottom : R.height - r.height)}px ${cl(r.left - R.left)}px round ${src.rad}px)`;
  const c1 = `inset(0px 0px 0px 0px round ${o.rad || "30px 30px 0px 0px"})`;
  el.__src = src; el.__grow = { dy, full };
  const h = el.querySelector(o.title || ".sh h2,.cam-h b,.sp-h b"), hr = h && rect(h.getBoundingClientRect());
  const pairs = [];
  if (o.snap) el.querySelectorAll("[data-fly]").forEach((x) => { const sp = o.snap.get(x.dataset.fly); if (sp && !el.contains(sp.el)) pairs.push([x, sp.r, rect(x.getBoundingClientRect())]); });
  const main = keep(el, el.animate([{ transform: `translateY(${dy}px)`, clipPath: c0 }, { transform: "translateY(0px)", clipPath: c1 }], { duration: o.dur || T_BOX, easing: EASE.box }));
  // 长的时候里面的滚动区先不裁剪，飞进来的小框才看得见
  main.finished.then(() => el.classList.remove("growing"), () => el.classList.remove("growing"));
  // 一开始是按钮的颜色，长到一半换成面板的颜色
  tint(el, boxPaint(src.bg), [1, 0], [0.15, 0.7]);
  // 内容晚一点淡进来
  parts(el.querySelectorAll(o.fade || FADE), pairs.map((p) => p[0]), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 0, transform: "translateY(10px)", offset: 0.16 }, { opacity: 1, transform: "none" }], { duration: (o.dur || T_BOX) + 80, easing: EASE.fly });
  // 按钮上的字飞成标题
  // 飞的小框外面那几层自己的进场动画（逐行淡入）先停掉，不然小框跟着一起被藏起来
  const hosts = new Set();
  [h, ...pairs.map((p) => p[0])].forEach((x) => { for (let p = x && x.parentElement; p && p !== el; p = p.parentElement) hosts.add(p); });
  hosts.forEach((p) => p.classList.add("flyhost"));
  main.finished.then(() => hosts.forEach((p) => p.classList.remove("flyhost")), () => hosts.forEach((p) => p.classList.remove("flyhost")));
  // 跟面板用同一条曲线、同样长，才能抵消面板自己往上滑的那一段，走直线
  if (h && hr && src.lab) flyFrom(h, src.lab, { r1: hr, lift: dy, dur: o.dur || T_BOX, ease: EASE.box });
  pairs.forEach(([x, r0, r1]) => flyFrom(x, r0, { r1, lift: dy, dur: o.dur || T_BOX, ease: EASE.box }));
  return true;
}
// 关：缩回按钮（按钮还在原处才这样，不然用原来的往下收）
export function shrink(el, o = {}) {
  if (calm() || !el || !el.__src) return false;
  const src = el.__src, now = src.el && src.el.isConnected ? describe(src.el) : null;
  if (!now || !seen(src.el)) { el.classList.remove("grown"); return false; }
  stop(el);
  const R = el.getBoundingClientRect(), r = now.r, full = el.__grow && el.__grow.full;
  const h = el.querySelector(o.title || ".sh h2,.cam-h b,.sp-h b"), hr = h && rect(h.getBoundingClientRect());
  const pairs = [];
  el.querySelectorAll("[data-fly]").forEach((x) => { let to = null; document.querySelectorAll(`[data-fly="${CSS.escape(x.dataset.fly)}"]`).forEach((y) => { if (!to && !el.contains(y) && seen(y)) to = y; }); if (to) pairs.push([x, rect(x.getBoundingClientRect()), rect(to.getBoundingClientRect())]); });
  const dy = full ? 0 : r.top - R.top, cl = (v) => Math.max(0, v);
  const c1 = `inset(${cl(full ? r.top - R.top : 0)}px ${cl(R.right - r.right)}px ${cl(full ? R.bottom - r.bottom : R.height - r.height)}px ${cl(r.left - R.left)}px round ${now.rad}px)`;
  keep(el, el.animate([{ transform: "translateY(0px)", clipPath: `inset(0px 0px 0px 0px round ${o.rad || "30px 30px 0px 0px"})` }, { transform: `translateY(${dy}px)`, clipPath: c1 }], { duration: o.dur || 290, easing: EASE.close, fill: "forwards" }));
  tint(el, boxPaint(now.bg), [0, 1], [0.5, 1], true);
  parts(el.querySelectorAll(o.fade || FADE), pairs.map((p) => p[0]), [{ opacity: 1 }, { opacity: 0, offset: 0.45 }, { opacity: 0 }], { duration: o.dur || 290, fill: "forwards" });
  if (h && hr && now.lab) flyTo(h, now.lab, { r0: hr, lift: dy, dur: o.dur || 290, ease: EASE.close });
  pairs.forEach(([x, r0, r1]) => flyTo(x, r1, { r0, lift: dy, dur: o.dur || 290, ease: EASE.close }));
  caught(src.el, (o.dur || 290) - 30);
  return true;
}
// 框里铺一层按钮原来的颜色，渐渐变成面板的颜色（关的时候反过来）
function tint(el, bg, op, at, hold) {
  if (!bg) return;
  const i = document.createElement("i"); i.className = "fly-tint"; i.setAttribute("aria-hidden", "true");
  i.style.background = bg; el.appendChild(i);
  const a = i.animate([{ opacity: op[0], offset: 0 }, { opacity: op[0], offset: at[0] }, { opacity: op[1], offset: at[1] }, { opacity: op[1], offset: 1 }], { duration: hold ? 290 : T_BOX, easing: "ease", fill: "forwards" });
  keep(el, a); a.finished.then(() => { if (!hold) i.remove(); }, () => i.remove());
}
