// 入口：没建档先建档，建好以后是四个标签页
import { html, render, useState, useEffect, useReducer, useRef, app, UI } from "./ui.js";
import { Onboarding } from "./onboarding.js";
import { Today, TargetSheet, ModeSheet, ItemSheet, PickSheet, AISheet } from "./today.js";
import { FoodsView, FoodSheet, ShopSheet } from "./foodsview.js";
import { Records } from "./records.js";
import { SnapSheet } from "./snap.js";
import { liquidify } from "./liquid.js";
import { attachTabDrag } from "./tabdrag.js";
import { NaFbSheet } from "./nafb.js";
import { Me, ProfileSheet, AISetSheet, CloudSheet, DataSheet, AboutSheet } from "./me.js";
import { detectPreview } from "./ai.js";
import { haptic, fullFx, installRipple } from "./fx.js";
import { Splash, Calc, AIThinking, Wipe, Celebrate } from "./fullscreen.js";

const TABS = [
  { id: "today", n: "今天", d: "M3 17a9 9 0 0 1 18 0M12 4v2M4.6 7.6l1.4 1.4M19.4 7.6 18 9M2 20h20" },
  { id: "foods", n: "食物", d: "M4 10h16l-1.6 9.2a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8zM8 10l2.5-6M16 10l-2.5-6" },
  { id: "records", n: "记录", d: "M5 20v-6M12 20V5M19 20v-9" },
  { id: "me", n: "我的", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0" },
];
const TITLE = { today: "今天", foods: "食物", records: "记录", me: "我的" };
const SHEETS = { target: TargetSheet, mode: ModeSheet, item: ItemSheet, pick: PickSheet, ai: AISheet, food: FoodSheet, shop: ShopSheet, snap: SnapSheet, nafb: NaFbSheet,
  profile: ProfileSheet, aiset: AISetSheet, cloud: CloudSheet, data: DataSheet, about: AboutSheet };
const FSC = { splash: Splash, calc: Calc, ai: AIThinking, wipe: Wipe, cele: Celebrate };
const root = document.documentElement;
installRipple();

function App() {
  const [, force] = useReducer((x) => x + 1, 0);
  const [tab, setTab] = useState("today");
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  // 底部标签栏的液态玻璃折射（只在 Chrome 内核上生效）
  const glassRef = useRef(null);
  const goRef = useRef(null);
  useEffect(() => {
    const el = glassRef.current; if (!el) return;
    if (!el.__lg) el.__lg = liquidify(el, { id: "lg-tabs", radius: 32, band: 20, scale: 42 });
    // 按住标签栏会鼓出一个透明泡泡，可以左右滑着选
    if (!el.__drag) {
      el.__drag = attachTabDrag(el, { count: TABS.length, onPick: (n) => goRef.current(TABS[n].id), tick: () => haptic(4) });
      el.__lens = liquidify(el, { id: "lg-bubble", sel: ".bubble", backdrop: true, radius: 27, band: 10, scale: 12, cls: "lens-on" });
    }
  });
  // 全屏动画：开场问候在每次打开时播一次
  const [fs, setFs] = useState(() => (app.S.profile && fullFx(app.S) ? { t: "splash", k: 1 } : null));
  const [ready, setReady] = useState(!fs);
  const [fromFs, setFromFs] = useState(false);
  const [dir, setDir] = useState("r");
  const timer = useRef(0), fsTimer = useRef(0);
  app.rerender = force;

  const openSheet = (s) => { clearTimeout(timer.current); root.classList.remove("sheet-closing"); root.style.setProperty("--sy", window.scrollY + "px"); setSheet(s); };
  // 关面板时先播完收起的动画，再真的拿掉
  const closeSheet = () => {
    if (!sheet) return;
    root.classList.add("sheet-closing");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { root.classList.remove("sheet-closing"); setSheet(null); }, 300);
  };
  const go = (t) => {
    if (t === tab) return;
    haptic(6); setFromFs(false);
    setDir(TABS.findIndex((x) => x.id === t) > TABS.findIndex((x) => x.id === tab) ? "r" : "l");
    setTab(t);
  };
  UI.fs = (o) => {
    clearTimeout(fsTimer.current);
    if (o && (o.t === "splash" || o.t === "calc")) { setReady(false); setTab("today"); }
    setFs(o ? { k: Date.now(), ...o } : null);
  };
  // 先播完退场，再拿掉
  UI.fsOut = () => { setFs((f) => (f ? { ...f, closing: true } : f)); clearTimeout(fsTimer.current); fsTimer.current = setTimeout(() => setFs(null), 480); };
  UI.open = openSheet; UI.close = closeSheet; UI.go = go; goRef.current = go;
  UI.toast = (t) => { setToast({ t, k: Date.now() }); clearTimeout(UI._t); UI._t = setTimeout(() => setToast(null), 2600); };
  UI.back = () => { if (fs) { if (fs.t === "cele") setFs(null); return true; } if (sheet) { closeSheet(); return true; } if (tab !== "today") { setTab("today"); return true; } return false; };

  useEffect(() => { root.classList.toggle("has-sheet", !!sheet); }, [!!sheet]);
  useEffect(() => { detectPreview().then((ok) => ok && force()); }, []);
  // 过了半夜自动换到新的一天
  useEffect(() => { const on = () => { if (!document.hidden) force(); }; document.addEventListener("visibilitychange", on); return () => document.removeEventListener("visibilitychange", on); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  // 往下滚时，顶部出现一条毛玻璃标题栏
  useEffect(() => {
    let raf = 0;
    const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; root.style.setProperty("--scr", String(Math.min(1, Math.max(0, (window.scrollY - 24) / 48)))); root.style.setProperty("--sc", String(Math.min(320, Math.max(0, window.scrollY)))); }); };
    window.addEventListener("scroll", on, { passive: true }); on();
    return () => window.removeEventListener("scroll", on);
  }, []);

  const FS = fs && FSC[fs.t];
  const fsNode = FS ? html`<${FS} key=${fs.k} ...${fs} onReveal=${() => { setFromFs(true); setReady(true); }} onDone=${() => setFs(null)} />` : null;
  if (!app.S.profile) return html`<div class="page"><div class="view" key="ob"><${Onboarding} /></div></div>${fsNode}`;
  if (!ready) return html`<div class="page"></div>${fsNode}`;
  const View = { today: Today, foods: FoodsView, records: Records, me: Me }[tab];
  const SheetC = sheet && SHEETS[sheet.t];
  const idx = TABS.findIndex((t) => t.id === tab);
  return html`
    <div class="navglass" aria-hidden="true"><b>${TITLE[tab]}</b></div>
    <div class="page"><div class=${"view dir-" + dir + (fromFs ? " from-fs" : "")} key=${tab}><${View} /></div></div>
    <nav class="tabs" aria-label="主导航"><div class="in" ref=${glassRef} data-idx=${idx}>
      <i class="lgwarp" aria-hidden="true"></i>
      <i class="thumb" style=${`transform:translateX(${idx * 100}%)`}><i class="pill" key=${"t" + idx}></i><i class="bubble" aria-hidden="true"></i></i>
      ${TABS.map((t) => html`<button id=${"tab-" + t.id} aria-current=${tab === t.id ? "page" : undefined} onClick=${(e) => { if (e.detail === 0) go(t.id); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${t.d} /></svg><span>${t.n}</span></button>`)}
      <i class="lgrim" aria-hidden="true"></i>
    </div></nav>
    ${SheetC ? html`<${SheetC} ...${sheet} onClose=${closeSheet} />` : null}
    ${toast ? html`<div class="toast" role="status" key=${toast.k}>${toast.t}</div>` : null}
    ${fsNode}`;
}

const mount = document.getElementById("app");
mount.textContent = "";
render(html`<${App} />`, mount);

// 安卓的返回键：先关面板，再回「今天」，最后才退出
try {
  const cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.App) cap.Plugins.App.addListener("backButton", () => { if (!UI.back()) cap.Plugins.App.exitApp(); });
} catch (e) {}
