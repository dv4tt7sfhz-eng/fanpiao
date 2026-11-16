import Foundation
import SwiftUI
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

    private let file: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("fanpiao.v1.json")
    }()
    private let engine = Engine.shared

    init() {
        if let s = try? String(contentsOf: file, encoding: .utf8), !s.isEmpty { state = s }
        else { state = (try? engine.callSync("blank", [], as: StateOnly.self).S) ?? "" }
        hasProfile = (try? engine.callSync("hasProfile", [.raw(state)], as: Bool.self)) ?? false
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-fpDemo") && !hasProfile { applyDemo() }
    }

    static var today: String {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    private func save() { try? state.write(to: file, atomically: true, encoding: .utf8) }

    private func adopt(_ s: String) {
        state = s; save()
        hasProfile = (try? engine.callSync("hasProfile", [.raw(state)], as: Bool.self)) ?? false
    }

    func say(_ text: String) {
        toast = text
        Task { try? await Task.sleep(for: .seconds(2.4)); if toast == text { toast = nil } }
    }

    // ---------- 首页 ----------
    func refresh() async { await homeCall("home", [.raw(state), .str(Self.today)]) }
    func replan() async { await homeCall("replan", [.raw(state), .str(Self.today)]); say("换了一份新的") }
    func toggle(_ slot: String, _ i: Int) async { await homeCall("toggle", [.raw(state), .str(Self.today), .str(slot), .num(Double(i))]) }
    func remove(_ slot: String, _ i: Int) async { await homeCall("removeItem", [.raw(state), .str(Self.today), .str(slot), .num(Double(i))]) }
    func setQty(_ slot: String, _ i: Int, _ q: Double) async { await homeCall("setQty", [.raw(state), .str(Self.today), .str(slot), .num(Double(i)), .num(q)]) }
    func setMode(_ slot: String, _ mode: String) async { await homeCall("setMode", [.raw(state), .str(Self.today), .str(slot), .str(mode)]) }
    func addFood(_ slot: String, id: String, qty: Double, done: Bool) async {
        await homeCall("addFood", [.raw(state), .str(Self.today), .str(slot), .str(id), .num(qty), .bool(done)])
    }
    func addLib(_ hit: LibHit, grams: Double, slot: String, done: Bool) async {
        await homeCall("addLib", [.raw(state), .str(Self.today), .num(Double(hit.lid)), .num(grams), .str(slot), .bool(done)])
        say("已记到\(slotName(slot))：\(hit.n) \(Fmt.n(grams)) 克")
    }

    private func homeCall(_ name: String, _ args: [Engine.Arg]) async {
        busy = true; defer { busy = false }
        do {
            let r = try await engine.call(name, args, as: StateAndHome.self)
            adopt(r.S)
            withAnimation(.snappy) { home = r.v }
            accent = r.v.accent
        } catch { say(error.localizedDescription) }
    }

    // ---------- 其他页 ----------
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
        if let r = try? await engine.call("addWeight", [.raw(state), .num(kg)], as: StateOnly.self) { adopt(r.S); say("记下了：\(Fmt.one(kg)) kg") }
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

    /// 截图 / 演示用：一份通用的示例资料（不是任何真人的数据）
    private func applyDemo() {
        let json = #"{"sex":"m","age":20,"height":175,"weight":65,"goal":"gain","activity":1.55}"#
        if let r = try? engine.callSync("setProfile", [.raw(state), .raw(json)], as: StateOnly.self) { adopt(r.S) }
    }
}

func slotName(_ s: String) -> String { ["b": "早餐", "l": "午餐", "d": "晚餐", "s": "加餐"][s] ?? s }
func slotIcon(_ s: String) -> String { ["b": "sunrise", "l": "sun.max", "d": "moon.stars", "s": "cup.and.saucer"][s] ?? "fork.knife" }
