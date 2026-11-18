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
    static let shortcuts = ["饭票学堂", "成就", "官方食谱", "段位", "主题市场"]
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
}
