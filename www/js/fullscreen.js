// 全屏动画：开场问候、建档后的计算、AI 思考、换一份的转场、全天吃完的庆祝
import { html, useState, useEffect, useRef, app } from "./ui.js";
import { calm, haptic, confetti, fireworks, useTween } from "./fx.js";
import { targetsOf, sumItems, planItems } from "./nutrition.js";
import { allFoods, dateStr } from "./store.js";

export const skyOf = (h) => (h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 16 ? "day" : h >= 16 && h < 19 ? "dusk" : "night");
const STARS = [[7, 12], [17, 30], [27, 8], [39, 22], [50, 6], [61, 17], [70, 28], [79, 10], [89, 21], [94, 36], [12, 44], [84, 48], [22, 60], [66, 66], [44, 78], [90, 80]];
const Sky = () => html`<div class="skyfx" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i>
  ${STARS.map(([x, y], i) => html`<i class="star" style=${`left:${x}%;top:${y}%;animation-delay:${(i * 0.37) % 3}s`}></i>`)}</div>`;

// 把全屏的天空「收」进页面上的那张天空卡片里，再淡出
function morphToHero(el, done) {
  app.heroDelay = 620;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const h = document.querySelector(".view .hero");
    el.classList.add("leaving");
    if (!h || calm()) { el.style.transition = "opacity .4s"; el.style.opacity = "0"; return setTimeout(done, 420); }
    const r = h.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    el.style.transition = "clip-path .85s cubic-bezier(.32,.72,0,1), opacity .4s ease .62s";
    el.style.clipPath = `inset(${Math.max(0, r.top)}px ${Math.max(0, W - r.right)}px ${Math.max(0, H - r.bottom)}px ${Math.max(0, r.left)}px round 30px)`;
    el.style.opacity = "0";
    setTimeout(done, 1060);
  }));
}

function Chars({ text, base = 0, step = 55 }) {
  return html`${text.split("").map((ch, i) => html`<span class="ch" style=${`animation-delay:${base + i * step}ms`}>${ch === " " ? " " : ch}</span>`)}`;
}

function BigArc({ p, delay = 0, full }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay + 40); return () => clearTimeout(t); }, []);
  const q = on ? Math.max(0.035, p) : 0;
  return html`<svg class=${"arc bigarc" + (full ? " slow" : "")} viewBox="0 0 320 178" aria-hidden="true">
    <defs><linearGradient id="fsg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe9a8" /><stop offset="1" stop-color="#ffffff" /></linearGradient></defs>
    <path class="track" d="M32 160 A128 128 0 0 1 288 160" pathLength="1000" />
    <path class="eaten" d="M32 160 A128 128 0 0 1 288 160" pathLength="1000" stroke="url(#fsg)" style=${`stroke-dashoffset:${1000 * (1 - q)}`} />
    <g class="sun" style=${`transform:rotate(${180 * q}deg)`}><circle class="glow" cx="32" cy="160" r="17" /><circle class="core" cx="32" cy="160" r="9" /></g>
  </svg>`;
}

// ---------- 开场：按时间问好，太阳走到今天的进度 ----------
export function Splash({ onReveal, onDone }) {
  const ref = useRef(null), gone = useRef(false);
  const S = app.S, now = new Date(), h = now.getHours();
  const day = S.days[dateStr()];
  const byId = Object.fromEntries(allFoods(S).map((f) => [f.id, f]));
  const T = targetsOf(S.profile, day || {});
  const eaten = day && day.plan ? sumItems(planItems(day.plan, true), (id) => byId[id]).kcal : 0;
  const left = Math.max(0, Math.round(T.kcal - eaten));
  const hi = h >= 5 && h < 11 ? "早上好" : h >= 11 && h < 14 ? "中午好" : h >= 14 && h < 18 ? "下午好" : "晚上好";
  const leave = () => { if (gone.current) return; gone.current = true; onReveal(); morphToHero(ref.current, onDone); };
  useEffect(() => { const t = setTimeout(leave, 1900); return () => clearTimeout(t); }, []);
  return html`<div class=${"fs splash sky-" + skyOf(h)} ref=${ref} style="clip-path:inset(0px 0px 0px 0px round 0px)" onClick=${leave} role="status" aria-label=${hi}>
    <${Sky} /><i class="rays" aria-hidden="true"></i>
    <div class="fsin">
      <${BigArc} p=${Math.min(1, eaten / Math.max(1, T.kcal))} delay=${150} />
      <div class="fstext">
        <div class="greet"><${Chars} text=${hi} base=${250} step=${90} /></div>
        <div class="gsub">${eaten > 0 ? (left > 0 ? html`今天还可以吃 <b class="num">${left.toLocaleString("en-US")}</b> 千卡` : "今天已经吃够了") : "今天的饭已经排好了"}</div>
      </div>
    </div>
    <div class="fsbrand">饭票</div>
  </div>`;
}

function Count({ to, delay, unit }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(to), delay); return () => clearTimeout(t); }, []);
  const shown = useTween(v, 1100);
  return html`<b class="num">${Math.round(shown).toLocaleString("en-US")}${unit ? html`<small>${unit}</small>` : null}</b>`;
}

// ---------- 建档完成：把目标一项一项算出来 ----------
export function Calc({ onReveal, onDone }) {
  const ref = useRef(null), gone = useRef(false);
  const [phase, setPhase] = useState(0);
  const T = targetsOf(app.S.profile);
  const leave = () => { if (gone.current) return; gone.current = true; onReveal(); morphToHero(ref.current, onDone); };
  useEffect(() => {
    const a = setTimeout(() => { setPhase(1); haptic(10); }, 2300), b = setTimeout(leave, 3500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const tiles = [["每天热量", T.kcal, "千卡"], ["蛋白质", T.protein, "g"], ["碳水", T.carb, "g"], ["脂肪", T.fat, "g"]];
  return html`<div class="fs calc sky-dawn" ref=${ref} style="clip-path:inset(0px 0px 0px 0px round 0px)" role="status">
    <${Sky} /><i class="rays" aria-hidden="true"></i>
    <div class="fsin">
      <${BigArc} p=${1} delay=${200} full=${true} />
      <div class="fstext">
        <div class="greet" key=${phase}><${Chars} text=${phase ? "排好了" : "正在为你计算"} base=${phase ? 0 : 200} step=${60} /></div>
        <div class="gsub">${phase ? "照着吃就行，随时可以改" : "按你的身高、体重和目标"}</div>
      </div>
      <div class="fstiles">${tiles.map(([l, v, u], i) => html`<div class="glass fstile" style=${`animation-delay:${500 + i * 280}ms`}><span>${l}</span><${Count} to=${v} delay=${560 + i * 280} unit=${u} /></div>`)}</div>
    </div>
  </div>`;
}

// ---------- AI 思考 ----------
export function AIThinking({ names = [], onStop, closing }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 460); return () => clearInterval(t); }, []);
  const name = names.length ? names[i % names.length] : "";
  return html`<div class=${"fs aifs" + (closing ? " out" : "")} role="status" aria-label="AI 正在排餐">
    <div class="aurora" aria-hidden="true"><i class="a1"></i><i class="a2"></i><i class="a3"></i></div>
    <div class="fsin">
      <svg class="orbits" viewBox="0 0 240 240" aria-hidden="true">
        <g class="o1"><circle cx="120" cy="120" r="104" /><circle class="pl" cx="224" cy="120" r="5" /></g>
        <g class="o2"><circle cx="120" cy="120" r="76" /><circle class="pl" cx="120" cy="44" r="6" /><circle class="pl" cx="120" cy="196" r="3.5" /></g>
        <g class="o3"><circle cx="120" cy="120" r="48" /><circle class="pl" cx="72" cy="120" r="4.5" /></g>
        <path class="spark" d="M120 88l8.5 23.5L152 120l-23.5 8.5L120 152l-8.5-23.5L88 120l23.5-8.5z" />
      </svg>
      <div class="fstext">
        <div class="greet sm"><${Chars} text="AI 正在挑搭配" base=${150} step=${50} /></div>
        <div class="ticker">${name ? html`<span key=${i}>${name}</span>` : null}</div>
        <div class="gsub">一般要十几秒到一分钟</div>
      </div>
      <button class="glass fsbtn" id="ai-stop" onClick=${onStop}>停止</button>
    </div>
  </div>`;
}

// ---------- 换一份：从按钮处漫开一片天空，再收回太阳里 ----------
export function Wipe({ x, y, onMid, onDone }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => { onMid(); haptic(8); }, 430), b = setTimeout(() => setOut(true), 640), c = setTimeout(onDone, 1240);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, []);
  return html`<div class=${"fs wipe sky-" + skyOf(new Date().getHours()) + (out ? " out" : "")} style=${`--x:${x}px;--y:${y}px`} aria-hidden="true">
    <${Sky} />
    <div class="fsin"><svg class="shuffle" viewBox="0 0 24 24"><path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" /></svg></div>
  </div>`;
}

// ---------- 全天吃完 ----------
export function Celebrate({ stats, onDone }) {
  const cv = useRef(null);
  const [out, setOut] = useState(false);
  useEffect(() => {
    let stop = () => {};
    const a = setTimeout(() => { haptic([14, 70, 22]); stop = fireworks(cv.current, 8); confetti(); }, 1250);
    return () => { clearTimeout(a); stop(); };
  }, []);
  const close = () => { if (out) return; setOut(true); setTimeout(onDone, 450); };
  return html`<div class=${"fs celebrate sky-dusk" + (out ? " out" : "")} role="dialog" aria-label="今天吃够了" onClick=${close}>
    <${Sky} /><i class="rays big" aria-hidden="true"></i>
    <canvas class="fwk" ref=${cv} aria-hidden="true"></canvas>
    <div class="fsin">
      <${BigArc} p=${1} delay=${150} full=${true} />
      <div class="fstext">
        <div class="greet"><${Chars} text="今天吃够了" base=${1150} step=${80} /></div>
        <div class="gsub" style="animation-delay:1.6s">每一餐都完成了，做得好。</div>
      </div>
      <div class="fstiles three">
        <div class="glass fstile" style="animation-delay:1.75s"><span>热量</span><${Count} to=${stats.kcal} delay=${1800} unit="千卡" /></div>
        <div class="glass fstile" style="animation-delay:1.9s"><span>蛋白质</span><${Count} to=${stats.p} delay=${1950} unit="g" /></div>
        <div class="glass fstile" style="animation-delay:2.05s"><span>花费</span><b class="num">¥${stats.cost}</b></div>
      </div>
      ${stats.streak > 1 ? html`<div class="cstreak" style="animation-delay:2.3s">已经连续记录 <b class="num">${stats.streak}</b> 天</div>` : null}
      <button class="glass fsbtn" id="cele-ok" style="animation-delay:2.5s" onClick=${close}>好的</button>
    </div>
  </div>`;
}
