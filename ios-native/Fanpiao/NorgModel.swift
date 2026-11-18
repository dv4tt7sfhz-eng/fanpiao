import SwiftUI
import QuartzCore
import Observation

/// 启动参数（云端 Mac 截图用）
enum LaunchArgs {
    static let all = ProcessInfo.processInfo.arguments
    static func has(_ k: String) -> Bool { all.contains(k) }
    static func value(_ k: String) -> String? {
        guard let i = all.firstIndex(of: k), i + 1 < all.count else { return nil }
        return all[i + 1]
    }
}

/// 开场动画和当前标签页
@MainActor
@Observable
final class UIState {
    var tab: Int = Int(LaunchArgs.value("-fpTab") ?? "") ?? 0
    var bootShow = !LaunchArgs.has("-fpNoSplash")
    var splashOpacity: Double = LaunchArgs.has("-fpNoSplash") ? 0 : 1
    var pageOpacity: Double = LaunchArgs.has("-fpNoSplash") ? 1 : 0
    var heroRise: CGFloat = LaunchArgs.has("-fpNoSplash") ? 0 : 226

    /// 和预览一样：开场标志 0.3 秒后 0.3 秒淡出；首页 0.3 秒后 0.2 秒淡入；人物 0.42 秒后 0.9 秒升上来；1.5 秒后拿掉开场
    func playBoot() {
        Task { @MainActor in
            bootShow = true
            splashOpacity = 1
            pageOpacity = 0
            heroRise = 226
            try? await Task.sleep(for: .milliseconds(40))
            withAnimation(.linear(duration: 0.3).delay(0.3)) { splashOpacity = 0 }
            withAnimation(.easeOut(duration: 0.2).delay(0.3)) { pageOpacity = 1 }
            withAnimation(.timingCurve(0.14, 0.7, 0.1, 1, duration: 0.9).delay(0.42)) { heroRise = 0 }
            try? await Task.sleep(for: .milliseconds(1500))
            bootShow = false
        }
    }

    func skipBoot() {
        bootShow = false
        splashOpacity = 0
        pageOpacity = 1
        heroRise = 0
    }

    func replayBoot() {
        tab = 0
        playBoot()
    }
}

/// 屏幕刷新时回调（CADisplayLink 要一个 NSObject 当 target）
@MainActor
final class LinkProxy: NSObject {
    let fire: @MainActor () -> Void
    init(_ fire: @escaping @MainActor () -> Void) { self.fire = fire }
    @objc func step() { fire() }
}

/// 今日卡片的动画状态。和预览里的逐帧动画引擎一样：按录屏量出来的关键点插值。
@MainActor
@Observable
final class TodayMotion {
    enum Mode { case train, diet }

    var mode: Mode = (LaunchArgs.value("-fpMode") == "diet" || LaunchArgs.value("-fpShow") == "diet") ? .diet : .train
    /// 正在播的动画：diet / train / open / close
    var anim: String? = nil
    var at: Double = 0
    /// 安排三餐整页开着
    var sheet = LaunchArgs.value("-fpShow") == "sheet"
    /// 饮食整页开着
    var dsheet = LaunchArgs.value("-fpShow") == "diet"

    @ObservationIgnored private var link: CADisplayLink?
    @ObservationIgnored private var proxy: LinkProxy?
    @ObservationIgnored private var stepFn: ((Double) -> Bool)?
    @ObservationIgnored private var t0: CFTimeInterval = 0
    @ObservationIgnored private var drag: DragInfo?

    private struct DragInfo {
        var on = false
        var kind = "diet"
        var p: Double = 0
    }

    var running: Bool { stepFn != nil }

    // MARK: 动画引擎

    private func run(_ f: @escaping (Double) -> Bool) {
        stepFn = f
        t0 = CACurrentMediaTime()
        if link == nil {
            let p = LinkProxy { [weak self] in self?.tick() }
            let l = CADisplayLink(target: p, selector: #selector(LinkProxy.step))
            l.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
            l.add(to: .main, forMode: .common)
            link = l
            proxy = p
        }
    }

    private func tick() {
        guard let f = stepFn else { stopLink(); return }
        let el = CACurrentMediaTime() - t0
        if !f(el) {
            stepFn = nil
            stopLink()
        }
    }

    private func stopLink() {
        link?.invalidate()
        link = nil
        proxy = nil
    }

    /// 整页打开 / 收起（时长和预览一样）
    func startAnim(_ kind: String) {
        guard stepFn == nil else { return }
        let durs: [String: Double] = ["open": 0.45, "close": 0.63, "dopen": 0.47, "dclose": 0.62]
        let dur = durs[kind] ?? 0.5
        anim = kind
        at = 0
        run { [weak self] el in
            guard let self else { return false }
            if el >= dur {
                self.anim = nil
                self.at = 0
                if kind == "open" { self.sheet = true }
                if kind == "close" { self.sheet = false }
                if kind == "dopen" { self.dsheet = true }
                if kind == "dclose" { self.dsheet = false }
                return false
            }
            self.at = el
            return true
        }
    }

    /// 录屏里慢是手指在拖；只借用它的轨迹形状，进度 p 0→1 对应整条轨迹（跳过手指停顿那段）
    func dragToTime(_ kind: String, _ p: Double) -> Double {
        if kind == "diet" {
            return p < 0.35 ? p / 0.35 * 0.283 : 0.433 + (p - 0.35) / 0.65 * (1.15 - 0.433)
        }
        return p < 0.35 ? p / 0.35 * 0.35 : 0.35 + (p - 0.35) / 0.65 * (1.15 - 0.35)
    }

    /// 点击或松手后自动播完：0.42 秒，快起慢停
    func runSwitch(_ kind: String, _ p0: Double, _ toEnd: Bool) {
        guard stepFn == nil else { return }
        let target: Double = toEnd ? 1 : 0
        let dur = max(0.12, 0.42 * abs(target - p0))
        anim = kind
        at = dragToTime(kind, p0)
        run { [weak self] el in
            guard let self else { return false }
            let x = min(1, el / dur)
            let e = 1 - pow(1 - x, 3)
            let p = p0 + (target - p0) * e
            if x >= 1 {
                self.anim = nil
                self.at = 0
                if toEnd { self.mode = kind == "diet" ? .diet : .train }
                return false
            }
            self.at = self.dragToTime(kind, p)
            return true
        }
    }

    // MARK: 按钮

    func showTrain() { if mode != .train && stepFn == nil { runSwitch("train", 0, true) } }
    func showDiet() { if mode != .diet && stepFn == nil && !sheet { runSwitch("diet", 0, true) } }
    func openSheet() { if mode == .train && !sheet && stepFn == nil { startAnim("open") } }
    func closeSheet() { if sheet && stepFn == nil { startAnim("close") } }
    func closeDiet() { if dsheet && stepFn == nil { startAnim("dclose") } }
    func tapCard() {
        guard !sheet, !dsheet, stepFn == nil else { return }
        startAnim(mode == .train ? "open" : "dopen")
    }

    // MARK: 卡片左右滑：动画跟手，松手后接着播完或退回

    func cardDrag(dx: Double, dy: Double) {
        if sheet || dsheet { return }
        if drag == nil {
            if stepFn != nil { return }
            drag = DragInfo()
        }
        guard var g = drag else { return }
        if !g.on {
            if abs(dx) < 8 || abs(dx) < abs(dy) { return }
            g.kind = mode == .train ? "diet" : "train"
            g.on = true
        }
        let dir: Double = g.kind == "diet" ? -1 : 1
        g.p = cl(dx * dir / 300, 0, 1)
        drag = g
        anim = g.kind
        at = dragToTime(g.kind, g.p)
    }

    func cardDragEnd(vx: Double) {
        guard let g = drag else { return }
        drag = nil
        guard g.on else { return }
        let dir: Double = g.kind == "diet" ? -1 : 1
        let fling = vx * dir > 0.35
        anim = nil
        runSwitch(g.kind, g.p, g.p > 0.3 || (fling && g.p > 0.03))
    }

    /// 云端录屏用：自己把几个动画播一遍
    func autoplay() async {
        try? await Task.sleep(for: .milliseconds(1200))
        runSwitch("diet", 0, true)
        try? await Task.sleep(for: .milliseconds(1200))
        startAnim("dopen")
        try? await Task.sleep(for: .milliseconds(1500))
        startAnim("dclose")
        try? await Task.sleep(for: .milliseconds(1300))
        runSwitch("train", 0, true)
        try? await Task.sleep(for: .milliseconds(1400))
        startAnim("open")
        try? await Task.sleep(for: .milliseconds(1600))
        startAnim("close")
    }
}
