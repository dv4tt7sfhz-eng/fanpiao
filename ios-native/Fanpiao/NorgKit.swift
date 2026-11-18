import SwiftUI

// 照 Norg 可点预览搭框架用的小工具：设计坐标、绝对定位、颜色、轨迹插值、SVG 图标。

// MARK: - 设计坐标：页面按预览里的 390 宽来画，再整体缩放到手机宽度

private struct DesignKKey: EnvironmentKey { static let defaultValue: CGFloat = 1 }

extension EnvironmentValues {
    /// 屏幕宽度 ÷ 390
    var designK: CGFloat {
        get { self[DesignKKey.self] }
        set { self[DesignKKey.self] = newValue }
    }
}

/// 把 390 宽的设计内容按屏幕宽度整体缩放。height 为空时自己量高度。
struct DesignScaled<Content: View>: View {
    @Environment(\.designK) private var k
    var height: CGFloat? = nil
    @ViewBuilder var content: Content
    @State private var measured: CGFloat = 844

    var body: some View {
        let h = height ?? measured
        content
            .frame(width: 390, height: height, alignment: .topLeading)
            .fixedSize(horizontal: false, vertical: height == nil)
            .onGeometryChange(for: CGFloat.self) { proxy in
                proxy.size.height
            } action: { value in
                if height == nil { measured = value }
            }
            .scaleEffect(k, anchor: .topLeading)
            .frame(width: 390 * k, height: h * k, alignment: .topLeading)
    }
}

extension View {
    /// 和网页里的 position:absolute; left; top 一样（放在 ZStack(alignment: .topLeading) 里用）
    func at(_ x: Double, _ y: Double) -> some View { offset(x: x, y: y) }
}

// MARK: - 颜色

func hx(_ v: UInt32, _ a: Double = 1) -> Color { Color(hex: v, alpha: a) }

func rgba(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) -> Color {
    Color(.sRGB, red: r / 255, green: g / 255, blue: b / 255, opacity: a)
}

/// 两个颜色之间按 p 插值（和预览里的 mix 一样）
func mix(_ c1: [Double], _ c2: [Double], _ p: Double) -> Color {
    let r = (c1[0] + (c2[0] - c1[0]) * p).rounded()
    let g = (c1[1] + (c2[1] - c1[1]) * p).rounded()
    let b = (c1[2] + (c2[2] - c1[2]) * p).rounded()
    return rgba(r, g, b)
}

func cl(_ v: Double, _ a: Double, _ b: Double) -> Double { max(a, min(b, v)) }

// MARK: - 文字

/// 一段文字：字号、粗细、颜色、字距
func T(_ s: String, _ size: CGFloat, _ w: Font.Weight = .regular, _ c: Color = .white, track: CGFloat = 0) -> Text {
    Text(s).font(.system(size: size, weight: w)).foregroundStyle(c).tracking(track)
}

// MARK: - 轨迹插值（和预览里的 tr / pick 完全一样）

func tr(_ a: Track, _ t: Double) -> Double {
    guard let first = a.first else { return 0 }
    if t <= first.0 { return first.1 }
    for i in 1..<a.count where t <= a[i].0 {
        let p = (t - a[i - 1].0) / (a[i].0 - a[i - 1].0)
        return a[i - 1].1 + (a[i].1 - a[i - 1].1) * p
    }
    return a[a.count - 1].1
}

func pick(_ set: [String: Track], _ t: Double) -> [String: Double] {
    set.mapValues { tr($0, t) }
}

// MARK: - SVG 路径（把预览里的 path d 原样搬过来画）

enum SVGPath {
    static func parse(_ d: String) -> Path {
        var p = Path()
        let s = Array(d.utf8)
        var i = 0
        var cmd: UInt8 = 0
        var cur = CGPoint.zero
        var start = CGPoint.zero
        var lastC: CGPoint? = nil
        var lastQ: CGPoint? = nil
        let cmds = Set("MmLlHhVvCcSsQqTtAaZz".utf8)

        func skip() {
            while i < s.count, s[i] == 32 || s[i] == 44 || s[i] == 9 || s[i] == 10 || s[i] == 13 { i += 1 }
        }
        func hasNum() -> Bool {
            skip()
            guard i < s.count else { return false }
            let c = s[i]
            return (c >= 48 && c <= 57) || c == 45 || c == 43 || c == 46
        }
        func num() -> CGFloat {
            skip()
            let st = i
            if i < s.count, s[i] == 45 || s[i] == 43 { i += 1 }
            var dot = false
            while i < s.count {
                let c = s[i]
                if c >= 48 && c <= 57 {
                    i += 1
                } else if c == 46 && !dot {
                    dot = true
                    i += 1
                } else if c == 101 || c == 69 {
                    i += 1
                    if i < s.count, s[i] == 45 || s[i] == 43 { i += 1 }
                } else {
                    break
                }
            }
            let str = String(decoding: s[st..<i], as: UTF8.self)
            return CGFloat(Double(str) ?? 0)
        }
        func flag() -> Bool {
            skip()
            guard i < s.count else { return false }
            let c = s[i]
            i += 1
            return c == 49
        }
        func pt(_ rel: Bool) -> CGPoint {
            let x = num()
            let y = num()
            return rel ? CGPoint(x: cur.x + x, y: cur.y + y) : CGPoint(x: x, y: y)
        }

        var guardCount = 0
        while guardCount < s.count * 4 + 8 {
            guardCount += 1
            skip()
            if i >= s.count { break }
            if cmds.contains(s[i]) {
                cmd = s[i]
                i += 1
            } else if !hasNum() {
                i += 1
                continue
            }
            let rel = cmd >= 97
            switch cmd | 0x20 {
            case 109: // m
                let q = pt(rel)
                p.move(to: q)
                cur = q; start = q; lastC = nil; lastQ = nil
                cmd = rel ? 108 : 76
            case 108: // l
                let q = pt(rel)
                p.addLine(to: q)
                cur = q; lastC = nil; lastQ = nil
            case 104: // h
                let x = num()
                cur = CGPoint(x: rel ? cur.x + x : x, y: cur.y)
                p.addLine(to: cur); lastC = nil; lastQ = nil
            case 118: // v
                let y = num()
                cur = CGPoint(x: cur.x, y: rel ? cur.y + y : y)
                p.addLine(to: cur); lastC = nil; lastQ = nil
            case 99: // c
                let c1 = pt(rel)
                let c2 = pt(rel)
                let e = pt(rel)
                p.addCurve(to: e, control1: c1, control2: c2)
                cur = e; lastC = c2; lastQ = nil
            case 115: // s
                var c1 = cur
                if let lc = lastC { c1 = CGPoint(x: 2 * cur.x - lc.x, y: 2 * cur.y - lc.y) }
                let c2 = pt(rel)
                let e = pt(rel)
                p.addCurve(to: e, control1: c1, control2: c2)
                cur = e; lastC = c2; lastQ = nil
            case 113: // q
                let c1 = pt(rel)
                let e = pt(rel)
                p.addQuadCurve(to: e, control: c1)
                cur = e; lastQ = c1; lastC = nil
            case 116: // t
                var c1 = cur
                if let lq = lastQ { c1 = CGPoint(x: 2 * cur.x - lq.x, y: 2 * cur.y - lq.y) }
                let e = pt(rel)
                p.addQuadCurve(to: e, control: c1)
                cur = e; lastQ = c1; lastC = nil
            case 97: // a
                let rx = num()
                let ry = num()
                let phi = num()
                let fa = flag()
                let fs = flag()
                let e = pt(rel)
                arc(&p, from: cur, rx: rx, ry: ry, phiDeg: phi, large: fa, sweep: fs, to: e)
                cur = e; lastC = nil; lastQ = nil
            case 122: // z
                p.closeSubpath()
                cur = start; lastC = nil; lastQ = nil
                if hasNum() { cmd = rel ? 108 : 76 }
            default:
                i += 1
            }
        }
        return p
    }

    /// SVG 椭圆弧 → 三次贝塞尔（SVG 规范 F.6.5 的算法）
    private static func arc(_ p: inout Path, from p0: CGPoint, rx rx0: CGFloat, ry ry0: CGFloat, phiDeg: CGFloat, large: Bool, sweep: Bool, to p1: CGPoint) {
        if p0 == p1 { return }
        var rx = abs(Double(rx0))
        var ry = abs(Double(ry0))
        if rx == 0 || ry == 0 { p.addLine(to: p1); return }
        let phi = Double(phiDeg) * .pi / 180
        let cphi = cos(phi), sphi = sin(phi)
        let dx2 = Double(p0.x - p1.x) / 2
        let dy2 = Double(p0.y - p1.y) / 2
        let x1p = cphi * dx2 + sphi * dy2
        let y1p = -sphi * dx2 + cphi * dy2
        let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
        if lambda > 1 {
            let sq = lambda.squareRoot()
            rx *= sq
            ry *= sq
        }
        let rx2 = rx * rx, ry2 = ry * ry
        let numr = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p
        let den = rx2 * y1p * y1p + ry2 * x1p * x1p
        var coef = den == 0 ? 0 : (max(0, numr / den)).squareRoot()
        if large == sweep { coef = -coef }
        let cxp = coef * rx * y1p / ry
        let cyp = -coef * ry * x1p / rx
        let cx = cphi * cxp - sphi * cyp + Double(p0.x + p1.x) / 2
        let cy = sphi * cxp + cphi * cyp + Double(p0.y + p1.y) / 2
        func ang(_ ux: Double, _ uy: Double, _ vx: Double, _ vy: Double) -> Double {
            atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        }
        let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
        var dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
        if !sweep && dt > 0 { dt -= 2 * .pi }
        if sweep && dt < 0 { dt += 2 * .pi }
        let segs = max(1, Int((abs(dt) / (.pi / 2)).rounded(.up)))
        let step = dt / Double(segs)
        let alpha = 4.0 / 3.0 * tan(step / 4)
        func point(_ t: Double) -> CGPoint {
            CGPoint(x: cx + rx * cos(t) * cphi - ry * sin(t) * sphi, y: cy + rx * cos(t) * sphi + ry * sin(t) * cphi)
        }
        func deriv(_ t: Double) -> CGPoint {
            CGPoint(x: -rx * sin(t) * cphi - ry * cos(t) * sphi, y: -rx * sin(t) * sphi + ry * cos(t) * cphi)
        }
        var ta = t1
        for _ in 0..<segs {
            let tb = ta + step
            let pa = point(ta), pb = point(tb)
            let da = deriv(ta), db = deriv(tb)
            let c1 = CGPoint(x: pa.x + alpha * da.x, y: pa.y + alpha * da.y)
            let c2 = CGPoint(x: pb.x - alpha * db.x, y: pb.y - alpha * db.y)
            p.addCurve(to: pb, control1: c1, control2: c2)
            ta = tb
        }
    }
}

func sp(_ d: String) -> Path { SVGPath.parse(d) }
func circ(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat) -> Path { Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: 2 * r, height: 2 * r)) }
func rct(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ rx: CGFloat = 0) -> Path {
    let r = CGRect(x: x, y: y, width: w, height: h)
    return rx > 0 ? Path(roundedRect: r, cornerRadius: rx, style: .circular) : Path(r)
}

/// 图标的一笔：路径 + 填充 / 描边
struct IconPart {
    var path: Path
    var fill: Color? = nil
    var stroke: Color? = nil
    var lw: CGFloat = 0
}

/// 按 SVG 的 viewBox 画图标（等比缩放、居中，和网页的默认行为一样）
struct Icon: View {
    let vb: CGSize
    let parts: [IconPart]
    var cap: CGLineCap = .round
    var join: CGLineJoin = .round

    init(_ w: CGFloat, _ h: CGFloat, cap: CGLineCap = .round, join: CGLineJoin = .round, _ parts: [IconPart]) {
        self.vb = CGSize(width: w, height: h)
        self.parts = parts
        self.cap = cap
        self.join = join
    }

    var body: some View {
        Canvas { ctx, size in
            let s = min(size.width / vb.width, size.height / vb.height)
            let ox = (size.width - vb.width * s) / 2
            let oy = (size.height - vb.height * s) / 2
            let t = CGAffineTransform(translationX: ox, y: oy).scaledBy(x: s, y: s)
            for part in parts {
                let path = part.path.applying(t)
                if let f = part.fill { ctx.fill(path, with: .color(f)) }
                if let st = part.stroke {
                    ctx.stroke(path, with: .color(st), style: StrokeStyle(lineWidth: part.lw * s, lineCap: cap, lineJoin: join))
                }
            }
        }
    }
}

/// 只描边的图标（大多数图标都是这种）
func strokeIcon(_ w: CGFloat, _ h: CGFloat, _ color: Color, _ lw: CGFloat, cap: CGLineCap = .round, join: CGLineJoin = .round, _ paths: [Path]) -> Icon {
    Icon(w, h, cap: cap, join: join, paths.map { IconPart(path: $0, stroke: color, lw: lw) })
}

/// 只填充的图标
func fillIcon(_ w: CGFloat, _ h: CGFloat, _ color: Color, _ paths: [Path]) -> Icon {
    Icon(w, h, paths.map { IconPart(path: $0, fill: color) })
}
