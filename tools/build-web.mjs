#!/usr/bin/env node
// 打包发出去的网页部分：www/（源码，自己改这里）→ dist/（打乱后的，装进安装包的是这里）
// 1. 所有 js 合成一个文件并压缩
// 2. 再打乱：变量名换成乱码、文字（包括中文）编码藏起来，别人解开安装包看不懂
// 3. css 压缩
// 用法：npm run build:web   （之后 npx cap sync 会把 dist 拷进安卓和苹果工程）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import JavaScriptObfuscator from "javascript-obfuscator";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "www"), OUT = path.join(ROOT, "dist");

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "js"), { recursive: true });
fs.cpSync(path.join(SRC, "fonts"), path.join(OUT, "fonts"), { recursive: true });

const js = await esbuild.build({
  entryPoints: [path.join(SRC, "js/app.js")], bundle: true, minify: true, format: "iife",
  target: ["es2019", "chrome70", "safari13"], write: false, legalComments: "none", charset: "utf8",
  // 界面文字写在 html`...` 模板里；拆成普通字符串，下一步才能把它们编码藏起来
  supported: { "template-literal": false },
});
const ob = JavaScriptObfuscator.obfuscate(js.outputFiles[0].text, {
  compact: true,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  stringArray: true, stringArrayEncoding: ["base64"], stringArrayThreshold: 1,
  stringArrayRotate: true, stringArrayShuffle: true, splitStrings: true, splitStringsChunkLength: 8,
  unicodeEscapeSequence: false, transformObjectKeys: true,
  // 食物库是公开数据，一大串文字切碎编码会让启动变慢，原样保留
  reservedStrings: ["^VC啤酒\\|"],
  // 下面这些会让动画变卡，不开
  controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, debugProtection: false,
});
fs.writeFileSync(path.join(OUT, "js/app.js"), ob.getObfuscatedCode());

const css = await esbuild.transform(fs.readFileSync(path.join(SRC, "styles.css"), "utf8"), { loader: "css", minify: true });
fs.writeFileSync(path.join(OUT, "styles.css"), css.code);

const html = fs.readFileSync(path.join(SRC, "index.html"), "utf8")
  .replace('<script type="module" src="js/app.js"></script>', '<script src="js/app.js"></script>');
if (!html.includes('<script src="js/app.js"></script>')) throw new Error("index.html 里没找到 app.js 的引用");
fs.writeFileSync(path.join(OUT, "index.html"), html);

const kb = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + " KB";
console.log(`dist/ 好了：js/app.js ${kb("js/app.js")}，styles.css ${kb("styles.css")}`);
