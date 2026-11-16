import SwiftUI

/// 全 App 统一的动作：弹簧，阻尼比 1（到位就停、不来回晃），松手时接着手指的速度走，拉到头有橡皮筋回弹。
enum Motion {
    /// 卡片长成整页（0.46 秒，和 2.1.0 录屏量出来的一样）
    static let grow = Animation.spring(response: 0.46, dampingFraction: 1)
    /// 收回
    static let shrink = Animation.spring(response: 0.4, dampingFraction: 1)
    /// 小东西：切换、勾选、出现
    static let quick = Animation.spring(response: 0.3, dampingFraction: 1)

    /// 松手后接着手指的速度走：把「每秒移动的点数」换成弹簧的初速度（以剩下的距离为 1）
    static func release(velocity: CGFloat, distance: CGFloat) -> Animation {
        let k: Double = 180, m: Double = 1
        let v = distance == 0 ? 0 : Double(velocity / distance)
        return .interpolatingSpring(mass: m, stiffness: k, damping: 2 * (k * m).squareRoot(), initialVelocity: v)
    }

    /// 橡皮筋：越往外拉越费劲（和 UIScrollView 同一个公式），limit 是最多能拉出去多远
    static func rubber(_ x: CGFloat, limit: CGFloat = 120) -> CGFloat {
        let c: CGFloat = 0.55
        let s: CGFloat = x < 0 ? -1 : 1
        let a = abs(x)
        return s * (1 - 1 / (a * c / limit + 1)) * limit
    }
}

/// 按下去缩一点、松手弹回来（阻尼比 1）
struct PressScale: ButtonStyle {
    var scale: CGFloat = 0.97
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .animation(Motion.quick, value: configuration.isPressed)
    }
}
