import Foundation

/// 整个 App 里显示的字都在这里。框架和动画照 Norg 预览一点不动，只换这里的字。
enum L {
    // 标志旁边的名字、开场
    static let brand = "饭票"
    static let pro = "PRO"
    static let streak = "0"

    // 底栏
    static let tabToday = "今日"
    static let tabPlan = "排餐"
    static let tabFind = "发现"
    static let tabMe = "我的"

    // 今日页
    static let days = ["前日", "昨日", "今日", "明日", "后日"]
    static let shortcuts = ["饭票学堂", "囤货柜", "官方食谱", "每元蛋白", "奶茶计算"]
    static let bodyData = "身体数据"
    static let edit = "编辑"
    static let rankTitle = "饮食段位"
    static let rankName = "黑铁 I"
    static let rankHint = "吃够一天 开始积累段位"
    static let rankXP = "0 / 120 XP"
    static let rankNext = "黑铁 II"

    // 今日卡片：左边排餐、右边饮食
    static let segA = "排餐"
    static let segB = "饮食"
    static let cardTitle = "暂无排餐"
    static let cardSub1 = "尚未选择食谱"
    static let cardSub2 = "这一天还没有排餐安排"
    static let cardBtn = "安排三餐"
    static let dietGoal = "目标"
    static let dietLeft = "还可吃"
    static let dietGoalKcal = "2,390"
    static let kcal = "kcal"
    static let dietEaten = "0"
    static let dietMeals = "已记录 0 餐"
    static let dietPct = "0%"
    static let macros = ["蛋白质", "碳水", "脂肪"]
    static let macroZero = "0g"

    // 安排三餐整页
    static let sheetToday = "今日"
    static let sheetBlock = "餐食板块"
    static let sheetBlockCount = "0"
    static let sheetCreate = "创建板块"
    static let sheetEmpty = "暂无安排"
    static let sheetEmptySub = "创建一个餐食板块，安排这一天的三餐"
    static let weekdays = ["日", "一", "二", "三", "四", "五", "六"]
    static let todayShort = "今"

    // 排餐页
    static let planTitle = "排餐"
    static let planNew = "新食谱"
    static let planPhoto = "拍照识别"
    static let planBlank = "从零开始排餐"
    static let planContinue = "继续排餐"
    static let planList = "我的食谱"
    static let planCount = "0"
    static let planLib = "食物库"
    static let planEmpty = "还没有食谱"
    static let planEmptySub = "创建新食谱，或拍营养成分表后点击“保存食谱”"

    // 发现页
    static let feedTabs = ["推荐", "好友", "主题市场"]
    static let officialAvatar = "饭"
    static let officialName = "饭票官方"
    static let officialMeta = "11月13日 15:00 · 投票"
    static let pollQuestion = "宿舍党最常囤的高蛋白是什么？"
    static let pollOptions = ["即食鸡胸肉", "鸡蛋和牛奶", "蛋白粉和蛋白棒"]
    static let pollJoined = "人参与"
    static let pollVoted = "已投票"
    static let postAvatar = "杰"
    static let postName = "阿杰."
    static let postTime = "35 分钟前"
    static let postTitle = "今日饭票：一天吃够 120g 蛋白"
    static let postStatA = "1980"
    static let postStatALabel = "摄入 (大卡)"
    static let postStatB = "126"
    static let postStatBLabel = "蛋白质 (g)"
    static let postChips = ["4 餐", "1980 kcal", "13 种", "0天"]

    // 我的页
    static let meAvatar = "饭"
    static let meName = "饭票同学 5864"
    static let meStats = [("0", "记录天数"), ("0", "粉丝"), ("1", "关注")]
    static let meBio = "添加个人简介"
    static let meRank = "黑铁 I"
    static let meBadges = "成就 0"
    static let meMonth = "本月记录天数"
    static let meMonthValue = "0"
    static let meMonthUnit = "天"
    static let meMonthTotal = "总计 0 天"
    static let meFeed = "我的动态"
    static let meFeedEmpty = "暂无动态"
    static let meFeedEmptySub = "记录一餐后可发布动态"

    // ---------- 旧版饭票的内容（3.0 搬过来） ----------

    // 今日页：哪一天
    static func dayName(_ o: Int) -> String {
        if (-2...2).contains(o) { return days[o + 2] }
        let d = Calendar(identifier: .gregorian).date(byAdding: .day, value: o, to: Date()) ?? Date()
        let w = weekdays[Calendar(identifier: .gregorian).component(.weekday, from: d) - 1]
        return (o < 0 ? "上周" : "周") + w
    }
    static let streakUnit = "天"

    // 身体数据卡
    static let cardWeight = "体重"
    static let cardBMI = "BMI"
    static let cardTarget = "每日目标"
    static let cardKg = "kg"
    static let cardNoWeight = "还没记过"
    static func weightDelta(_ d: Double, days: Int) -> String {
        if abs(d) < 0.05 { return "和 \(days) 天前一样" }
        return "比 \(days) 天前 " + (d > 0 ? "+" : "−") + Fmt.one(abs(d))
    }
    static func bmiLevel(_ b: Double) -> String { b < 18.5 ? "偏瘦" : b < 24 ? "正常" : b < 28 ? "偏重" : "肥胖" }
    static func targetSub(_ p: Double) -> String { "蛋白 \(Fmt.n(p)) g" }

    // 段位卡
    static func rankHintNext(_ left: Double, _ next: String) -> String { next.isEmpty ? "已经是最高段位" : "再得 \(Fmt.n(left)) XP 升到 \(next)" }
    static func rankXPText(_ cur: Double, _ need: Double) -> String { "\(Fmt.n(cur)) / \(Fmt.n(need)) XP" }

    // 今日卡片（有排餐时）
    static func cardSubA(_ n: Int, _ kcal: Double, _ done: Int) -> String { "\(n) 样 · 约 \(Fmt.k(kcal)) kcal · 已吃 \(done)/\(n)" }
    static func cardSubB(_ cost: Double, _ p: Double) -> String { "今天约 ¥\(Fmt.yuan(cost)) · 蛋白 \(Fmt.n(p)) g" }
    static func dietMealsN(_ n: Int) -> String { "已记录 \(n) 餐" }

    // 安排三餐整页：餐食板块
    static func sheetDate(_ m: Int, _ d: Int, _ name: String) -> String { "\(m)月\(d)日 · \(name)" }
    static func mealSum(_ kcal: Double, _ p: Double, _ cost: Double) -> String { "\(Fmt.k(kcal)) kcal · 蛋白 \(Fmt.n(p)) g · ¥\(Fmt.yuan(cost))" }
    static func itemQty(_ q: String, _ u: String) -> String { "\(q) × \(u)" }
    static func itemSub(_ p: Double, _ cost: Double) -> String { "蛋白 \(Fmt.one(p))g · ¥\(Fmt.yuan(cost))" }
    static let mealSkip = "轻断食：这一餐不吃"
    static let mealEmpty = "这一餐还没有安排，点右边的 + 加一样"
    static let mealAdd = "加一样"
    static let itemMore = "多加半份"
    static let itemLess = "少半份"
    static let itemDelete = "删掉"
    static let modeOut = "食堂 / 外面吃"
    static let modeCold = "不开火"
    static let modeCook = "自己做"
    static let sheetFootnote = "每份的热量和价格是常见值，以包装和食堂实际为准。"
    static let replanToast = "换了一份新的"

    // 饮食整页
    static let dietRecipe = "饭票智能食谱"
    static let dietRecipeSub = "选一份食谱，安排每天的餐食"
    static let dietNoRecord = "这一天还没有餐食记录"
    static let dietRecord = "记录饮食"
    static let dietEatenTitle = "已经吃了"
    static func dietRecipeUsing(_ n: String) -> String { "正在用「\(n)」，点这里换一份" }
    static func dietEatenN(_ n: Int) -> String { "已经吃了 \(n) 样" }

    // 排餐页
    static let planCurrent = "生效中"
    static let planRhythm = "接下来两周"
    static let planLocked = "要填的东西多，可以先用「让 AI 帮你填」"
    static func planSwitched(_ n: String) -> String { "换成「\(n)」" }
    static let plansTitle = "官方食谱"

    // 发现页
    static let pollTitle = "你最常囤哪种高蛋白？"
    static let pollPick = "点一个"
    static let pollTips = [
        "即食鸡胸肉：一袋大约 100 克，蛋白二十多克，买的时候看看钠别太高。",
        "鸡蛋一个大约 6 克蛋白，一盒 250 毫升牛奶大约 8 克，便宜又好买。",
        "蛋白粉一勺大约 20 克蛋白；蛋白棒看一下糖和脂肪，有的其实是零食。"
    ]
    static let myPostName = "我的饭票"
    static let myPostTime = "今天"
    static func myPostTitle(_ p: Double) -> String { "今日饭票：一天吃够 \(Fmt.n(p))g 蛋白" }
    static func myPostChips(_ meals: Int, _ kcal: Double, _ n: Int, _ streak: Int) -> [String] { ["\(meals) 餐", "\(Fmt.n(kcal)) kcal", "\(n) 种", "\(streak)天"] }
    static let officialMetaTip = "饭票学堂 · 科普"
    static let friendsEmpty = "还没有好友"
    static let friendsEmptySub = "饭票的数据只存在这台手机上，好友功能还在做"
    static let readMore = "看全文"

    // 我的页
    static let meStatLabels = ["记录天数", "本周", "体重记录"]
    static func meBioText(_ goal: String, _ h: Double, _ w: Double, _ kcal: Double) -> String { "\(goal) · \(Fmt.n(h)) cm · \(Fmt.one(w)) kg · 每天 \(Fmt.k(kcal)) kcal" }
    static func meBadgesN(_ n: Int) -> String { "成就 \(n)" }
    static func meMonthTotalN(_ n: Int) -> String { "总计 \(n) 天" }
    static let meWeekTitle = "最近 7 天"
    static let meWeekSub = "每天吃了多少千卡，虚线是目标"
    static let meVersion = "饭票 4.1（iPhone 原生版）· 数据只存在这台手机上"

    // 第一次打开
    static let welcomeTitle = "先认识一下你"
    static let welcomeSub = "用来算你一天该吃多少。数据只存在这台手机上。"
    static let welcomeSelf = "自己填（1 分钟）"
    static let welcomeAI = "让 AI 帮你填"
    static let welcomeAISub = "把说明发给任何 AI，再把它写的那段粘回来"

    // 让 AI 帮你填
    static let aiStep1 = "第一步：复制说明，发给任何 AI"
    static let aiStep1Sub = "可以附上营养成分表、外卖菜单的照片。AI 会问你几个问题，最后写一段数据。"
    static let aiStep2 = "第二步：把 AI 写的那段粘回来"
    static let aiCopy = "复制给 AI 的说明"
    static let aiCopyAgain = "再复制一次"
    static let aiCopied = "已复制。去粘贴给你的 AI 吧"

    // 设置
    static let setTitle = "设置"
    static let setHabits = "吃饭的习惯"
    static let setBudget = "每天预算"
    static let setNoLimit = "不限"
    static let setSnack = "要加餐"
    static let setProfile = "改身体资料"
    static let setAI = "让 AI 帮你填"
    static let setTheme = "主题色"
    static let setRecords = "记录和体重"
    static let setFoods = "我的食物和食物库"

    // 主题市场
    static let themeTitle = "主题市场"
    static let themeNote = "主题色会用在底栏和弹出页面的按钮上。"
    static let themeUsing = "使用中"

    // 体重
    static let weightTitle = "体重"
    static let weightInput = "今天的体重 kg"
    static let weightSave = "记下"
    static let weightBad = "体重请填 20–300 之间的数字"
    static let weightNone = "还没有体重记录"
    static let weightHistory = "最近的记录"

    // 通知
    static let noticeTitle = "通知"
    static let noticeEmpty = "暂无新通知"
    static let noticeSub = "排餐、记录都在这台手机上完成，不会给你发推送。"

    static let done = "完成"

    // ---------- 4.2 ----------
    static let copyDone = "照搬了昨天的三餐，打过勾的没动"
    static let copyNone = "昨天没有排餐，没法照搬"
    static let replanStock = "重新排好了，先用了柜子里的"
    static let ctaSheet = "重新排 · 先吃柜子里的"
    static let copyLabel = "和昨天一样"
    static func itemLeft(_ n: Double) -> String { "柜子里还剩 \(Fmt.one(n))" }

    // 红字超标
    static let over = "超标"
    static func overKcal(_ v: Double) -> String { "超标 \(Fmt.k(v)) kcal" }

    // 身体数据：钠、痘痘分
    static let cardSodium = "钠（今天）"
    static let mg = "mg"
    static func sodiumLeft(_ v: Double) -> String { "还能吃 \(Fmt.k(v)) mg" }
    static func sodiumOver(_ v: Double) -> String { "超标 \(Fmt.k(v)) mg" }
    static let cardAcne = "痘痘分（今天）"
    static let acneSoon = "4.5 上线"

    // 我的页
    static func monthSpent(_ v: Double) -> String { "花了 ¥\(Fmt.n(v))" }
    static let reviewTitle = "这个月的你"
    static let reviewLabels = ["蛋白吃够", "平均每天", "皮肤分"]
    static let reviewNote = "只讲过程，不放体重"
    static let reviewShare = "分享这个月"
    static func reviewText(_ days: Int, _ avg: Double) -> String { "这个月在饭票里：蛋白吃够 \(days) 天，平均每天吃饭花 ¥\(Fmt.yuan(avg))。" }

    // 我的柜子
    static let stockTitle = "我的柜子"
    static let stockIn = "进货"
    static let stockSumA = "柜子里的蛋白够吃"
    static func stockDays(_ d: Double) -> String { "约 \(Fmt.one(d)) 天" }
    static let stockSumB = "按你现在的排餐算"
    static let stockFilters = ["全部", "快吃完"]
    static func stockEach(_ u: String, _ price: Double, _ p: Double) -> String { "每\(u) ¥\(Fmt.yuan(price)) · 蛋白 \(Fmt.one(p)) g" }
    static func stockLasts(_ d: Double) -> String { d < 1 ? "不够一天了" : "够 \(Fmt.n(d)) 天" }
    static let stockLow = "该补了"
    static let stockEmpty = "柜子还是空的"
    static let stockEmptySub = "网购到货后点右上角「进货」录一次，以后在三餐里打勾就会自动减。"
    static let stockPick = "进什么货？"
    static let stockSearch = "搜你的食物"
    static let stockCount = "数量"
    static let stockTotal = "这一批一共多少钱（可不填）"
    static func stockUnit(_ n: Double, _ total: Double, _ p: Double) -> String {
        guard n > 0, total > 0 else { return "填了总价，自动算单价" }
        let each = total / n
        return "= 每份 ¥\(Fmt.yuan(each))" + (p > 0 ? " · 每克蛋白 ¥\(String(format: "%.2f", each / p))" : "")
    }
    static let stockSave = "放进柜子"
    static let stockEdit = "改数量"
    static let stockRemove = "拿出柜子"
    static let stockNote = "剩 3 份以下会写「该补了」。饭票不卖货，也不推荐去哪买。"

    // 每元蛋白
    static let valueTitle = "每元蛋白"
    static let valueSub = "1 块钱能买到几克蛋白（你开着的食物和柜子里的）"
    static let valueModes = ["每元蛋白", "每元热量"]
    static func valueEach(_ price: Double, _ u: String, _ p: Double) -> String { "¥\(Fmt.yuan(price)) / \(u) · 蛋白 \(Fmt.one(p)) g" }
    static let valueUnitP = "g / 元"
    static let valueUnitK = "kcal / 元"
    static let valueCupboard = "柜子里"
    static let swapTitle = "换一换"
    static func swapA(_ n: String, _ price: Double, _ p: Double) -> String { "\(n)（¥\(Fmt.yuan(price))，蛋白 \(Fmt.one(p)) g）" }
    static func swapB(_ n: String, _ q: Double, _ cost: Double) -> String { "→ \(n) \(Fmt.one(q)) 份（¥\(Fmt.yuan(cost))，蛋白一样多）" }
    static func swapSave(_ v: Double) -> String { "每次省 ¥\(Fmt.yuan(v))" }
    static let valueNote = "价格来自食物库和你进货时填的数，可以在食物库或柜子里改。不推广告。"

    // 奶茶计算
    static let teaTitle = "奶茶计算"
    static let teaSub = "粗略估算，不同店差很多，以店里标的为准。"
    static let teaBase = "底"
    static let teaBases = ["奶茶", "鲜奶茶", "果茶", "纯茶"]
    static let teaSize = "杯型"
    static let teaSizes = ["中杯", "大杯"]
    static let teaSugar = "甜度"
    static let teaSugars = ["全糖", "七分", "五分", "三分", "无糖"]
    static let teaTops = "加料"
    static let teaTopNames = ["珍珠", "椰果", "芋圆", "奶盖", "布丁"]
    static let teaKcal = "大约"
    static func teaSugarG(_ g: Double) -> String { "糖约 \(Fmt.n(g)) g" }
    static let teaTip = "少一档甜度、不加奶盖，热量掉得最多。"
    static let teaPrice = "这杯多少钱"
    static let teaAdd = "记到加餐"
    static func teaName(_ base: String, _ size: String, _ sugar: String) -> String { "\(base) · \(size) · \(sugar)" }

    // ---------- 4.3 ----------
    // 暖心小动画
    static func moment(_ k: MomentKind) -> (String, String) {
        switch k {
        case .comfort: return ("记下来就很好。", "明天的饭，我帮你排好了。")
        case .welcome: return ("欢迎回来", "从今天接着来就好。")
        case .water: return ("这一点多半是水", "长 1 公斤脂肪大约要多吃 7700 千卡。\n盐、碳水、睡眠都会让体重跳一下，看一周的平均就好。")
        case .cheer: return ("今天蛋白吃够了", "肌肉是在休息的时候长的，今晚早点睡。")
        }
    }

    // 拍一下就识别
    static let snapTitle = "拍照识别"
    static let snapModes = ["拍饭菜", "拍营养成分表", "说一句"]
    static let snapHints = [
        "拍一盘饭菜、食堂打的饭，或者一包零食的正面。AI 会把每样分开，估热量和蛋白。",
        "拍包装背面的「营养成分表」，AI 只照着表上的数字抄，不估。拍清楚、别反光。",
        "不想拍照？说一句吃了什么，比如「一碗牛肉面加一个卤蛋」。"
    ]
    static let snapCamera = "拍照"
    static let snapAlbum = "从相册选"
    static let snapSayHint = "比如：一碗牛肉面加一个卤蛋"
    static let snapGo = "让 AI 算"
    static let snapReading = "正在认……"
    static let snapStop = "停止"
    static let snapAte = "已经吃了（打勾）"
    static func snapSave(_ n: Int) -> String { n > 0 ? "存进食物库并记到这一餐（\(n) 样）" : "至少勾一样" }
    static let snapAgain = "重新拍"
    static let snapNothing = "没认出食物，换个角度再拍一张试试。"
    static let snapFromLabel = "表上读的"
    static let snapUnsure = "不太确定"
    static let snapInLib = "库里有"
    static func snapSaved(_ n: Int) -> String { "存好了 \(n) 样" }
    static let snapNeedVision = "拍照识别要用能看图的 AI 模型。在「AI 设置」里填一个你自己的密钥就能用。"
    static let snapNeedText = "「说一句」要用 AI 模型。在「AI 设置」里填一个你自己的密钥就能用。"
    static let snapOrCopy = "不想填密钥？复制说明发给任何 AI"
    static let snapPrivacy = "照片只发给你自己选的那家 AI，饭票没有服务器，也不存你的照片。"

    // AI 设置
    static let aiSetTitle = "AI 设置"
    static let aiSetSub = "饭票不带 AI，用你自己的密钥。密钥只存在这台手机上。"
    static let aiProvider = "用哪一家"
    static let aiKey = "密钥（API Key）"
    static let aiBase = "接口地址（OpenAI 兼容）"
    static let aiModel = "模型名"
    static let aiVModel = "识图模型（可不填）"
    static let aiNoVisionHere = "这家不能看图，拍照识别要换一家"
    static func aiVisionDefault(_ m: String) -> String { "识图模型（不填就用 \(m)）" }
    static func aiGetKey(_ site: String) -> String { "去 \(site) 申请密钥" }
    static let aiSave = "保存"
    static let aiSaved = "AI 设置存好了"
    static let aiRecommend = "想先试试：智谱、通义千问、硅基流动都有能看图的模型，有的有免费额度（以官网为准）。DeepSeek 目前不能看图，只能用「说一句」。"
    static let aiKeyPrivacy = "饭票只在你点「识别」的时候，把照片或那句话发给你选的那一家。"
    static let aiNoKey = "还没填 AI 密钥，到「AI 设置」填一个。"
    static let aiNoVision = "这家 AI 不能看图，或者识图模型名不对。到「AI 设置」换一家，比如智谱或通义千问。"
    static let aiBadBase = "接口地址不对，到「AI 设置」检查一下。"
    static let aiNetwork = "连不上 AI，看看网络再试一次。"
    static let aiBadKey = "密钥不对或者没开通，到「AI 设置」检查一下。"
    static let aiBadModel = "模型名不对，到「AI 设置」检查一下。"
    static let aiBusy = "AI 那边太忙或者额度用完了，过一会儿再试。"
    static let aiBadReply = "AI 回的东西看不懂，再试一次。"
    static func aiFailed(_ code: Int) -> String { "AI 暂时用不了（\(code)），过一会儿再试。" }
    static let setAISettings = "AI 设置（拍照识别）"

    // 底栏浮窗：下一顿
    static func nextTitle(_ meal: String, _ n: Int) -> String { "\(meal) · \(n) 样" }
    static func nextSub(_ kcal: Double, _ p: Double) -> String { "约 \(Fmt.k(kcal)) kcal · 蛋白 \(Fmt.n(p)) g" }
    static let allDone = "今天都吃完了"
    static func allDoneSub(_ kcal: Double, _ p: Double) -> String { "吃了 \(Fmt.k(kcal)) kcal · 蛋白 \(Fmt.n(p)) g" }
    static func ateMeal(_ meal: String) -> String { "\(meal)打好勾了" }
    static let noPlanYet = "还没排餐"
    static let noPlanSub = "点一下，饭票帮你排"
}
