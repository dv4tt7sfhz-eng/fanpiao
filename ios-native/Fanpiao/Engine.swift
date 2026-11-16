import Foundation
import JavaScriptCore

/// 排餐引擎：在 iPhone 自带的 JavaScriptCore 里跑 core.js（和安卓 / 网页版同一套规则）。
/// JSContext 不能多线程同时用，所以所有调用都排在同一条队列上。
final class Engine: @unchecked Sendable {
    static let shared = Engine()
    private let queue = DispatchQueue(label: "fanpiao.engine")
    private var ctx: JSContext!

    private init() {
        queue.sync {
            ctx = JSContext()!
            ctx.exceptionHandler = { _, e in print("JS 出错：", e?.toString() ?? "") }
            // JavaScriptCore 里没有 console，补一个最简单的
            let log: @convention(block) (String) -> Void = { print("[core]", $0) }
            ctx.setObject(unsafeBitCast(log, to: AnyObject.self), forKeyedSubscript: "__log" as NSString)
            ctx.evaluateScript("var console = { log: function(){ __log(Array.prototype.join.call(arguments, ' ')) }, warn: function(){}, error: function(){ __log(Array.prototype.join.call(arguments, ' ')) } };")
            if let url = Bundle.main.url(forResource: "core", withExtension: "js"),
               let src = try? String(contentsOf: url, encoding: .utf8) {
                ctx.evaluateScript(src)
            }
        }
    }

    enum Arg {
        case raw(String)      // 已经是 JSON 的（比如整份状态）
        case str(String)
        case num(Double)
        case bool(Bool)
        var json: String {
            switch self {
            case .raw(let s): return s.isEmpty ? "null" : s
            case .str(let s):
                let d = try? JSONSerialization.data(withJSONObject: [s], options: [.fragmentsAllowed])
                let a = d.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
                return String(a.dropFirst().dropLast())
            case .num(let n): return n.isFinite ? String(n) : "0"
            case .bool(let b): return b ? "true" : "false"
            }
        }
    }

    struct EngineError: LocalizedError { let message: String; var errorDescription: String? { message } }
    private struct Envelope<T: Decodable>: Decodable { let ok: T?; let error: String? }

    /// 同步调用（在引擎队列里跑）。
    func callSync<T: Decodable>(_ name: String, _ args: [Arg], as: T.Type = T.self) throws -> T {
        let argsJSON = "[" + args.map(\.json).joined(separator: ",") + "]"
        var text = ""
        queue.sync {
            let fp = ctx.objectForKeyedSubscript("FP")
            text = fp?.call(withArguments: [name, argsJSON])?.toString() ?? "{\"error\":\"引擎没加载\"}"
        }
        let env = try JSONDecoder().decode(Envelope<T>.self, from: Data(text.utf8))
        if let e = env.error { throw EngineError(message: e) }
        guard let ok = env.ok else { throw EngineError(message: "引擎没有返回结果") }
        return ok
    }

    /// 异步调用：排餐要算一会儿，不卡住界面。
    func call<T: Decodable & Sendable>(_ name: String, _ args: [Arg], as: T.Type = T.self) async throws -> T {
        try await withCheckedThrowingContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                do { cont.resume(returning: try self.callSync(name, args, as: T.self)) }
                catch { cont.resume(throwing: error) }
            }
        }
    }
}
