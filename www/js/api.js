// 云端接口（预留）。默认不连服务器，App 完全离线可用。
// 以后有了服务器，在「我的 → 云端」里填上地址就能：注册登录、备份和恢复数据、用服务器上的 AI。
// 接口定义见 server/openapi.yaml，参考实现见 server/server.js。
const clean = (u) => String(u || "").trim().replace(/\/+$/, "");

async function call(base, path, { method = "GET", token, body } = {}) {
  let res;
  try {
    res = await fetch(clean(base) + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) { throw new Error("连不上服务器，请检查地址和网络。"); }
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && data.error) || `服务器出错（${res.status}）`);
  return data;
}

export const cloud = {
  health: (base) => call(base, "/v1/health"),
  register: (base, user, password) => call(base, "/v1/auth/register", { method: "POST", body: { user, password } }),
  login: (base, user, password) => call(base, "/v1/auth/login", { method: "POST", body: { user, password } }),
  pull: (base, token) => call(base, "/v1/state", { token }),
  push: (base, token, state) => call(base, "/v1/state", { method: "PUT", token, body: { state } }),
  foods: (base) => call(base, "/v1/foods"),
};

// 上传时不带密钥和登录信息
export function exportable(s) {
  const { ai, cloud: c, ...rest } = s;
  return { ...rest, ai: { provider: ai.provider, base: ai.base, model: ai.model, key: "", vprovider: ai.vprovider || "", vbase: ai.vbase || "", vmodel: ai.vmodel || "", vkey: "" } };
}
