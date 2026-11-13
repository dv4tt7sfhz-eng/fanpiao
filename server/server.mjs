// 饭票参考后端（预留）。零依赖，Node 18 以上直接运行：node server/server.mjs
// 功能：注册登录、数据备份和恢复、公共食物库、代用户调用 AI（密钥放在服务器上）、注销账号。
// 环境变量：
//   PORT            端口，默认 8787
//   DATA_DIR        数据目录，默认 ./data
//   AI_BASE_URL     模型接口地址，例如 https://api.deepseek.com
//   AI_API_KEY      模型密钥（只放在服务器上，不会发给 App）
//   AI_MODEL        模型名，例如 deepseek-chat
//   AI_DAILY_LIMIT  每个账号每天最多调用几次 AI，默认 30
// 正式上线必须放在 HTTPS 后面（用 Caddy 或 Nginx 反向代理），不要直接把这个端口暴露到公网。
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FOODS } from "../www/js/foods.js";

const VERSION = "1.0.0";
const __dir = path.dirname(fileURLToPath(import.meta.url));

export function createServer(env = process.env) {
  const DATA_DIR = env.DATA_DIR || path.join(__dir, "data");
  const DB_FILE = path.join(DATA_DIR, "db.json");
  const AI = { base: (env.AI_BASE_URL || "").replace(/\/+$/, ""), key: env.AI_API_KEY || "", model: env.AI_MODEL || "", vmodel: env.AI_VISION_MODEL || env.AI_MODEL || "", limit: Number(env.AI_DAILY_LIMIT || 30) };
  const TOKEN_DAYS = 90, MAX_STATE = 1024 * 1024, MAX_BODY = 1.2 * 1024 * 1024;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  let db = { users: {} }; // users[name] = {salt, hash, tokens:{sha256: expiresAt}, state, updatedAt, ai:{day, n}}
  try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) {}
  let writing = Promise.resolve();
  const persist = () => { // 先写临时文件再改名，断电也不会写坏
    writing = writing.then(() => new Promise((res) => {
      const tmp = DB_FILE + ".tmp";
      fs.writeFile(tmp, JSON.stringify(db), (e) => (e ? res() : fs.rename(tmp, DB_FILE, () => res())));
    }));
    return writing;
  };

  const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
  const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
  const safeEq = (a, b) => { const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex"); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const fails = new Map(); // 登录失败次数限制：同一账号 15 分钟内最多错 5 次
  const tooMany = (k) => { const f = fails.get(k); return f && f.n >= 5 && Date.now() - f.t < 15 * 60e3; };
  const failed = (k) => { const f = fails.get(k); if (!f || Date.now() - f.t > 15 * 60e3) fails.set(k, { n: 1, t: Date.now() }); else f.n++; };

  function issueToken(u) {
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    for (const h in u.tokens) if (u.tokens[h] < now) delete u.tokens[h];
    u.tokens[sha(token)] = now + TOKEN_DAYS * 864e5;
    return token;
  }
  function auth(req) {
    const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || "");
    if (!m) return null;
    const h = sha(m[1]);
    for (const name in db.users) { const exp = db.users[name].tokens[h]; if (exp && exp > Date.now()) return name; }
    return null;
  }

  const send = (res, code, obj) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
    res.end(JSON.stringify(obj));
  };
  const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error("内容太大"), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (e) { reject(Object.assign(new Error("请求不是合法的 JSON"), { code: 400 })); } });
    req.on("error", reject);
  });

  async function route(req, res) {
    const url = new URL(req.url, "http://x");
    const key = req.method + " " + url.pathname;
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "86400" });
      return res.end();
    }
    if (key === "GET /v1/health") return send(res, 200, { name: "饭票服务器", version: VERSION, ai: !!(AI.base && AI.key && AI.model) });
    if (key === "GET /v1/foods") return send(res, 200, { version: VERSION, foods: FOODS });

    if (key === "POST /v1/auth/register" || key === "POST /v1/auth/login") {
      const b = await readBody(req);
      const user = String(b.user || "").trim().toLowerCase(), pw = String(b.password || "");
      if (!/^[a-z0-9_.@-]{3,64}$/.test(user)) return send(res, 400, { error: "账号只能用字母、数字和 _ . @ -，3 到 64 个字符" });
      if (pw.length < 8 || pw.length > 200) return send(res, 400, { error: "密码至少 8 位" });
      if (key.endsWith("register")) {
        if (db.users[user]) return send(res, 409, { error: "这个账号已经有人用了" });
        const salt = crypto.randomBytes(16).toString("hex");
        const u = (db.users[user] = { salt, hash: hashPw(pw, salt), tokens: {}, state: null, updatedAt: null, ai: { day: "", n: 0 }, createdAt: new Date().toISOString() });
        const token = issueToken(u); await persist();
        return send(res, 201, { user, token });
      }
      if (tooMany(user)) return send(res, 429, { error: "密码错太多次了，15 分钟后再试" });
      const u = db.users[user];
      // 账号不存在时也算一次哈希，防止用响应时间猜账号
      const ok = u ? safeEq(hashPw(pw, u.salt), u.hash) : (hashPw(pw, "0".repeat(32)), false);
      if (!ok) { failed(user); return send(res, 401, { error: "账号或密码不对" }); }
      fails.delete(user);
      const token = issueToken(u); await persist();
      return send(res, 200, { user, token });
    }

    // 下面的接口都要先登录
    const me = auth(req);
    if (!me) return send(res, 401, { error: "请先登录" });
    const u = db.users[me];

    if (key === "GET /v1/state") return send(res, 200, { state: u.state, updatedAt: u.updatedAt });
    if (key === "PUT /v1/state") {
      const b = await readBody(req);
      if (!b.state || typeof b.state !== "object") return send(res, 400, { error: "缺少 state" });
      if (JSON.stringify(b.state).length > MAX_STATE) return send(res, 413, { error: "备份数据超过 1MB" });
      if (b.state.ai) b.state.ai.key = ""; // 就算客户端带了密钥也不存
      u.state = b.state; u.updatedAt = new Date().toISOString(); await persist();
      return send(res, 200, { ok: true, updatedAt: u.updatedAt });
    }
    if (key === "POST /v1/auth/logout") { const m = /^Bearer (.+)$/.exec(req.headers.authorization); delete u.tokens[sha(m[1])]; await persist(); return send(res, 200, { ok: true }); }
    if (key === "DELETE /v1/account") { delete db.users[me]; await persist(); return send(res, 200, { ok: true }); }

    if (key === "POST /v1/ai/chat") {
      if (!(AI.base && AI.key && AI.model)) return send(res, 501, { error: "服务器还没有配置 AI" });
      const b = await readBody(req);
      // content 可以是文字，也可以是 [{type:"text"},{type:"image_url"}] 这种带图片的（拍照识别食物用）
      let textLen = 0, images = 0, bad = false;
      const part = (x) => {
        if (x && x.type === "text" && typeof x.text === "string") { textLen += x.text.length; return { type: "text", text: x.text }; }
        const url = x && x.type === "image_url" && x.image_url && x.image_url.url;
        if (typeof url === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url) && url.length <= 900000) { images++; return { type: "image_url", image_url: { url } }; }
        bad = true; return null;
      };
      const msgs = Array.isArray(b.messages) ? b.messages.filter((m) => m && ["system", "user", "assistant"].includes(m.role)).slice(0, 8).map((m) => {
        if (typeof m.content === "string") { textLen += m.content.length; return { role: m.role, content: m.content }; }
        if (Array.isArray(m.content) && m.content.length <= 6) return { role: m.role, content: m.content.map(part) };
        bad = true; return null;
      }) : [];
      if (bad || !msgs.length || textLen > 40000 || images > 2) return send(res, 400, { error: "messages 不合法或太长" });
      const day = new Date().toISOString().slice(0, 10);
      if (u.ai.day !== day) u.ai = { day, n: 0 };
      if (u.ai.n >= AI.limit) return send(res, 429, { error: `今天的 AI 次数用完了（每天 ${AI.limit} 次）` });
      u.ai.n++; persist();
      let r;
      try {
        r = await fetch(AI.base + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + AI.key },
          body: JSON.stringify({ model: images ? AI.vmodel : AI.model, messages: msgs, temperature: 1.0, response_format: { type: "json_object" } }), signal: AbortSignal.timeout(90000) });
      } catch (e) { return send(res, 502, { error: "服务器连不上模型服务" }); }
      if (!r.ok) return send(res, 502, { error: "模型服务出错（" + r.status + "）" });
      const data = await r.json();
      const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      let result = null;
      try { result = JSON.parse(text); } catch (e) { const a = text.indexOf("{"), z = text.lastIndexOf("}"); if (a >= 0 && z > a) try { result = JSON.parse(text.slice(a, z + 1)); } catch (e2) {} }
      if (result === null) return send(res, 502, { error: "模型的回答不是 JSON" });
      return send(res, 200, { result, remaining: AI.limit - u.ai.n });
    }
    return send(res, 404, { error: "没有这个接口" });
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => send(res, e.code && e.code < 600 ? e.code : 500, { error: e.code ? e.message : "服务器内部错误" }));
  });
  server.flush = () => writing;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  createServer().listen(port, () => console.log(`饭票服务器已启动：http://localhost:${port}/v1/health`));
}
