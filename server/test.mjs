// 接口测试：node server/test.mjs   全部通过会打印 ALL PASS
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createServer } from "./server.mjs";

const listen = (srv) => new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
// 假的模型服务，模仿 OpenAI 兼容接口
let lastAuth = "", lastBody = null;
const mock = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    lastAuth = req.headers.authorization; lastBody = JSON.parse(b || "null");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: '好的：{"meals":{"b":[{"id":"oats","qty":1}],"l":[],"d":[],"s":[]},"tip":"测试"}' } }] }));
  });
});
const mockPort = await listen(mock);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-"));
const env = { DATA_DIR: dir, AI_BASE_URL: `http://127.0.0.1:${mockPort}`, AI_API_KEY: "sk-server-secret", AI_MODEL: "mock", AI_VISION_MODEL: "mock-vl", AI_DAILY_LIMIT: "3" };
const srv = createServer(env);
const base = `http://127.0.0.1:${await listen(srv)}`;
const call = async (method, p, body, token) => {
  const r = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json().catch(() => null), h: r.headers };
};
let n = 0; const ok = (name) => console.log(`  ✓ ${++n} ${name}`);

let r = await call("GET", "/v1/health"); assert.equal(r.s, 200); assert.equal(r.j.ai, true); assert.equal(r.h.get("access-control-allow-origin"), "*"); ok("health + CORS");
r = await call("GET", "/v1/foods"); assert.ok(r.j.foods.length > 50); ok("公共食物库");
r = await call("POST", "/v1/auth/register", { user: "ab", password: "12345678" }); assert.equal(r.s, 400); ok("账号太短被拒绝");
r = await call("POST", "/v1/auth/register", { user: "tester", password: "short" }); assert.equal(r.s, 400); ok("密码太短被拒绝");
r = await call("POST", "/v1/auth/register", { user: "Tester", password: "correct-horse" }); assert.equal(r.s, 201); const t1 = r.j.token; assert.equal(r.j.user, "tester"); ok("注册");
r = await call("POST", "/v1/auth/register", { user: "tester", password: "correct-horse" }); assert.equal(r.s, 409); ok("重复注册被拒绝");
r = await call("GET", "/v1/state"); assert.equal(r.s, 401); ok("没登录不能读数据");
r = await call("GET", "/v1/state", null, "f".repeat(64)); assert.equal(r.s, 401); ok("假令牌不能读数据");
r = await call("GET", "/v1/state", null, t1); assert.equal(r.j.state, null); ok("新账号没有备份");
r = await call("PUT", "/v1/state", { state: { profile: { weight: 60 }, prefs: {}, ai: { key: "sk-leak" } } }, t1); assert.equal(r.s, 200); ok("上传备份");
r = await call("GET", "/v1/state", null, t1); assert.equal(r.j.state.profile.weight, 60); assert.equal(r.j.state.ai.key, ""); ok("恢复备份，密钥没被保存");
r = await call("PUT", "/v1/state", { state: { big: "x".repeat(1100000) } }, t1); assert.equal(r.s, 413); ok("超过 1MB 被拒绝");
r = await call("POST", "/v1/auth/login", { user: "tester", password: "wrong-password" }); assert.equal(r.s, 401); ok("密码错误");
r = await call("POST", "/v1/auth/login", { user: "nobody", password: "wrong-password" }); assert.equal(r.s, 401); ok("账号不存在，返回一样的提示");
r = await call("POST", "/v1/auth/login", { user: "tester", password: "correct-horse" }); assert.equal(r.s, 200); const t2 = r.j.token; assert.notEqual(t1, t2); ok("登录");
r = await call("POST", "/v1/ai/chat", { messages: [{ role: "user", content: "排餐" }] }, t2); assert.equal(r.s, 200); assert.equal(r.j.result.meals.b[0].id, "oats"); assert.equal(lastAuth, "Bearer sk-server-secret"); ok("AI 代理：用服务器的密钥，返回解析好的 JSON");
r = await call("POST", "/v1/ai/chat", { messages: [] }, t2); assert.equal(r.s, 400); ok("空 messages 被拒绝");
const img = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
r = await call("POST", "/v1/ai/chat", { messages: [{ role: "user", content: [{ type: "text", text: "认食物" }, { type: "image_url", image_url: { url: img } }] }] }, t2);
assert.equal(r.s, 200); assert.equal(lastBody.model, "mock-vl"); assert.equal(lastBody.messages[0].content[1].image_url.url, img); ok("带照片的请求：转给识图模型");
r = await call("POST", "/v1/ai/chat", { messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://evil.example/x.jpg" } }] }] }, t2); assert.equal(r.s, 400); ok("只收 base64 图片，不收外部链接");
r = await call("POST", "/v1/ai/chat", { messages: [{ role: "user", content: "再来" }] }, t2); assert.equal(r.s, 200);
r = await call("POST", "/v1/ai/chat", { messages: [{ role: "user", content: "再来" }] }, t2); assert.equal(r.s, 429); ok("每天次数上限");
for (let i = 0; i < 5; i++) await call("POST", "/v1/auth/login", { user: "tester", password: "wrong-password" });
r = await call("POST", "/v1/auth/login", { user: "tester", password: "correct-horse" }); assert.equal(r.s, 429); ok("连续输错 5 次后锁 15 分钟");
r = await call("POST", "/v1/auth/logout", null, t2); assert.equal(r.s, 200);
r = await call("GET", "/v1/state", null, t2); assert.equal(r.s, 401); ok("退出登录后令牌失效");
await srv.flush();
const disk = fs.readFileSync(path.join(dir, "db.json"), "utf8"); assert.ok(!disk.includes("correct-horse") && !disk.includes(t1) && !disk.includes("sk-leak")); ok("磁盘上没有明文密码、令牌和密钥");
r = await call("DELETE", "/v1/account", null, t1); assert.equal(r.s, 200);
r = await call("GET", "/v1/state", null, t1); assert.equal(r.s, 401); ok("注销账号后数据删除");
r = await call("GET", "/v1/nope", null, null); assert.equal(r.s, 401); ok("未知接口");
const srv2 = createServer({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "fp-")) }); const b2 = `http://127.0.0.1:${await listen(srv2)}`;
const reg = await (await fetch(b2 + "/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: "u_1", password: "password-1" }) })).json();
const ai = await fetch(b2 + "/v1/ai/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + reg.token }, body: JSON.stringify({ messages: [{ role: "user", content: "x" }] }) });
assert.equal(ai.status, 501); ok("没配置 AI 时返回 501");
srv.close(); srv2.close(); mock.close();
console.log("ALL PASS");
