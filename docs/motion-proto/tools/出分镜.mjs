// 出分镜图：每个场景触发以后，把动画停在几个时间点各截一张
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
const OUT = "/home/claude/fanpiao/docs/motion-proto/shots/";
const only = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["iPhone 13"], colorScheme: "dark" });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const open = async () => { await p.goto("http://127.0.0.1:8767/docs/motion-proto/index.html"); await p.waitForTimeout(150); };
const frames = async (name, ts) => { for (const t of ts) { await p.evaluate((t) => P.freeze(t), t); await p.waitForTimeout(60); await p.screenshot({ path: `${OUT}${name}-${String(t).padStart(4, "0")}.png` }); } };
const settle = async (ms = 2600) => { await p.waitForTimeout(ms); };
const S = {
  async home() { await open(); await frames("01-home", [120, 420, 800, 1300, 2400]); },
  async face() { await open(); await settle(); await p.evaluate(() => { P.mark(); P.face("r"); }); await p.waitForTimeout(40); await frames("02-face", [80, 260, 520, 900, 1900]); },
  async day() { await open(); await settle(); await p.evaluate(() => { P.mark(); P.day(1); }); await p.waitForTimeout(40); await frames("03-day", [60, 180, 340, 700]); },
  async expand() { await open(); await settle(); await p.evaluate(() => P.face("r")); await settle(1500); await p.evaluate(() => { P.mark(); P.expand(); }); await p.waitForTimeout(40); await frames("04-expand", [90, 240, 420, 760, 1500]); },
  async sheet() { await open(); await settle(); await p.evaluate(() => { P.mark(); P.sheet("plans"); }); await p.waitForTimeout(40); await frames("05-sheet", [110, 260, 480, 1000]);
    await settle(900); await p.evaluate(() => { P.mark(); P.pick(3); }); await p.waitForTimeout(40); await frames("06-pick", [90, 240, 480, 900]); },
  async theme() { await open(); await settle(); await p.evaluate(() => P.sheet("theme")); await settle(1400); await p.screenshot({ path: OUT + "07-theme-0000.png" });
    await p.evaluate(() => { P.mark(); P.accent(1); }); await p.waitForTimeout(60); await frames("07-theme", [140]);
    await p.evaluate(() => document.getAnimations().forEach((a) => a.play())); await settle(1300); await p.screenshot({ path: OUT + "07-theme-0800.png" });
    await p.evaluate(() => P.close()); await settle(900); await p.screenshot({ path: OUT + "07-theme-1600.png" }); },
  async cal() { await open(); await settle(); await p.evaluate(() => document.querySelector("#cal").scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
    await p.evaluate(() => { P.mark(); P.cal(24); }); await p.waitForTimeout(40); await frames("08-cal", [90, 220, 380, 800]);
    await settle(700); await p.evaluate(() => { P.mark(); P.month(1); }); await p.waitForTimeout(40); await frames("09-month", [70, 200, 380, 800]); },
};
for (const k of Object.keys(S)) if (!only || only === k) await S[k]();
console.log("errors:", errs);
await b.close();
