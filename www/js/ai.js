// AI 接入：用户填自己的密钥（BYOK）。所有主流模型都走「OpenAI 兼容」的 /chat/completions 接口。
// 密钥只存在这台设备上，只会发给用户自己选的那家模型服务商。
import { SLOT_NAME, SLOTS } from "./nutrition.js";
import { CK_LABEL, CATS } from "./foods.js";

export const PROVIDERS = [
  { id: "deepseek", n: "DeepSeek", base: "https://api.deepseek.com", model: "deepseek-chat", vmodel: "", site: "platform.deepseek.com" },
  { id: "qwen", n: "通义千问（阿里云百炼）", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", vmodel: "qwen-vl-plus", site: "bailian.console.aliyun.com" },
  { id: "zhipu", n: "智谱 GLM", base: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", vmodel: "glm-4v-flash", site: "open.bigmodel.cn" },
  { id: "moonshot", n: "Kimi（月之暗面）", base: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k", vmodel: "moonshot-v1-8k-vision-preview", site: "platform.moonshot.cn" },
  { id: "siliconflow", n: "硅基流动", base: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3", vmodel: "Qwen/Qwen2.5-VL-72B-Instruct", site: "siliconflow.cn" },
  { id: "openai", n: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4o-mini", vmodel: "gpt-4o-mini", site: "platform.openai.com" },
  { id: "custom", n: "自定义（OpenAI 兼容）", base: "", model: "", site: "" },
  { id: "server", n: "我的服务器（预留）", base: "", model: "", site: "" },
];
export const providerOf = (id) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];

// 在 Claude 的预览页面里，没有密钥也能用 Claude 试 AI 排餐
let previewSample = null, previewImages = false;
export async function detectPreview() {
  try {
    if (window.claude && window.claude.use) previewSample = await window.claude.use("sample");
    if (previewSample && previewSample.limits) previewImages = !!(await previewSample.limits()).images;
  } catch (e) { if (!previewSample) previewSample = null; }
  return !!previewSample;
}
export const hasPreviewAI = () => !!previewSample;

export function aiReady(s) {
  if (s.ai.provider === "server") return !!(s.cloud.url && s.cloud.token);
  if (s.ai.key) return !!(s.ai.base || providerOf(s.ai.provider).base);
  return hasPreviewAI();
}

// 拍照识别用的模型：默认和排餐同一家（换成这家的识图模型）；也可以单独选一家。
// 返回 {provider, base, key, model}，这家不能看图时 model 为空。
export function visionCfg(s) {
  const a = s.ai, own = !!a.vprovider && a.vprovider !== a.provider;
  const pid = own ? a.vprovider : a.provider;
  const p = providerOf(pid);
  return { provider: pid, base: ((own ? a.vbase : a.base) || p.base || "").replace(/\/+$/, ""), key: ((own ? a.vkey : a.key) || "").trim(), model: (a.vmodel || "").trim() || p.vmodel || "" };
}
export function visionReady(s) {
  const v = visionCfg(s);
  if (v.provider === "server") return !!(s.cloud.url && s.cloud.token);
  if (v.key) return !!(v.base && v.model);
  return !!previewSample && previewImages;
}
// 为什么不能拍照识别，用一句话说清楚
export function visionWhy(s) {
  const v = visionCfg(s);
  if (v.provider === "server") return s.cloud.url && s.cloud.token ? "" : "先在「我的 → 云端账号和备份」登录服务器。";
  if (!v.key) return "拍照识别要用能看图的 AI 模型。到「我的 → AI 设置」填一个密钥，推荐智谱（识图模型 glm-4v-flash 免费）。";
  if (!v.model) return providerOf(v.provider).n + " 现在不能看图片。到「我的 → AI 设置 → 拍照识别」另选一家，比如智谱或通义千问。";
  return "";
}

class AIError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
const MSG = {
  401: "密钥不对或已失效，请到「我的 → AI 设置」检查。",
  402: "模型账户余额不足，请到服务商网站充值。",
  403: "这个密钥没有权限用这个模型。",
  404: "接口地址或模型名不对。",
  429: "请求太频繁或额度用完了，过一会儿再试。",
};

function parseJSON(text) {
  const t = String(text || "");
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  throw new AIError("AI 的回答格式不对，再试一次。", "format");
}

// 发给模型并拿回 JSON。messages: [{role, content}]
export async function chatJSON(s, messages, signal, opt = {}) {
  if (!opt.vision && !s.ai.key && previewSample && s.ai.provider !== "server") {
    try { return await previewSample.json(messages.map((m) => m.content).join("\n\n"), { signal, cache: false }); }
    catch (e) {
      if (e && e.code === "cancelled") throw new AIError("已停止。", "cancelled");
      throw new AIError(e && (e.code === "not_granted" || e.code === "sampling_disabled") ? "没有允许预览页面使用 Claude。" : "预览里的 Claude 暂时用不了，过一会儿再试。", "preview");
    }
  }
  let url, headers = { "Content-Type": "application/json" }, body;
  if (s.ai.provider === "server") {
    url = s.cloud.url.replace(/\/+$/, "") + "/v1/ai/chat";
    headers.Authorization = "Bearer " + s.cloud.token;
    body = { messages };
  } else {
    const p = providerOf(s.ai.provider);
    const base = (s.ai.base || p.base).replace(/\/+$/, "");
    if (!base || !s.ai.key) throw new AIError("还没填 AI 密钥。", "nokey");
    url = base + "/chat/completions";
    headers.Authorization = "Bearer " + s.ai.key.trim();
    body = opt.vision ? { model: s.ai.model, messages, temperature: 0.2, max_tokens: 1500 }
      : { model: s.ai.model || p.model, messages, temperature: 1.0, response_format: { type: "json_object" } };
  }
  const post = async (b) => {
    let res;
    try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(b), signal }); }
    catch (e) {
      if (e && e.name === "AbortError") throw new AIError("已停止。", "cancelled");
      throw new AIError("连不上 AI 服务，请检查网络和接口地址。", "network");
    }
    return res;
  };
  let res = await post(body);
  // 有的模型不支持 response_format，去掉再试一次
  if (res.status === 400 && body.response_format) { const { response_format, ...rest } = body; res = await post(rest); }
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = (j.error && (j.error.message || j.error)) || j.message || ""; } catch (e) {}
    if (opt.vision && (res.status === 400 || res.status === 404)) throw new AIError("这个模型看不了图片，或者模型名不对。到「我的 → AI 设置 → 拍照识别」换一个识图模型。", res.status);
    throw new AIError(MSG[res.status] || `AI 服务出错（${res.status}）${detail ? "：" + String(detail).slice(0, 80) : ""}`, res.status);
  }
  const data = await res.json();
  if (s.ai.provider === "server") return data.result !== undefined ? data.result : data;
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return parseJSON(text);
}

// 带一张照片问模型，拿回 JSON。img: {url: dataURL, blob}
export async function visionJSON(s, text, img, signal) {
  const v = visionCfg(s);
  if (!v.key && v.provider !== "server" && previewSample && previewImages) {
    try { return await previewSample.json(text, { images: [img.blob], signal, cache: false, modelTier: "default" }); }
    catch (e) {
      if (e && e.code === "cancelled") throw new AIError("已停止。", "cancelled");
      throw new AIError(e && e.code === "not_granted" ? "没有允许预览页面使用 Claude。" : "预览里的 Claude 暂时看不了图，过一会儿再试。", "preview");
    }
  }
  const why = visionWhy(s);
  if (why) throw new AIError(why, "nokey");
  const content = [{ type: "text", text }, { type: "image_url", image_url: { url: img.url } }];
  const msgs = [{ role: "user", content }];
  const fake = { ...s, ai: { provider: v.provider, base: v.base, key: v.key, model: v.model } };
  return chatJSON(fake, msgs, signal, { vision: true });
}

const MODE_TEXT = { out: "在食堂或外面吃，只能用「外食」的食物", cold: "不开火，只能用即食或有热水就行的食物", cook: "自己开火做" };

export function planMessages({ profile, T, modes, budget, snack, foods, ask, prevText }) {
  const lines = foods.map((f) => `${f.id}|${f.n}|${f.u}|${f.k}|${f.p}|${f.f}|${f.cb}|${f.na || 0}|${f.fb || 0}|${f.$}|${f.out ? "外食" : CK_LABEL[f.ck]}|${f.r}|${f.s}|${f.mx}`);
  const sys = `你是健身饮食安排助手。只用给出的食物库，按要求排一天的饭。只输出 JSON，不要任何别的文字。`;
  const user = `用户：${profile.sex === "f" ? "女" : "男"}，${profile.age} 岁，${profile.height}cm，${profile.weight}kg，目标是${{ gain: "增肌", cut: "减脂", keep: "保持" }[T.goal]}。

今天的目标：
- 总热量约 ${T.kcal} 千卡（上下 100 以内）
- 蛋白质至少 ${T.protein}g
- 脂肪 ${T.fatMin}–${T.fatMax}g，碳水约 ${T.carb}g
- 蔬菜至少 300g
- 钠尽量不超过 ${T.naMax || 2000}mg，膳食纤维尽量达到 ${T.fbMin || 25}g（这两项是次要目标，不要为了它们让热量和蛋白不达标）
- 总花费不超过 ${budget} 元，越省越好

每餐怎么吃：
${["b", "l", "d"].map((k) => `- ${SLOT_NAME[k]}：${MODE_TEXT[modes[k]]}`).join("\n")}
- 加餐：${snack ? "可以安排 1–2 样即食的" : "不要安排"}

食物库（一行一种）：id|名称|单位|千卡|蛋白g|脂肪g|碳水g|钠mg|膳食纤维g|价格元|加工方式|角色|适合的餐(b早l午d晚s加餐)|一天最多几个单位
${lines.join("\n")}

规则：
1. 只能用上面的 id。每样食物只能放在它「适合的餐」里，并且符合那一餐的吃法。
2. 午餐、晚餐各要有主食、蛋白、蔬菜（角色是 meal 的整份餐可以代替主食和蛋白）。
3. qty 是单位数，可以是 0.5 的倍数，不超过「一天最多」。
4. 每次的搭配要有变化，不要总是同一种组合。本次随机编号 ${Math.floor(Math.random() * 1e6)}。
${prevText ? `5. 上一份是：${prevText}。这次请明显换一种搭配。\n` : ""}${ask ? `用户今天的特别要求（在不违反上面规则的前提下尽量满足）：${ask}\n` : ""}
输出格式（严格 JSON）：
{"meals":{"b":[{"id":"oats","qty":1}],"l":[...],"d":[...],"s":[...]},"tip":"用一两句简单的中文说今天这样吃的要点"}`;
  return [{ role: "system", content: sys }, { role: "user", content: user }];
}

export function estimateMessages(name, unit) {
  return [
    { role: "system", content: "你是营养数据助手。只输出 JSON，不要任何别的文字。" },
    { role: "user", content: `估算这种食物的营养：「${name}」，单位是「${unit || "1 份"}」。\n按中国常见做法和常见品牌的典型值估算「每 1 个单位」的数值。\n输出：{"k":千卡数字,"p":蛋白质克数,"f":脂肪克数,"cb":碳水克数,"na":钠毫克数,"fb":膳食纤维克数,"note":"一句话说明估算依据，不确定就写不确定"}` },
  ];
}

export function planToText(plan, byId) {
  return SLOTS.map((s) => SLOT_NAME[s] + "：" + (plan.meals[s] || []).map((it) => (byId[it.id] ? byId[it.id].n : it.id) + "×" + it.qty).join("、")).join("；");
}

// ---------- 拍照识别食物 ----------
export function snapPrompt(foods) {
  const lib = foods.map((f) => `${f.id}|${f.n}|${f.u}`).join("\n");
  return `你是食物识别和营养估算助手。看这张照片，认出里面的食物，估算营养。只输出 JSON，不要任何别的文字。

照片可能是：
A. 一盘饭菜或食堂打的饭：把每样菜分开（比如 米饭、红烧鸡块、炒青菜），按照片里的份量估重量。
B. 包装食品的正面：认出是什么，按常见品牌的典型值估。
C. 包装上的「营养成分表」：直接读表上的数字，不要估。表上一般是每 100g 或每份，单位就照表写。

用户已有的食物库（id|名称|单位）。如果照片里的东西和库里某一样是同一种，就在 match 里填它的 id，qty 按库里的单位算：
${lib}

每样食物输出：
- n：中文名字，简短，例如「红烧鸡块」「某某牌高蛋白酸奶」
- u：一个单位是多少，带重量，例如「份(约150g)」「盒(200g)」「100g」
- qty：照片里大约有几个这样的单位（0.5 的倍数）
- k、p、f、cb：每 1 个单位的千卡、蛋白质克、脂肪克、碳水克（数字）
- na：每 1 个单位的钠，毫克（营养成分表上写的「钠」；饭菜按中国常见做法估，食堂菜和卤味一般偏咸）
- fb：每 1 个单位的膳食纤维，克（表上没写就按食物估）
- price：在中国大陆买 1 个单位大约多少元（食堂菜按一般大学食堂价）
- c：分类，只能是 ${CATS.join("、")} 里的一个
- r：角色，只能是 staple(主食) protein(蛋白) veg(蔬菜) fruit(水果) dairy(奶豆) fat(坚果油脂) meal(一整份套餐) 之一
- ck：吃之前怎么处理，0=即食 1=要热水 2=要开火
- s：适合哪几餐，用 b(早) l(午) d(晚) s(加餐) 组合，例如 "ld"
- out：是不是食堂或外面买的现成饭菜（true/false）
- match：库里同一种食物的 id，没有就写 null
- label：数字是不是从营养成分表上读的（true/false）
- sure：你有多确定，0 到 1

最多 6 样。看不出是食物就让 items 为空。

输出格式：
{"items":[{"n":"","u":"","qty":1,"k":0,"p":0,"f":0,"cb":0,"na":0,"fb":0,"price":0,"c":"","r":"","ck":0,"s":"ld","out":false,"match":null,"label":false,"sure":0.8}],"note":"一句简单中文：认出了什么，哪里不确定"}`;
}

const ROLES_OK = ["staple", "protein", "veg", "fruit", "dairy", "fat", "meal"];
const CAT_OF_ROLE = { staple: "主食", protein: "肉蛋水产", veg: "蔬菜", fruit: "水果", dairy: "奶和豆", fat: "坚果", meal: "食堂外食" };
const n1 = (x, max) => { const v = Number(x); return Number.isFinite(v) && v >= 0 ? Math.min(max, Math.round(v * 10) / 10) : 0; };

// 把模型给的结果整理干净，不信任里面任何字段
export function sanitizeSnap(raw, byId) {
  const items = (raw && Array.isArray(raw.items) ? raw.items : []).slice(0, 6).map((x) => {
    if (!x || typeof x !== "object") return null;
    const m = typeof x.match === "string" && byId[x.match] ? byId[x.match] : null;
    const r = ROLES_OK.includes(x.r) ? x.r : m ? m.r : "staple";
    const out = x.out === true || x.c === "食堂外食";
    const s = typeof x.s === "string" ? [...new Set(x.s.replace(/[^blds]/g, ""))].join("") : "";
    const it = {
      n: String(x.n || (m && m.n) || "").trim().slice(0, 24),
      u: String(x.u || "份").trim().slice(0, 16) || "份",
      qty: Math.max(0.5, Math.min(10, Math.round(n1(x.qty, 10) * 2) / 2 || 1)),
      k: n1(x.k, 3000), p: n1(x.p, 300), f: n1(x.f, 300), cb: n1(x.cb, 500), $: n1(x.price, 500),
      na: Math.round(n1(x.na, 20000)), fb: n1(x.fb, 100),
      c: out ? "食堂外食" : CATS.includes(x.c) ? x.c : CAT_OF_ROLE[r],
      r, ck: [0, 1, 2].includes(Number(x.ck)) ? Number(x.ck) : 0,
      s: s || (r === "fruit" || r === "dairy" || r === "fat" ? "bs" : "ld"),
      out, label: x.label === true, sure: Math.max(0, Math.min(1, Number(x.sure) || 0.6)),
      match: m ? m.id : null,
    };
    if (m) { it.u = m.u; }
    return it.n ? it : null;
  }).filter(Boolean);
  return { items, note: typeof (raw && raw.note) === "string" ? raw.note.slice(0, 160) : "" };
}
