// 饮食计划的界面：计划清单、每个计划的设置、接下来两周的节奏
import { html, useState, useMemo, app, commit, UI, Sheet, Seg, r0, num } from "./ui.js";
import { dateStr, addDays } from "./store.js";
import { targetsOf, SLOTS } from "./nutrition.js";
import { PLANS, KIND, planOf, makeCycle, rhythm, targetsFor, dayInfo, dayLabel, taperMul, DEFAULT_WEEK, aiPlanMessages, sanitizeAIPlan, weekdayName } from "./plans.js";
import { aiReady, chatJSON } from "./ai.js";

const WD = "一二三四五六日";
const md = (d) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;

// 一排小柱子：高度是热量，颜色是高中低碳。today 那一根下面有个点
export function Rhythm({ rows, big, id }) {
  const max = Math.max(...rows.map((r) => r.T.kcal), 1);
  const min = Math.min(...rows.map((r) => r.T.kcal));
  const flat = max - min < 30;
  const today = dateStr();
  return html`<div class=${"rhythm" + (big ? " big" : "")} id=${id} role="img" aria-label=${"接下来 " + rows.length + " 天的目标：" + rows.map((r) => (r.kind ? KIND[r.kind].s : "") + r.T.kcal + "千卡").join("，")}>
    ${rows.map((r, i) => html`<div class=${"rb k-" + (r.kind || "N") + (r.d === today ? " now" : "")} style=${`--h:${flat ? 0.62 : 0.28 + (0.72 * (r.T.kcal - min)) / (max - min || 1)};--i:${i}`}>
      ${big && (i === 0 || r.T.kcal !== rows[i - 1].T.kcal) ? html`<span class="rv num">${r.T.kcal}</span>` : null}
      <i></i>
      ${big ? html`<span class="rd">${r.d === today ? "今" : WD[(new Date(r.d + "T12:00:00").getDay() + 6) % 7]}</span>` : null}
    </div>`)}
  </div>`;
}

// 计划卡片上的小图标：这个计划的节奏
function Glyph({ p }) {
  const s = (p.seq || (p.week ? DEFAULT_WEEK.join("") : p.strip || "MMMMMMM")).slice(0, 7).padEnd(7, (p.seq || "M")[0]);
  const H = { L: 0.38, M: 0.64, H: 1 };
  if (p.plate) return html`<span class="glyph plate" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" /><path d="M16 3v26M16 16h13" /></svg></span>`;
  if (p.fast) return html`<span class="glyph fast" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12.5" /><path class="win" d="M16 3.5A12.5 12.5 0 0 1 28.5 16" /><path d="M16 9v7l4 3" /></svg></span>`;
  if (p.taper) return html`<span class="glyph" aria-hidden="true">${[1, 0.9, 0.8, 0.72, 0.66, 0.62, 0.6].map((h, i) => html`<i class=${i < 3 ? "k-M" : "k-L"} style=${`--h:${h}`}></i>`)}</span>`;
  if (p.id === "manual") return html`<span class="glyph dial" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 10h20M6 16h20M6 22h20" /><circle cx="12" cy="10" r="2.6" /><circle cx="21" cy="16" r="2.6" /><circle cx="15" cy="22" r="2.6" /></svg></span>`;
  return html`<span class="glyph" aria-hidden="true">${[...s].map((k) => html`<i class=${"k-" + k} style=${`--h:${H[k] || 0.64}`}></i>`)}</span>`;
}

export function PlanSheet({ onClose }) {
  return html`<${Sheet} title="饮食计划" onClose=${onClose}><${PlanList} /><//>`;
}

// 计划清单本体：面板里和「计划」页都用它
export function PlanList() {
  const S = app.S, today = dateStr();
  const cur = S.cycle ? planOf(S.cycle.id) : PLANS[0];
  const rows = rhythm(S, today, 14);
  const T = rows[0].T, info = dayInfo(S, today);
  const groups = ["基础", "碳循环", "网红方案", "AI"];
  return html`
    <section class="plancur" id="plan-cur">
      <div class="pch">
        <div><span class="eyebrow">正在用</span><b>${S.cycle && S.cycle.name ? S.cycle.name : cur.n}</b></div>
        ${info.kind ? html`<span class=${"kpill k-" + info.kind}>${KIND[info.kind].n}</span>` : null}
      </div>
      <div class="pcnum"><b class="num">${T.kcal}</b><span>千卡 · 今天</span></div>
      <div class="pcmac num">蛋白 ${T.protein} g　碳水 ${T.carb} g　脂肪 ${T.fat} g</div>
      <${Rhythm} rows=${rows} big id="plan-rhythm" />
      ${dayLabel(S, today) ? html`<p class="small muted" style="margin:0">${dayLabel(S, today)}</p>` : null}
    </section>
    ${groups.map((g) => html`<div class="plangroup">
      <h3>${g}</h3>
      ${PLANS.filter((p) => p.g === g).map((p) => html`<button class="plancard" id=${"plan-" + p.id} aria-pressed=${String(p.id === cur.id)} onClick=${() => UI.open({ t: "planedit", id: p.id })}>
        <${Glyph} p=${p} />
        <span class="pt"><b>${p.n}${p.id === cur.id ? html`<em>生效中</em>` : null}</b><span class="tg">${p.tag}</span><span class="pd">${p.d}</span></span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>`)}
    </div>`)}
    <p class="tiny muted">计划只是把每天的热量和三大营养素分得不一样，蛋白每天都吃够。热量最低不会低于 ${S.profile.sex === "f" ? 1200 : 1500} 千卡。这些是一般的饮食参考，不是医疗建议；有慢性病或特殊情况请先问医生。</p>`;
}

// 每天高中低怎么填：按星期（训练日）
function WeekEditor({ week, set }) {
  const hint = { H: "练腿 / 练背", M: "练胸肩手", L: "休息" };
  return html`<div class="weeked" id="week-ed">
    ${week.map((k, i) => html`<div class="wrow"><span class="wd">周${WD[i]}</span>
      <div class="kseg">${["H", "M", "L"].map((x) => html`<button class=${"k-" + x} aria-pressed=${String(k === x)} onClick=${() => set(week.map((y, j) => (j === i ? x : y)))}>${KIND[x].s}</button>`)}</div>
      <span class="wh">${hint[k]}</span></div>`)}
  </div>`;
}

// 每天高中低怎么填：按顺序（几天一轮）
function SeqEditor({ seq, set, at, setAt, editable }) {
  const next = { L: "M", M: "H", H: "L" };
  return html`<div class="seqed" id="seq-ed">
    <div class="seqrow">${[...seq].map((k, i) => html`<button class=${"sq k-" + k + (i === at ? " at" : "")} aria-label=${`第 ${i + 1} 天 ${KIND[k].n}`}
      onClick=${() => (editable ? set(seq.slice(0, i) + next[k] + seq.slice(i + 1)) : setAt(i))}><b>${KIND[k].s.slice(0, 1)}</b><small>${i + 1}</small></button>`)}
      ${editable ? html`<span class="seqbtns"><button aria-label="少一天" disabled=${seq.length <= 2} onClick=${() => set(seq.slice(0, -1))}>−</button><button aria-label="多一天" disabled=${seq.length >= 14} onClick=${() => set(seq + "M")}>＋</button></span>` : null}
    </div>
    ${editable ? html`<p class="tiny muted">点一下切换：低 → 中 → 高。${seq.length} 天一轮。</p>` : null}
    <div class="field">今天是这一轮的第几天
      <div class="chips">${[...seq].map((k, i) => html`<button class="chip" aria-pressed=${String(at === i)} onClick=${() => setAt(i)}>第 ${i + 1} 天</button>`)}</div></div>
  </div>`;
}

export function PlanEditSheet({ id, onClose }) {
  const S = app.S, today = dateStr(), p = planOf(id);
  const c0 = S.cycle && S.cycle.id === id ? S.cycle : null;
  const base = targetsOf(S.profile, S.days[today] || {});
  const [seq, setSeq] = useState((c0 && c0.seq) || p.seq || "");
  const [at, setAt] = useState(c0 && c0.seq ? dayInfo(S, today).idx : 0);
  const [week, setWeek] = useState((c0 && c0.week) || DEFAULT_WEEK.slice());
  const [body, setBody] = useState((c0 && c0.body) || "ecto");
  const [ppk, setPpk] = useState((c0 && c0.ppk) || 1.5);
  const [skip, setSkip] = useState((c0 && c0.skip) || "b");
  const [mm, setMm] = useState("g");
  const m0 = (c0 && c0.macro) || { p: base.protein, cb: base.carb, f: base.fat };
  const [mg, setMg] = useState({ p: String(m0.p), cb: String(m0.cb), f: String(m0.f) });
  const [pct, setPct] = useState(() => { const k = m0.p * 4 + m0.cb * 4 + m0.f * 9; return { k: String(Math.round(k)), p: String(Math.round((m0.p * 400) / k)), cb: String(Math.round((m0.cb * 400) / k)), f: String(Math.round((m0.f * 900) / k)) }; });
  const [ask, setAsk] = useState("");
  const [ai, setAi] = useState(c0 && c0.id === "ai" ? { name: c0.name, note: c0.note } : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const minor = S.profile.age < 18;

  const macro = () => {
    if (mm === "g") return { p: num(mg.p), cb: num(mg.cb), f: num(mg.f) };
    const k = num(pct.k), sum = num(pct.p) + num(pct.cb) + num(pct.f);
    if (!(Math.abs(sum - 100) < 0.6)) return null;
    return { p: Math.round((k * num(pct.p)) / 400), cb: Math.round((k * num(pct.cb)) / 400), f: Math.round((k * num(pct.f)) / 900) };
  };
  const cfg = () => {
    if (id === "manual") { const m = macro(); return m ? makeCycle(S, id, { macro: m }) : null; }
    return makeCycle(S, id, { seq, at, week, body, ppk, skip, name: ai && ai.name, note: ai && ai.note });
  };
  const draft = useMemo(() => { try { return cfg(); } catch (e) { return null; } }, [seq, at, week.join(""), body, ppk, skip, mm, JSON.stringify(mg), JSON.stringify(pct), ai && ai.name]);
  const preview = useMemo(() => rhythm({ ...S, cycle: draft, days: {} }, today, 14), [draft]);
  const avg = Math.round(preview.reduce((a, r) => a + r.T.kcal, 0) / preview.length);
  const kinds = ["H", "M", "L"].filter((k) => preview.some((r) => r.kind === k));
  const kindT = (k) => preview.find((r) => r.kind === k).T;

  const manualErr = id === "manual" && !draft ? "三个比例加起来要等于 100%" : "";
  const bad = id === "manual" && draft && !(draft.macro.p >= 20 && draft.macro.p <= 400 && draft.macro.cb >= 20 && draft.macro.cb <= 900 && draft.macro.f >= 15 && draft.macro.f <= 300) ? "蛋白 20–400 g、碳水 20–900 g、脂肪 15–300 g 之间" : "";

  const genAI = async () => {
    setBusy(true); setErr("");
    try {
      const r = sanitizeAIPlan(await chatJSON(S, aiPlanMessages(S, ask)));
      setSeq(r.seq); setAt(0); setAi({ name: r.name, note: r.note });
    } catch (e) { setErr(e.message || "AI 暂时用不了"); }
    finally { setBusy(false); }
  };
  const save = () => {
    if (manualErr || bad) return setErr(manualErr || bad);
    if (p.ai && !ai) return setErr("先让 AI 排一个节奏");
    if (p.fast && minor) return setErr("未满 18 岁不建议轻断食");
    const c = id === "steady" ? null : draft;
    commit((S) => {
      S.cycle = c;
      for (const d in S.days) if (d >= today) delete S.days[d].kind;
      const day = S.days[today];
      // 今天还没打勾的话，按新计划重排
      if (day && day.plan && !SLOTS.some((s) => day.plan.meals[s].some((it) => it.done))) day.plan = null;
    });
    UI.toast(id === "steady" ? "换回稳稳来了" : `「${(c && c.name) || p.n}」生效了，今天的饭按新计划排`);
    onClose();
  };

  return html`<${Sheet} title=${p.n} onClose=${onClose}>
    <section class="planhead">
      <span class="tg">${p.g} · ${p.tag}</span>
      <p>${p.d}</p>
      ${p.kai ? html`<p class="tiny muted">按网上流传的「凯圣王碳循环」整理，不是他本人出品。</p>` : null}
    </section>

    ${id === "steady" ? html`<div class="card"><div class="kv"><span>每天的目标</span><b class="num">${base.kcal} 千卡</b></div>
      <div class="kv"><span>蛋白 / 碳水 / 脂肪</span><b class="num">${base.protein} / ${base.carb} / ${base.fat} g</b></div>
      <p class="small muted" style="margin:8px 0 0">按你的身高体重、目标和活动量算。填了手表活动千卡的那天会跟着变。</p></div>` : null}

    ${p.taper ? html`<div class="card stack">
      <div class="steps3">
        <div><b>1</b><span>每周固定一天早上空腹称体重</span></div>
        <div><b>2</b><span>${S.profile.goal === "gain" ? "一周没涨 0.15%：碳水 +8%" : "一周没掉 0.3%：碳水 −10%"}</span></div>
        <div><b>3</b><span>${S.profile.goal === "gain" ? "涨了就保持，最多加到 1.4 倍" : "掉了就保持，最低降到 0.6 倍"}</span></div>
      </div>
      ${S.profile.goal === "keep" ? html`<div class="note warn">你的目标是「保持」，这个计划不会调。先到「我的资料」把目标改成增肌或减脂。</div>` : null}
      ${c0 ? html`<div class="kv"><span>现在</span><b class="num">${dayLabel(S, today)}</b></div>` : null}
      <p class="tiny muted" style="margin:0">没称体重的那一周，${S.profile.goal === "gain" ? "按计划加一点" : "按计划降一点"}。</p>
    </div>` : null}

    ${id === "manual" ? html`<div class="card stack">
      <${Seg} id="mac-mode" value=${mm} onChange=${setMm} options=${[{ v: "g", n: "按克数" }, { v: "pct", n: "按比例" }]} />
      ${mm === "g" ? html`<div class="grid3">
          ${[["p", "蛋白质 g"], ["cb", "碳水 g"], ["f", "脂肪 g"]].map(([k, n]) => html`<label class="field">${n}<input id=${"mac-" + k} inputmode="decimal" value=${mg[k]} onInput=${(e) => setMg({ ...mg, [k]: e.target.value })} /></label>`)}
        </div>`
        : html`<label class="field">每天热量（千卡）<input id="mac-k" inputmode="numeric" value=${pct.k} onInput=${(e) => setPct({ ...pct, k: e.target.value })} /></label>
        <div class="grid3">
          ${[["p", "蛋白 %"], ["cb", "碳水 %"], ["f", "脂肪 %"]].map(([k, n]) => html`<label class="field">${n}<input id=${"pct-" + k} inputmode="decimal" value=${pct[k]} onInput=${(e) => setPct({ ...pct, [k]: e.target.value })} /></label>`)}
        </div>
        <p class="tiny muted" style="margin:0">三个加起来是 ${r0(num(pct.p, 0) + num(pct.cb, 0) + num(pct.f, 0))}%，要等于 100%。</p>`}
      ${draft ? html`<div class="kv"><span>算出来每天</span><b class="num">${preview[0].T.kcal} 千卡</b></div>` : null}
      <p class="tiny muted" style="margin:0">自己定的目标是固定的，填了手表活动千卡也不会变。</p>
    </div>` : null}

    ${p.seq && !p.ai ? html`<div class="card stack"><${SeqEditor} seq=${seq} set=${setSeq} at=${Math.min(at, seq.length - 1)} setAt=${setAt} editable=${!!p.edit} /></div>` : null}

    ${p.ai ? html`<div class="card stack">
      <label class="field">说说你的情况
        <textarea id="aiplan-ask" rows="3" placeholder="例如：一周练 4 次，周一腿、周三背、周五胸、周六肩手；周二和周日跑步 2 小时；想增肌，肠胃不太好" value=${ask} onInput=${(e) => setAsk(e.target.value)}></textarea></label>
      ${aiReady(S) ? html`<button class="btn" id="aiplan-go" disabled=${busy} onClick=${genAI}>${busy ? "AI 正在排…" : ai ? "让 AI 重新排" : "让 AI 排"}</button>`
        : html`<div class="note warn">还没接入 AI。<button class="linkbtn" onClick=${() => UI.open({ t: "aiset" })}>去填密钥 ›</button></div>`}
      ${ai ? html`<div class="note ai" id="aiplan-res"><b>${ai.name}</b>${ai.note}</div>
        <${SeqEditor} seq=${seq} set=${setSeq} at=${Math.min(at, seq.length - 1)} setAt=${setAt} editable=${true} />` : null}
    </div>` : null}

    ${p.week ? html`<div class="card stack">
      <h2>一周怎么练</h2>
      <${WeekEditor} week=${week} set=${setWeek} />
      ${p.kai ? html`
        <div class="field">体型
          <${Seg} id="kai-body" value=${body} onChange=${setBody} options=${[{ v: "ecto", n: "偏瘦，不容易胖" }, { v: "endo", n: "容易长肉" }]} /></div>
        <div class="field">蛋白
          <${Seg} id="kai-ppk" value=${ppk} onChange=${setPpk} options=${[{ v: 1, n: "刚开始练 1.0 g/kg" }, { v: 1.5, n: "有训练基础 1.5 g/kg" }]} /></div>
        <p class="tiny muted" style="margin:0">碳水按体重算：偏瘦每公斤 3 g、容易长肉每公斤 2 g；脂肪每公斤 1.1 g / 0.8 g。乘 7 是一周的总量，再按高中低分。</p>` : null}
    </div>` : null}

    ${p.plate ? html`<div class="card plate211">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rim" cx="60" cy="60" r="56" /><path class="veg" d="M60 60V8a52 52 0 0 0 0 104z" /><path class="pro" d="M60 60V8a52 52 0 0 1 52 52z" /><path class="sta" d="M60 60h52a52 52 0 0 1-52 52z" /></svg>
      <ul><li><i class="veg"></i><b>2 份蔬菜</b><span>占半个盘子，两个拳头大</span></li>
        <li><i class="pro"></i><b>1 份蛋白</b><span>一个手掌大的肉、鱼、蛋、豆腐</span></li>
        <li><i class="sta"></i><b>1 份主食</b><span>一个拳头的饭，最好有粗粮</span></li></ul>
    </div>` : null}

    ${p.fast ? html`<div class="card stack">
      <div class="field">什么时候吃
        <${Seg} id="if-win" value=${skip} onChange=${setSkip} options=${[{ v: "b", n: "12:00–20:00" }, { v: "d", n: "8:00–16:00" }]} /></div>
      <p class="small muted" style="margin:0"><b style="color:var(--ink)">${skip === "b" ? "不吃早饭" : "不吃晚饭"}。</b>一天的热量不变，挪到窗口里的${skip === "b" ? "午饭、晚饭和加餐" : "早饭、午饭和加餐"}。窗口外只喝水、无糖茶或黑咖啡。</p>
      ${minor ? html`<div class="note warn">未满 18 岁还在长身体，不建议轻断食。</div>` : null}
    </div>` : null}

    ${id !== "steady" ? html`<div class="card stack" id="plan-preview">
      <div class="row between"><h2 style="margin:0">接下来两周</h2><span class="small muted num">平均 ${avg} 千卡${Math.abs(avg - base.kcal) >= 20 ? `（${avg > base.kcal ? "比平时多" : "比平时少"} ${Math.abs(avg - base.kcal)}）` : ""}</span></div>
      <${Rhythm} rows=${preview} big />
      ${kinds.length ? html`<div class="ktable">${kinds.map((k) => { const t = kindT(k); return html`<div class=${"kt k-" + k}><span class="kn">${KIND[k].n}</span><b class="num">${t.kcal}</b><span class="num">蛋白 ${t.protein}　碳水 ${t.carb}　脂肪 ${t.fat}</span></div>`; })}</div>` : null}
      ${preview.some((r) => r.T.floored) ? html`<p class="tiny muted" style="margin:0">有几天算出来低于安全下限，已经按下限补了碳水。</p>` : null}
    </div>` : null}

    ${err ? html`<div class="note bad" role="alert" id="plan-err">${err}</div>` : null}
    <button class="btn primary block" id="plan-save" onClick=${save}>${(S.cycle ? S.cycle.id : "steady") === id ? "保存修改" : "保存并生效"}</button>
  <//>`;
}
