// 「食物」页：勾选能吃到的食物、改价格、加自己的食物、生成采购清单
import { html, useState, useMemo, app, commit, UI, Sheet, Seg, Field, r0, yuan, qtyText, num, copyText } from "./ui.js";
import { allFoods, dateStr, addDays } from "./store.js";
import { targetsFor, dayInfo } from "./plans.js";
import { CATS, CK_LABEL, ROLE_LABEL, FOODS } from "./foods.js";
import { targetsOf, SLOTS } from "./nutrition.js";
import { makePlan } from "./planner.js";
import { aiReady, chatJSON, estimateMessages } from "./ai.js";
import { searchLib, LibRow, libSize } from "./lib.js";

export function FoodsView() {
  const S = app.S;
  const [cat, setCat] = useState("全部");
  const [q, setQ] = useState("");
  const foods = allFoods(S);
  const list = foods.filter((f) => (cat === "全部" || (cat === "已勾选" ? f.on : f.c === cat)) && (!q || f.n.includes(q.trim())));
  const nOn = foods.filter((f) => f.on).length;
  const toggle = (f) => commit((S) => {
    if (f.custom) { const c = S.custom.find((x) => x.id === f.id); if (c) c.on = !f.on; }
    else S.pantry[f.id] = { ...(S.pantry[f.id] || {}), on: !f.on };
  });
  return html`
    <div class="top"><div><h1>食物</h1><p class="sub">勾上的才会排进饭里。现在勾了 <b class="num">${nOn}</b> 样。</p></div></div>
    <button class="snapcta" id="btn-snap" onClick=${() => UI.open({ t: "snap" })}>
      <span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-1.8h5.2L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.4" r="3.6" /></svg></span>
      <span class="tx"><b>拍一下加食物</b><span>拍饭菜，AI 认出来、帮你估好</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    <button class="snapcta pack" id="btn-pack" onClick=${() => UI.open({ t: "snap", mode: "pack" })}>
      <span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M8 8h8M8 11.5h8M8 15h5M12.5 8v10" /></svg></span>
      <span class="tx"><b>拍包装加食物</b><span>拍营养成分表，照着表上的数字记</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    <div class="row">
      <button class="btn grow" id="btn-shop" onClick=${() => UI.open({ t: "shop" })}>采购清单</button>
      <button class="btn grow" id="btn-newfood" onClick=${() => UI.open({ t: "food", id: null })}>＋ 手动加食物</button>
    </div>
    <input class="inp" id="food-q" placeholder="搜食物名字" value=${q} onInput=${(e) => setQ(e.target.value)} />
    <div class="catbar">${["全部", "已勾选", ...CATS].map((c) => html`<button class="chip" aria-pressed=${String(cat === c)} onClick=${() => setCat(c)}>${c}</button>`)}</div>
    <div class="card"><div class="list">
      ${list.map((f) => html`<div class="lrow" key=${f.id}>
        <button class="main" onClick=${() => UI.open({ t: "food", id: f.id })}>
          <b>${f.n} ${f.custom ? html`<span class="tag">${f.pack ? "营养表" : f.snap ? "拍照加的" : f.ai ? "AI 加的" : f.lib ? "食物库" : "自己加的"}</span>` : null}${(f.na || 0) >= 600 ? html` <span class="tag na">高钠</span>` : null}${(f.fb || 0) >= 4 ? html` <span class="tag fb">高纤维</span>` : null}</b>
          <span class="num">每${f.u}：${r0(f.k)} 千卡　蛋白 ${f.p}g　¥${yuan(f.$)}　${f.out ? "外食" : CK_LABEL[f.ck]}</span>
        </button>
        <button class="tog" aria-label=${"勾选 " + f.n} aria-pressed=${String(!!f.on)} onClick=${() => toggle(f)}></button>
      </div>`)}
      ${!list.length ? html`<p class="muted">${q ? "你的食物里没有。看看下面的食物库，或者点上面的「拍一下加食物」。" : "没找到。点上面的「拍一下加食物」或「手动加食物」加进来。"}</p>` : null}
    </div></div>
    ${q.trim() ? html`<div class="card" id="lib-res"><h2>食物库里的 <span class="tag">${libSize()} 种 · 每 100 克</span></h2><div class="list">
      ${searchLib(q).map((x) => html`<${LibRow} key=${x.lid} x=${x} onPick=${(x) => UI.open({ t: "lib", lid: x.lid })} />`)}
      ${!searchLib(q).length ? html`<p class="muted">食物库里也没有。可以手动加，或者让 AI 估一下。</p>` : null}
    </div></div>` : null}
    <p class="tiny muted">营养数值是常见食物的典型值，不同品牌会有差别。买到的东西请以包装上的营养成分表为准，点进去就能改。</p>`;
}

const ROLES = ["staple", "protein", "veg", "fruit", "dairy", "fat"];

export function FoodSheet({ id, pre, onClose }) {
  const S = app.S;
  const cur = id ? allFoods(S).find((f) => f.id === id) : null;
  const builtin = cur && !cur.custom;
  const [f, setF] = useState(() => cur ? { ...cur, k: String(cur.k), p: String(cur.p), f: String(cur.f), cb: String(cur.cb), $: String(cur.$), na: String(cur.na || 0), fb: String(cur.fb || 0) }
    : pre ? { ...pre, k: String(pre.k), p: String(pre.p), f: String(pre.f), cb: String(pre.cb), $: "", na: String(pre.na || 0), fb: String(pre.fb || 0), on: true }
    : { n: "", u: "份", c: "主食", k: "", p: "", f: "", cb: "", $: "", na: "", fb: "", ck: 0, r: "staple", s: "ld", on: true });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const set = (p) => { setF({ ...f, ...p }); setErr(""); };
  const flip = (ch) => set({ s: f.s.includes(ch) ? f.s.replace(ch, "") : f.s + ch });
  const save = () => {
    const v = { k: num(f.k), p: num(f.p), f: num(f.f), cb: num(f.cb), $: num(f.$) };
    const extra = { na: num(f.na, 0), fb: num(f.fb, 0) };
    if (!f.n.trim()) return setErr("请填名字");
    if (!(extra.na >= 0 && extra.na <= 20000 && extra.fb >= 0 && extra.fb <= 100)) return setErr("钠和膳食纤维请填数字（不知道就留空）");
    Object.assign(v, extra);
    if (Object.values(v).some((x) => !(x >= 0))) return setErr("热量、蛋白、脂肪、碳水、价格都要填数字（没有就填 0）");
    if (!f.s) return setErr("至少选一餐");
    commit((S) => {
      if (builtin) S.pantry[id] = { ...(S.pantry[id] || {}), ...v, on: f.on };
      else {
        const rec = { id: id || (pre && pre.id) || "u" + Date.now().toString(36), n: f.n.trim(), u: f.u.trim() || "份", c: f.c, ...v, ck: f.ck, r: f.r, s: f.s, on: f.on, out: f.c === "食堂外食",
          ...(cur && cur.snap ? { snap: true } : {}), ...(cur && cur.pack ? { pack: true } : {}), ...((cur && cur.lib) || (pre && pre.lib) ? { lib: true } : {}), ...(cur && cur.ai ? { ai: true } : {}) };
        const i = S.custom.findIndex((x) => x.id === rec.id);
        if (i >= 0) S.custom[i] = rec; else S.custom.push(rec);
      }
    });
    UI.toast("已保存"); onClose();
  };
  const reset = () => { commit((S) => { const on = (S.pantry[id] || {}).on; S.pantry[id] = on === undefined ? {} : { on }; }); UI.toast("已恢复默认数值"); onClose(); };
  const del = () => {
    commit((S) => {
      S.custom = S.custom.filter((x) => x.id !== id);
      for (const d in S.days) { const pl = S.days[d].plan; if (pl) for (const s of SLOTS) pl.meals[s] = pl.meals[s].filter((it) => it.id !== id); }
    });
    UI.toast("已删除"); onClose();
  };
  const estimate = async () => {
    if (!f.n.trim()) return setErr("先填名字，AI 才知道估什么");
    setBusy(true); setNote("");
    try {
      const r = await chatJSON(S, estimateMessages(f.n.trim(), f.u.trim()));
      const g = (x) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? String(Math.round(Number(x) * 10) / 10) : "");
      set({ k: g(r.k), p: g(r.p), f: g(r.f), cb: g(r.cb), na: g(r.na), fb: g(r.fb) });
      setNote("AI 估的：" + (typeof r.note === "string" ? r.note.slice(0, 120) : "") + " 有包装的话请以包装为准。");
    } catch (e) { setErr(e.message || "AI 暂时用不了"); }
    finally { setBusy(false); }
  };
  return html`<${Sheet} title=${cur ? cur.n : "自己加食物"} onClose=${onClose}>
    ${cur ? null : html`<button class="pkghint" id="fd-pack" onClick=${() => UI.open({ t: "snap", mode: "pack" })}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M8 8h8M8 11.5h8M8 15h5M12.5 8v10" /></svg>
      <span>有包装的食品，不同牌子成分差很多，<b>拍营养成分表</b>直接照着表记，比手填准。</span></button>`}
    <div class="card stack">
      ${builtin ? null : html`<${Field} id="fd-name" label="名字" value=${f.n} onInput=${(v) => set({ n: v })} placeholder="例如：XX 牌鸡胸肉肠" />
        <div class="grid2">
          <${Field} id="fd-unit" label="一个单位是多少" value=${f.u} onInput=${(v) => set({ u: v })} placeholder="例如：根(60g)" />
          <label class="field">分类<select value=${f.c} onChange=${(e) => set({ c: e.target.value })}>${CATS.map((c) => html`<option value=${c}>${c}</option>`)}</select></label>
        </div>`}
      <div class="grid2">
        <${Field} id="fd-k" label=${"每" + (f.u || "份") + " 热量（千卡）"} mode="decimal" value=${f.k} onInput=${(v) => set({ k: v })} />
        <${Field} id="fd-p" label="蛋白质（g）" mode="decimal" value=${f.p} onInput=${(v) => set({ p: v })} />
        <${Field} id="fd-f" label="脂肪（g）" mode="decimal" value=${f.f} onInput=${(v) => set({ f: v })} />
        <${Field} id="fd-cb" label="碳水（g）" mode="decimal" value=${f.cb} onInput=${(v) => set({ cb: v })} />
        <${Field} id="fd-na" label="钠（mg）" mode="decimal" value=${f.na} onInput=${(v) => set({ na: v })} placeholder="包装上写的「钠」" />
        <${Field} id="fd-fb" label="膳食纤维（g）" mode="decimal" value=${f.fb} onInput=${(v) => set({ fb: v })} placeholder="没写就留空" />
      </div>
      <${Field} id="fd-price" label=${"每" + (f.u || "份") + " 价格（元）"} mode="decimal" value=${f.$} onInput=${(v) => set({ $: v })} />
      ${!builtin && aiReady(S) ? html`<button class="btn" id="fd-ai" disabled=${busy} onClick=${estimate}>${busy ? "AI 正在估…" : "不知道营养？让 AI 估一下"}</button>` : null}
      ${note ? html`<div class="note ai">${note}</div>` : null}
      ${builtin ? null : html`
        <div class="field">吃之前要怎么处理
          <${Seg} value=${f.ck} onChange=${(v) => set({ ck: v })} options=${CK_LABEL.map((n, v) => ({ v, n }))} /></div>
        <div class="field">它算哪一类
          <div class="chips">${ROLES.map((r) => html`<button class="chip" aria-pressed=${String(f.r === r)} onClick=${() => set({ r })}>${ROLE_LABEL[r]}</button>`)}</div></div>
        <div class="field">适合哪几餐
          <div class="chips">${[["b", "早餐"], ["l", "午餐"], ["d", "晚餐"], ["s", "加餐"]].map(([ch, n]) => html`<button class="chip" aria-pressed=${String(f.s.includes(ch))} onClick=${() => flip(ch)}>${n}</button>`)}</div></div>`}
      <label class="switch"><span>排餐时可以用它</span><input type="checkbox" checked=${f.on} onChange=${(e) => set({ on: e.target.checked })} /></label>
    </div>
    ${err ? html`<div class="note bad" role="alert">${err}</div>` : null}
    <div class="row">
      ${builtin ? html`<button class="btn" onClick=${reset}>恢复默认数值</button>` : null}
      ${cur && !builtin ? html`<button class="btn danger" id="fd-del" onClick=${del}>删除</button>` : null}
      <button class="btn primary grow" id="fd-save" onClick=${save}>保存</button>
    </div>
  <//>`;
}

export function ShopSheet({ onClose }) {
  const S = app.S;
  const [days, setDays] = useState(7);
  const res = useMemo(() => {
    const foods = allFoods(S).filter((f) => f.on);
    const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
    const need = {};
    const today = dateStr();
    let prev = null;
    for (let i = 0; i < days; i++) {
      const avoid = {};
      for (const s of SLOTS) avoid[s] = new Set(prev ? prev[s].map((it) => it.id) : []);
      const d = addDays(today, i), info = dayInfo(S, d);
      const pl = makePlan({ foods, T: targetsFor(S, d, {}), modes: S.prefs.modes, budget: S.prefs.budget, snack: S.prefs.snack, seed: 1000 + i * 77 + days, avoid, skip: info.skip, plate: info.plate });
      prev = pl.meals;
      for (const s of SLOTS) for (const it of pl.meals[s]) need[it.id] = (need[it.id] || 0) + it.qty;
    }
    const rows = Object.entries(need).map(([id, q]) => ({ f: byId[id], q })).filter((r) => !r.f.out).sort((a, b) => CATS.indexOf(a.f.c) - CATS.indexOf(b.f.c));
    const outCost = Object.entries(need).filter(([id]) => byId[id].out).reduce((a, [id, q]) => a + byId[id].$ * q, 0);
    return { rows, buy: rows.reduce((a, r) => a + r.f.$ * r.q, 0), outCost };
  }, [days]);
  const text = `饭票采购清单（${days} 天）\n` + res.rows.map((r) => `□ ${r.f.n} ${qtyText(r.q)} ${r.f.u}  约 ¥${yuan(r.f.$ * r.q)}`).join("\n") + `\n合计约 ¥${yuan(res.buy)}`;
  return html`<${Sheet} title="采购清单" onClose=${onClose}>
    <${Seg} value=${days} onChange=${setDays} options=${[{ v: 3, n: "3 天" }, { v: 7, n: "7 天" }, { v: 14, n: "14 天" }]} />
    <p class="small muted">按你平时的吃法和勾选的食物，先排出 ${days} 天的饭，再汇总要买多少。实际每天排的会有变化，这是大约的量。</p>
    <div class="card"><div class="list">
      ${res.rows.map((r) => html`<div class="lrow"><div class="main"><b>${r.f.n}</b><span>${r.f.c}</span></div>
        <div class="side num"><b style="color:var(--ink)">${qtyText(r.q)} ${r.f.u}</b><br />约 ¥${yuan(r.f.$ * r.q)}</div></div>`)}
    </div></div>
    <div class="card">
      <div class="kv"><span>要买的东西合计</span><b class="num" id="shop-total">¥${yuan(res.buy)}</b></div>
      ${res.outCost > 0 ? html`<div class="kv"><span>另外，在食堂和外面吃大约</span><b class="num">¥${yuan(res.outCost)}</b></div>` : null}
      <div class="kv"><span>平均每天</span><b class="num">¥${yuan((res.buy + res.outCost) / days)}</b></div>
    </div>
    <button class="btn primary block" onClick=${async () => UI.toast((await copyText(text)) ? "已复制，可以粘贴到备忘录" : "复制失败，请手动抄一下")}>复制清单</button>
  <//>`;
}
