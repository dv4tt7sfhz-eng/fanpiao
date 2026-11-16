import SwiftUI

/// 和 2.3.0 一样的六个低饱和主题色。
struct Accent: Identifiable, Hashable {
    let id: String
    let name: String
    let note: String
    let tint: Color
    let hi: Color
    let lo: Color
    let glowA: Color   // 背景主光
    let glowB: Color   // 背景冷光

    static let all: [Accent] = [
        Accent(id: "", name: "暮", note: "傍晚天边的灰粉", tint: Color(hex: 0xd0928f), hi: Color(hex: 0xe8b7aa), lo: Color(hex: 0x8b5860), glowA: Color(hex: 0x7a4f4f), glowB: Color(hex: 0x3a4a63)),
        Accent(id: "sea", name: "雾", note: "清晨湖面的雾蓝", tint: Color(hex: 0x8dadd7), hi: Color(hex: 0xbbcaf0), lo: Color(hex: 0x4e7391), glowA: Color(hex: 0x3f5a7c), glowB: Color(hex: 0x56456e)),
        Accent(id: "berry", name: "玫", note: "压干的玫瑰", tint: Color(hex: 0xc58ba1), hi: Color(hex: 0xe3b1c0), lo: Color(hex: 0x87516a), glowA: Color(hex: 0x744d5e), glowB: Color(hex: 0x4a4366)),
        Accent(id: "pine", name: "苔", note: "石头上的青苔", tint: Color(hex: 0x8db69f), hi: Color(hex: 0xaed4c8), lo: Color(hex: 0x5b775f), glowA: Color(hex: 0x46604f), glowB: Color(hex: 0x3a4c60)),
        Accent(id: "iris", name: "藤", note: "褪了色的紫藤", tint: Color(hex: 0xab9bcb), hi: Color(hex: 0xd0bde6), lo: Color(hex: 0x6a5b8a), glowA: Color(hex: 0x5a4c78), glowB: Color(hex: 0x3a4d68)),
        Accent(id: "persimmon", name: "沙", note: "午后的沙色", tint: Color(hex: 0xcaab88), hi: Color(hex: 0xe5ceae), lo: Color(hex: 0x8a6c50), glowA: Color(hex: 0x6e5a44), glowB: Color(hex: 0x3c4a62)),
    ]
    static func of(_ id: String) -> Accent { all.first { $0.id == id } ?? all[0] }
}

/// 三大营养、日型等语义色（低饱和，和 2.3.0 一致）
enum Palette {
    static let protein = Color(hex: 0xa9c79a)
    static let carb = Color(hex: 0x93b6d9)
    static let fat = Color(hex: 0xd4bf8f)
    static let sodium = Color(hex: 0xa9a6d6)
    static let fiber = Color(hex: 0x98c4a4)
    static let good = Color(hex: 0x8fcaa5)
    static let warn = Color(hex: 0xd9c38a)
    static let bad = Color(hex: 0xdb9a95)
    static func kind(_ k: String?) -> Color {
        switch k { case "H": return Color(hex: 0xd99c8a); case "L": return Color(hex: 0x86bfc4); default: return Color(hex: 0xd4bc86) }
    }
    static let ink2 = Color(red: 235 / 255, green: 235 / 255, blue: 245 / 255).opacity(0.62)
    static let ink3 = Color(red: 235 / 255, green: 235 / 255, blue: 245 / 255).opacity(0.34)
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: alpha)
    }
}

/// 整个 App 的底：纯黑，背后几团很淡的主题色柔光（和 2.3.0 网页版同一个思路）
struct Backdrop: View {
    let accent: Accent
    var body: some View {
        ZStack {
            Color.black
            RadialGradient(colors: [accent.glowA.opacity(0.55), .clear], center: UnitPoint(x: 0, y: -0.05), startRadius: 0, endRadius: 420)
            RadialGradient(colors: [accent.glowB.opacity(0.6), .clear], center: UnitPoint(x: 1.1, y: 0.3), startRadius: 0, endRadius: 400)
            RadialGradient(colors: [Color(hex: 0x4d4436).opacity(0.35), .clear], center: UnitPoint(x: -0.1, y: 1.05), startRadius: 0, endRadius: 360)
        }
        .ignoresSafeArea()
    }
}

// ---------- 液态玻璃：iOS 26 用苹果原生的 glassEffect，老系统退回到磨砂材质 ----------

extension View {
    /// 一块玻璃卡片。tint 不为空时是带颜色的玻璃。
    @ViewBuilder
    func glassCard(cornerRadius: CGFloat = 26, tint: Color? = nil, interactive: Bool = false) -> some View {
        if #available(iOS 26.0, *) {
            let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            let g: Glass = tint.map { Glass.regular.tint($0) } ?? .regular
            self.glassEffect(interactive ? g.interactive() : g, in: shape)
        } else {
            self.background {
                let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                ZStack {
                    shape.fill(.ultraThinMaterial)
                    if let tint { shape.fill(tint.opacity(0.25)) }
                    shape.strokeBorder(.white.opacity(0.14), lineWidth: 0.5)
                }
            }
        }
    }

    /// 胶囊形的玻璃（小按钮、标签）
    @ViewBuilder
    func glassCapsule(tint: Color? = nil, interactive: Bool = true) -> some View {
        if #available(iOS 26.0, *) {
            let g: Glass = tint.map { Glass.regular.tint($0) } ?? .regular
            self.glassEffect(interactive ? g.interactive() : g, in: Capsule())
        } else {
            self.background(Capsule().fill(.ultraThinMaterial).overlay(Capsule().fill((tint ?? .clear).opacity(0.3))).overlay(Capsule().strokeBorder(.white.opacity(0.16), lineWidth: 0.5)))
        }
    }

    /// 普通玻璃按钮
    @ViewBuilder
    func glassButton() -> some View {
        if #available(iOS 26.0, *) { self.buttonStyle(.glass) } else { self.buttonStyle(.bordered) }
    }

    /// 主按钮：带主题色的玻璃
    @ViewBuilder
    func glassProminentButton() -> some View {
        if #available(iOS 26.0, *) { self.buttonStyle(.glassProminent) } else { self.buttonStyle(.borderedProminent) }
    }

    /// 往下滑时底栏缩成一个小圆（iOS 26）
    @ViewBuilder
    func minimizeTabBarOnScroll() -> some View {
        if #available(iOS 26.0, *) { self.tabBarMinimizeBehavior(.onScrollDown) } else { self }
    }
}

/// 把几块玻璃放在一组，让它们一起渲染、靠近时融在一起（iOS 26 的 GlassEffectContainer）
struct GlassGroup<Content: View>: View {
    var spacing: CGFloat = 12
    @ViewBuilder var content: Content
    var body: some View {
        if #available(iOS 26.0, *) { GlassEffectContainer(spacing: spacing) { content } } else { content }
    }
}
