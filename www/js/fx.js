// 动效小工具：数字滚动、打勾的粒子、完成时的彩带、轻微震动。都尊重系统的「减少动态效果」。
import { html, useState, useEffect, useRef } from "../vendor/preact-htm.js";

export const calm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
export function haptic(ms = 8) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

// 数字从旧值平滑滚到新值
export function useTween(value, ms = 800) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (calm() || from.current === value) { from.current = value; setShown(value); return; }
    const a = from.current, b = value;
    let raf, t0 = null;
    const tick = (t) => {
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4);
      const v = a + (b - a) * e;
      from.current = v; setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

// 打勾时从圆圈里迸出一圈小点
export function burst(el, colors = ["#34c759", "#ffd60a", "#ff9f0a", "#5ac8fa"]) {
  if (!el || calm() || !el.animate) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:90";
  document.body.appendChild(box);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const d = document.createElement("i");
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4, dist = 22 + Math.random() * 20, size = 4 + Math.random() * 4;
    d.style.cssText = `position:absolute;left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${colors[i % colors.length]}`;
    box.appendChild(d);
    d.animate([{ transform: "translate(0,0) scale(.4)", opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${Math.cos(ang) * dist * 1.25}px,${Math.sin(ang) * dist * 1.25 + 6}px) scale(0)`, opacity: 0 }], { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  }
  setTimeout(() => box.remove(), 700);
}

// 一天都吃完时的彩带
export function confetti() {
  if (calm()) return;
  const c = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:95";
  document.body.appendChild(c);
  const g = c.getContext("2d"); g.scale(dpr, dpr);
  const cols = ["#ff9f0a", "#ffd60a", "#34c759", "#5ac8fa", "#bf5af2", "#ff6482", "#ffffff"];
  const ps = Array.from({ length: 140 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return { x: W / 2 + side * W * 0.42, y: H * 0.62, vx: -side * (3 + Math.random() * 7), vy: -(9 + Math.random() * 9), w: 5 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], life: 0 };
  });
  let t0 = null;
  requestAnimationFrame(function frame(t) {
    if (t0 === null) t0 = t;
    const el = t - t0;
    g.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - Math.max(0, el - 1500) / 900);
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.7))); g.restore();
    }
    if (el < 2400) requestAnimationFrame(frame); else c.remove();
  });
}

// 全屏动画是否打开：系统没开「减少动态效果」，用户也没在设置里关掉
export const fullFx = (S) => !calm() && !(S && S.prefs && S.prefs.fullfx === false);

// 烟花：画在给定的 canvas 上，放 n 朵后自己停
export function fireworks(canvas, n = 7) {
  if (!canvas || calm()) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const g = canvas.getContext("2d"); g.scale(dpr, dpr);
  const hues = [42, 28, 330, 190, 265, 140, 55];
  let ps = [], raf = 0, alive = true, fired = 0;
  const boom = () => {
    if (!alive || fired >= n) return;
    const x = W * (0.18 + Math.random() * 0.64), y = H * (0.12 + Math.random() * 0.3), hue = hues[fired % hues.length];
    const count = 46 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2, sp = 2.2 + Math.random() * 3.6;
      ps.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.012 + Math.random() * 0.012, hue: hue + (Math.random() * 24 - 12), w: 1.4 + Math.random() * 1.4 });
    }
    haptic(6); fired++;
    setTimeout(boom, 300 + Math.random() * 380);
  };
  const frame = () => {
    if (!alive) return;
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    for (const p of ps) {
      p.px = p.x; p.py = p.y;
      p.vx *= 0.975; p.vy = p.vy * 0.975 + 0.045; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      g.strokeStyle = `hsla(${p.hue},100%,${62 + p.life * 20}%,${Math.max(0, p.life)})`;
      g.lineWidth = p.w; g.lineCap = "round";
      g.beginPath(); g.moveTo(p.px, p.py); g.lineTo(p.x, p.y); g.stroke();
    }
    ps = ps.filter((p) => p.life > 0);
    if (fired < n || ps.length) raf = requestAnimationFrame(frame); else g.clearRect(0, 0, W, H);
  };
  boom(); raf = requestAnimationFrame(frame);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

// 一位一位滚动的数字（像里程表）
export function Roll({ value, id }) {
  const [live, setLive] = useState(calm());
  useEffect(() => { const t = requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); return () => cancelAnimationFrame(t); }, []);
  const text = Math.round(value).toLocaleString("en-US");
  const chars = text.split("");
  return html`<span class="roll" id=${id} data-v=${Math.round(value)} aria-label=${text}>
    ${chars.map((ch, i) => {
      const k = chars.length - i; // 从右往左数，位数变了也不会错位
      if (ch === ",") return html`<span class="rsep" key=${"s" + k} aria-hidden="true">,</span>`;
      return html`<span class="rd" key=${"d" + k} aria-hidden="true"><span class="rc" style=${`transform:translateY(-${live ? Number(ch) * 10 : 0}%);transition-delay:${(k - 1) * 70}ms`}>0<br />1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</span></span>`;
    })}
  </span>`;
}

// 滚到屏幕里才开始播进场动画
export function useReveal(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || calm() || !("IntersectionObserver" in window)) { if (el) el.classList.add("in"); return; }
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
}

// 按下按钮时，从手指的位置扩散一圈水波
export function installRipple() {
  document.addEventListener("pointerdown", (e) => {
    if (calm()) return;
    const el = e.target.closest && e.target.closest(".btn,.chip,.opt,.modebtn,.tabs button");
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    const i = document.createElement("i");
    i.className = "rip";
    i.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(i);
    setTimeout(() => i.remove(), 700);
  }, { passive: true });
}
