// 「我的」页：资料和目标、AI 设置、云端（预留）、数据、说明
import { html, useState, app, commit, UI, Sheet, Seg, Field, num, copyText, MODE } from "./ui.js";
import { planOf } from "./plans.js";
import { targetsOf, GOALS, ACTIVITY } from "./nutrition.js";
import { BasicForm, LifeForm, toProfile, checkProfile } from "./onboarding.js";
import { PROVIDERS, providerOf, chatJSON, hasPreviewAI, aiReady } from "./ai.js";
import { cloud, exportable } from "./api.js";
import { blank, wipe, save } from "./store.js";

export const VERSION = "1.8.0";

export function Me() {
  const S = app.S, p = S.profile, T = targetsOf(p);
  const prov = providerOf(S.ai.provider);
  const aiState = S.ai.provider === "server" ? (S.cloud.token ? "用我的服务器" : "服务器未登录") : S.ai.key ? prov.n + "　已填密钥" : hasPreviewAI() ? "预览版：用 Claude 试用" : "未接入";
  return html`
    <div class="top"><div><h1>我的</h1></div></div>
    <div class="card">
      <h2>我的资料和目标</h2>
      <div class="kv"><span>基本情况</span><b>${p.sex === "f" ? "女" : "男"}　${p.age} 岁　${p.height} cm　${p.weight} kg</b></div>
      <div class="kv"><span>目标</span><b>${GOALS[T.goal].n}　${(ACTIVITY.find((a) => a.v === p.activity) || ACTIVITY[1]).n}</b></div>
      <div class="kv"><span>每天热量</span><b class="num">${T.kcal} 千卡${p.kcalOverride > 800 ? "（自己定的）" : ""}</b></div>
      <div class="kv"><span>蛋白 / 脂肪 / 碳水</span><b class="num">${T.protein} / ${T.fat} / ${T.carb} g</b></div>
      <div class="kv"><span>每天预算</span><b class="num">${S.prefs.budget > 0 ? "¥" + S.prefs.budget : "不限"}</b></div>
      <div class="kv"><span>三餐</span><b>${["b", "l", "d"].map((k) => MODE[S.prefs.modes[k]].s).join(" / ")}${S.prefs.snack ? " + 加餐" : ""}</b></div>
      <button class="btn block" id="btn-profile" style="margin-top:12px" onClick=${() => UI.open({ t: "profile" })}>修改</button>
    </div>
    <div class="card" style="padding-block:4px">
      <button class="nav" id="nav-plan" onClick=${() => UI.open({ t: "plan" })}><span class="ic i-plan" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19V13M10 19V8M15 19v-4M20 19V5" /></svg></span><b>饮食计划</b><span>${S.cycle ? (S.cycle.name || planOf(S.cycle.id).n) : "稳稳来"} ›</span></button>
      <button class="nav" id="nav-ai" onClick=${() => UI.open({ t: "aiset" })}><span class="ic i-ai" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg></span><b>AI 设置</b><span>${aiState} ›</span></button>
      <button class="nav" id="nav-aiimport" onClick=${() => UI.open({ t: "aiimport" })}><span class="ic i-fill" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19l9.5-9.5M14.5 9.5l2-2a1.4 1.4 0 0 1 2 2l-2 2M17 3v2M21 7h-2M19.5 4.5 18 6M9 4l.6 1.6L11 6l-1.4.4L9 8l-.6-1.6L7 6l1.4-.4z" /></svg></span><b>让 AI 帮你填</b><span>任何 AI 都行 ›</span></button>
      <button class="nav" id="nav-cloud" onClick=${() => UI.open({ t: "cloud" })}><span class="ic i-cloud" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 18h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 9.6 4.2 4.2 0 0 0 7 18z" /></svg></span><b>云端账号和备份</b><span>${S.cloud.token ? "已登录 " + S.cloud.user : "预留功能，未连接"} ›</span></button>
      <button class="nav" id="nav-data" onClick=${() => UI.open({ t: "data" })}><span class="ic i-data" aria-hidden="true"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.6" /><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" /></svg></span><b>导出、导入、清空数据</b><span>›</span></button>
      <button class="nav" id="nav-about" onClick=${() => UI.open({ t: "about" })}><span class="ic i-about" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l7 3v5.5c0 4.3-3 7.8-7 9.5-4-1.7-7-5.2-7-9.5V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></svg></span><b>隐私说明和免责声明</b><span>›</span></button>
    </div>
    <div class="card">
      <label class="switch"><span>全屏动画<br /><small class="muted">开场问候、换一份、AI 排餐、全天吃完时的整屏动画</small></span>
        <input id="fx-full" type="checkbox" checked=${S.prefs.fullfx !== false} onChange=${(e) => commit((S) => { S.prefs.fullfx = e.target.checked; })} /></label>
    </div>
    <p class="tiny muted" style="text-align:center">饭票 ${VERSION}　数据只存在这台设备上</p>`;
}

export function ProfileSheet({ onClose }) {
  const S = app.S, p = S.profile;
  const [f, setF] = useState({ sex: p.sex, age: String(p.age), height: String(p.height), weight: String(p.weight), goal: p.goal, activity: p.activity,
    budget: String(S.prefs.budget), modes: { ...S.prefs.modes }, snack: S.prefs.snack,
    ppk: p.proteinPerKg ? String(p.proteinPerKg) : "", kcal: p.kcalOverride ? String(p.kcalOverride) : "", rest: p.restKcal ? String(p.restKcal) : "" });
  const [err, setErr] = useState("");
  const set = (patch) => { setF({ ...f, ...patch }); setErr(""); };
  const save = () => {
    const np = toProfile(f);
    const e = checkProfile(np);
    if (e) return setErr(e);
    const ppk = f.ppk === "" ? 0 : num(f.ppk), kc = f.kcal === "" ? 0 : num(f.kcal), rest = f.rest === "" ? 0 : num(f.rest);
    if (ppk && !(ppk >= 0.8 && ppk <= 2.5)) return setErr("每公斤蛋白请填 0.8–2.5 之间，或者留空");
    if (kc && !(kc >= (np.sex === "f" ? 1200 : 1500) && kc <= 6000)) return setErr(`自定热量请填 ${np.sex === "f" ? 1200 : 1500}–6000 之间，或者留空`);
    if (rest && !(rest >= 800 && rest <= 4000)) return setErr("静息千卡请填 800–4000 之间，或者留空");
    if (!(num(f.budget, -1) >= 0)) return setErr("预算请填数字，不限制就填 0");
    commit((S) => {
      S.profile = { ...np, proteinPerKg: ppk || undefined, kcalOverride: kc || undefined, restKcal: rest || undefined };
      S.prefs = { ...S.prefs, modes: f.modes, snack: f.snack, budget: num(f.budget, 0) };
    });
    UI.toast("已保存。今天的饭可以点「换一份」按新目标重排"); onClose();
  };
  return html`<${Sheet} title="我的资料和目标" onClose=${onClose}>
    <div class="card"><${BasicForm} f=${f} set=${set} /></div>
    <div class="card"><${LifeForm} f=${f} set=${set} /></div>
    <div class="card stack">
      <h2>进阶（都可以留空）</h2>
      <${Field} id="pf-ppk" label="每公斤体重吃多少克蛋白" mode="decimal" value=${f.ppk} onInput=${(v) => set({ ppk: v })} placeholder=${"留空 = " + GOALS[f.goal].ppk} hint="增肌一般 1.6–2.2，减脂 1.8–2.2，保持 1.2–1.6。" />
      <${Field} id="pf-kcal" label="自己定每天的热量（千卡）" mode="numeric" value=${f.kcal} onInput=${(v) => set({ kcal: v })} placeholder="留空 = 自动算" hint="填了以后，就不再按活动量和手表自动调整。" />
      <${Field} id="pf-rest" label="手表上的静息千卡" mode="numeric" value=${f.rest} onInput=${(v) => set({ rest: v })} placeholder="留空 = 用公式估" hint="苹果手表在「健康 → 静息能量」里看。填了会更准。" />
    </div>
    ${err ? html`<div class="note bad" role="alert">${err}</div>` : null}
    <button class="btn primary block" id="pf-save" onClick=${save}>保存</button>
  <//>`;
}

export function AISetSheet({ onClose }) {
  const S = app.S;
  const [f, setF] = useState({ ...S.ai });
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const prov = providerOf(f.provider);
  const set = (p) => { setF({ ...f, ...p }); setMsg(null); };
  const persist = () => commit((S) => { S.ai = { provider: f.provider, base: f.base.trim(), model: f.model.trim(), key: f.key.trim(),
    vprovider: f.vprovider || "", vbase: (f.vbase || "").trim(), vmodel: (f.vmodel || "").trim(), vkey: (f.vkey || "").trim() }; });
  const vown = !!f.vprovider && f.vprovider !== f.provider;
  const vprov = providerOf(vown ? f.vprovider : f.provider);
  const test = async () => {
    persist(); setBusy(true); setMsg(null);
    try {
      const r = await chatJSON(app.S, [{ role: "system", content: "只输出 JSON。" }, { role: "user", content: '回复 {"ok":true}' }]);
      setMsg({ ok: true, t: "连上了，可以用。" + (r && r.ok ? "" : "（模型回复的格式有点怪，但能通）") });
    } catch (e) { setMsg({ ok: false, t: e.message }); }
    finally { setBusy(false); }
  };
  const isServer = f.provider === "server";
  return html`<${Sheet} title="AI 设置" onClose=${onClose}>
    <p class="small muted">饭票不自带 AI 账号。你用自己的模型密钥，费用直接付给模型服务商，一次排餐一般只要几厘到几分钱。不填也能用本地排餐。</p>
    <div class="card stack">
      <label class="field">用哪家的模型
        <select id="ai-provider" value=${f.provider} onChange=${(e) => set({ provider: e.target.value, base: "", model: "" })}>
          ${PROVIDERS.map((p) => html`<option value=${p.id}>${p.n}</option>`)}</select></label>
      ${isServer ? html`<div class="note ai">AI 请求会发到你在「云端账号和备份」里填的服务器，由服务器去调模型。用户就不用自己填密钥了。这是给以后正式运营留的。</div>` : html`
        <label class="field">API 密钥
          <div class="row" style="flex-wrap:nowrap"><input id="ai-key" class="grow" type=${show ? "text" : "password"} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-..." value=${f.key} onInput=${(e) => set({ key: e.target.value })} />
          <button class="btn sm" type="button" onClick=${() => setShow(!show)}>${show ? "隐藏" : "显示"}</button></div>
          ${prov.site ? html`<span class="tiny">到 ${prov.site} 注册、充值后，在「API Keys」里创建一个密钥，复制过来。</span>` : null}</label>
        <${Field} id="ai-base" label="接口地址" value=${f.base} onInput=${(v) => set({ base: v })} placeholder=${prov.base || "https://你的地址/v1"} hint="一般不用改。自定义时填到 /v1 为止，不要带 /chat/completions。" />
        <${Field} id="ai-model" label="模型名" value=${f.model} onInput=${(v) => set({ model: v })} placeholder=${prov.model || "模型名"} hint="留空就用默认的。服务商改了模型名时在这里填新的。" />`}
    </div>
    <h2 class="sec">拍照识别</h2>
    <div class="card stack" id="ai-vision">
      <label class="field">看照片用哪家
        <select id="ai-vprovider" value=${vown ? f.vprovider : ""} onChange=${(e) => set({ vprovider: e.target.value, vbase: "", vmodel: "" })}>
          <option value="">和上面同一家</option>
          ${PROVIDERS.filter((p) => p.id !== f.provider).map((p) => html`<option value=${p.id}>${p.n}${p.vmodel || p.id === "custom" || p.id === "server" ? "" : "（不能看图）"}</option>`)}</select></label>
      ${vown && f.vprovider !== "server" ? html`
        <label class="field">这家的 API 密钥
          <input id="ai-vkey" type=${show ? "text" : "password"} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-..." value=${f.vkey || ""} onInput=${(e) => set({ vkey: e.target.value })} />
          ${vprov.site ? html`<span class="tiny">到 ${vprov.site} 创建密钥。</span>` : null}</label>
        ${f.vprovider === "custom" ? html`<${Field} id="ai-vbase" label="接口地址" value=${f.vbase || ""} onInput=${(v) => set({ vbase: v })} placeholder="https://你的地址/v1" />` : null}` : null}
      ${(vown ? f.vprovider : f.provider) === "server" ? null : html`<${Field} id="ai-vmodel" label="识图模型名" value=${f.vmodel || ""} onInput=${(v) => set({ vmodel: v })}
        placeholder=${vprov.vmodel || "这家没有默认的识图模型"} hint=${vprov.vmodel ? "留空就用默认的 " + vprov.vmodel + "。" : "DeepSeek 现在不能看图。可以在上面另选一家，推荐智谱（glm-4v-flash 免费）或通义千问。"} />`}
    </div>
    ${msg ? html`<div class=${"note " + (msg.ok ? "ok" : "bad")} id="ai-test-msg">${msg.t}</div>` : null}
    <div class="row">
      <button class="btn grow" id="ai-test" disabled=${busy} onClick=${test}>${busy ? "正在测试…" : "保存并测试"}</button>
      <button class="btn primary grow" id="ai-save" onClick=${() => { persist(); UI.toast("已保存"); onClose(); }}>保存</button>
    </div>
    <p class="tiny muted">密钥只保存在这台设备上，只会发给你选的这家服务商。排餐时会把你的身高、体重、年龄、目标和勾选的食物发给它；拍照识别时会把照片（缩小后）发给看照片的那家。不要把密钥发给别人。</p>
  <//>`;
}

export function CloudSheet({ onClose }) {
  const S = app.S;
  const [url, setUrl] = useState(S.cloud.url);
  const [user, setUser] = useState(S.cloud.user);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askPull, setAskPull] = useState(false);
  const run = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try { const t = await fn(); setMsg({ ok: true, t: t || okText }); }
    catch (e) { setMsg({ ok: false, t: e.message }); }
    finally { setBusy(false); }
  };
  const base = url.trim();
  const auth = (kind) => run(async () => {
    if (!base) throw new Error("先填服务器地址");
    if (user.trim().length < 3 || pw.length < 8) throw new Error("账号至少 3 个字符，密码至少 8 位");
    const r = await cloud[kind](base, user.trim(), pw);
    commit((S) => { S.cloud = { ...S.cloud, url: base, user: r.user, token: r.token }; });
    setPw("");
    return kind === "register" ? "注册成功，已登录。" : "登录成功。";
  });
  const logged = !!S.cloud.token;
  return html`<${Sheet} title="云端账号和备份" onClose=${onClose}>
    <div class="note ai">这是预留功能。饭票不连服务器也能完整使用。等有了自己的服务器，填上地址就能注册登录、把数据备份到服务器、换手机时恢复。</div>
    <div class="card stack">
      <${Field} id="cl-url" label="服务器地址" value=${url} onInput=${setUrl} placeholder="https://api.你的域名.com" />
      <button class="btn" id="cl-health" disabled=${busy} onClick=${() => run(async () => { if (!base) throw new Error("先填服务器地址"); const h = await cloud.health(base); commit((S) => { S.cloud.url = base; }); return `连上了：${h.name || "服务器"} ${h.version || ""}${h.ai ? "，服务器已配置 AI" : "，服务器还没配置 AI"}`; })}>测试连接</button>
    </div>
    ${logged ? html`<div class="card stack">
      <div class="kv"><span>当前账号</span><b>${S.cloud.user}</b></div>
      <div class="kv"><span>上次备份</span><b>${S.cloud.last || "还没备份过"}</b></div>
      <div class="row">
        <button class="btn grow" id="cl-push" disabled=${busy} onClick=${() => run(async () => { await cloud.push(S.cloud.url, S.cloud.token, exportable(app.S)); const t = new Date().toLocaleString("zh-CN"); commit((S) => { S.cloud.last = t; }); return "已备份到服务器。"; })}>备份到服务器</button>
        <button class="btn grow" id="cl-pull" disabled=${busy} onClick=${() => setAskPull(true)}>从服务器恢复</button>
      </div>
      ${askPull ? html`<div class="note warn">恢复会用服务器上的数据盖掉这台设备上的数据。确定吗？
        <div class="row" style="margin-top:8px"><button class="btn sm" onClick=${() => setAskPull(false)}>不了</button>
        <button class="btn sm danger" id="cl-pull-yes" onClick=${() => { setAskPull(false); run(async () => {
          const r = await cloud.pull(S.cloud.url, S.cloud.token);
          if (!r.state || !r.state.profile) throw new Error("服务器上还没有备份。");
          commit((S) => { const keepAi = S.ai, keepCloud = S.cloud; Object.assign(S, blank(), r.state); S.ai = keepAi; S.cloud = keepCloud; });
          return "已恢复。";
        }); }}>确定恢复</button></div></div>` : null}
      <button class="btn danger" onClick=${() => { commit((S) => { S.cloud.token = ""; }); setMsg({ ok: true, t: "已退出登录。" }); }}>退出登录</button>
    </div>` : html`<div class="card stack">
      <${Field} id="cl-user" label="账号" value=${user} onInput=${setUser} placeholder="至少 3 个字符" />
      <${Field} id="cl-pw" label="密码" type="password" value=${pw} onInput=${setPw} placeholder="至少 8 位" />
      <div class="row"><button class="btn grow" id="cl-register" disabled=${busy} onClick=${() => auth("register")}>注册</button>
        <button class="btn primary grow" id="cl-login" disabled=${busy} onClick=${() => auth("login")}>登录</button></div>
    </div>`}
    ${msg ? html`<div class=${"note " + (msg.ok ? "ok" : "bad")} id="cl-msg">${msg.t}</div>` : null}
    <p class="tiny muted">备份不会上传你的 AI 密钥。接口文档在安装包附带的 server/openapi.yaml 里。</p>
  <//>`;
}

export function DataSheet({ onClose }) {
  const [text, setText] = useState("");
  const [imp, setImp] = useState("");
  const [msg, setMsg] = useState(null);
  const [sure, setSure] = useState(false);
  const doExport = async () => {
    const t = JSON.stringify(exportable(app.S));
    setText(t);
    setMsg({ ok: true, t: (await copyText(t)) ? "已复制到剪贴板。粘贴到备忘录或发给自己保存。" : "下面是你的数据，长按全选后复制保存。" });
  };
  const doImport = () => {
    try {
      const o = JSON.parse(imp);
      if (!o || typeof o !== "object" || !o.profile || !o.prefs) throw 0;
      commit((S) => { const keepAi = S.ai, keepCloud = S.cloud; Object.assign(S, blank(), o); S.ai = keepAi; S.cloud = keepCloud; });
      setImp(""); setMsg({ ok: true, t: "导入成功。" });
    } catch (e) { setMsg({ ok: false, t: "这段文字不是饭票导出的数据，没法导入。" }); }
  };
  return html`<${Sheet} title="我的数据" onClose=${onClose}>
    <div class="card stack">
      <h2>导出</h2>
      <p class="small muted">把所有资料、食物、记录导出成一段文字。换手机或重装前先导出。里面不含 AI 密钥。</p>
      <button class="btn" id="data-export" onClick=${doExport}>导出并复制</button>
      ${text ? html`<pre class="code" id="data-text">${text}</pre>` : null}
    </div>
    <div class="card stack">
      <h2>导入</h2>
      <label class="field">把之前导出的文字粘贴到这里
        <textarea id="data-import" value=${imp} onInput=${(e) => setImp(e.target.value)}></textarea></label>
      <button class="btn" id="data-import-btn" disabled=${!imp.trim()} onClick=${doImport}>导入（会盖掉现在的数据）</button>
    </div>
    ${msg ? html`<div class=${"note " + (msg.ok ? "ok" : "bad")} id="data-msg">${msg.t}</div>` : null}
    <div class="card stack">
      <h2>清空</h2>
      ${sure ? html`<div class="note bad">所有资料、食物和记录都会删掉，没法恢复。
        <div class="row" style="margin-top:8px"><button class="btn sm" onClick=${() => setSure(false)}>不删了</button>
        <button class="btn sm danger" id="data-wipe-yes" onClick=${() => { wipe(); app.S = blank(); save(app.S); onClose(); app.rerender(); }}>确定全部删除</button></div></div>`
        : html`<button class="btn danger" id="data-wipe" onClick=${() => setSure(true)}>清空所有数据，重新开始</button>`}
    </div>
  <//>`;
}

export function AboutSheet({ onClose }) {
  return html`<${Sheet} title="隐私说明和免责声明" onClose=${onClose}>
    <div class="card prose small">
      <h3 style="margin-top:0">你的数据在哪里</h3>
      <p>你的身高、体重、目标、食物和每天的记录，都只保存在这台设备上。饭票没有自己的服务器在收集这些数据，也没有广告和统计代码。</p>
      <p>卸载 App 或清除 App 数据后，这些数据会一起删除。需要保留请先在「导出」里备份。</p>
      <h3>什么时候数据会离开这台设备</h3>
      <p>只有三种情况，而且都是你自己打开的：</p>
      <p>一、使用「AI 排餐」或「让 AI 估营养」时，会把你的性别、年龄、身高、体重、目标、预算和勾选的食物，发给你自己选的模型服务商（例如 DeepSeek）。他们怎么处理这些数据，以他们的隐私政策为准。</p>
      <p>二、在「云端账号和备份」里填了服务器地址并登录后，点「备份到服务器」会把数据上传到那台服务器。</p>
      <p>三、在「让 AI 帮你填」里，打开「附上我现在的设置」再复制说明时，你的资料和食物会在复制的文字里，由你自己粘贴给别的 AI；用「让饭票里的 AI 写」时，会把你写的那段话和你的设置发给你选的模型服务商。</p>
      <h3>AI 密钥</h3>
      <p>你填的 AI 密钥只保存在这台设备上，只会发给你选的那家服务商。备份和导出里都不包含密钥。</p>
      <h3>免责声明</h3>
      <p>饭票提供的是一般性的饮食安排参考，不是医疗建议，也不能代替医生或注册营养师的意见。</p>
      <p>食物的热量和营养是常见食物的典型值，实际会因品牌、做法、分量而不同。AI 估算的数值可能不准，请以食品包装上的营养成分表为准。</p>
      <p>如果你有糖尿病、肾病、痛风等慢性病，正在怀孕或哺乳，未满 18 岁，或者有过进食障碍，请在医生或营养师指导下安排饮食。未满 18 岁的用户不提供减脂目标。</p>
      <p>过敏原请自己核对食物配料表。</p>
      <p>饮食计划里的碳循环、211 餐盘法、16+8 轻断食，是按网上常见的做法整理的，不代表任何博主本人。轻断食不适合未满 18 岁、孕期哺乳期、有胃病或进食障碍史的人。</p>
      <p>食物库（1700 种，每 100 克）的数据来自开源项目 cn-food-mcp（MIT 许可），原始数据整理自《中国食物成分表》。</p>
    </div>
  <//>`;
}
