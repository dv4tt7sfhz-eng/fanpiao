// 把分镜拼成一张张对照图
import fs from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const D = "/home/claude/fanpiao/docs/motion-proto/shots/";
const T = { "01-home": "① 打开首页：一层一层浮上来", "02-face": "② 封面上切「热量 / 节奏」：换面 + 换天色", "03-day": "③ 换一天：三层错开滑", "04-expand": "④ 过场：封面长成整页（计划详情）",
  "05-sheet": "⑤ 过场：面板升起，后面变糊", "06-pick": "⑥ 选计划：边画一圈、勾弹出来", "07-theme": "⑦ 过场：换主题色，颜色从点上漫开", "08-cal": "⑧ 日历：选中的黑块滑过去", "09-month": "⑨ 日历：翻月" };
const files = fs.readdirSync(D).filter((f) => /^\d\d-.*-\d{4}\.png$/.test(f)).sort();
const b = await chromium.launch(); const p = await (await b.newContext({ deviceScaleFactor: 2, viewport: { width: 1180, height: 100 } })).newPage();
for (const k of Object.keys(T)) {
  const fr = files.filter((f) => f.startsWith(k));
  if (!fr.length) continue;
  const html = `<body style="margin:0;background:#101014;font-family:-apple-system,'PingFang SC','Noto Sans CJK SC',sans-serif;color:#fff;padding:22px 24px 24px;width:${fr.length * 226 + 28}px">
    <div style="font-size:21px;font-weight:800;margin-bottom:14px">${T[k]}</div>
    <div style="display:flex;gap:14px">${fr.map((f) => `<div><img src="file://${D}${f}" style="width:212px;border-radius:22px;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.12)"><div style="font:700 13px ui-monospace,monospace;color:#9a9aa8;margin-top:8px;text-align:center">${+f.slice(-8, -4)} ms</div></div>`).join("")}</div></body>`;
  fs.writeFileSync(D + "_tmp.html", html);
  await p.goto("file://" + D + "_tmp.html"); await p.waitForTimeout(200);
  await (await p.$("body")).screenshot({ path: `${D}分镜-${k}.png` });
}
fs.unlinkSync(D + "_tmp.html");
await b.close();
