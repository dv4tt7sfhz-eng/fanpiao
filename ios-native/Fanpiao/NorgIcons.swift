import SwiftUI

/// 预览里用到的图标，路径原样照搬
enum NI {
    static func logo() -> Icon {
        Icon(28, 28, [
            IconPart(path: sp("M3 6 L12 2 L12 26 L3 22 Z"), fill: hx(0xe5404a)),
            IconPart(path: sp("M12 2 L25 9 L25 26 L18 22 L18 12 L12 9 Z"), fill: hx(0xc22c36))
        ])
    }
    static func logoSplash() -> Icon {
        Icon(28, 30, [
            IconPart(path: sp("M2 7 L12 2 L12 28 L2 23 Z"), fill: hx(0xb8f03c)),
            IconPart(path: sp("M12 2 L26 10 L26 28 L18 23.5 L18 13 L12 9.5 Z"), fill: hx(0x8ccf22)),
            IconPart(path: sp("M12 9.5 L18 13 L18 23.5 L12 20 Z"), fill: hx(0x5f9a12))
        ])
    }
    static func flame() -> Icon {
        fillIcon(24, 24, hx(0x4e4e52), [sp("M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z")])
    }
    static func triLeft(_ c: Color) -> Icon { fillIcon(11, 12, c, [sp("M10 0 L0 6 L10 12 Z")]) }
    static func triRight(_ c: Color) -> Icon { fillIcon(11, 12, c, [sp("M1 0 L11 6 L1 12 Z")]) }

    // 今日页五个入口
    static func cap() -> Icon {
        strokeIcon(24, 22, hx(0x4a1c20), 1.6, [sp("M2 8l10-5 10 5-10 5z"), sp("M6 10v5c3 2 9 2 12 0v-5")])
    }
    static func medal() -> Icon {
        strokeIcon(24, 28, hx(0xe5404a), 1.9, [
            sp("M7 2l3 8M17 2l-3 8M6 2h12"), circ(12, 18, 7),
            sp("M12 14.5l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z")
        ])
    }
    static func badge() -> Icon {
        strokeIcon(24, 24, hx(0xe5404a), 1.8, [
            sp("M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"),
            sp("M8.5 12l2.5 2.5 4.5-5")
        ])
    }
    static func trophy() -> Icon {
        strokeIcon(24, 26, hx(0xe5404a), 1.9, [
            sp("M7 2h10v7a5 5 0 0 1-10 0z"), sp("M7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"), sp("M12 14v5M8 24h8v-3H8z")
        ])
    }
    static func layers() -> Icon {
        strokeIcon(24, 24, hx(0x4a1c20), 1.6, [sp("M12 3l9 5-9 5-9-5z"), sp("M3 12l9 5 9-5M3 16l9 5 9-5")])
    }

    static func plus(_ c: Color, _ lw: CGFloat) -> Icon { strokeIcon(24, 24, c, lw, [sp("M12 3v18M3 12h18")]) }
    static func plusSmall(_ c: Color, _ lw: CGFloat) -> Icon { strokeIcon(24, 24, c, lw, [sp("M12 4v16M4 12h16")]) }

    static func diamond(_ a: Color, _ b: Color, _ c: Color) -> Icon {
        Icon(40, 44, [
            IconPart(path: sp("M20 2 L38 22 L20 42 L2 22 Z"), fill: a),
            IconPart(path: sp("M20 8 L32 22 L20 36 L8 22 Z"), fill: b),
            IconPart(path: sp("M20 14 L26 22 L20 30 L14 22 Z"), fill: c)
        ])
    }
    static func chevronRight() -> Icon { strokeIcon(12, 18, hx(0x5a5a5e), 2.4, [sp("M3 2l7 7-7 7")]) }

    // 卡片
    static func fork() -> Icon {
        strokeIcon(24, 26, .white, 2.4, [sp("M6 2v8a3 3 0 0 0 6 0V2M9 2v22M18 2c-2 2-3 5-3 9h3v13")])
    }
    static func editSquare() -> Icon {
        strokeIcon(24, 24, .white, 2.6, [sp("M20 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"), sp("M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z")])
    }
    static func arrowRight() -> Icon { strokeIcon(24, 24, hx(0x1a0608), 2.8, [sp("M5 12h14M13 6l6 6-6 6")]) }
    static func chevronDown(_ c: Color, _ lw: CGFloat) -> Icon { strokeIcon(24, 24, c, lw, [sp("M5 9l7 7 7-7")]) }
    static func pencil(_ c: Color, _ lw: CGFloat) -> Icon { strokeIcon(24, 24, c, lw, [sp("M4 20l1-4L17 4l3 3L8 19z")]) }
    static func calendar() -> Icon {
        strokeIcon(24, 24, hx(0xe8e0e0), 2.2, cap: .butt, join: .miter, [rct(3, 5, 18, 16, 2), sp("M3 10h18M8 3v4M16 3v4")])
    }
    static func arrowDown() -> Icon { strokeIcon(24, 24, hx(0x6a6a6e), 2, [sp("M12 4v16M6 14l6 6 6-6")]) }

    // 排餐页
    static func clipboard() -> Icon {
        strokeIcon(24, 28, .white, 2.2, join: .miter, [rct(3, 4, 18, 22, 3), sp("M9 2h6v4H9zM7 12h1M11 12h6M7 16h1M11 16h6M7 20h1M11 20h6")])
    }
    static func sparkles() -> Icon {
        fillIcon(24, 24, .white, [sp("M10 7l1.4 4.2L16 13l-4.6 1.6L10 19l-1.4-4.4L4 13l4.6-1.8z"), sp("M17 2l.8 2.2L20 5l-2.2.8L17 8l-.8-2.2L14 5l2.2-.8z")])
    }
    static func play() -> Icon { fillIcon(24, 24, .white, [sp("M6 3l15 9-15 9z")]) }
    static func books() -> Icon {
        strokeIcon(26, 24, .white, 2, cap: .butt, join: .miter, [rct(2, 4, 5, 17), rct(8, 2, 5, 19), sp("M15 5l4-1 4 17-4 1z")])
    }
    static func clipboardBig() -> Icon {
        strokeIcon(24, 30, hx(0x8a8a8e), 1.8, join: .miter, [rct(2, 4, 20, 24, 3.5), sp("M8 2h8v5H8zM6 13h1M10 13h8M6 18h1M10 18h8M6 23h1M10 23h8")])
    }

    // 发现页
    static func search() -> Icon { strokeIcon(24, 24, .white, 2.4, join: .miter, [circ(11, 11, 7.5), sp("M20.5 20.5l-4.2-4.2")]) }
    static func bell() -> Icon {
        strokeIcon(24, 26, .white, 2.2, [sp("M6 10a6 6 0 0 1 12 0c0 6 3 8 3 8H3s3-2 3-8"), sp("M10 22a2 2 0 0 0 4 0")])
    }
    static func dots() -> Icon { fillIcon(20, 6, .white, [circ(3, 3, 2.2), circ(10, 3, 2.2), circ(17, 3, 2.2)]) }
    static func check(_ lw: CGFloat = 3.6) -> Icon { strokeIcon(24, 24, .white, lw, [sp("M5 12l5 5 9-10")]) }
    static func heart(fill: Color?, stroke: Color) -> Icon {
        Icon(24, 22, cap: .butt, join: .round, [
            IconPart(path: sp("M12 20s-9-5.5-9-11.5A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 9 2.5C21 14.5 12 20 12 20z"), fill: fill, stroke: stroke, lw: 2)
        ])
    }
    static func comment() -> Icon {
        strokeIcon(26, 22, .white, 2, cap: .butt, [sp("M4 2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H11l-4 4v-4H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z")])
    }
    static func send() -> Icon { strokeIcon(24, 24, .white, 2, cap: .butt, [sp("M22 2L2 10l8 3 3 8z"), sp("M10 13l12-11")]) }
    static func figure(_ shirt: Bool) -> Icon {
        var parts = [
            IconPart(path: circ(20, 8, 6), fill: hx(0x4a5060)),
            IconPart(path: sp("M8 18h24l4 32-5 2-3-20v60h-6V60h-4v32H12V32l-3 20-5-2z"), fill: hx(0x3a4050))
        ]
        if shirt {
            parts.append(IconPart(path: sp("M12 20h16l-2 16h-12z"), fill: hx(0xe8cf9a)))
        } else {
            parts.append(IconPart(path: sp("M9 34l-4 15M31 34l4 15"), stroke: hx(0xc9a96a), lw: 3))
        }
        return Icon(40, 100, cap: .butt, join: .miter, parts)
    }

    // 我的页
    static func picture() -> Icon {
        strokeIcon(24, 21, .white, 2, cap: .butt, [rct(5, 2, 17, 13, 2), sp("M2 6v11a2 2 0 0 0 2 2h14"), circ(11, 7, 1.5), sp("M5 13l5-4 4 3 3-2 5 4")])
    }
    static func gear() -> Icon {
        strokeIcon(24, 24, .white, 2, cap: .butt, join: .miter, [circ(12, 12, 3), sp("M12 2l2 3 3.5-.8.8 3.5 3 2-1.5 3.3 1.5 3.3-3 2-.8 3.5-3.5-.8-2 3-2-3-3.5.8-.8-3.5-3-2 1.5-3.3L2.7 9.7l3-2 .8-3.5 3.5.8z")])
    }
    static func grid() -> Icon {
        var ps: [Path] = []
        for y in [2.0, 9.5, 17.0] { for x in [2.0, 9.5, 17.0] { ps.append(rct(x, y, 5, 5, 1)) } }
        return strokeIcon(24, 24, hx(0xbdbdc2), 2, cap: .butt, join: .miter, ps)
    }
    static func stickFigure() -> Icon {
        Icon(24, 24, [
            IconPart(path: circ(12, 3.5, 1.6), fill: hx(0xa52a32), stroke: hx(0xa52a32), lw: 1.8),
            IconPart(path: sp("M12 7v6M8 21l4-8 4 8M5 9h14M3 7v4M21 7v4"), stroke: hx(0xa52a32), lw: 1.8)
        ])
    }
}
