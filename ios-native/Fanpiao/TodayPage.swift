import SwiftUI
import UIKit

// 今日页：照 Norg 可点预览的布局和逐帧动画，只换字。

/// 每一帧卡片的几何（和预览 renderVals 里 sys / b 那一段同一套算法）
struct CardGeo {
    static let K = 390.0 / 402.0
    let D: [String: Double]
    let S: [String: Double]
    let DS: [String: Double]
    let dInv: Bool
    let sheetOn: Bool
    let scrollY: Double

    @MainActor
    init(m: TodayMotion, scrollY: Double) {
        let A = m.anim
        let at = m.at
        var d: [String: Double]
        if A == "diet" {
            d = pick(NT.diet, at)
        } else if A == "train" {
            d = pick(NT.train, at)
        } else if m.mode == .diet {
            d = ["hero": 330, "trainX": -300, "trainOp": 0, "dietX": 0, "red": 0, "glow": 1, "pill": 1]
        } else {
            d = ["hero": 0, "trainX": 0, "trainOp": 1, "dietX": 300, "red": 1, "glow": 0, "pill": 0]
        }
        var s: [String: Double]
        if A == "open" {
            s = pick(NT.open, at)
        } else if A == "close" {
            s = pick(NT.close, at)
        } else {
            s = pick(m.sheet ? NT.close : NT.open, 0)
        }
        let di = A == "dopen" || A == "dclose" || m.dsheet
        let ds: [String: Double]
        if A == "dclose" {
            ds = pick(NT.dclose, at)
        } else {
            ds = pick(NT.dopen, A == "dopen" ? at : (m.dsheet ? 0.47 : 0))
        }
        if di {
            for key in ["cTop", "cBot", "cL", "cR", "rad", "oldOp"] { s[key] = ds[key] ?? 0 }
            s["sheetOp"] = 0
            s["heroOp"] = 0
        }
        if s["bL"] == nil {
            let cy = s["cy"] ?? 780
            s["bL"] = 42 + 187 * cl((780 - cy) / 366, 0, 1)
        }
        D = d
        S = s
        DS = ds
        dInv = di
        sheetOn = m.sheet || A == "open" || A == "close" || di
        self.scrollY = scrollY
    }

    func d(_ k: String) -> Double { D[k] ?? 0 }
    func s(_ k: String) -> Double { S[k] ?? 0 }
    var K: Double { Self.K }

    var P: Double { cl((197 - s("cTop")) / 197, 0, 1) }
    var frameOff: Double { -scrollY * (1 - P) }
    var cT: Double { s("cTop") * K }
    var cB: Double { s("cBot") * K }
    var cL: Double { s("cL") * K }
    var cR: Double { s("cR") * K }
    var rad: Double { s("rad") * K }
    var redA: Double { d("red") * s("redOp") }
    var titleP: Double { cl((260 - s("tY")) / 110, 0, 1) }
    var tc: Double { s("tColor") }
    var dP: Double { cl((s("cd") - 35) / 11, 0, 1) }
    var bcx: Double { s("cx") * K }
    var bcy: Double { s("cy") * K }
    var bd: Double { s("cd") * K }
    var bh: Double { bd + 12 }
    var pad: Double { 5 + 1.5 * dP }
    var bLeft: Double { s("bL") * K }
    var bRight: Double { bcx + bd / 2 + pad }
    var forkOp: Double { cl(1 - d("dietX") / 150, 0, 1) }
    var pillP: Double { d("pill") }
    var cp: Double { DS["cp"] ?? 0 }
}

struct TodayPage: View {
    @Environment(TodayMotion.self) private var m
    @Environment(UIState.self) private var ui
    @Environment(\.designK) private var k
    @State private var scrollY: Double = 0

    var body: some View {
        let g = CardGeo(m: m, scrollY: scrollY)
        ZStack(alignment: .topLeading) {
            hx(0x0c0a0b).ignoresSafeArea()
            ScrollView(.vertical) {
                DesignScaled {
                    ZStack(alignment: .topLeading) {
                        TodayContent(hdrOp: g.s("hdrOp"))
                        if !g.sheetOn {
                            HeroCard(g: g, frameOff: 0)
                        }
                    }
                }
            }
            .scrollIndicators(.hidden)
            .scrollDisabled(g.sheetOn)
            .ignoresSafeArea()
            .onScrollGeometryChange(for: Double.self) { geo in
                Double(geo.contentOffset.y + geo.contentInsets.top)
            } action: { _, y in
                scrollY = y / Double(k)
            }
            if g.sheetOn {
                DesignScaled(height: 900) {
                    HeroCard(g: g, frameOff: g.frameOff)
                }
                .ignoresSafeArea()
            }
        }
        .opacity(ui.pageOpacity)
        .toolbarVisibility(g.sheetOn ? .hidden : .visible, for: .tabBar)
        .task {
            if LaunchArgs.has("-fpAutoplay") { await m.autoplay() }
        }
    }
}

// MARK: - 页面本身（卡片下面那一层）

struct TodayContent: View {
    let hdrOp: Double
    @Environment(UIState.self) private var ui
    @State private var day = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .frame(width: 390, height: 449, alignment: .topLeading)
                .opacity(hdrOp)
            shortcuts
            sectionHeader
            addData
            rankCard
            Color.clear.frame(height: 110)
        }
        .frame(width: 390, alignment: .topLeading)
        .background(alignment: .top) {
            RadialGradient(stops: [
                .init(color: hx(0x2a0e11), location: 0),
                .init(color: hx(0x0c0a0b), location: 1)
            ], center: UnitPoint(x: 0.5, y: 0.28), startRadius: 0, endRadius: 263)
            .frame(width: 390, height: 880)
        }
    }

    private var header: some View {
        ZStack(alignment: .topLeading) {
            Button {
                ui.replayBoot()
            } label: {
                HStack(spacing: 4) {
                    NI.logo().frame(width: 25, height: 28)
                    T(L.brand, 28, .heavy, .white, track: -1)
                }
                .frame(height: 38)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .at(18, 72)

            ProBadge().at(294, 81)
            Streak().at(345, 82)

            Button {
                day = max(-2, day - 1)
            } label: {
                NI.triLeft(hx(0xe8e0e0)).frame(width: 11, height: 12)
                    .frame(width: 24, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .at(18, 133)

            T(L.days[day + 2], 32, .black, hx(0xf2e2e2), track: 1)
                .lineLimit(1).fixedSize()
                .frame(height: 44)
                .at(44, 133)

            Button {
                day = min(2, day + 1)
            } label: {
                NI.triRight(hx(0x3e3a3b)).frame(width: 11, height: 12)
                    .frame(width: 24, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .at(108, 133)
        }
    }

    private var shortcuts: some View {
        HStack(alignment: .bottom, spacing: 0) {
            shortcut(NI.cap(), 22, 20, L.shortcuts[0], 9, .regular, hx(0x3a2c2e), gap: 7, pb: 4)
            shortcut(NI.medal(), 22, 27, L.shortcuts[1], 12, .regular, hx(0xc4c4c8), gap: 6, pb: 2)
            shortcut(NI.badge(), 30, 30, L.shortcuts[2], 15, .bold, .white, gap: 8, pb: 0)
            shortcut(NI.trophy(), 24, 26, L.shortcuts[3], 12, .regular, hx(0xc4c4c8), gap: 6, pb: 2)
            shortcut(NI.layers(), 20, 20, L.shortcuts[4], 9, .regular, hx(0x3a2c2e), gap: 7, pb: 4)
        }
        .frame(width: 354)
        .padding(.top, 22)
        .padding(.horizontal, 18)
    }

    private func shortcut(_ icon: Icon, _ w: CGFloat, _ h: CGFloat, _ label: String, _ size: CGFloat, _ weight: Font.Weight, _ color: Color, gap: CGFloat, pb: CGFloat) -> some View {
        Button {
        } label: {
            VStack(spacing: gap) {
                icon.frame(width: w, height: h)
                T(label, size, weight, color).lineLimit(1).fixedSize()
            }
            .padding(.bottom, pb)
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var sectionHeader: some View {
        HStack(spacing: 0) {
            HStack(spacing: 9) {
                Circle().fill(hx(0xe5404a)).frame(width: 7, height: 7)
                    .shadow(color: hx(0xe5404a), radius: 4)
                T(L.bodyData, 18, .heavy)
            }
            Spacer(minLength: 0)
            Button {
            } label: {
                T(L.edit, 13, .regular, hx(0x8a8a8e)).frame(minHeight: 32)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 30)
        .padding(.horizontal, 18)
        .padding(.bottom, 10)
    }

    private var addData: some View {
        Button {
        } label: {
            RoundedRectangle(cornerRadius: 18, style: .circular)
                .strokeBorder(hx(0x3a3a3e), style: StrokeStyle(lineWidth: 1.2, dash: [4, 3]))
                .frame(width: 170, height: 123)
                .overlay { NI.plus(hx(0x8a8a8e), 1.6).frame(width: 18, height: 18) }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 18)
    }

    private var rankCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                NI.diamond(hx(0x6b6b70), hx(0x2a2a2e), hx(0xc9c9cc)).frame(width: 50, height: 54)
                VStack(alignment: .leading, spacing: 0) {
                    T(L.rankTitle, 12, .regular, hx(0x8a8a8e))
                    T(L.rankName, 26, .black, hx(0xd8d8dc)).padding(.top, 2)
                    T(L.rankHint, 12, .regular, hx(0x6a6a6e)).padding(.top, 2)
                }
                Spacer(minLength: 0)
                NI.chevronRight().frame(width: 12, height: 18)
            }
            ZStack(alignment: .leading) {
                Capsule().fill(hx(0x2a2a2e))
                Rectangle().fill(hx(0xe5404a)).frame(width: 322 * 0.02)
            }
            .frame(height: 4)
            .clipShape(Capsule())
            .padding(.top, 14)
            HStack {
                T(L.rankXP, 11, .bold, hx(0xd8d8dc))
                Spacer()
                T(L.rankNext, 11, .bold, hx(0xd8d8dc))
            }
            .padding(.top, 8)
        }
        .padding(EdgeInsets(top: 14, leading: 16, bottom: 16, trailing: 16))
        .background(
            RoundedRectangle(cornerRadius: 22, style: .circular)
                .fill(LinearGradient(colors: [hx(0x1e1e21), hx(0x151517)], startPoint: .top, endPoint: .bottom))
        )
        .padding(.top, 16)
        .padding(.horizontal, 18)
    }
}

struct ProBadge: View {
    var body: some View {
        T(L.pro, 11, .heavy, hx(0x111111), track: 0.5)
            .frame(width: 38, height: 21)
            .background(Capsule().fill(hx(0xf0f0f0)))
    }
}

struct Streak: View {
    var body: some View {
        HStack(spacing: 4) {
            NI.flame().frame(width: 13, height: 16)
            T(L.streak, 14, .bold, hx(0x6a6a6e))
        }
    }
}

// MARK: - 今日卡片（训练/饮食切换、长成整页）

struct HeroCard: View {
    @Environment(TodayMotion.self) private var m
    @Environment(UIState.self) private var ui
    let g: CardGeo
    let frameOff: Double

    var body: some View {
        ZStack(alignment: .topLeading) {
            shell
            heroClip
            clip
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
        .offset(y: frameOff)
    }

    // 卡片底：暗色 + 底部红光 + 红色卡面
    private var shell: some View {
        let w = max(0, g.cR - g.cL)
        let h = max(0, g.cB - g.cT)
        let shape = RoundedRectangle(cornerRadius: g.rad, style: .circular)
        let gh = (125 + 205 * g.cp) * g.K
        return ZStack(alignment: .bottom) {
            LinearGradient(stops: [
                .init(color: hx(0x1b1113), location: 0),
                .init(color: hx(0x0e0a0b), location: 0.45),
                .init(color: hx(0x090808), location: 1)
            ], startPoint: .top, endPoint: .bottom)
            RadialGradient(stops: [
                .init(color: hx(0xec3541), location: 0),
                .init(color: hx(0xc8283a), location: 0.28),
                .init(color: rgba(150, 24, 32, 0.6), location: 0.58),
                .init(color: rgba(60, 10, 14, 0), location: 1)
            ], center: .bottom, startRadius: 0, endRadius: gh)
            .scaleEffect(x: 1.3 * w / gh, y: 1, anchor: .bottom)
            .frame(width: w, height: gh)
            .clipped()
            .opacity(g.d("glow"))
            ZStack(alignment: .top) {
                LinearGradient(stops: [
                    .init(color: hx(0xdf5a60), location: 0),
                    .init(color: hx(0xc2454c), location: 0.4),
                    .init(color: hx(0x8a2a30), location: 0.75),
                    .init(color: hx(0x3a1215), location: 1)
                ], startPoint: UnitPoint(x: 0.41, y: 0), endPoint: UnitPoint(x: 0.59, y: 1))
                Rectangle().fill(Color.white.opacity(0.28)).frame(height: 1)
            }
            .opacity(g.redA)
        }
        .frame(width: w, height: h)
        .clipShape(shape)
        .overlay(shape.strokeBorder(rgba(255, 110, 110, 0.22 * (1 - g.P)), lineWidth: 1))
        .shadow(color: rgba(229, 64, 74, 0.32 * g.redA), radius: 23)
        .offset(x: g.cL, y: g.cT)
    }

    // 人物大图：可以探出卡片顶部，只在右下角跟着卡片圆角裁
    private var heroClip: some View {
        let w = max(0, g.cR - 148)
        let y = 127 + g.d("hero") + g.s("heroY") * g.K + Double(ui.heroRise)
        return ZStack(alignment: .topLeading) {
            if let img = UIImage(named: "hero") {
                Image(uiImage: img)
                    .resizable()
                    .frame(width: 223, height: 322)
                    .opacity(g.s("heroOp"))
                    .offset(y: y)
            }
        }
        .frame(width: w, height: max(0, g.cB), alignment: .topLeading)
        .clipShape(UnevenRoundedRectangle(bottomTrailingRadius: g.rad, style: .circular))
        .allowsHitTesting(false)
        .offset(x: 148)
    }

    // 卡片里的内容：按全屏坐标写，裁在卡片里
    private var clip: some View {
        let w = max(0, g.cR - g.cL)
        let h = max(0, g.cB - g.cT)
        return ZStack(alignment: .topLeading) {
            inner
                .frame(width: 390, height: 844, alignment: .topLeading)
                .offset(x: -g.cL, y: -g.cT)
        }
        .frame(width: w, height: h, alignment: .topLeading)
        .clipShape(RoundedRectangle(cornerRadius: g.rad, style: .circular))
        .contentShape(Rectangle())
        .onTapGesture { m.tapCard() }
        .simultaneousGesture(
            DragGesture(minimumDistance: 8)
                .onChanged { v in m.cardDrag(dx: v.translation.width, dy: v.translation.height) }
                .onEnded { v in m.cardDragEnd(vx: v.velocity.width / 1000) }
        )
        .offset(x: g.cL, y: g.cT)
    }

    private var inner: some View {
        let sheetOp = g.s("sheetOp")
        let oldOp = g.s("oldOp")
        let trainOp = g.d("trainOp")
        return ZStack(alignment: .topLeading) {
            SheetContent(onClose: { m.closeSheet() })
                .offset(x: g.cL, y: g.cT)
                .opacity(sheetOp)
                .allowsHitTesting(sheetOp > 0.5)
            oldHeader
                .offset(x: g.cL - 18, y: g.cT)
                .opacity(oldOp)
                .allowsHitTesting(oldOp > 0.5)
            if g.d("dietX") < 299 {
                DietGroup(cp: g.cp)
                    .offset(x: g.d("dietX"))
                    .opacity(g.dInv ? 1 : 1 - g.P)
                    .allowsHitTesting(false)
            }
            trainLayer
                .offset(x: g.d("trainX"))
                .opacity(trainOp)
                .allowsHitTesting(trainOp > 0.5)
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
    }

    // 卡片顶部：排餐/饮食切换、餐具、编辑
    private var oldHeader: some View {
        let pillP = g.pillP
        let forkOp = g.forkOp
        return ZStack(alignment: .topLeading) {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 15, style: .circular).fill(hx(0x1a0a0c))
                RoundedRectangle(cornerRadius: 15, style: .circular).strokeBorder(hx(0x0a0405), lineWidth: 1.5)
                Capsule().fill(hx(0xe8434c))
                    .frame(width: 56, height: 25)
                    .at(2.5 + 55.5 * pillP, 2.5)
                Button {
                    m.showTrain()
                } label: {
                    T(L.segA, 13, .heavy, pillP < 0.5 ? hx(0x1a0608) : hx(0xd8cccc))
                        .frame(width: 56, height: 25).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .at(2.5, 2.5)
                Button {
                    m.showDiet()
                } label: {
                    T(L.segB, 13, .heavy, pillP >= 0.5 ? hx(0x1a0608) : hx(0xe2c4c6))
                        .frame(width: 56, height: 25).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .at(58, 2.5)
            }
            .frame(width: 116, height: 30, alignment: .topLeading)
            .at(32, 15)

            Button {
            } label: {
                ZStack {
                    Circle().fill(rgba(44, 34, 36, 0.9))
                    Circle().strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
                    NI.fork().frame(width: 14, height: 15)
                }
                .frame(width: 31, height: 31)
            }
            .buttonStyle(.plain)
            .opacity(forkOp)
            .scaleEffect(0.6 + 0.4 * forkOp)
            .allowsHitTesting(forkOp > 0.5)
            .at(290, 10)

            Button {
            } label: {
                ZStack {
                    Circle().fill(rgba(70, 24, 28, 0.8))
                    Circle().strokeBorder(Color.white.opacity(0.22), lineWidth: 1)
                    NI.editSquare().frame(width: 14, height: 14)
                }
                .frame(width: 31, height: 31)
            }
            .buttonStyle(.plain)
            .at(331, 10)
        }
        .frame(width: 390, height: 50, alignment: .topLeading)
    }

    // 排餐那一面：大标题、两行说明、虚线圈、安排三餐按钮（都会飞到整页的新位置）
    private var trainLayer: some View {
        let tp = g.titleP
        let tc = g.tc
        let K = g.K
        let subColor = mix([92, 26, 31], [184, 168, 168], tc)
        let subSize = 11.5 + 0.5 * tp
        let dashSize = 30 + 5 * tp
        return ZStack(alignment: .topLeading) {
            T(L.cardTitle, 33, .black, mix([28, 7, 9], [236, 220, 220], tc))
                .lineLimit(1).fixedSize()
                .frame(height: 40)
                .at((35 - 17 * tp) * K, g.s("tY") * K)
            T(L.cardSub1, subSize, .regular, subColor)
                .lineLimit(1).fixedSize()
                .frame(height: 21)
                .at(34 - 16.5 * tp, 326 - 109.5 * tp)
            T(L.cardSub2, subSize, .regular, subColor)
                .lineLimit(1).fixedSize()
                .frame(height: 21)
                .at(34 - 16.5 * tp, 347 - 98.5 * tp)
            Circle()
                .strokeBorder(mix([106, 32, 38], [74, 74, 78], tc), style: StrokeStyle(lineWidth: 1.2, dash: [3.6, 2.4]))
                .frame(width: dashSize, height: dashSize)
                .at(32 - 14.5 * tp, 367 - 92.5 * tp)
            ctaButton
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
    }

    private var ctaButton: some View {
        let bh = g.bh
        let bd = g.bd
        let w = max(bh, g.bRight - g.bLeft)
        let dP = g.dP
        let pad = g.pad
        let arrow = 15 + 5 * dP
        return Button {
            m.openSheet()
        } label: {
            ZStack(alignment: .topLeading) {
                Capsule().fill(LinearGradient(colors: [rgba(60, 14, 18, 0.92), rgba(40, 10, 12, 0.92)], startPoint: .leading, endPoint: .trailing))
                Capsule().fill(LinearGradient(stops: [
                    .init(color: rgba(22, 10, 12, 0.96), location: 0),
                    .init(color: rgba(64, 16, 22, 0.92), location: 0.55),
                    .init(color: rgba(196, 48, 58, 0.8), location: 1)
                ], startPoint: .leading, endPoint: .trailing))
                .opacity(dP)
                T(L.cardBtn, 15 + 2 * dP, .heavy, mix([255, 107, 115], [255, 90, 100], dP))
                    .lineLimit(1).fixedSize()
                    .frame(height: bh)
                    .at(16 + 5 * dP, 0)
                Circle().fill(hx(0xe8434c))
                    .frame(width: bd, height: bd)
                    .shadow(color: rgba(255, 60, 70, 0.55 * dP), radius: 6 * dP)
                    .overlay { NI.arrowRight().frame(width: arrow, height: arrow) }
                    .at(w - pad - bd, (bh - bd) / 2 - 1.2)
            }
            .frame(width: w, height: bh, alignment: .topLeading)
            .clipShape(Capsule())
            .overlay(Capsule().strokeBorder(rgba(240, 90, 98, 0.55 + 0.25 * dP), lineWidth: 1.2))
            .shadow(color: rgba(229, 64, 74, 0.25 * dP), radius: 7 * dP)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .at(g.bLeft, g.bcy - bh / 2)
    }
}

// MARK: - 饮食那一面（按全屏坐标写，卡片里时整体缩小平移）

struct DietGroup: View {
    let cp: Double

    var body: some View {
        let K = 390.0 / 402.0
        let gs = 0.84 + 0.16 * cp
        let gtx = 32.7 * (1 - cp) * K
        let gty = 164.6 * (1 - cp) * K
        return ZStack(alignment: .topLeading) {
            ZStack {
                RadialGradient(colors: [Color.white.opacity(0.05), Color.white.opacity(0)], center: .top, startRadius: 0, endRadius: 175)
                    .scaleEffect(x: 584.0 / 175.0, y: 1, anchor: .top)
                    .clipShape(Circle())
                Circle()
                    .trim(from: 0.625, to: 0.875)
                    .stroke(rgba(255, 220, 220, 0.42), lineWidth: 1.2)
            }
            .frame(width: 974, height: 974)
            .at(-292, 308.5)

            HStack(alignment: .firstTextBaseline, spacing: 5) {
                T(cp > 0.5 ? L.dietLeft : L.dietGoal, 10.5, .regular, hx(0xb8acac))
                T(L.dietGoalKcal, 17, .heavy, hx(0xf2e6e6))
                T(L.kcal, 10.5, .regular, hx(0xb8acac))
            }
            .frame(width: 390)
            .at(0, 322)

            HStack(alignment: .firstTextBaseline, spacing: 7) {
                T(L.dietEaten, 48, .black, .white)
                T(L.kcal, 14.5, .bold, hx(0x9a9a9e))
            }
            .frame(height: 50)
            .at(19, 104)

            T(L.dietMeals, 11, .regular, hx(0xb8b0b0)).at(26, 157)

            Capsule()
                .fill(LinearGradient(stops: [
                    .init(color: hx(0x130808), location: 0),
                    .init(color: hx(0x2a0b0e), location: 0.55),
                    .init(color: hx(0x401014), location: 1)
                ], startPoint: .leading, endPoint: .trailing))
                .overlay(Capsule().strokeBorder(rgba(255, 120, 120, 0.32), lineWidth: 1))
                .shadow(color: rgba(229, 64, 74, 0.18), radius: 6)
                .frame(width: 297.8, height: 37)
                .at(19.4, 189)
            T(L.dietPct, 17.5, .heavy, .white).at(342, 196)

            macro(0, x: 25, barX: 55, bar: hx(0x3c4a1e))
            Rectangle().fill(Color.white.opacity(0.16)).frame(width: 1, height: 27).at(128, 257)
            macro(1, x: 174.6, barX: 207, bar: hx(0x22482a))
            Rectangle().fill(Color.white.opacity(0.16)).frame(width: 1, height: 27).at(264, 257)
            macro(2, x: 309.4, barX: 341, bar: hx(0x3a3a1c))
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
        .scaleEffect(gs, anchor: .topLeading)
        .offset(x: gtx, y: gty)
    }

    private func macro(_ i: Int, x: Double, barX: Double, bar: Color) -> some View {
        ZStack(alignment: .topLeading) {
            T(L.macros[i], 11, .regular, hx(0xb3a9a9)).at(x, 251)
            T(L.macroZero, 18.5, .heavy, .white).at(x, 266)
            RoundedRectangle(cornerRadius: 2).fill(bar).frame(width: 3, height: 18).at(barX, 270)
        }
    }
}

// MARK: - 安排三餐整页（跟着卡片左上角走）

struct SheetContent: View {
    let onClose: () -> Void

    var body: some View {
        let week = WeekStrip.make()
        ZStack(alignment: .topLeading) {
            Button(action: onClose) {
                RoundIcon(size: 35, bg: hx(0x221d1e)) { NI.chevronDown(hx(0xe8e0e0), 2.6).frame(width: 15, height: 15) }
            }
            .buttonStyle(.plain)
            .at(15, 64)

            T(week.dateText, 13.5, .regular, hx(0xd6cfcf), track: 0.3)
                .lineLimit(1).fixedSize()
                .frame(height: 19)
                .at(64, 72)

            RoundIcon(size: 33, bg: hx(0x221d1e)) { NI.pencil(hx(0xe8e0e0), 2.2).frame(width: 14, height: 14) }.at(300, 119)
            RoundIcon(size: 33, bg: hx(0x221d1e)) { NI.calendar().frame(width: 14, height: 14) }.at(340, 119)

            RoundedRectangle(cornerRadius: 18, style: .circular).fill(hx(0x1e191a))
                .frame(width: 35, height: 58)
                .at(24, 316)

            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { i in
                    T(week.labels[i], 9, .regular, hx(0x6a6a6e)).frame(width: 51, height: 12)
                }
            }
            .at(16, 322)

            ZStack {
                Circle().fill(hx(0x3a1215))
                Circle().strokeBorder(hx(0xe5404a), lineWidth: 1.5)
            }
            .frame(width: 25, height: 25)
            .at(29, 341)

            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { i in
                    T(week.numbers[i], 13.5, i == 0 ? .bold : .regular, i == 0 ? .white : hx(0xc8c8cc))
                        .frame(width: 51, height: 18)
                }
            }
            .at(16, 345)

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                T(L.sheetBlock, 15, .heavy, hx(0xf2eded))
                T(L.sheetBlockCount, 12, .regular, hx(0x6a6a6e))
            }
            .at(17, 393)

            Button {
            } label: {
                HStack(spacing: 5) {
                    NI.plusSmall(.white, 3).frame(width: 10, height: 10)
                    T(L.sheetCreate, 11, .regular, .white)
                }
                .frame(width: 86, height: 26)
                .background(Capsule().fill(hx(0x1a0c0e)))
                .overlay(Capsule().strokeBorder(hx(0x7a2228), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .at(287, 391)

            VStack(spacing: 0) {
                NI.arrowDown().frame(width: 14, height: 16)
                T(L.sheetEmpty, 14, .heavy, hx(0xececec)).padding(.top, 9)
                T(L.sheetEmptySub, 10, .regular, hx(0x6a6a6e)).padding(.top, 8)
            }
            .frame(width: 390)
            .at(0, 470)
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
    }
}

/// 圆形小按钮底（深色圆 + 一圈细白边）
struct RoundIcon<Content: View>: View {
    let size: CGFloat
    let bg: Color
    @ViewBuilder var content: Content
    var body: some View {
        ZStack {
            Circle().fill(bg)
            Circle().strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
            content
        }
        .frame(width: size, height: size)
    }
}

/// 一周日期：今天 + 后面 6 天
struct WeekStrip {
    let dateText: String
    let labels: [String]
    let numbers: [String]

    static func make() -> WeekStrip {
        let cal = Calendar(identifier: .gregorian)
        let now = Date()
        var labels: [String] = []
        var numbers: [String] = []
        for i in 0..<7 {
            let d = cal.date(byAdding: .day, value: i, to: now) ?? now
            numbers.append(String(cal.component(.day, from: d)))
            labels.append(i == 0 ? L.todayShort : L.weekdays[cal.component(.weekday, from: d) - 1])
        }
        let m = cal.component(.month, from: now)
        let d = cal.component(.day, from: now)
        return WeekStrip(dateText: "\(m)月\(d)日 · \(L.sheetToday)", labels: labels, numbers: numbers)
    }
}
