// 第一次打开：三步建档。也提供「改资料」用的表单。
import { html, useState, app, commit, UI, Seg, Field, num, r0, MODE } from "./ui.js";
import { ACTIVITY, GOALS, targetsOf } from "./nutrition.js";
import { CATS, FOODS } from "./foods.js";
import { dateStr } from "./store.js";
import { fullFx } from "./fx.js";

export function checkProfile(p) {
  if (!(p.age >= 14 && p.age <= 90)) return "年龄请填 14–90 之间";
  if (!(p.height >= 120 && p.height <= 220)) return "身高请填 120–220 厘米之间";
  if (!(p.weight >= 30 && p.weight <= 250)) return "体重请填 30–250 公斤之间";
  return "";
}

export function BasicForm({ f, set }) {
  const minor = num(f.age) < 18;
  return html`<div class="stack">
    <div class="field">性别（用来算基础代谢）
      <${Seg} id="pf-sex" value=${f.sex} onChange=${(v) => set({ sex: v })} options=${[{ v: "m", n: "男" }, { v: "f", n: "女" }]} />
    </div>
    <div class="grid3">
      <${Field} id="pf-age" label="年龄" mode="numeric" value=${f.age} onInput=${(v) => set({ age: v })} />
      <${Field} id="pf-height" label="身高 cm" mode="decimal" value=${f.height} onInput=${(v) => set({ height: v })} />
      <${Field} id="pf-weight" label="体重 kg" mode="decimal" value=${f.weight} onInput=${(v) => set({ weight: v })} />
    </div>
    <div class="field">目标
      <${Seg} id="pf-goal" value=${minor && f.goal === "cut" ? "keep" : f.goal} onChange=${(v) => set({ goal: v })}
        options=${[{ v: "gain", n: "增肌" }, { v: "cut", n: "减脂", disabled: minor }, { v: "keep", n: "保持" }]} />
      <span class="tiny">${minor ? "未满 18 岁还在长身体，不建议减脂，可以选保持或增肌。" : GOALS[f.goal].d}</span>
    </div>
  </div>`;
}

export function LifeForm({ f, set }) {
  const setMode = (k, v) => set({ modes: { ...f.modes, [k]: v } });
  const modeOpts = [{ v: "out", n: "外食" }, { v: "cold", n: "不开火" }, { v: "cook", n: "自己做" }];
  return html`<div class="stack">
    <div class="field">平时的活动量
      <div class="stack" style="gap:8px">
        ${ACTIVITY.map((a) => html`<button type="button" class="opt" aria-pressed=${String(f.activity === a.v)} onClick=${() => set({ activity: a.v })}>
          <div><b>${a.n}</b><span>${a.d}</span></div></button>`)}
      </div>
    </div>
    <${Field} id="pf-budget" label="每天吃饭预算（元）" mode="decimal" value=${f.budget} onInput=${(v) => set({ budget: v })} hint="排餐时不会超过这个数。填 0 表示不限制。" />
    <div class="field">三餐一般怎么吃（每天还能单独改）
      ${["b", "l", "d"].map((k) => html`<div class="row" style="flex-wrap:nowrap">
        <span style="width:36px;color:var(--ink)">${{ b: "早餐", l: "午餐", d: "晚餐" }[k]}</span>
        <div class="grow"><${Seg} id=${"pf-mode-" + k} value=${f.modes[k]} onChange=${(v) => setMode(k, v)} options=${modeOpts} /></div>
      </div>`)}
      <span class="tiny">外食 = 食堂或外面买；不开火 = 只吃即食的或用热水冲泡的；自己做 = 有锅能开火。</span>
    </div>
    <label class="switch"><span>安排加餐（水果、牛奶、坚果这类）</span>
      <input id="pf-snack" type="checkbox" checked=${f.snack} onChange=${(e) => set({ snack: e.target.checked })} /></label>
  </div>`;
}

export function toProfile(f) {
  const age = num(f.age);
  return {
    sex: f.sex, age, height: num(f.height), weight: num(f.weight),
    goal: age < 18 && f.goal === "cut" ? "keep" : f.goal, activity: f.activity,
  };
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ sex: "m", age: "", height: "", weight: "", goal: "gain", activity: 1.375, budget: "30", modes: { b: "cold", l: "out", d: "cook" }, snack: true });
  const [on, setOn] = useState(() => Object.fromEntries(FOODS.map((x) => [x.id, x.on])));
  const [err, setErr] = useState("");
  const set = (patch) => { setF({ ...f, ...patch }); setErr(""); };
  const p = toProfile(f);
  const next = () => {
    if (step === 0) { const e = checkProfile(p); if (e) return setErr(e); }
    if (step === 1 && !(num(f.budget, -1) >= 0)) return setErr("预算请填数字，不限制就填 0");
    setStep(step + 1); window.scrollTo(0, 0);
  };
  const finish = () => {
    if (Object.values(on).filter(Boolean).length < 6) return setErr("至少选 6 样食物，才排得出一天的饭");
    if (fullFx(app.S)) UI.fs({ t: "calc" });
    commit((S) => {
      S.profile = p;
      S.prefs = { ...S.prefs, modes: f.modes, snack: f.snack, budget: num(f.budget, 0) };
      S.pantry = {};
      for (const x of FOODS) if (on[x.id] !== x.on) S.pantry[x.id] = { on: on[x.id] };
      S.weights = [{ d: dateStr(), kg: p.weight }];
    });
  };
  const T = step === 2 ? targetsOf(p) : null;
  const q = (step + 1) / 3;
  let n = 0;
  return html`<section class=${"hero ob sky-" + ["dawn", "day", "dusk"][step]}>
      <div class="skybg" aria-hidden="true">${["dawn", "day", "dusk"].map((k, i) => html`<i class=${"sky-" + k + (i === step ? " on" : "")}></i>`)}</div>
      <div class="skyfx" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="rays"></i></div>
      <div class="obname">饭票</div>
      <h1 key=${"h" + step} class="swap">${["先认识一下你", "你平时怎么吃", "你能吃到哪些东西"][step]}</h1>
      <p key=${"p" + step} class="swap" style="animation-delay:.08s">${["用来算你一天该吃多少。数据只存在这台手机上。", "排餐会按你的预算和条件来。", "点亮你买得到、愿意吃的。以后随时能改。"][step]}</p>
      <svg class="arc" viewBox="0 0 320 178" role="img" aria-label=${"第 " + (step + 1) + " 步，共 3 步"}>
        <path class="track" d="M32 160 A128 128 0 0 1 288 160" pathLength="1000" />
        <path class="eaten" d="M32 160 A128 128 0 0 1 288 160" pathLength="1000" stroke="#fff" style=${`stroke-dashoffset:${1000 * (1 - q)}`} />
        <g class="sun" style=${`transform:rotate(${180 * q}deg)`}><circle class="glow" cx="32" cy="160" r="15" /><circle class="core" cx="32" cy="160" r="8" /></g>
      </svg>
    </section>
    <div class="card obcard" key=${step}>
      ${step === 0 ? html`<${BasicForm} f=${f} set=${set} />` : null}
      ${step === 1 ? html`<${LifeForm} f=${f} set=${set} />` : null}
      ${step === 2 ? html`<div class="stack">
        ${CATS.map((c) => html`<div><div class="tiny muted" style="margin-bottom:8px;font-weight:600">${c}</div><div class="chips">
          ${FOODS.filter((x) => x.c === c && x.r !== "manual").map((x) => html`<button type="button" class="chip wave" style=${"--n:" + n++} aria-pressed=${String(!!on[x.id])}
            onClick=${() => { setOn({ ...on, [x.id]: !on[x.id] }); setErr(""); }}>${x.n}</button>`)}
        </div></div>`)}
      </div>` : null}
    </div>
    ${T ? html`<div class="card" id="ob-preview"><h2>按你的资料，每天大约这样吃</h2><div class="reveal">
      <div class="tile"><div class="v num">${T.kcal}</div><div class="l">千卡</div></div>
      <div class="tile"><div class="v num">${T.protein} g</div><div class="l">蛋白质</div></div>
      <div class="tile"><div class="v num">${T.carb} g</div><div class="l">碳水</div></div>
      <div class="tile"><div class="v num">${T.fat} g</div><div class="l">脂肪</div></div>
    </div><p class="small muted" style="margin:10px 0 0">进去以后可以再调。</p></div>` : null}
    ${err ? html`<div class="note bad" role="alert">${err}</div>` : null}
    <div class="row">
      ${step > 0 ? html`<button class="btn" onClick=${() => { setStep(step - 1); setErr(""); }}>上一步</button>` : null}
      <button class="btn primary grow" id="ob-next" onClick=${step < 2 ? next : finish}>${step < 2 ? "下一步" : "开始用"}</button>
    </div>
    <p class="hint">饭票给的是一般性的饮食参考，不是医疗建议。有慢性病、在怀孕或哺乳、有进食障碍史的人，请先问医生或营养师。</p>`;
}
