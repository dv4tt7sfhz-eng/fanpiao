// 插画：封面上替换人物的大饭碗、智能食谱里的一排小店。全是 SVG，跟着主题色变。
import { html } from "./ui.js";

// 伪随机，保证每次画出来的米粒一样
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- 封面：一大碗饭（深色、主题色边光，筷子和热气伸出卡片上沿） ----------
const GRAINS = (() => {
  const r = rnd(7), out = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI, rr = Math.sqrt(r());
    const x = 130 + Math.cos(a) * 100 * rr * (r() > 0.5 ? 1 : -1), y = 196 - Math.sin(a) * 70 * rr;
    if (y > 196) continue;
    out.push([x.toFixed(1), y.toFixed(1), (r() * 180).toFixed(0), (0.55 + r() * 0.45).toFixed(2)]);
  }
  return out;
})();
export const HeroBowl = () => html`<svg class="hero-bowl" viewBox="0 0 260 320" aria-hidden="true">
  <defs>
    <linearGradient id="hb-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#3b3b42" /><stop offset=".45" style="stop-color:#16161a" /><stop offset="1" style="stop-color:#050506" /></linearGradient>
    <linearGradient id="hb-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--tint);stop-opacity:.95" /><stop offset=".3" style="stop-color:#fff;stop-opacity:.55" /><stop offset=".7" style="stop-color:#fff;stop-opacity:.12" /><stop offset="1" style="stop-color:var(--tint);stop-opacity:.6" /></linearGradient>
    <linearGradient id="hb-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--tint);stop-opacity:.85" /><stop offset=".22" style="stop-color:var(--tint);stop-opacity:0" /><stop offset=".85" style="stop-color:#fff;stop-opacity:0" /><stop offset="1" style="stop-color:#fff;stop-opacity:.18" /></linearGradient>
    <radialGradient id="hb-rice" cx="38%" cy="20%" r="80%"><stop offset="0" style="stop-color:#f5f2ec" /><stop offset=".45" style="stop-color:#cfcac1" /><stop offset=".8" style="stop-color:#6e6a63" /><stop offset="1" style="stop-color:#2e2c29" /></radialGradient>
    <linearGradient id="hb-stick" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:#1a1613" /><stop offset=".45" style="stop-color:#5a4a3c" /><stop offset=".6" style="stop-color:#9a8572" /><stop offset="1" style="stop-color:#231d18" /></linearGradient>
    <radialGradient id="hb-meat" cx="40%" cy="30%" r="80%"><stop offset="0" style="stop-color:#e3d5c3" /><stop offset=".6" style="stop-color:#9c8b78" /><stop offset="1" style="stop-color:#4a4038" /></radialGradient>
    <radialGradient id="hb-yolk" cx="40%" cy="35%" r="70%"><stop offset="0" style="stop-color:#ffd27a" /><stop offset=".7" style="stop-color:#e8922c" /><stop offset="1" style="stop-color:#9a4e14" /></radialGradient>
    <radialGradient id="hb-broc" cx="40%" cy="30%" r="75%"><stop offset="0" style="stop-color:#8fb57f" /><stop offset=".6" style="stop-color:#3c5e3b" /><stop offset="1" style="stop-color:#16251a" /></radialGradient>
    <radialGradient id="hb-haze" cx="50%" cy="55%" r="50%"><stop offset="0" style="stop-color:var(--tint-hi,var(--tint));stop-opacity:.5" /><stop offset=".55" style="stop-color:var(--tint);stop-opacity:.22" /><stop offset="1" style="stop-color:var(--tint);stop-opacity:0" /></radialGradient>
    <filter id="hb-soft"><feGaussianBlur stdDeviation="2.4" /></filter>
  </defs>
  <ellipse cx="146" cy="196" rx="104" ry="104" fill="url(#hb-haze)" />
  <g class="hb-steam" filter="url(#hb-soft)">
    <path d="M100 150c-14-22 14-34 0-60s10-40 2-62" />
    <path d="M134 140c-14-22 14-34 0-60s10-40 2-70" />
    <path d="M166 150c-14-22 14-34 0-60s10-40 2-58" />
  </g>
  <g class="hb-sticks">
    <rect x="-4" y="-170" width="9" height="200" rx="4.5" fill="url(#hb-stick)" transform="translate(200 170) rotate(24)" />
    <rect x="-4" y="-160" width="9" height="190" rx="4.5" fill="url(#hb-stick)" transform="translate(214 178) rotate(31)" />
    <path d="M0 -168v190" stroke="var(--tint)" stroke-opacity=".7" stroke-width="1.4" transform="translate(196 170) rotate(24)" />
  </g>
  <path d="M30 196C34 140 76 104 130 104s96 36 100 92z" fill="url(#hb-rice)" />
  ${GRAINS.map(([x, y, a, o]) => html`<ellipse cx=${x} cy=${y} rx="4.2" ry="2.1" transform=${`rotate(${a} ${x} ${y})`} fill="#fbf9f4" opacity=${o * 0.55} />`)}
  <g class="hb-top">
    <g transform="rotate(-14 98 140)">
      <path d="M58 150c10-22 52-30 76-14-4 14-10 20-22 22-20 4-42 4-54-8z" fill="url(#hb-meat)" />
      <path d="M70 142l8 10M84 136l8 12M98 134l8 12M112 136l6 10" stroke="#3a312b" stroke-width="2.4" stroke-linecap="round" opacity=".6" />
    </g>
    <ellipse cx="160" cy="132" rx="24" ry="15" fill="#f2efe8" /><ellipse cx="163" cy="132" rx="12" ry="9" fill="url(#hb-yolk)" />
    <circle cx="186" cy="156" r="13" fill="url(#hb-broc)" /><circle cx="200" cy="166" r="11" fill="url(#hb-broc)" /><circle cx="176" cy="168" r="10" fill="url(#hb-broc)" />
  </g>
  <path d="M8 196h244c-6 70-58 124-122 124S14 266 8 196z" fill="url(#hb-body)" />
  <path d="M8 196h244c-6 70-58 124-122 124S14 266 8 196z" fill="url(#hb-edge)" style="mix-blend-mode:screen" />
  <ellipse cx="130" cy="196" rx="122" ry="10" fill="none" stroke="url(#hb-rim)" stroke-width="3" />
  <path d="M206 214c-6 34-26 60-52 74" stroke="#fff" stroke-opacity=".22" stroke-width="5" stroke-linecap="round" fill="none" />
  <path d="M26 214c6 30 20 52 40 66" stroke="var(--tint)" stroke-opacity=".75" stroke-width="3" stroke-linecap="round" fill="none" />
</svg>`;

// ---------- 智能食谱：一排夜里的小店 ----------
// 每家：招牌字、招牌底色、招牌字色、店里的灯色、门口的东西
export const SCENES = [
  { id: "canteen", n: "食堂食谱", sign: "食 堂", sub: "一荤一素 · 管饱", bg: "#f3ead8", fg: "#1d3a6b", glow: "#ffd58a", kind: "canteen", modes: { b: "out", l: "out", d: "out" }, d: "三餐都在食堂，按窗口常见的菜排" },
  { id: "takeout", n: "外卖食谱", sign: "外 卖", sub: "30 分钟送到", bg: "#1b1b1f", fg: "#ffe9c2", glow: "#ffb35c", kind: "takeout", modes: { b: "cold", l: "out", d: "out" }, d: "早饭不开火，午饭晚饭点外卖" },
  { id: "store", n: "便利店食谱", sign: "便利店", sub: "24H", bg: "#1e5fd8", fg: "#ffffff", glow: "#dff1ff", kind: "store", modes: { b: "cold", l: "cold", d: "cold" }, d: "只买即食的：饭团、鸡胸、牛奶、香蕉" },
  { id: "dorm", n: "宿舍不开火", sign: "宿 舍", sub: "热水 · 微波炉", bg: "#2a2a30", fg: "#c9f7e6", glow: "#9ef5e0", kind: "dorm", modes: { b: "cold", l: "out", d: "cold" }, d: "宿舍只有热水壶，午饭去食堂" },
  { id: "home", n: "家庭厨房", sign: "家 常 菜", sub: "自己做", bg: "#7a2a1c", fg: "#ffe2b8", glow: "#ffc06b", kind: "home", modes: { b: "cook", l: "cook", d: "cook" }, d: "三餐自己做，买菜按清单来" },
  { id: "ai", n: "AI 私人食谱", sign: "A I 定 制", sub: "说说你的情况", bg: "#2a1450", fg: "#e6d8ff", glow: "#c58bff", kind: "ai", modes: null, d: "让 AI 照你的口味和预算排" },
];

const roofUnits = (r) => html`<g>
  <rect x="34" y="18" width="34" height="20" rx="2" fill="#2b2b31" /><rect x="38" y="22" width="26" height="12" rx="1" fill="none" stroke="#45454d" />
  <circle cx="51" cy="28" r="5" fill="none" stroke="#55555e" />
  <rect x="${r ? 226 : 232}" y="20" width="32" height="18" rx="2" fill="#2b2b31" /><circle cx="${r ? 242 : 248}" cy="29" r="5" fill="none" stroke="#55555e" />
  <path d="M20 40h260" stroke="#3a3a42" stroke-width="2" /><path d="M24 40v-8M40 40v-8M260 40v-8M276 40v-8" stroke="#3a3a42" stroke-width="1.5" />
</g>`;

function Inside({ s }) {
  const k = s.kind;
  if (k === "store") return html`<g>
    ${[0, 1, 2, 3].map((i) => html`<rect x=${70 + i * 42} y="98" width="36" height="66" rx="2" fill="#eaf6ff" opacity=".92" />
      ${[0, 1, 2, 3].map((j) => html`<rect x=${73 + i * 42} y=${103 + j * 15} width="30" height="9" rx="1.5" fill=${["#5ab0ff", "#ffcf4a", "#ff7a7a", "#7ae0a0"][(i + j) % 4]} opacity=".85" />`)}`)}
    <rect x="60" y="160" width="180" height="6" fill="#bcd9f5" /></g>`;
  if (k === "home") return html`<g>
    <rect x="68" y="92" width="80" height="58" rx="4" fill="#ffdca0" opacity=".9" /><path d="M108 92v58M68 121h80" stroke="#8a4a20" stroke-width="3" />
    <path d="M66 90c14 18 30 18 44 0M106 90c14 18 30 18 44 0" fill="#d94a3a" opacity=".85" />
    <rect x="164" y="104" width="70" height="60" rx="3" fill="#3a1d12" /><circle cx="186" cy="118" r="8" fill="#5a5a60" /><circle cx="212" cy="118" r="8" fill="#5a5a60" />
    <path d="M174 140h52" stroke="#ffc06b" stroke-width="3" /><ellipse cx="199" cy="104" rx="16" ry="4" fill="#cfcfd6" /><path d="M190 96c-4-6 4-8 0-14M206 96c-4-6 4-8 0-14" stroke="#fff" stroke-opacity=".5" fill="none" />
  </g>`;
  if (k === "dorm") return html`<g>
    <rect x="70" y="96" width="70" height="70" rx="3" fill="#20252c" /><rect x="76" y="102" width="58" height="34" rx="2" fill="#9ef5e0" opacity=".25" />
    <rect x="160" y="120" width="40" height="44" rx="4" fill="#d9dde6" /><rect x="166" y="126" width="28" height="22" rx="2" fill="#2a2f38" /><circle cx="196" cy="156" r="2.5" fill="#ff6a4a" />
    <path d="M214 164v-30a10 10 0 0 1 20 0v30z" fill="#e8e8ee" /><path d="M234 140h6v10h-6" fill="none" stroke="#e8e8ee" stroke-width="3" />
    <path d="M222 124c-3-6 3-8 0-14" stroke="#fff" stroke-opacity=".5" fill="none" />
  </g>`;
  if (k === "ai") return html`<g>
    <circle cx="150" cy="128" r="30" fill="none" stroke="#c58bff" stroke-width="3" opacity=".9" /><circle cx="150" cy="128" r="18" fill="#c58bff" opacity=".35" />
    <path d="M150 104l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#fff" />
    ${[0, 1, 2, 3, 4].map((i) => html`<rect x=${74 + i * 34} y="166" width="22" height="4" rx="2" fill="#c58bff" opacity=${0.4 + i * 0.12} />`)}
  </g>`;
  // 食堂 / 外卖：一排菜盆和灯
  return html`<g>
    ${[0, 1, 2, 3, 4].map((i) => html`<g><rect x=${66 + i * 34} y="132" width="30" height="16" rx="3" fill="#cfcfd6" /><ellipse cx=${81 + i * 34} cy="134" rx="13" ry="4" fill=${["#c8642c", "#7fb069", "#e8b44a", "#a8442c", "#5a9a4a"][i]} /></g>`)}
    <rect x="60" y="148" width="180" height="20" fill=${k === "takeout" ? "#2a2a30" : "#e9e2d2"} />
    ${[0, 1, 2].map((i) => html`<g><path d=${`M${96 + i * 54} 84v10`} stroke="#555" /><path d=${`M${86 + i * 54} 94h20l-4 8h-12z`} fill="#ffe0a0" /></g>`)}
    ${k === "takeout" ? html`<g>${[0, 1, 2, 3].map((i) => html`<rect x=${70 + i * 44} y="104" width="34" height="22" rx="2" fill="#3a2a1a" stroke="#ffb35c" stroke-opacity=".4" />`)}</g>` : html`<g><rect x="70" y="102" width="160" height="22" rx="2" fill="#20406e" /><text x="150" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">今日菜单 · 荤 6 元 · 素 2.5 元</text></g>`}
  </g>`;
}

function Front({ s }) {
  const k = s.kind;
  if (k === "takeout") return html`<g>
    <g transform="translate(222 170)"><circle cx="0" cy="22" r="11" fill="#141416" stroke="#555" stroke-width="3" /><circle cx="44" cy="22" r="11" fill="#141416" stroke="#555" stroke-width="3" />
      <path d="M0 22l14-26h20l10 26" fill="none" stroke="#2f2f36" stroke-width="5" /><rect x="22" y="-18" width="26" height="22" rx="3" fill="#ffb35c" /><text x="35" y="-3" text-anchor="middle" font-size="9" font-weight="900" fill="#1b1b1f">外卖</text></g>
    <rect x="30" y="176" width="22" height="30" rx="2" fill="#ff6a4a" opacity=".9" /><circle cx="41" cy="172" r="7" fill="#ff6a4a" />
  </g>`;
  if (k === "canteen") return html`<g>
    <circle cx="36" cy="176" r="14" fill="#2f5a34" /><circle cx="28" cy="168" r="10" fill="#3f7a44" /><rect x="28" y="184" width="16" height="16" fill="#6a4a30" />
    <rect x="246" y="150" width="30" height="46" rx="2" fill="#f3ead8" /><path d="M250 160h22M250 168h22M250 176h16" stroke="#1d3a6b" stroke-width="2" />
  </g>`;
  if (k === "store") return html`<g><rect x="246" y="140" width="28" height="60" rx="3" fill="#2a2a30" /><rect x="250" y="146" width="20" height="46" rx="2" fill="#dff1ff" opacity=".7" /></g>`;
  if (k === "home") return html`<g>${[34, 262].map((x) => html`<g><circle cx=${x} cy="120" r="12" fill="#e2412f" /><path d=${`M${x} 108v-12`} stroke="#555" /><path d=${`M${x - 6} 120h12`} stroke="#ffcf7a" stroke-width="2" /></g>`)}</g>`;
  if (k === "dorm") return html`<g><rect x="30" y="150" width="20" height="50" rx="3" fill="#3a6a8a" /><rect x="34" y="156" width="12" height="8" fill="#9ef5e0" opacity=".6" /></g>`;
  return html`<g><path d="M30 200l10-40h20l10 40z" fill="#c58bff" opacity=".25" /></g>`;
}

export function Store({ s, dim }) {
  const id = "st-" + s.id;
  return html`<svg class=${"store" + (dim ? " dim" : "")} viewBox="0 0 300 210" aria-hidden="true">
    <defs>
      <linearGradient id=${id + "-in"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style=${"stop-color:" + s.glow + ";stop-opacity:.95"} /><stop offset="1" style=${"stop-color:" + s.glow + ";stop-opacity:.35"} /></linearGradient>
      <radialGradient id=${id + "-spill"} cx="50%" cy="0%" r="90%"><stop offset="0" style=${"stop-color:" + s.glow + ";stop-opacity:.5"} /><stop offset="1" style=${"stop-color:" + s.glow + ";stop-opacity:0"} /></radialGradient>
    </defs>
    ${roofUnits(s.id.length % 2)}
    <rect x="16" y="40" width="268" height="166" fill="#17171b" />
    <rect x="16" y="40" width="268" height="166" fill="none" stroke="#2a2a31" />
    <rect x="22" y="46" width="256" height="36" rx="3" fill=${s.bg} />
    <rect x="22" y="46" width="256" height="36" rx="3" fill="none" stroke="#fff" stroke-opacity=".15" />
    <rect x="30" y="52" width="24" height="24" rx="3" fill=${s.fg} opacity=".9" /><path d="M36 64h12M42 58v12" stroke=${s.bg} stroke-width="3" stroke-linecap="round" />
    <text x="150" y="72" text-anchor="middle" font-size="22" font-weight="900" fill=${s.fg} letter-spacing="2">${s.sign}</text>
    <text x="270" y="78" text-anchor="end" font-size="8" font-weight="700" fill=${s.fg} opacity=".75">${s.sub}</text>
    <rect x="56" y="88" width="188" height="84" fill=${`url(#${id}-in)`} />
    <${Inside} s=${s} />
    <rect x="56" y="88" width="188" height="84" fill="none" stroke="#0e0e10" stroke-width="4" />
    <path d="M56 88h188" stroke="#000" stroke-opacity=".4" stroke-width="6" />
    <rect x="22" y="88" width="30" height="112" fill="#1f1f24" /><rect x="248" y="88" width="30" height="112" fill="#1f1f24" />
    <ellipse cx="150" cy="210" rx="150" ry="26" fill=${`url(#${id}-spill)`} />
    <path d="M0 206h300" stroke="#2c2c33" stroke-width="2" />
    <${Front} s=${s} />
  </svg>`;
}
