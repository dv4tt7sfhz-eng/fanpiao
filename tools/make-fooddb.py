#!/usr/bin/env python3
# 生成 www/js/fooddb.js：1700 种常见食物，每 100 克的营养。
# 数据来源：npm 包 cn-food-mcp 1.0.0（MIT 许可）里的 dist/data/foods.json，原始数据整理自《中国食物成分表》。
# 用法：npm pack cn-food-mcp@1.0.0 && tar xzf cn-food-mcp-1.0.0.tgz && python3 tools/make-fooddb.py package/dist/data/foods.json
import json, sys, re
src = json.load(open(sys.argv[1], encoding="utf-8"))
seen, rows = set(), []
def fix(n):
    n = n.replace("?", "").replace("|", "/").strip()
    if n.count("(") > n.count(")"): n += ")"
    return n
for x in src:
    n = fix(x["name"]); e = x["energy"] or 0
    if not n or n in seen or e <= 0: continue
    p, c, f = x["protein"] or 0, x["carbohydrate"] or 0, x["fat"] or 0
    calc = p * 4 + c * 4 + f * 9
    if abs(calc - e) > max(40, 0.35 * e) and not re.search(r"酒|度\)", n): continue  # 数字明显对不上的不要
    seen.add(n)
    g = lambda v: ("%g" % round(v or 0, 1))
    rows.append("|".join([n, g(e), g(p), g(c), g(f), g(x["fiber"]), g(x["sodium"])]))
out = open("www/js/fooddb.js", "w", encoding="utf-8")
out.write("// 食物库：%d 种常见食物，每 100 克的营养（千卡|蛋白|碳水|脂肪|膳食纤维|钠 mg）。\n" % len(rows))
out.write("// 数据来源：开源项目 cn-food-mcp（MIT 许可），原始数据整理自《中国食物成分表》。由 tools/make-fooddb.py 生成，别手改。\n")
out.write("export const LIB_RAW = " + json.dumps("\n".join(rows), ensure_ascii=False) + ";\n")
print(len(rows), "foods")
