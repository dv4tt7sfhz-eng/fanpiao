import SwiftUI

// 暖心小动画（光遇那种：一团会呼吸的暖光，几颗光点慢慢往上飘）。
// 第一次完整播 3.4 秒，之后同一种只播 2 秒；点一下就收；系统打开「减少动态效果」时只淡入淡出。

enum MomentKind: String, Sendable {
    case comfort, welcome, water, cheer
}

struct Moment: Identifiable, Equatable {
    let id = UUID()
    let kind: MomentKind
}

private let warmCore = Color(hex: 0xffe2c4)
private let warm = Color(hex: 0xffb08a)
private let warmDeep = Color(hex: 0xe5636e)

struct MomentView: View {
    let m: Moment
    var onDone: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduce
    @State private var shown = false
    @State private var ring: CGFloat = 0
    @State private var start = Date()
    @State private var closing = false

    var body: some View {
        let txt = L.moment(m.kind)
        ZStack {
            Color.black.opacity(shown ? 0.8 : 0).ignoresSafeArea()
            TimelineView(.animation(paused: reduce)) { tl in
                let t = tl.date.timeIntervalSince(start)
                Canvas { ctx, size in draw(ctx, size, t) }
            }
            .ignoresSafeArea()
            .opacity(shown ? 1 : 0)
            .allowsHitTesting(false)

            VStack(spacing: 16) {
                ZStack {
                    if m.kind == .cheer {
                        Circle().stroke(Color.white.opacity(0.12), lineWidth: 4)
                        Circle().trim(from: 0, to: ring)
                            .stroke(LinearGradient(colors: [warmCore, warm], startPoint: .top, endPoint: .bottom), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                    }
                    Image(systemName: icon)
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(warmCore)
                        .shadow(color: warm.opacity(0.9), radius: 14)
                }
                .frame(width: 86, height: 86)
                Text(txt.0)
                    .font(.system(size: 25, weight: .heavy))
                    .foregroundStyle(.white)
                Text(txt.1)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.white.opacity(0.78))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .padding(.horizontal, 40)
            .scaleEffect(shown ? 1 : 0.9)
            .opacity(shown ? 1 : 0)
            .blur(radius: shown || reduce ? 0 : 8)
        }
        .contentShape(Rectangle())
        .onTapGesture { close() }
        .sensoryFeedback(.success, trigger: shown) { _, new in new && m.kind == .cheer }
        .onAppear {
            start = Date()
            withAnimation(reduce ? .easeOut(duration: 0.25) : .spring(response: 0.6, dampingFraction: 0.9)) { shown = true }
            withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 1.2).delay(0.3)) { ring = 1 }
            let key = "fp.moment." + m.kind.rawValue
            let seen = UserDefaults.standard.integer(forKey: key)
            UserDefaults.standard.set(seen + 1, forKey: key)
            let stay: Double = LaunchArgs.has("-fpMoment") && m.kind != .cheer ? 30 : (seen == 0 ? 3.4 : 2.0)
            Task {
                try? await Task.sleep(for: .seconds(stay))
                close()
            }
        }
    }

    private var icon: String {
        switch m.kind {
        case .comfort: return "heart.fill"
        case .welcome: return "sparkles"
        case .water: return "drop.fill"
        case .cheer: return "checkmark"
        }
    }

    private func close() {
        guard !closing else { return }
        closing = true
        withAnimation(.easeOut(duration: 0.45)) { shown = false }
        Task {
            try? await Task.sleep(for: .milliseconds(460))
            onDone()
        }
    }

    /// 一团会呼吸的暖光 + 往上飘的光点
    private func draw(_ ctx: GraphicsContext, _ size: CGSize, _ t: Double) {
        let c = CGPoint(x: size.width / 2, y: size.height * 0.43)
        let breathe = reduce ? 1 : 1 + 0.05 * sin(t * 2 * .pi / 3.2)
        for (r, a, col) in [(260.0, 0.22, warmDeep), (170.0, 0.38, warm), (90.0, 0.55, warmCore)] {
            let rr = r * breathe
            let rect = CGRect(x: c.x - rr, y: c.y - rr, width: rr * 2, height: rr * 2)
            ctx.fill(Path(ellipseIn: rect), with: .radialGradient(Gradient(colors: [col.opacity(a), col.opacity(0)]), center: c, startRadius: 0, endRadius: rr))
        }
        // 光点：位置用固定的「随机」数，每次都一样
        let n = m.kind == .welcome ? 26 : 16
        for i in 0..<n {
            let seed = sin(Double(i) * 12.9898) * 43758.5453
            let fx = seed - floor(seed)
            let seed2 = sin(Double(i) * 78.233) * 12543.3
            let fs = seed2 - floor(seed2)
            let speed = 14 + 22 * fs
            let span = size.height * 0.7
            let y = size.height * 0.85 - (t * speed + Double(i) * 47).truncatingRemainder(dividingBy: span)
            let x = size.width * (0.12 + 0.76 * fx) + 10 * sin(t * 0.8 + Double(i))
            let life = 1 - abs((size.height * 0.85 - y) / span - 0.5) * 2
            // 欢迎回来：光点一颗一颗亮起来
            let on = m.kind == .welcome ? min(1, max(0, (t - Double(i) * 0.09) / 0.4)) : 1
            let rad = 1.4 + 2.2 * fs
            let p = Path(ellipseIn: CGRect(x: x - rad, y: y - rad, width: rad * 2, height: rad * 2))
            ctx.fill(p, with: .color(warmCore.opacity(0.85 * life * on)))
            let halo = Path(ellipseIn: CGRect(x: x - rad * 4, y: y - rad * 4, width: rad * 8, height: rad * 8))
            ctx.fill(halo, with: .radialGradient(Gradient(colors: [warm.opacity(0.25 * life * on), .clear]), center: CGPoint(x: x, y: y), startRadius: 0, endRadius: rad * 4))
        }
    }
}

// MARK: - 列表里一行一行轻轻浮上来

private struct Appear: ViewModifier {
    let i: Int
    @State private var on = false
    @Environment(\.accessibilityReduceMotion) private var reduce
    func body(content: Content) -> some View {
        content
            .opacity(on ? 1 : 0)
            .offset(y: on || reduce ? 0 : 14)
            .onAppear {
                withAnimation(.spring(response: 0.48, dampingFraction: 0.88).delay(Double(min(i, 12)) * 0.035)) { on = true }
            }
    }
}

extension View {
    /// 第 i 行：晚一点点浮上来，整列就像一层层铺开
    func appear(_ i: Int) -> some View { modifier(Appear(i: i)) }
}
