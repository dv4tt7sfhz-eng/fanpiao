import Foundation

// 引擎回来的数据。数字一律用 Double，JS 里没有整数和小数之分。

struct Totals: Codable, Hashable, Sendable {
    var kcal: Double = 0, p: Double = 0, f: Double = 0, cb: Double = 0
    var cost: Double = 0, na: Double = 0, fb: Double = 0, veg: Double = 0
}

struct Targets: Codable, Hashable, Sendable {
    var kcal: Double, protein: Double, fat: Double, carb: Double
    var naMax: Double, fbMin: Double
    var goal: String
    var kind: String?
}

struct MealItem: Codable, Hashable, Identifiable, Sendable {
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
    var streak: Double
    var level: Level
    var profile: ProfileVM?
    var budget: Double
    var accent: String
    var salt: Double
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
    var month: Double
    var weights: Double
    var custom: Double
    var plan: String
    var streak: Double
    var level: Level
    var w: [WeightRec]
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
