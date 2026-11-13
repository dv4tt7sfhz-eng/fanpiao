// 拍一下加食物：拍照或选图 → AI 认出是什么、估营养 → 勾选后加进食物库，也可以顺手记到今天哪一餐
import { html, useState, useRef, useEffect, app, commit, UI, Sheet, Seg, Field, r0, yuan, num } from "./ui.js";
import { allFoods, dateStr, dayOf } from "./store.js";
import { CATS, CK_LABEL, ROLE_LABEL } from "./foods.js";
import { SLOT_NAME } from "./nutrition.js";
import { visionReady, visionWhy, visionJSON, snapPrompt, sanitizeSnap, packPrompt, sanitizePack, packToItem, packUnit } from "./ai.js";
import { haptic, burst } from "./fx.js";
import { replanLocal } from "./today.js";

// 让用户选照片。camera=true 时直接打开相机
export function pickPhoto(camera) {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    if (camera) inp.setAttribute("capture", "environment");
    inp.style.cssText = "position:fixed;left:-9999px;opacity:0";
    inp.onchange = () => { resolve(inp.files && inp.files[0] ? inp.files[0] : null); inp.remove(); };
    inp.oncancel = () => { resolve(null); inp.remove(); };
    document.body.appendChild(inp);
    inp.click();
  });
}

// 把照片缩到长边 1024，转成 jpeg，几百 KB 以内，省流量也省 AI 费用
export async function shrink(file, max = 1024) {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("这张图片打不开，换一张试试")); i.src = src; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
    const url = cv.toDataURL("image/jpeg", 0.82);
    const blob = await new Promise((ok) => cv.toBlob((b) => ok(b), "image/jpeg", 0.82));
    return { url, blob, w, h };
  } finally { URL.revokeObjectURL(src); }
}

const CAM = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-1.8h5.2L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.4" r="3.6" /></svg>`;
const PIC = html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19.5 17" /></svg>`;

const LINES = ["正在看照片…", "在找盘子里有什么…", "在估份量…", "在算热量和蛋白…"];
const PLINES = ["正在找营养成分表…", "在一格一格读数字…", "在把千焦换成千卡…", "在核对数字对不对得上…"];
const TABLE = html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M8 8h8M8 11.5h8M8 15h5M12.5 8v10" /></svg>`;

function Scan({ img, onStop, lines = LINES }) {
  const LINES = lines;
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 1600); return () => clearInterval(t); }, []);
  return html`<div class="snapscan" id="snap-scan">
    <div class="shot" style=${`aspect-ratio:${img.w}/${img.h}`}>
      <img src=${img.url} alt="你拍的照片" />
      <i class="grid"></i><i class="beam"></i>
      <i class="cn c1"></i><i class="cn c2"></i><i class="cn c3"></i><i class="cn c4"></i>
      ${[[28, 34], [66, 28], [44, 58], [76, 64], [22, 72], [56, 44]].map(([x, y], k) => html`<i class="dot" style=${`--k:${k};left:${x}%;top:${y}%`}></i>`)}
    </div>
    <p class="scantext" key=${i}>${LINES[i]}</p>
    <button class="btn block" id="snap-stop" onClick=${onStop}>停止</button>
  </div>`;
}

function ItemCard({ it, i, on, toggle, edit, open, setOpen, onPack }) {
  const lib = it.match ? app.byId[it.match] : null;
  const k = lib ? lib.k : it.k, p = lib ? lib.p : it.p, na = (lib ? lib.na : it.na) || 0, fb = (lib ? lib.fb : it.fb) || 0;
  return html`<div class=${"snapitem" + (on ? " on" : "")} style=${`--j:${i}`}>
    <div class="top">
      <button class="tog" aria-label=${"选中 " + it.n} aria-pressed=${String(on)} onClick=${toggle}></button>
      <div class="main">
        <b>${lib ? lib.n : it.n}${lib ? html` <span class="tag">食物库里有</span>` : it.label ? html` <span class="tag">读的营养表</span>` : it.sure < 0.5 ? html` <span class="tag warn">不太确定</span>` : null}</b>
        <span class="num">约 ${it.qty} ${lib ? lib.u : it.u}　·　${r0(k * it.qty)} 千卡　蛋白 ${r0(p * it.qty)}g</span>
        <span class="nfmini sm"><span class=${na * it.qty >= 600 ? "hi" : ""}><i class="d na"></i>钠 <b class="num">${r0(na * it.qty)}</b> mg</span><span class=${fb * it.qty >= 4 ? "good" : ""}><i class="d fb"></i>纤维 <b class="num">${Math.round(fb * it.qty * 10) / 10}</b> g</span></span>
      </div>
      ${lib ? null : html`<button class="btn sm" onClick=${() => setOpen(open ? -1 : i)}>${open ? "收起" : "改"}</button>`}
    </div>
    ${it.pkg && !lib ? html`<button class="pkghint" onClick=${onPack}>${TABLE}<span>这是包装食品，不同牌子差很多。<b>拍它的营养成分表</b>，数字才准</span></button>` : null}
    ${open && !lib ? html`<div class="edit stack">
      <div class="grid2">
        <${Field} label="名字" value=${it.n} onInput=${(v) => edit({ n: v })} />
        <${Field} label="一个单位" value=${it.u} onInput=${(v) => edit({ u: v })} />
        <${Field} label="照片里几个单位" mode="decimal" value=${String(it.qty)} onInput=${(v) => edit({ qty: num(v, 1) })} />
        <${Field} label="每单位价格（元）" mode="decimal" value=${String(it.$)} onInput=${(v) => edit({ $: num(v, 0) })} />
        <${Field} label="每单位千卡" mode="decimal" value=${String(it.k)} onInput=${(v) => edit({ k: num(v, 0) })} />
        <${Field} label="蛋白质 g" mode="decimal" value=${String(it.p)} onInput=${(v) => edit({ p: num(v, 0) })} />
        <${Field} label="脂肪 g" mode="decimal" value=${String(it.f)} onInput=${(v) => edit({ f: num(v, 0) })} />
        <${Field} label="碳水 g" mode="decimal" value=${String(it.cb)} onInput=${(v) => edit({ cb: num(v, 0) })} />
        <${Field} label="钠 mg" mode="decimal" value=${String(it.na)} onInput=${(v) => edit({ na: num(v, 0) })} />
        <${Field} label="膳食纤维 g" mode="decimal" value=${String(it.fb)} onInput=${(v) => edit({ fb: num(v, 0) })} />
      </div>
      <label class="field">分类<select value=${it.c} onChange=${(e) => edit({ c: e.target.value })}>${CATS.map((c) => html`<option value=${c}>${c}</option>`)}</select></label>
      <span class="tiny muted">${ROLE_LABEL[it.r]} · ${it.out ? "外食" : CK_LABEL[it.ck]} · 适合${[...it.s].map((c) => SLOT_NAME[c]).join("、")}　价格是 AI 猜的，按你实际买的改。</span>
    </div>` : null}
  </div>`;
}


// 包装：把读到的营养成分表摆成和包装上一样的表，方便对照照片检查；每一格都能改
const ROWS = [["kcal", "能量", "千卡"], ["p", "蛋白质", "g"], ["f", "脂肪", "g"], ["cb", "碳水化合物", "g"], ["na", "钠", "mg"], ["fb", "膳食纤维", "g"]];
function PackCard({ t, set, warn, shots }) {
  const { u, k } = packUnit(t);
  const head = t.basis === "serving" ? `每份(${t.basisAmt}${t.unitOf})` : `每100${t.unitOf}`;
  const v = (key) => (key === "na" || key === "kcal" ? Math.round(t[key] * k) : Math.round(t[key] * k * 10) / 10);
  return html`<div class="packcard" id="pack-card">
    <div class="pshots">${shots.map((x, i) => html`<img src=${x.url} alt=${i ? "包装正面" : "营养成分表"} style=${`--j:${i}`} />`)}</div>
    <${Field} label="名字" value=${t.name} onInput=${(x) => set({ name: x })} />
    <div class="ptable" role="table" aria-label="营养成分表">
      <div class="ph" role="row"><span role="columnheader">项目</span><span role="columnheader">${head}</span><span role="columnheader">${t.whole && t.net ? `一${t.form}(${t.net}${t.unitOf})` : `100${t.unitOf}`}</span></div>
      ${ROWS.map(([key, n, unit], i) => html`<div class=${"pr" + (key === "fb" && !t.fbListed ? " dim" : "")} role="row" style=${`--j:${i}`}>
        <span role="cell">${n}${key === "kcal" && t.kj != null ? html`<small>表上 ${t.kj} kJ</small>` : null}${key === "fb" && !t.fbListed ? html`<small>表上没写</small>` : null}</span>
        <span role="cell"><input class="num" id=${"pk-" + key} type="text" inputmode="decimal" aria-label=${n + " " + head} value=${String(t[key])}
          onInput=${(e) => set({ [key]: num(e.target.value, 0), ...(key === "fb" ? { fbListed: true } : {}) })} /><em>${unit}</em></span>
        <span role="cell" class="num">${v(key)}<em>${unit}</em></span>
      </div>`)}
    </div>
    ${warn.map((w) => html`<div class="note warn" role="alert">${w}</div>`)}
    <div class="grid2">
      <${Field} label=${"净含量（" + t.unitOf + "）"} mode="decimal" value=${t.net == null ? "" : String(t.net)} onInput=${(x) => { const n = num(x, 0); set({ net: n || null, whole: !!n && n <= 1000 }); }} />
      <${Field} label=${t.whole ? "一" + t.form + "多少钱" : "一整包多少钱"} mode="decimal" value=${String(t.price)} onInput=${(x) => set({ price: num(x, 0) })} />
    </div>
    ${t.net ? html`<div class="field">记的时候按
      <${Seg} id="pack-unit" value=${t.whole ? "w" : "h"} onChange=${(x) => set({ whole: x === "w" })} options=${[{ v: "w", n: `一${t.form}(${t.net}${t.unitOf})` }, { v: "h", n: `100${t.unitOf}` }]} /></div>` : null}
    <span class="tiny muted">食物库里一个单位是「${u}」。</span>
  </div>`;
}

export function SnapSheet({ slot: slot0, mode: mode0, onClose }) {
  const S = app.S;
  const [mode, setMode] = useState(mode0 === "pack" ? "pack" : "meal"); // meal 饭菜 | pack 包装
  const [phase, setPhase] = useState("pick"); // pick | front(包装：问要不要拍正面) | scan | result
  const [shots, setShots] = useState([]);
  const [pk, setPk] = useState(null); // 包装读到的表
  const [img, setImg] = useState(null);
  const [res, setRes] = useState(null);
  const [sel, setSel] = useState([]);
  const [open, setOpen] = useState(-1);
  const [slot, setSlot] = useState(slot0 || "");
  const [ate, setAte] = useState(true);
  const [err, setErr] = useState("");
  const ctl = useRef(null);
  const addRef = useRef(null);
  const foods = allFoods(S);
  app.byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const ready = visionReady(S);
  useEffect(() => () => ctl.current && ctl.current.abort(), []);

  const go = async (camera) => {
    setErr("");
    const file = await pickPhoto(camera);
    if (!file) return;
    let im;
    try { im = await shrink(file); } catch (e) { return setErr(e.message); }
    setImg(im); setPhase("scan"); haptic(6);
    ctl.current = new AbortController();
    try {
      const raw = await visionJSON(app.S, snapPrompt(foods), im, ctl.current.signal);
      const r = sanitizeSnap(raw, app.byId);
      setRes(r); setSel(r.items.map(() => true)); setOpen(-1); setPhase("result");
      if (r.items.length) haptic(12);
    } catch (e) {
      setPhase("pick");
      if (e.code !== "cancelled") setErr(e.message || "AI 暂时用不了，过一会儿再试");
    }
  };
  // 包装：第 1 张营养成分表，第 2 张正面（可以不拍）
  const packShot = async (camera) => {
    setErr("");
    const file = await pickPhoto(camera);
    if (!file) return;
    let im;
    try { im = await shrink(file, 1400); } catch (e) { return setErr(e.message); }
    const list = phase === "front" ? [shots[0], im] : [im];
    setShots(list); haptic(6);
    if (list.length === 1) { setPhase("front"); return; }
    readPack(list);
  };
  const readPack = async (list) => {
    setImg(list[0]); setPhase("scan");
    ctl.current = new AbortController();
    try {
      const raw = await visionJSON(app.S, packPrompt(list.length > 1), list, ctl.current.signal);
      const r = sanitizePack(raw);
      setPk(r); setPhase("result");
      haptic(r.ok ? 12 : 6);
    } catch (e) {
      setPhase(list.length > 1 ? "front" : "pick");
      if (e.code !== "cancelled") setErr(e.message || "AI 暂时用不了，过一会儿再试");
    }
  };
  const switchMode = (m) => { setMode(m); setPhase("pick"); setShots([]); setPk(null); setErr(""); };
  const stop = () => { if (ctl.current) ctl.current.abort(); };
  const edit = (i) => (patch) => setRes({ ...res, items: res.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const n = sel.filter(Boolean).length;
  const save = (packed) => {
    const picked = packed || res.items.filter((_, i) => sel[i]);
    if (!picked.length) return setErr("至少勾一样");
    if (picked.some((x) => !x.match && !x.n.trim())) return setErr("有一样没有名字，点「改」填一下");
    let added = 0;
    // 今天还没排过饭，先排一份，再把拍到的加进去
    if (slot && !(S.days[dateStr()] && S.days[dateStr()].plan)) { try { replanLocal(false); } catch (e) {} }
    commit((S) => {
      const ids = picked.map((x, i) => {
        if (x.match) {
          if (S.custom.some((c) => c.id === x.match)) { const c = S.custom.find((c) => c.id === x.match); c.on = true; }
          else S.pantry[x.match] = { ...(S.pantry[x.match] || {}), on: true };
          return x.match;
        }
        const id = "u" + Date.now().toString(36) + i;
        S.custom.push({ id, n: x.n.trim(), u: x.u.trim() || "份", c: x.c, k: x.k, p: x.p, f: x.f, cb: x.cb, na: x.na, fb: x.fb, $: x.$, ck: x.ck, r: x.r, s: x.s, on: true, out: x.out, snap: true, ...(x.pack ? { pack: true } : {}) });
        added++;
        return id;
      });
      if (slot) {
        const day = dayOf(S, dateStr());
        if (!day.plan) day.plan = { meals: { b: [], l: [], d: [], s: [] } };
        picked.forEach((x, i) => {
          const arr = day.plan.meals[slot];
          const hit = arr.find((y) => y.id === ids[i]);
          // 原来计划里就有、还没吃：按照片里的量算，打勾；已经吃过一次了：再加上这次的量
          if (hit && ate && !hit.done) { hit.qty = x.qty; hit.done = true; }
          else if (hit) hit.qty = Math.round((hit.qty + x.qty) * 2) / 2;
          else arr.push({ id: ids[i], qty: x.qty, done: ate });
        });
      }
    });
    haptic(15);
    if (addRef.current) burst(addRef.current);
    const where = slot ? `，并记到今天${SLOT_NAME[slot]}` : "";
    UI.toast(added ? `加进食物库 ${added} 样${where}` : `已经在食物库里了${where}`);
    setTimeout(onClose, 260);
  };

  return html`<${Sheet} title=${mode === "pack" ? "拍包装加食物" : "拍一下加食物"} onClose=${onClose}>
    ${phase === "pick" || phase === "front" ? html`<${Seg} id="snap-mode" value=${mode} onChange=${switchMode} options=${[{ v: "meal", n: "饭菜" }, { v: "pack", n: "包装食品" }]} />` : null}
    ${mode === "meal" && phase === "pick" ? html`<div class="snaphero">
        <div class="lens" aria-hidden="true"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><span>${CAM}</span></div>
        <p>拍一盘饭菜、食堂打的饭，AI 会认出是什么、估出热量和蛋白。<br />有包装的食品请切到上面的<b>「包装食品」</b>。</p>
      </div>
      ${ready ? html`<div class="row">
          <button class="btn primary grow icon" id="snap-cam" onClick=${() => go(true)}>${CAM}拍照</button>
          <button class="btn grow icon" id="snap-pick" onClick=${() => go(false)}>${PIC}从相册选</button>
        </div>
        <p class="tiny muted">小技巧：从正上方拍，光线亮一点，一张图里别超过 6 样。</p>`
      : html`<div class="note warn" id="snap-why">${visionWhy(S)}</div>
        <button class="btn primary block" onClick=${() => UI.open({ t: "aiset" })}>去 AI 设置</button>`}
      ${err ? html`<div class="note bad" role="alert" id="snap-err">${err}</div>` : null}` : null}


    ${mode === "pack" && phase === "pick" ? html`<div class="snaphero pack">
        <div class="lens" aria-hidden="true"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><span>${TABLE}</span></div>
        <p>不同牌子的成分差很多，所以包装食品<b>只认包装上的营养成分表</b>，照着表上的数字记，不靠猜。</p>
      </div>
      ${ready ? html`<ol class="packsteps">
          <li class="on"><b>拍背面的「营养成分表」</b><span>整张表拍进去，拍正、拍清楚，别反光</span></li>
          <li><b>再拍正面</b><span>可以不拍。拍了名字和净含量更准</span></li>
        </ol>
        <div class="row">
          <button class="btn primary grow icon" id="pack-cam" onClick=${() => packShot(true)}>${CAM}拍营养成分表</button>
          <button class="btn grow icon" id="pack-pick" onClick=${() => packShot(false)}>${PIC}从相册选</button>
        </div>`
      : html`<div class="note warn" id="snap-why">${visionWhy(S)}</div>
        <button class="btn primary block" onClick=${() => UI.open({ t: "aiset" })}>去 AI 设置</button>`}
      ${err ? html`<div class="note bad" role="alert" id="snap-err">${err}</div>` : null}` : null}

    ${mode === "pack" && phase === "front" ? html`<div class="stack" id="pack-front">
        <div class="thumbrow"><img src=${shots[0].url} alt="营养成分表" /><div><b>营养成分表拍好了</b><span class="small muted">要不要再拍一张正面？名字和净含量会更准。</span></div></div>
        <ol class="packsteps"><li class="done"><b>营养成分表</b><span>拍好了</span></li><li class="on"><b>再拍正面</b><span>可以跳过</span></li></ol>
        <div class="row">
          <button class="btn grow icon" id="front-cam" onClick=${() => packShot(true)}>${CAM}拍正面</button>
          <button class="btn grow icon" id="front-pick" onClick=${() => packShot(false)}>${PIC}相册</button>
        </div>
        <button class="btn primary block" id="pack-read" onClick=${() => readPack([shots[0]])}>跳过，直接读表</button>
        <button class="btn block" id="pack-redo" onClick=${() => { setShots([]); setPhase("pick"); }}>重拍营养成分表</button>
        ${err ? html`<div class="note bad" role="alert" id="snap-err">${err}</div>` : null}
      </div>` : null}

    ${mode === "pack" && phase === "result" ? html`<div class="snapres">
      ${pk.ok ? html`
        <${PackCard} t=${pk.t} set=${(patch) => setPk({ ...pk, t: { ...pk.t, ...patch } })} warn=${pk.warn} shots=${shots} />
        ${pk.note ? html`<p class="small muted">${pk.note}</p>` : null}
        <div class="card stack">
          <div class="field">顺手记到今天
            <${Seg} id="snap-slot" value=${slot} onChange=${setSlot} options=${[{ v: "", n: "不记" }, { v: "b", n: "早" }, { v: "l", n: "午" }, { v: "d", n: "晚" }, { v: "s", n: "加餐" }]} /></div>
          ${slot ? html`<label class="switch"><span>已经吃了（直接打勾）</span><input type="checkbox" id="snap-ate" checked=${ate} onChange=${(e) => setAte(e.target.checked)} /></label>` : null}
        </div>
        <p class="tiny muted">数字是照着你拍的营养成分表读的。先对照照片看一眼，有不对的直接点格子改。</p>`
      : html`<div class="thumbrow"><img src=${shots[0].url} alt="你拍的照片" /><div><b>没看到营养成分表</b>
          <span class="small muted">${pk.note || "请拍包装背面那张写着「营养成分表」的表格，整张拍进去。"}</span></div></div>`}
      ${err ? html`<div class="note bad" role="alert">${err}</div>` : null}
      <div class="row">
        <button class="btn" id="snap-again" onClick=${() => { setShots([]); setPhase("pick"); setErr(""); }}>重拍</button>
        ${pk.ok ? html`<button class="btn primary grow" id="pack-add" ref=${addRef} onClick=${() => { if (!pk.t.name.trim()) return setErr("名字不能空着"); save([packToItem(pk.t)]); }}>加入食物库</button>` : null}
      </div>
    </div>` : null}
    ${phase === "scan" ? html`<${Scan} img=${img} onStop=${stop} lines=${mode === "pack" ? PLINES : LINES} />` : null}

    ${mode === "meal" && phase === "result" ? html`<div class="snapres">
      <div class="thumbrow"><img src=${img.url} alt="你拍的照片" /><div>
        <b>${res.items.length ? `认出 ${res.items.length} 样` : "没认出食物"}</b>
        ${res.note ? html`<span class="small muted">${res.note}</span>` : null}</div></div>
      ${res.items.length ? html`
        <div class="stack" id="snap-items">${res.items.map((it, i) => html`<${ItemCard} key=${i} it=${it} i=${i} on=${sel[i]} open=${open === i} setOpen=${setOpen}
          toggle=${() => { setSel(sel.map((v, j) => (j === i ? !v : v))); haptic(5); }} edit=${edit(i)} onPack=${() => switchMode("pack")} />`)}</div>
        <div class="card stack">
          <div class="field">顺手记到今天
            <${Seg} id="snap-slot" value=${slot} onChange=${setSlot} options=${[{ v: "", n: "不记" }, { v: "b", n: "早" }, { v: "l", n: "午" }, { v: "d", n: "晚" }, { v: "s", n: "加餐" }]} /></div>
          ${slot ? html`<label class="switch"><span>已经吃了（直接打勾）</span><input type="checkbox" id="snap-ate" checked=${ate} onChange=${(e) => setAte(e.target.checked)} /></label>` : null}
        </div>
        <p class="tiny muted">数字是 AI 根据照片估的，可能差 20% 左右。有包装的话，以包装上的营养成分表为准。</p>`
      : html`<p class="muted">换个角度、离近一点再拍一张试试。</p>`}
      ${err ? html`<div class="note bad" role="alert">${err}</div>` : null}
      <div class="row">
        <button class="btn" id="snap-again" onClick=${() => { setPhase("pick"); setErr(""); }}>重拍</button>
        ${res.items.length ? html`<button class="btn primary grow" id="snap-add" ref=${addRef} disabled=${!n} onClick=${() => save()}>${n ? `加入 ${n} 样` : "先勾一样"}</button>` : null}
      </div>
    </div>` : null}
  <//>`;
}
