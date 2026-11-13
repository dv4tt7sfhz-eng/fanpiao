#!/usr/bin/env node
// 把一份 fanpiao.ai/1 数据变成能直接打开饭票的链接。
// 用法：node tools/fanpiao-link.mjs 数据.json
// 打开链接后，饭票会显示「导入后会这样改」，用户确认后才写入。格式见 docs/AI接口.md
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("用法：node tools/fanpiao-link.mjs 数据.json"); process.exit(1); }
let pack;
try { pack = JSON.parse(fs.readFileSync(file, "utf8")); }
catch (e) { console.error("读不了这个文件，或者它不是 JSON：" + e.message); process.exit(1); }
if (!pack || typeof pack !== "object" || Array.isArray(pack)) { console.error("数据应该是用 { } 包起来的一整段。"); process.exit(1); }
if (!pack.format) pack.format = "fanpiao.ai/1";
const data = Buffer.from(JSON.stringify(pack)).toString("base64url");
console.log("fanpiao://import?data=" + data);
