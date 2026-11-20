import Foundation

// 引擎回来的数据。数字一律用 Double，JS 里没有整数和小数之分。

struct Totals: Codable, Hashable, Sendable {
    var kcal: Double = 0, p: Double = 0, f: Double = 0, cb: Double = 0
    var cost: Double = 0, na: Double = 0, fb: Double = 0, veg: Double = 0
    /// 铁（毫克），4.4 起才有
    var fe: Double? = 0
}

struct Targets: Codable, Hashable, Sendable {
    var kcal: Double, protein: Double, fat: Double, carb: Double
    var naMax: Double, fbMin: Double
    var goal: String
    var kind: String?
    /// 女生模式：经前一周多给的弹性（这范围内不算超标），和黄体期加了多少
    var flex: Double?
    var plus: Double?
}

/// 女生模式（经期数据只在这台手机上）
struct HerVM: Codable, Hashable, Sendable {
    struct Cycle: Codable, Hashable, Sendable, Identifiable { var s: String; var e: String; var days: Double; var id: String { s } }
    struct Sym: Codable, Hashable, Sendable { var pain: Double?; var mood: Double?; var swell: Double? }
    var on: Bool
    var nonum: Bool
    var pill: Bool
    var logged: Bool
    var len: Double
    var pLen: Double
    var day: Double
    var phase: String
    var next: String
    var until: Double
    var irregular: Bool
    var doctor: String
    var inPeriod: Bool
    var open: Bool
    var late: Double
    var start: String
    var cycles: [Cycle]
    var sym: Sym?
    var ironT: Double
}

struct MealItem: Codable, Hashable, Identifiable, Sendable {
    /// 柜子里还剩几份（没放进柜子就是 nil）
    var left: Double?
    var i: Int
    var id: String
    var n: String
    var u: String
    var qty: Double
    var qtyText: String
    var kcal: Double
    var p: Double
    var cost: Double
    var done: Bool
    var rowID: String { "\(id)#\(i)" }
}

struct Meal: Codable, Hashable, Identifiable, Sendable {
    var slot: String
    var name: String
    var mode: String
    var skip: Bool
    var items: [MealItem]
    var sum: Totals
    var id: String { slot }
}

struct Level: Codable, Hashable, Sendable {
    var xp: Double, lv: Double, cur: Double, need: Double
    var name: String, next: String
    var tier: Double
}

struct ProfileVM: Codable, Hashable, Sendable {
    var sex: String?
    var age: Double?
    var height: Double?
    var weight: Double?
    var goal: String?
}

struct HomeVM: Codable, Hashable, Sendable {
    var date: String
    var T: Targets
    var planned: Totals
    var eaten: Totals
    var meals: [Meal]
    var issues: [String]
    var label: String
    var kindName: String
    var planName: String
    var planTag: String
    var goalName: String
    /// 本周（周一开始）吃了几天
    var week: Double?
    var streak: Double
    var level: Level
    var profile: ProfileVM?
    var budget: Double
    var accent: String
    var salt: Double
    var her: HerVM?
}

extension HomeVM {
    /// 女生模式开着
    var herOn: Bool { her?.on ?? false }
    /// 无数字模式：只说「够了 / 差一点 / 多了」
    var nonum: Bool { her?.nonum ?? false }
    /// 热量吃到多少才算超标（经前一周有 100 kcal 弹性）
    var kcalCap: Double { T.kcal + (T.flex ?? 0) }
}

struct StateAndHome: Decodable, Sendable { var S: String; var v: HomeVM }
struct StateOnly: Decodable, Sendable { var S: String }

struct Food: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var n: String
    var u: String
    var c: String
    var k: Double
    var p: Double
    var f: Double
    var cb: Double
    var price: Double
    var na: Double
    var fb: Double
    var on: Bool
    var out: Bool
    var ck: Double
    var custom: Bool
}
struct FoodsVM: Decodable, Sendable { var cats: [String]; var foods: [Food] }

struct LibHit: Codable, Hashable, Identifiable, Sendable {
    var lid: Int
    var n: String
    var k: Double, p: Double, cb: Double, f: Double, fb: Double, na: Double
    var id: Int { lid }
}

struct ImportPreview: Decodable, Sendable {
    var rows: [[String]]
    var warns: [String]
    var note: String
    var next: String
}

struct DayRecord: Codable, Hashable, Identifiable, Sendable {
    var d: String
    var T: Targets
    var e: Totals
    var id: String { d }
}
struct WeightRec: Codable, Hashable, Identifiable, Sendable { var d: String; var kg: Double; var id: String { d } }
struct RecordsVM: Decodable, Sendable { var days: [DayRecord]; var weights: [WeightRec]; var level: Level; var streak: Double }

struct PlanInfo: Codable, Hashable, Identifiable, Sendable { var id: String; var g: String; var n: String; var tag: String; var d: String; var simple: Bool }
struct RhythmDay: Codable, Hashable, Identifiable, Sendable { var d: String; var kind: String?; var kcal: Double; var id: String { d } }
struct PlansVM: Decodable, Sendable { var cur: String; var plans: [PlanInfo]; var rhythm: [RhythmDay] }

struct GoalOpt: Codable, Hashable, Sendable { var id: String; var n: String; var d: String }
struct ActivityOpt: Codable, Hashable, Sendable { var v: Double; var n: String; var d: String }
struct GoalsVM: Decodable, Sendable { var goals: [GoalOpt]; var activity: [ActivityOpt] }

enum Fmt {
    static func n(_ v: Double) -> String { v.isFinite ? String(Int(v.rounded())) : "—" }
    static func one(_ v: Double) -> String {
        guard v.isFinite else { return "—" }
        let r = (v * 10).rounded() / 10
        return r == r.rounded() ? String(Int(r)) : String(format: "%.1f", r)
    }
    static func yuan(_ v: Double) -> String { String(format: "%.1f", (v * 10).rounded() / 10) }
}

/// 我的页、成就要的累计数字
struct StatsVM: Codable, Hashable, Sendable {
    var days: Double
    var full: Double
    var items: Double
    var first: String
    var last: String?
    var month: Double
    var weights: Double
    var custom: Double
    var plan: String
    var streak: Double
    var level: Level
    var w: [WeightRec]
    var week: Double?
    var monthCost: Double?
    var monthProtein: Double?
    var monthAvg: Double?
}

/// 我的柜子里的一样
struct StockItem: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var n: String
    var u: String
    var left: Double
    var price: Double
    var p: Double
    var k: Double
    var days: Double
    var low: Bool
}

struct StockVM: Codable, Hashable, Sendable {
    var items: [StockItem]
    var proteinDays: Double
}

/// 每元蛋白排行的一样
struct ValueItem: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var n: String
    var u: String
    var price: Double
    var p: Double
    var k: Double
    var gpy: Double
    var kpy: Double
    var stocked: Bool
}

struct CopyResult: Decodable, Sendable {
    var S: String
    var v: HomeVM
    var ok: Bool
}

extension Fmt {
    /// 千位加逗号：2390 → 2,390
    static func k(_ v: Double) -> String {
        guard v.isFinite else { return "—" }
        let n = Int(v.rounded())
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "en_US")
        return f.string(from: NSNumber(value: n)) ?? String(n)
    }
}

// ---------- 4.3 拍照识别 ----------

/// AI 认出来的一样（字段和网页版 sanitizeSnap 一样，价格换成了 price）
struct SnapItem: Codable, Hashable, Identifiable, Sendable {
    var id = UUID()
    var n: String
    var u: String
    var qty: Double
    var k: Double
    var p: Double
    var f: Double
    var cb: Double
    var na: Double
    var fb: Double
    var c: String
    var r: String
    var ck: Double
    var s: String
    var out: Bool
    var label: Bool?
    var pkg: Bool?
    var pack: Bool?
    var sure: Double
    var match: String?
    var price: Double

    enum CodingKeys: String, CodingKey { case n, u, qty, k, p, f, cb, na, fb, c, r, ck, s, out, label, pkg, pack, sure, match, price }
}

struct SnapResult: Codable, Sendable {
    var items: [SnapItem]
    var note: String
    var ok: Bool?
    var warn: [String]?
}

struct AIProvider: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var n: String
    var base: String
    var model: String
    var vmodel: String
    var site: String
}

struct AIEndpoint: Codable, Hashable, Sendable {
    var base: String
    var key: String
    var model: String
}

struct AIInfo: Codable, Sendable {
    var providers: [AIProvider]
    var provider: String
    var base: String
    var model: String
    var key: String
    var vmodel: String
    var vision: AIEndpoint
    var text: AIEndpoint
}
