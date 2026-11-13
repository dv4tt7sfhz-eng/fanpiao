// 内置食物库。每一项的营养都是「每 1 个单位」的数值，来自常见食物成分表和包装标签的典型值。
// n 名称 · c 分类 · u 单位 · k 千卡 · p 蛋白 · f 脂肪 · cb 碳水 · $ 默认价格(元)
// ck 加工：0 即食 / 1 有热水就行 / 2 要开火   · r 角色 · s 适合哪几餐(b早 l午 d晚 s加餐)
// na 钠(mg) · fb 膳食纤维(g)（在文件后面统一填）
// v 算多少克蔬菜 · st 每次加减多少 · mx 一天最多几个单位 · on 默认是否勾选 · out 食堂或外面买的
export const CATS = ["主食", "肉蛋水产", "奶和豆", "蔬菜", "水果", "坚果", "速食", "补剂", "食堂外食"];

const F = (id, n, c, u, k, p, f, cb, $, ck, r, s, x = {}) => ({ id, n, c, u, k, p, f, cb, $, ck, r, s, v: 0, st: 1, mx: 3, on: false, out: false, ...x });

export const FOODS = [
  // ---- 主食
  F("rice", "米饭", "主食", "碗(150g)", 174, 3.9, 0.5, 38.9, 0.6, 2, "staple", "ld", { st: 0.5, on: true }),
  F("bun", "馒头", "主食", "个(100g)", 223, 7, 1.1, 47, 1.0, 0, "staple", "bld", { on: true }),
  F("oats", "燕麦片", "主食", "份(50g)", 189, 6.8, 3.4, 33, 0.75, 1, "staple", "bs", { on: true }),
  F("bread_ww", "全麦面包", "主食", "片(40g)", 98, 3.6, 1.2, 18, 1.0, 0, "staple", "bs", { mx: 4, on: true }),
  F("bread_pro", "高蛋白面包", "主食", "片(50g)", 130, 10, 2, 18, 1.2, 0, "staple", "bls", { mx: 5 }),
  F("noodle", "挂面", "主食", "份(干100g)", 350, 11, 1, 74, 0.9, 2, "staple", "ld", { st: 0.5, mx: 2 }),
  F("soba", "荞麦面", "主食", "份(干100g)", 340, 11, 1.5, 70, 1.5, 2, "staple", "ld", { st: 0.5, mx: 2 }),
  F("sweetpotato", "红薯", "主食", "个(200g)", 172, 2.2, 0.4, 40, 1.5, 2, "staple", "blds", { mx: 2, on: true }),
  F("corn", "玉米", "主食", "根", 224, 8, 2.4, 45, 2.5, 2, "staple", "bls", { mx: 2 }),
  F("potato", "土豆", "主食", "个(200g)", 154, 4, 0.4, 34, 1.0, 2, "staple", "ld", { mx: 2 }),
  F("baozi_frozen", "速冻包子", "主食", "个(100g)", 220, 8, 8, 30, 1.5, 2, "staple", "b", { mx: 3 }),
  F("dumpling", "速冻水饺", "主食", "份(10个)", 440, 16, 16, 56, 5, 2, "staple", "ld", { st: 0.5, mx: 2 }),

  // ---- 肉蛋水产
  F("egg", "鸡蛋", "肉蛋水产", "个", 72, 6.5, 5, 0.6, 0.6, 2, "protein", "bld", { mx: 4, on: true }),
  F("tea_egg", "卤蛋 / 茶叶蛋", "肉蛋水产", "个", 75, 6.5, 5, 1, 1.5, 0, "protein", "blds", { mx: 3 }),
  F("chicken", "鸡胸肉（生）", "肉蛋水产", "份(100g)", 118, 24, 1.9, 0, 2.2, 2, "protein", "ld", { on: true }),
  F("chicken_ready", "即食鸡胸肉", "肉蛋水产", "袋(100g)", 120, 23, 2, 2, 4.5, 0, "protein", "lds", { mx: 2, on: true }),
  F("chicken_sausage", "鸡胸肉肠", "肉蛋水产", "根(60g)", 95, 12, 3, 4, 1.5, 0, "protein", "blds", {}),
  F("duck_leg", "即食鸭腿", "肉蛋水产", "袋(110g)", 200, 32, 7, 2, 3.8, 0, "protein", "lds", { mx: 2 }),
  F("chicken_leg", "鸡腿", "肉蛋水产", "只(可食120g)", 217, 19, 15.6, 0, 3.5, 2, "protein", "ld", { mx: 2 }),
  F("beef", "瘦牛肉", "肉蛋水产", "份(100g)", 115, 21, 3, 1, 7, 2, "protein", "ld", { mx: 2 }),
  F("pork", "猪瘦肉", "肉蛋水产", "份(100g)", 143, 20, 6.2, 1.5, 3, 2, "protein", "ld", { mx: 2, on: true }),
  F("fish", "鱼柳（巴沙/龙利）", "肉蛋水产", "份(100g)", 88, 16, 2.5, 0, 2.5, 2, "protein", "ld", {}),
  F("shrimp", "虾仁", "肉蛋水产", "份(100g)", 80, 17, 0.8, 1, 6, 2, "protein", "ld", { mx: 2 }),
  F("tuna", "水浸金枪鱼罐头", "肉蛋水产", "罐", 100, 22, 1, 0, 9, 0, "protein", "lds", { mx: 1 }),

  // ---- 奶和豆
  F("milk", "纯牛奶", "奶和豆", "盒(250ml)", 163, 8, 9.5, 12.5, 3, 0, "dairy", "bs", { mx: 2, on: true }),
  F("milk_skim", "脱脂牛奶", "奶和豆", "盒(250ml)", 88, 8.5, 0.5, 12.5, 3.5, 0, "dairy", "bs", { mx: 2 }),
  F("yogurt", "无糖酸奶", "奶和豆", "杯(200g)", 140, 6.4, 7, 10, 4, 0, "dairy", "bs", { mx: 2 }),
  F("soymilk", "无糖豆浆", "奶和豆", "杯(300ml)", 95, 9, 4.8, 3.5, 2, 0, "dairy", "bs", { mx: 2 }),
  F("tofu", "北豆腐", "奶和豆", "块(200g)", 200, 20, 11, 5, 1.5, 2, "protein", "ld", { mx: 2, on: true }),
  F("dried_tofu", "豆腐干", "奶和豆", "份(100g)", 147, 16, 5, 9, 2.5, 0, "protein", "lds", { mx: 2 }),

  // ---- 蔬菜
  F("broccoli", "西兰花", "蔬菜", "份(150g)", 51, 6, 0.9, 6.5, 1.8, 2, "veg", "ld", { v: 150, mx: 2, on: true }),
  F("cabbage", "娃娃菜 / 白菜", "蔬菜", "份(200g)", 30, 3, 0.4, 5, 0.8, 2, "veg", "ld", { v: 200, mx: 2, on: true }),
  F("greens", "绿叶菜", "蔬菜", "份(200g)", 36, 3.5, 0.6, 5, 1.2, 2, "veg", "ld", { v: 200, mx: 2, on: true }),
  F("mushroom", "菌菇", "蔬菜", "份(150g)", 35, 4, 0.5, 5, 2, 2, "veg", "ld", { v: 150, mx: 2 }),
  F("tomato", "番茄", "蔬菜", "个(200g)", 36, 1.8, 0.4, 7.5, 1.5, 0, "veg", "blds", { v: 200, mx: 2, on: true }),
  F("cucumber", "黄瓜", "蔬菜", "根(200g)", 32, 1.6, 0.4, 5.8, 1.2, 0, "veg", "lds", { v: 200, mx: 2, on: true }),
  F("carrot", "胡萝卜", "蔬菜", "根(120g)", 45, 1.2, 0.2, 10, 0.6, 0, "veg", "lds", { v: 120, mx: 2 }),
  F("pepper", "彩椒", "蔬菜", "个(180g)", 45, 1.8, 0.4, 9, 1.3, 0, "veg", "lds", { v: 180, mx: 2 }),
  F("lettuce", "生菜", "蔬菜", "份(150g)", 22, 2, 0.5, 3, 1.5, 0, "veg", "lds", { v: 150, mx: 2 }),
  F("dried_veg", "脱水蔬菜", "蔬菜", "把(20g)", 60, 3, 0.5, 10, 0.6, 1, "veg", "ld", { v: 180, mx: 2 }),

  // ---- 水果
  F("apple", "苹果", "水果", "个(200g)", 104, 0.4, 0.4, 27, 2, 0, "fruit", "bs", { mx: 2, on: true }),
  F("banana", "香蕉", "水果", "根", 93, 1.4, 0.2, 22, 1.2, 0, "fruit", "bs", { mx: 2, on: true }),
  F("orange", "橙子", "水果", "个(200g)", 94, 1.6, 0.4, 22, 2, 0, "fruit", "bs", { mx: 2 }),
  F("kiwi", "猕猴桃", "水果", "个", 61, 0.8, 0.6, 14.5, 1.5, 0, "fruit", "bs", { mx: 2 }),
  F("pear", "梨", "水果", "个(250g)", 125, 1, 0.5, 33, 2, 0, "fruit", "bs", { mx: 1 }),

  // ---- 坚果
  F("nuts", "混合坚果", "坚果", "小包(25g)", 150, 5, 13, 5, 2.5, 0, "fat", "bs", { mx: 2, on: true }),
  F("peanut", "花生", "坚果", "把(20g)", 115, 5, 9, 4, 0.5, 0, "fat", "bs", { mx: 2 }),
  F("pumpkin_seed", "南瓜子仁", "坚果", "把(15g)", 85, 4.5, 7, 2, 0.5, 0, "fat", "bs", { mx: 2 }),
  F("peanut_butter", "花生酱", "坚果", "勺(15g)", 90, 3.5, 7.5, 3, 0.6, 0, "fat", "b", { mx: 2 }),
  F("oil", "炒菜油", "坚果", "勺(8g)", 72, 0, 8, 0, 0.15, 2, "manual", "ld", { mx: 4 }),

  // ---- 速食
  F("inst_noodle", "泡面", "速食", "包", 460, 9, 18, 62, 2.1, 1, "staple", "ld", { mx: 1, junk: true }),
  F("inst_rice", "速食米饭", "速食", "盒(200g)", 232, 5, 0.6, 52, 3.5, 1, "staple", "ld", { mx: 2 }),
  F("onigiri", "便利店饭团", "速食", "个", 200, 4.5, 3, 38, 4.5, 0, "staple", "bl", { mx: 2 }),

  // ---- 补剂
  F("whey", "乳清蛋白粉", "补剂", "勺(30g)", 120, 23, 1.5, 3, 3, 0, "protein", "bs", { mx: 2, supp: true }),
  F("protein_bar", "蛋白棒", "补剂", "根", 160, 15, 5, 15, 6, 0, "protein", "s", { mx: 1, supp: true }),

  // ---- 食堂外食（按一份估算，油比自己做的多）
  F("c_rice", "食堂米饭", "食堂外食", "份(200g)", 232, 5.2, 0.6, 52, 1, 0, "staple", "ld", { st: 0.5, mx: 2, out: true, on: true }),
  F("c_meat", "食堂荤菜", "食堂外食", "份(约150g)", 270, 20, 18, 6, 6, 0, "protein", "ld", { mx: 2, out: true, on: true }),
  F("c_veg", "食堂素菜", "食堂外食", "份(约150g)", 105, 3, 7.5, 7, 2.5, 0, "veg", "ld", { v: 150, mx: 2, out: true, on: true }),
  F("c_weigh", "食堂称重肉菜", "食堂外食", "50g", 105, 8, 7, 2, 2.8, 0, "protein", "ld", { mx: 6, out: true }),
  F("o_baozi", "肉包子", "食堂外食", "个", 230, 8, 9, 29, 2, 0, "staple", "b", { mx: 3, out: true, on: true }),
  F("o_egg", "水煮蛋（外面买）", "食堂外食", "个", 72, 6.5, 5, 0.6, 1.5, 0, "protein", "b", { mx: 3, out: true, on: true }),
  F("o_soymilk", "豆浆（外面买）", "食堂外食", "杯", 95, 9, 4.8, 3.5, 2.5, 0, "dairy", "b", { mx: 1, out: true, on: true }),
  F("o_jianbing", "煎饼果子", "食堂外食", "个", 420, 14, 17, 52, 7, 0, "meal", "b", { mx: 1, out: true }),
  F("o_beefnoodle", "牛肉面", "食堂外食", "碗", 550, 25, 15, 78, 15, 0, "meal", "ld", { mx: 1, out: true }),
  F("o_hmj", "黄焖鸡米饭", "食堂外食", "份", 750, 35, 28, 85, 18, 0, "meal", "ld", { mx: 1, out: true }),
  F("o_salad", "鸡胸轻食沙拉", "食堂外食", "份", 420, 32, 15, 38, 22, 0, "meal", "ld", { v: 200, mx: 1, out: true }),
  F("o_mlt", "麻辣烫", "食堂外食", "份", 600, 28, 28, 55, 20, 0, "meal", "ld", { v: 150, mx: 1, out: true }),
  F("o_gaifan", "盖浇饭", "食堂外食", "份", 800, 25, 28, 110, 15, 0, "meal", "ld", { mx: 1, out: true }),
];

// 钠(mg) 和 膳食纤维(g)，同样是「每 1 个单位」。参考《中国食物成分表》和常见包装标签；
// 腌卤、即食、外食的钠差别很大，这里取常见的中间值。
const NAFB = {
  rice: [3, 0.5], bun: [165, 1.3], oats: [3, 5], bread_ww: [180, 2.8], bread_pro: [200, 3], noodle: [180, 1.5], soba: [100, 5],
  sweetpotato: [56, 4], corn: [5, 5], potato: [10, 4], baozi_frozen: [400, 1.5], dumpling: [1100, 3],
  egg: [70, 0], tea_egg: [300, 0], chicken: [65, 0], chicken_ready: [600, 0], chicken_sausage: [450, 0], duck_leg: [900, 0],
  chicken_leg: [90, 0], beef: [55, 0], pork: [60, 0], fish: [90, 0], shrimp: [250, 0], tuna: [300, 0],
  milk: [100, 0], milk_skim: [105, 0], yogurt: [100, 0], soymilk: [15, 1], tofu: [15, 1], dried_tofu: [600, 1],
  broccoli: [45, 4], cabbage: [110, 2], greens: [120, 3], mushroom: [10, 3.5], tomato: [10, 2.4], cucumber: [10, 1],
  carrot: [80, 3.3], pepper: [5, 3.6], lettuce: [50, 1.8], dried_veg: [80, 5],
  apple: [2, 4.8], banana: [1, 3], orange: [2, 4.5], kiwi: [2, 2.2], pear: [2, 6],
  nuts: [50, 2], peanut: [1, 1.7], pumpkin_seed: [1, 0.9], peanut_butter: [70, 1.2], oil: [0, 0],
  inst_noodle: [2000, 2], inst_rice: [10, 0.6], onigiri: [450, 1], whey: [60, 0], protein_bar: [200, 5],
  c_rice: [4, 0.6], c_meat: [700, 0.5], c_veg: [450, 2.5], c_weigh: [230, 0.3], o_baozi: [350, 1], o_egg: [70, 0],
  o_soymilk: [15, 1], o_jianbing: [1100, 2], o_beefnoodle: [2500, 3], o_hmj: [2200, 3], o_salad: [900, 6], o_mlt: [3000, 5], o_gaifan: [1800, 3],
};
for (const f of FOODS) { const x = NAFB[f.id] || [0, 0]; f.na = x[0]; f.fb = x[1]; }

export const CK_LABEL = ["即食", "要热水", "要开火"];
export const ROLE_LABEL = { staple: "主食", protein: "蛋白", veg: "蔬菜", fruit: "水果", dairy: "奶豆", fat: "坚果油脂", meal: "整份餐", manual: "手动添加" };
