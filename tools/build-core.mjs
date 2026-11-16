// 打包 iPhone 原生版用的排餐引擎：core/entry.js → ios-native/Fanpiao/core.js
import * as esbuild from "esbuild";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const stub = { name: "stub", setup(b) {
  b.onResolve({ filter: /\.\/ui\.js$/ }, () => ({ path: path.join(root, "core/ui-stub.js") }));
  b.onResolve({ filter: /\.\/ai\.js$/ }, () => ({ path: path.join(root, "core/ai-stub.js") }));
} };
await esbuild.build({ entryPoints: [path.join(root, "core/entry.js")], bundle: true, minify: true, format: "iife", target: "es2019", charset: "utf8",
  outfile: path.join(root, "ios-native/Fanpiao/core.js"), plugins: [stub], logLevel: "warning" });
console.log("core.js ok");
