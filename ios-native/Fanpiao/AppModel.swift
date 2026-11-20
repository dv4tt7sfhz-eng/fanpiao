import Foundation
import SwiftUI
import UIKit
import Observation

/// 整个 App 的数据。状态（和网页版一样的 fanpiao.v1 格式）存在手机里的一个文件里。
@MainActor
@Observable
final class AppModel {
    var state: String = ""
    var home: HomeVM?
    var hasProfile = false
    var busy = false
    var toast: String?
    var accent: String = ""
    /// 今日页正在看哪一天：0 今天，-1 昨天，1 明天……
    var dayOffset = 0
    /// 累计数字（连续天数、段位、记录天数）
    var stats: StatsVM?
    /// 弹出页面
    var route: Route?
    /// 暖心小动画（安慰、欢迎回来、体重涨的是水、蛋白吃够了）
    var moment: Moment?

    private let file: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("fanpiao.v1.json")
    }()
    private let engine = Engine.shared
    private var homeFile: URL { file.deletingLastPathComponent().appendingPathComponent("home-cache.json") }

    init() {
        if let s = try? String(contentsOf: file, encoding: .utf8), !s.isEmpty { state = s }
        else { state = (try? engine.callSync("blank", [], as: StateOnly.self).S) ?? "" }
        hasProfile = (try? engine.callSync("hasProfile", [.raw(state)], as: Bool.self)) ?? false
        // 先把上次的首页直接摆出来（同一天才用），后台再算最新的
        if let d = try? Data(contentsOf: homeFile), let h = try? JSONDecoder().decode(HomeVM.self, from: d), h.date == Self.today {
            home = h; accent = h.accent
        }
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-fpDemo") && !hasProfile { applyDemo() }
        stats = try? engine.callSync("stats", [.raw(state)], as: StatsVM.self)
        if let r = LaunchArgs.value("-fpRoute") { route = Route.named(r) }
    }

    /// 正在看的那一天（yyyy-MM-dd）
    var day: String { Self.date(offset: dayOffset) }

    static func date(offset: Int) -> String {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        let d = Calendar(identifier: .gregorian).date(byAdding: .day, value: offset, to: Date()) ?? Date()
        return f.string(from: d)
    }

    /// 换一天看：日期条、标题一起滑过去，数字跟着滚
    func setDay(_ offset: Int) async {
        guard offset != dayOffset else { return }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) { dayOffset = offset }
        await refresh()
    }

    /// 从某天（yyyy-MM-dd）到今天过了几天
    static func daysSince(_ d: String) -> Int {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        guard let x = f.date(from: d), let y = f.date(from: today) else { return 0 }
        return Int((y.timeIntervalSince(x) / 86400).rounded())
    }

    static var today: String {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    private func save() { try? state.write(to: file, atomically: true, encoding: .utf8) }

    private func adopt(_ s: String) {
        state = s; save()
        hasProfile = (try? engine.callSync("hasProfile", [.raw(state)], as: Bool.self)) ?? false
        stats = try? engine.callSync("stats", [.raw(state)], as: StatsVM.self)
    }

    func say(_ text: String) {
        toast = text
        Task { try? await Task.sleep(for: .seconds(2.4)); if toast == text { toast = nil } }
    }

    // ---------- 首页 ----------
    func refresh() async { await homeCall("home", [.raw(state), .str(day)]) }
    func replan() async { await homeCall("replan", [.raw(state), .str(day)]); say(L.replanStock) }
    func toggle(_ slot: String, _ i: Int) async {
        let before = home
        await homeCall("toggle", [.raw(state), .str(day), .str(slot), .num(Double(i))])
        guard let a = before, let b = home, dayOffset == 0 else { return }
        if a.eaten.kcal <= a.T.kcal && b.eaten.kcal > b.T.kcal { show(.comfort) }
        else if a.eaten.p < a.T.protein && b.eaten.p >= b.T.protein { show(.cheer) }
    }
    /// 这一餐没打勾的全部打勾（底栏浮窗上的 ✓）
    func eatMeal(_ slot: String) async {
        guard let meal = home?.meals.first(where: { $0.slot == slot }) else { return }
        let before = home
        for it in meal.items where !it.done {
            await homeCall("toggle", [.raw(state), .str(day), .str(slot), .num(Double(it.i))])
        }
        say(L.ateMeal(meal.name))
        guard let a = before, let b = home, dayOffset == 0 else { return }
        if a.eaten.kcal <= a.T.kcal && b.eaten.kcal > b.T.kcal { show(.comfort) }
        else if a.eaten.p < a.T.protein && b.eaten.p >= b.T.protein { show(.cheer) }
    }
    /// 记好一餐：这一餐只留打勾的，后面几餐按今天还剩多少重新排
    func rebalance(_ slot: String) async {
        await homeCall("rebalance", [.raw(state), .str(day), .str(slot)])
        say(L.rebalanced(slotName(slot)))
    }
    /// 记录页正在记哪一餐（拍照、奶茶默认记到这一餐）
    var focusSlot: String?

    /// 放一个暖心小动画
    func show(_ kind: MomentKind) { moment = Moment(kind: kind) }
    func remove(_ slot: String, _ i: Int) async { await homeCall("removeItem", [.raw(state), .str(day), .str(slot), .num(Double(i))]) }
    func setQty(_ slot: String, _ i: Int, _ q: Double) async { await homeCall("setQty", [.raw(state), .str(day), .str(slot), .num(Double(i)), .num(q)]) }
    func setMode(_ slot: String, _ mode: String) async { await homeCall("setMode", [.raw(state), .str(day), .str(slot), .str(mode)]) }
    func addFood(_ slot: String, id: String, qty: Double, done: Bool) async {
        await homeCall("addFood", [.raw(state), .str(day), .str(slot), .str(id), .num(qty), .bool(done)])
    }
    func addLib(_ hit: LibHit, grams: Double, slot: String, done: Bool) async {
        await homeCall("addLib", [.raw(state), .str(day), .num(Double(hit.lid)), .num(grams), .str(slot), .bool(done)])
        say("已记到\(slotName(slot))：\(hit.n) \(Fmt.n(grams)) 克")
    }

    private func homeCall(_ name: String, _ args: [Engine.Arg]) async {
        guard hasProfile else { return }
        busy = true; defer { busy = false }
        do {
            let r = try await engine.call(name, args, as: StateAndHome.self)
            adopt(r.S)
            withAnimation(Motion.quick) { home = r.v }
            accent = r.v.accent
            if r.v.date == Self.today, let d = try? JSONEncoder().encode(r.v) { try? d.write(to: homeFile) }
        } catch { say(error.localizedDescription) }
    }

    // ---------- 其他页 ----------
    /// 和昨天一样
    func copyYesterday() async {
        guard hasProfile else { return }
        do {
            let r = try await engine.call("copyDay", [.raw(state), .str(day)], as: CopyResult.self)
            adopt(r.S)
            withAnimation(Motion.quick) { home = r.v }
            say(r.ok ? L.copyDone : L.copyNone)
        } catch { say(error.localizedDescription) }
    }
    func stock() async -> StockVM? { try? await engine.call("stock", [.raw(state)], as: StockVM.self) }
    func stockIn(_ id: String, _ n: Double, total: Double) async {
        if let r = try? await engine.call("stockIn", [.raw(state), .str(id), .num(n), .num(total)], as: StateOnly.self) { adopt(r.S); await refresh() }
    }
    func setStock(_ id: String, _ n: Double) async {
        if let r = try? await engine.call("setStock", [.raw(state), .str(id), .num(n)], as: StateOnly.self) { adopt(r.S); await refresh() }
    }
    // ---------- 拍照识别 ----------
    func aiInfo() -> AIInfo? { try? engine.callSync("aiInfo", [.raw(state)], as: AIInfo.self) }
    func setAI(_ p: [String: Any]) async {
        let json = String(data: (try? JSONSerialization.data(withJSONObject: p)) ?? Data("{}".utf8), encoding: .utf8) ?? "{}"
        if let r = try? await engine.call("setAI", [.raw(state), .raw(json)], as: StateOnly.self) { adopt(r.S) }
    }
    /// mode: 0 拍饭菜，1 拍营养成分表，2 说一句
    func snap(mode: Int, images: [UIImage], desc: String) async throws -> SnapResult {
        guard let info = aiInfo() else { throw AIClient.Failure(message: L.aiFailed(0)) }
        if mode == 1 {
            let prompt = try engine.callSync("packPrompt", [.bool(images.count > 1)], as: String.self)
            let raw = try await AIClient.ask(info.vision, prompt: prompt, images: images)
            return try engine.callSync("packClean", [.raw(raw)], as: SnapResult.self)
        }
        let prompt = try engine.callSync("snapPrompt", [.raw(state), .str(desc), .bool(mode == 2)], as: String.self)
        let raw = mode == 2
            ? try await AIClient.ask(info.text, prompt: prompt, userText: String(desc.prefix(300)))
            : try await AIClient.ask(info.vision, prompt: prompt, images: images)
        return try engine.callSync("snapClean", [.raw(state), .raw(raw)], as: SnapResult.self)
    }
    func snapSave(_ items: [SnapItem], slot: String, ate: Bool) async {
        guard let data = try? JSONEncoder().encode(items), let json = String(data: data, encoding: .utf8) else { return }
        await homeCall("snapSave", [.raw(state), .str(day), .str(slot), .raw(json), .bool(ate)])
        say(L.snapSaved(items.count))
    }

    func values() async -> [ValueItem] { (try? await engine.call("values", [.raw(state)], as: [ValueItem].self)) ?? [] }
    /// 记一杯奶茶这类不在食物库里的东西（直接记成已吃）
    func addQuick(_ slot: String, name: String, k: Double, p: Double, f: Double, cb: Double, cost: Double) async {
        await homeCall("addQuick", [.raw(state), .str(day), .str(slot), .str(name), .num(k), .num(p), .num(f), .num(cb), .num(cost)])
        show(.comfort)
    }
    func foods() async -> FoodsVM? { try? await engine.call("foods", [.raw(state)], as: FoodsVM.self) }
    func setOn(_ id: String, _ on: Bool) async {
        if let r = try? await engine.call("setOn", [.raw(state), .str(id), .bool(on)], as: StateOnly.self) { adopt(r.S) }
    }
    func search(_ q: String) async -> [LibHit] { (try? await engine.call("search", [.str(q)], as: [LibHit].self)) ?? [] }
    func records(_ n: Int) async -> RecordsVM? { try? await engine.call("records", [.raw(state), .num(Double(n))], as: RecordsVM.self) }
    func plans() async -> PlansVM? { try? await engine.call("plans", [.raw(state)], as: PlansVM.self) }
    func setPlan(_ id: String) async {
        if let r = try? await engine.call("setPlan", [.raw(state), .str(id)], as: StateOnly.self) { adopt(r.S); await refresh() }
    }
    func goals() -> GoalsVM? { try? engine.callSync("goals", [], as: GoalsVM.self) }
    func addWeight(_ kg: Double) async {
        let prev = stats?.w.last?.kg
        if let r = try? await engine.call("addWeight", [.raw(state), .num(kg)], as: StateOnly.self) {
            adopt(r.S)
            if let prev, kg - prev >= 0.3 { show(.water) } else { say("记下了：\(Fmt.one(kg)) kg") }
        }
    }
    func setProfile(_ p: [String: Any]) async {
        let json = String(data: (try? JSONSerialization.data(withJSONObject: p)) ?? Data("{}".utf8), encoding: .utf8) ?? "{}"
        if let r = try? await engine.call("setProfile", [.raw(state), .raw(json)], as: StateOnly.self) { adopt(r.S); await refresh() }
    }
    func setPrefs(_ p: [String: Any]) async {
        let json = String(data: (try? JSONSerialization.data(withJSONObject: p)) ?? Data("{}".utf8), encoding: .utf8) ?? "{}"
        if let r = try? await engine.call("setPrefs", [.raw(state), .raw(json)], as: StateOnly.self) { adopt(r.S); await refresh() }
    }
    func setAccent(_ id: String) async {
        accent = id
        await setPrefs(["accent": id])
    }
    func importPreview(_ text: String) async throws -> ImportPreview {
        try await engine.call("importPreview", [.raw(state), .str(text)], as: ImportPreview.self)
    }
    func importApply(_ pv: ImportPreview) async {
        if let r = try? await engine.call("importApply", [.raw(state), .raw(pv.next)], as: StateOnly.self) { adopt(r.S); await refresh(); say("导入好了") }
    }

    /// 给 AI 的说明（复制后发给任何 AI，附上营养成分表照片）
    func aiPrompt() -> String { (try? engine.callSync("aiPrompt", [.raw(state), .bool(true)], as: String.self)) ?? "" }

    /// 截图 / 演示用：一份通用的示例资料和一周的示例记录（不是任何真人的数据）
    private func applyDemo() {
        let json = #"{"sex":"m","age":20,"height":175,"weight":65,"goal":"gain","activity":1.55}"#
        if let r = try? engine.callSync("setProfile", [.raw(state), .raw(json)], as: StateOnly.self) { adopt(r.S) }
        if let r = try? engine.callSync("demo", [.raw(state)], as: StateOnly.self) { adopt(r.S) }
        home = nil
    }
}

func slotName(_ s: String) -> String { ["b": "早餐", "l": "午餐", "d": "晚餐", "s": "加餐"][s] ?? s }
func slotIcon(_ s: String) -> String { ["b": "sunrise", "l": "sun.max", "d": "moon.stars", "s": "cup.and.saucer"][s] ?? "fork.knife" }
