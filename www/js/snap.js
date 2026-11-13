// 拍一下加食物：拍照或选图 → AI 认出是什么、估营养 → 勾选后加进食物库，也可以顺手记到今天哪一餐
import { html, useState, useRef, useEffect, app, commit, UI, Sheet, Seg, Field, r0, yuan, num } from "./ui.js";
import { allFoods, dateStr, dayOf } from "./store.js";
import { CATS, CK_LABEL, ROLE_LABEL } from "./foods.js";
import { SLOT_NAME } from "./nutrition.js";
import { visionReady, visionWhy, visionJSON, snapPrompt, sanitizeSnap } from "./ai.js";
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

function Scan({ img, onStop }) {
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

function ItemCard({ it, i, on, toggle, edit, open, setOpen }) {
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

export function SnapSheet({ slot: slot0, onClose }) {
  const S = app.S;
  const [phase, setPhase] = useState("pick"); // pick | scan | result
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
  const stop = () => { if (ctl.current) ctl.current.abort(); };
  const edit = (i) => (patch) => setRes({ ...res, items: res.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const n = sel.filter(Boolean).length;
  const save = () => {
    const picked = res.items.filter((_, i) => sel[i]);
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
        S.custom.push({ id, n: x.n.trim(), u: x.u.trim() || "份", c: x.c, k: x.k, p: x.p, f: x.f, cb: x.cb, na: x.na, fb: x.fb, $: x.$, ck: x.ck, r: x.r, s: x.s, on: true, out: x.out, snap: true });
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

  return html`<${Sheet} title="拍一下加食物" onClose=${onClose}>
    ${phase === "pick" ? html`<div class="snaphero">
        <div class="lens" aria-hidden="true"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><span>${CAM}</span></div>
        <p>拍一盘饭菜、一个包装，或者包装背面的<b>营养成分表</b>，AI 会认出是什么、估出热量和蛋白。</p>
      </div>
      ${ready ? html`<div class="row">
          <button class="btn primary grow icon" id="snap-cam" onClick=${() => go(true)}>${CAM}拍照</button>
          <button class="btn grow icon" id="snap-pick" onClick=${() => go(false)}>${PIC}从相册选</button>
        </div>
        <p class="tiny muted">小技巧：从正上方拍，光线亮一点，一张图里别超过 6 样。拍营养成分表最准。</p>`
      : html`<div class="note warn" id="snap-why">${visionWhy(S)}</div>
        <button class="btn primary block" onClick=${() => UI.open({ t: "aiset" })}>去 AI 设置</button>`}
      ${err ? html`<div class="note bad" role="alert" id="snap-err">${err}</div>` : null}` : null}

    ${phase === "scan" ? html`<${Scan} img=${img} onStop=${stop} />` : null}

    ${phase === "result" ? html`<div class="snapres">
      <div class="thumbrow"><img src=${img.url} alt="你拍的照片" /><div>
        <b>${res.items.length ? `认出 ${res.items.length} 样` : "没认出食物"}</b>
        ${res.note ? html`<span class="small muted">${res.note}</span>` : null}</div></div>
      ${res.items.length ? html`
        <div class="stack" id="snap-items">${res.items.map((it, i) => html`<${ItemCard} key=${i} it=${it} i=${i} on=${sel[i]} open=${open === i} setOpen=${setOpen}
          toggle=${() => { setSel(sel.map((v, j) => (j === i ? !v : v))); haptic(5); }} edit=${edit(i)} />`)}</div>
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
        ${res.items.length ? html`<button class="btn primary grow" id="snap-add" ref=${addRef} disabled=${!n} onClick=${save}>${n ? `加入 ${n} 样` : "先勾一样"}</button>` : null}
      </div>
    </div>` : null}
  <//>`;
}
