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
    func ds(_ k: String) -> Double { DS[k] ?? 0 }
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
        }
        .overlay(alignment: .topLeading) {
            // 卡片长成整页时放到最上层（用 overlay，不撑大页面，免得整页跟着跳）
            if g.sheetOn {
                DesignScaled(height: 844) {
                    HeroCard(g: g, frameOff: g.frameOff)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
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
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .frame(width: 390, height: 449, alignment: .topLeading)
                .opacity(hdrOp)
            shortcuts
            sectionHeader
            BodyCards()
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
        let off = model.dayOffset
        let canBack = off > -2
        let canNext = off < 6
        return ZStack(alignment: .topLeading) {
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
            Button {
                model.route = .records
            } label: {
                Streak(n: Int(model.stats?.streak ?? 0))
            }
            .buttonStyle(.plain)
            .at(345, 82)

            Button {
                if canBack { Task { await model.setDay(off - 1) } }
            } label: {
                NI.triLeft(canBack ? hx(0xe8e0e0) : hx(0x3e3a3b)).frame(width: 11, height: 12)
                    .frame(width: 24, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .at(18, 133)

            T(L.dayName(off), 32, .black, hx(0xf2e2e2), track: 1)
                .lineLimit(1).fixedSize()
                .frame(height: 44)
                .contentTransition(.numericText())
                .at(44, 133)

            Button {
                if canNext { Task { await model.setDay(off + 1) } }
            } label: {
                NI.triRight(canNext ? hx(0xe8e0e0) : hx(0x3e3a3b)).frame(width: 11, height: 12)
                    .frame(width: 24, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .at(108, 133)
        }
    }

    private var shortcuts: some View {
        HStack(alignment: .bottom, spacing: 0) {
            shortcut(NI.cap(), 22, 20, L.shortcuts[0], 9, .regular, hx(0x3a2c2e), gap: 7, pb: 4, to: .school)
            shortcut(NI.medal(), 22, 27, L.shortcuts[1], 12, .regular, hx(0xc4c4c8), gap: 6, pb: 2, to: .achievements)
            shortcut(NI.badge(), 30, 30, L.shortcuts[2], 15, .bold, .white, gap: 8, pb: 0, to: .plans)
            shortcut(NI.trophy(), 24, 26, L.shortcuts[3], 12, .regular, hx(0xc4c4c8), gap: 6, pb: 2, to: .level)
            shortcut(NI.layers(), 20, 20, L.shortcuts[4], 9, .regular, hx(0x3a2c2e), gap: 7, pb: 4, to: .themes)
        }
        .frame(width: 354)
        .padding(.top, 22)
        .padding(.horizontal, 18)
    }

    private func shortcut(_ icon: Icon, _ w: CGFloat, _ h: CGFloat, _ label: String, _ size: CGFloat, _ weight: Font.Weight, _ color: Color, gap: CGFloat, pb: CGFloat, to route: Route) -> some View {
        Button {
            model.route = route
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
                model.route = .profile
            } label: {
                T(L.edit, 13, .regular, hx(0x8a8a8e)).frame(minHeight: 32)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 30)
        .padding(.horizontal, 18)
        .padding(.bottom, 10)
    }

    private var rankCard: some View {
        let lv = model.home?.level ?? model.stats?.level
        let cur = lv?.cur ?? 0
        let need = max(1, lv?.need ?? 120)
        let fresh = (lv?.xp ?? 0) == 0
        return Button {
            model.route = .level
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 12) {
                    NI.diamond(hx(0x6b6b70), hx(0x2a2a2e), hx(0xc9c9cc)).frame(width: 50, height: 54)
                    VStack(alignment: .leading, spacing: 0) {
                        T(L.rankTitle, 12, .regular, hx(0x8a8a8e))
                        T(lv?.name ?? L.rankName, 26, .black, hx(0xd8d8dc)).padding(.top, 2)
                        T(fresh ? L.rankHint : L.rankHintNext(need - cur, lv?.next ?? ""), 12, .regular, hx(0x6a6a6e)).padding(.top, 2)
                    }
                    Spacer(minLength: 0)
                    NI.chevronRight().frame(width: 12, height: 18)
                }
                ZStack(alignment: .leading) {
                    Capsule().fill(hx(0x2a2a2e))
                    Rectangle().fill(hx(0xe5404a)).frame(width: 322 * max(0.02, min(1, cur / need)))
                }
                .frame(height: 4)
                .clipShape(Capsule())
                .padding(.top, 14)
                HStack {
                    T(lv.map { L.rankXPText($0.cur, $0.need) } ?? L.rankXP, 11, .bold, hx(0xd8d8dc))
                    Spacer()
                    T(lv.map { $0.next.isEmpty ? $0.name : $0.next } ?? L.rankNext, 11, .bold, hx(0xd8d8dc))
                }
                .padding(.top, 8)
            }
            .padding(EdgeInsets(top: 14, leading: 16, bottom: 16, trailing: 16))
            .background(
                RoundedRectangle(cornerRadius: 22, style: .circular)
                    .fill(LinearGradient(colors: [hx(0x1e1e21), hx(0x151517)], startPoint: .top, endPoint: .bottom))
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.top, 16)
        .padding(.horizontal, 18)
    }
}

/// 身体数据：体重、BMI、每日目标三张卡，加一张虚线的「+」
struct BodyCards: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let h = model.home
        let ws = model.stats?.w ?? []
        VStack(alignment: .leading, spacing: 14) {
            if let h, let p = h.profile {
                HStack(spacing: 14) {
                    DataCard(title: L.cardWeight, value: weightText(ws, p), unit: L.cardKg, sub: weightSub(ws), spark: ws.map(\.kg)) { model.route = .weight }
                    DataCard(title: L.cardBMI, value: bmi(p).map { Fmt.one($0) } ?? "—", unit: "", sub: bmi(p).map { L.bmiLevel($0) } ?? "", spark: []) { model.route = .profile }
                }
                HStack(spacing: 14) {
                    DataCard(title: L.cardTarget, value: Fmt.k(h.T.kcal), unit: L.kcal, sub: L.targetSub(h.T.protein), spark: []) { model.route = .dietDetail }
                    addCard
                }
            } else {
                addCard
            }
        }
        .padding(.horizontal, 18)
    }

    private var addCard: some View {
        Button {
            model.route = .weight
        } label: {
            RoundedRectangle(cornerRadius: 18, style: .circular)
                .strokeBorder(hx(0x3a3a3e), style: StrokeStyle(lineWidth: 1.2, dash: [4, 3]))
                .frame(width: 170, height: 123)
                .overlay { NI.plus(hx(0x8a8a8e), 1.6).frame(width: 18, height: 18) }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func weightText(_ ws: [WeightRec], _ p: ProfileVM) -> String {
        if let w = ws.last { return Fmt.one(w.kg) }
        return p.weight.map { Fmt.one($0) } ?? "—"
    }

    private func weightSub(_ ws: [WeightRec]) -> String {
        guard ws.count >= 2, let a = ws.first, let b = ws.last else { return ws.isEmpty ? L.cardNoWeight : ws[0].d }
        return L.weightDelta(b.kg - a.kg, days: max(1, daysBetween(a.d, b.d)))
    }

    private func daysBetween(_ a: String, _ b: String) -> Int {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        guard let x = f.date(from: a), let y = f.date(from: b) else { return 0 }
        return Int((y.timeIntervalSince(x) / 86400).rounded())
    }

    private func bmi(_ p: ProfileVM) -> Double? {
        guard let h = p.height, let w = p.weight, h > 0 else { return nil }
        let m = h / 100
        return w / (m * m)
    }
}

/// 一张身体数据卡（170 × 123，和虚线卡一样大）
struct DataCard: View {
    let title: String
    let value: String
    let unit: String
    let sub: String
    let spark: [Double]
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                T(title, 12, .regular, hx(0x8a8a8e))
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    T(value, 26, .black, hx(0xf2eded)).monospacedDigit()
                    T(unit, 11, .bold, hx(0x8a8a8e))
                }
                .padding(.top, 6)
                T(sub, 11, .regular, hx(0x6a6a6e)).lineLimit(1).padding(.top, 2)
                Spacer(minLength: 0)
                if spark.count >= 2 { Spark(vals: spark).frame(height: 18) }
            }
            .padding(14)
            .frame(width: 170, height: 123, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .circular)
                    .fill(LinearGradient(colors: [hx(0x1e1e21), hx(0x151517)], startPoint: .top, endPoint: .bottom))
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// 一条小折线
struct Spark: View {
    let vals: [Double]
    var body: some View {
        Canvas { ctx, size in
            guard vals.count >= 2, let lo = vals.min(), let hi = vals.max() else { return }
            let r = max(0.1, hi - lo)
            var p = Path()
            for (i, v) in vals.enumerated() {
                let x = size.width * CGFloat(i) / CGFloat(vals.count - 1)
                let y = 2 + (size.height - 4) * CGFloat(1 - (v - lo) / r)
                if i == 0 { p.move(to: CGPoint(x: x, y: y)) } else { p.addLine(to: CGPoint(x: x, y: y)) }
            }
            ctx.stroke(p, with: .color(hx(0xe5404a)), style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
        }
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
    var n: Int = 0
    var body: some View {
        HStack(spacing: 4) {
            NI.flame().frame(width: 13, height: 16)
            T(String(n), 14, .bold, n > 0 ? hx(0xe5404a) : hx(0x6a6a6e))
        }
    }
}

// MARK: - 今日卡片（训练/饮食切换、长成整页）

struct HeroCard: View {
    @Environment(TodayMotion.self) private var m
    @Environment(UIState.self) private var ui
    @Environment(AppModel.self) private var model
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
        // 整页打开后只让里面的按钮、列表接手势（免得和列表滚动抢）
        .gesture(TapGesture().onEnded { m.tapCard() }, including: g.sheetOn ? .subviews : .all)
        .simultaneousGesture(
            DragGesture(minimumDistance: 8)
                .onChanged { v in m.cardDrag(dx: v.translation.width, dy: v.translation.height) }
                .onEnded { v in m.cardDragEnd(vx: v.velocity.width / 1000) },
            including: g.sheetOn ? .subviews : .all
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
                DietGroup(cp: g.cp, h: model.home)
                    .offset(x: g.d("dietX"))
                    .opacity(g.dInv ? 1 : 1 - g.P)
                    .allowsHitTesting(false)
            }
            if g.dInv {
                DietPageLayers(g: g)
            }
            trainLayer
                .offset(x: g.d("trainX"))
                .opacity(trainOp)
                .allowsHitTesting(trainOp > 0.5)
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
    }

    /// 卡片上的标题和两行说明：有排餐就显示这一天用的食谱和数字
    private var cardTexts: (String, String, String) {
        guard let h = model.home else { return (L.cardTitle, L.cardSub1, L.cardSub2) }
        let items = h.meals.flatMap(\.items)
        guard !items.isEmpty else { return (L.cardTitle, L.cardSub1, L.cardSub2) }
        let done = items.filter(\.done).count
        return (h.planName, L.cardSubA(items.count, h.planned.kcal), L.cardSubB(done, items.count, h.planned.cost))
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
                model.route = .addFood(Route.guessSlot(), true)
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
                model.route = .plans
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
        let tx = cardTexts
        return ZStack(alignment: .topLeading) {
            T(tx.0, 33, .black, mix([28, 7, 9], [236, 220, 220], tc))
                .lineLimit(1).fixedSize()
                .frame(height: 40)
                .at((35 - 17 * tp) * K, g.s("tY") * K)
            T(tx.1, subSize, .regular, subColor)
                .lineLimit(1).fixedSize()
                .frame(height: 21)
                .at(34 - 16.5 * tp, 326 - 109.5 * tp)
            T(tx.2, subSize, .regular, subColor)
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
            // 卡片上：打开整页；整页里：让饭票重新安排三餐（已经打勾的不动）
            if m.sheet && m.anim == nil {
                Task { await model.replan() }
            } else {
                m.openSheet()
            }
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
    let h: HomeVM?

    var body: some View {
        let K = 390.0 / 402.0
        let gs = 0.84 + 0.16 * cp
        let gtx = 32.7 * (1 - cp) * K
        let gty = 164.6 * (1 - cp) * K
        let target = h?.T.kcal ?? 0
        let eaten = h?.eaten.kcal ?? 0
        let pct = target > 0 ? min(1, eaten / target) : 0
        let mealsN = h?.meals.filter { $0.items.contains(where: \.done) }.count ?? 0
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
                T(h == nil ? L.dietGoalKcal : Fmt.k(cp > 0.5 ? max(0, target - eaten) : target), 17, .heavy, hx(0xf2e6e6))
                T(L.kcal, 10.5, .regular, hx(0xb8acac))
            }
            .frame(width: 390)
            .at(0, 322)

            HStack(alignment: .firstTextBaseline, spacing: 7) {
                T(h == nil ? L.dietEaten : Fmt.k(eaten), 48, .black, .white)
                T(L.kcal, 14.5, .bold, hx(0x9a9a9e))
            }
            .frame(height: 50)
            .at(19, 104)

            T(h == nil ? L.dietMeals : L.dietMealsN(mealsN), 11, .regular, hx(0xb8b0b0)).at(26, 157)

            Capsule()
                .fill(LinearGradient(stops: [
                    .init(color: hx(0x130808), location: 0),
                    .init(color: hx(0x2a0b0e), location: 0.55),
                    .init(color: hx(0x401014), location: 1)
                ], startPoint: .leading, endPoint: .trailing))
                .overlay(Capsule().strokeBorder(rgba(255, 120, 120, 0.32), lineWidth: 1))
                .shadow(color: rgba(229, 64, 74, 0.18), radius: 6)
                .frame(width: 297.8, height: 37)
                .overlay(alignment: .leading) {
                    // 吃了多少：红色从左往右涨
                    if pct > 0 {
                        Capsule()
                            .fill(LinearGradient(colors: [hx(0x5a1418), hx(0xe5404a)], startPoint: .leading, endPoint: .trailing))
                            .frame(width: max(37, 297.8 * pct), height: 37)
                    }
                }
                .at(19.4, 189)
            T(h == nil ? L.dietPct : "\(Int((pct * 100).rounded()))%", 17.5, .heavy, .white).at(342, 196)

            macro(0, x: 25, barX: 55, bar: hx(0x3c4a1e), v: h?.eaten.p)
            Rectangle().fill(Color.white.opacity(0.16)).frame(width: 1, height: 27).at(128, 257)
            macro(1, x: 174.6, barX: 207, bar: hx(0x22482a), v: h?.eaten.cb)
            Rectangle().fill(Color.white.opacity(0.16)).frame(width: 1, height: 27).at(264, 257)
            macro(2, x: 309.4, barX: 341, bar: hx(0x3a3a1c), v: h?.eaten.f)
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
        .scaleEffect(gs, anchor: .topLeading)
        .offset(x: gtx, y: gty)
    }

    private func macro(_ i: Int, x: Double, barX: Double, bar: Color, v: Double?) -> some View {
        // 数字变长时，小竖条跟在数字后面（没数字时和预览一样在 barX）
        ZStack(alignment: .topLeading) {
            T(L.macros[i], 11, .regular, hx(0xb3a9a9)).at(x, 251)
            HStack(alignment: .center, spacing: 0) {
                T(v.map { Fmt.n($0) + "g" } ?? L.macroZero, 18.5, .heavy, .white)
                    .lineLimit(1).fixedSize()
                    .frame(minWidth: barX - x - 8, alignment: .leading)
                RoundedRectangle(cornerRadius: 2).fill(bar).frame(width: 3, height: 18).padding(.leading, 8)
            }
            .at(x, 266)
        }
    }

}

// MARK: - 安排三餐整页（跟着卡片左上角走）

struct SheetContent: View {
    let onClose: () -> Void
    @Environment(AppModel.self) private var model

    var body: some View {
        let off = model.dayOffset
        let start = min(0, off)
        let sel = off - start
        let week = WeekStrip.make(start: start, selected: off)
        let meals = model.home?.meals ?? []
        let blocks = meals.filter { !$0.items.isEmpty }.count
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

            Button {
                model.route = .addFood(Route.guessSlot(), false)
            } label: {
                RoundIcon(size: 33, bg: hx(0x221d1e)) { NI.pencil(hx(0xe8e0e0), 2.2).frame(width: 14, height: 14) }
            }
            .buttonStyle(.plain)
            .at(300, 119)
            Button {
                model.route = .plans
            } label: {
                RoundIcon(size: 33, bg: hx(0x221d1e)) { NI.calendar().frame(width: 14, height: 14) }
            }
            .buttonStyle(.plain)
            .at(340, 119)

            RoundedRectangle(cornerRadius: 18, style: .circular).fill(hx(0x1e191a))
                .frame(width: 35, height: 58)
                .at(24 + 51 * Double(sel), 316)

            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { i in
                    T(week.labels[i], 9, .regular, start + i == 0 ? hx(0xe8e0e0) : hx(0x6a6a6e)).frame(width: 51, height: 12)
                }
            }
            .at(16, 322)

            ZStack {
                Circle().fill(hx(0x3a1215))
                Circle().strokeBorder(hx(0xe5404a), lineWidth: 1.5)
            }
            .frame(width: 25, height: 25)
            .at(29 + 51 * Double(sel), 341)

            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { i in
                    T(week.numbers[i], 13.5, i == sel ? .bold : .regular, i == sel ? .white : hx(0xc8c8cc))
                        .frame(width: 51, height: 18)
                }
            }
            .at(16, 345)

            // 点一天换到那一天
            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { i in
                    Button {
                        Task { await model.setDay(start + i) }
                    } label: {
                        Color.clear.frame(width: 51, height: 58).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .at(16, 316)

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                T(L.sheetBlock, 15, .heavy, hx(0xf2eded))
                T(model.home == nil ? L.sheetBlockCount : String(blocks), 12, .regular, hx(0x6a6a6e))
            }
            .at(17, 393)

            Button {
                model.route = .addFood(Route.guessSlot(), false)
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

            if let h = model.home, blocks > 0 {
                MealList(h: h)
                    .at(0, 428)
            } else {
                VStack(spacing: 0) {
                    NI.arrowDown().frame(width: 14, height: 16)
                    T(L.sheetEmpty, 14, .heavy, hx(0xececec)).padding(.top, 9)
                    T(L.sheetEmptySub, 10, .regular, hx(0x6a6a6e)).padding(.top, 8)
                }
                .frame(width: 390)
                .at(0, 470)
            }
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
    }
}

/// 整页里的餐食板块：早餐、午餐、晚餐、加餐，每样能打勾
struct MealList: View {
    let h: HomeVM

    var body: some View {
        ScrollView(.vertical) {
            VStack(spacing: 10) {
                ForEach(h.issues, id: \.self) { t in IssueLine(text: t) }
                ForEach(h.meals) { meal in MealBlock(meal: meal) }
                T(L.sheetFootnote, 10, .regular, hx(0x5a5a5e))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 2)
            }
            .padding(.horizontal, 18)
            .padding(.top, 4)
            .padding(.bottom, 40)
        }
        .scrollIndicators(.hidden)
        .frame(width: 390, height: 300)
        .mask(
            LinearGradient(stops: [
                .init(color: .black, location: 0),
                .init(color: .black, location: 0.86),
                .init(color: .clear, location: 1)
            ], startPoint: .top, endPoint: .bottom)
        )
    }
}

struct IssueLine: View {
    let text: String
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Circle().fill(hx(0xe5404a)).frame(width: 5, height: 5).padding(.top, 5)
            T(text, 11.5, .regular, hx(0xd8b8b8))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 9)
        .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(hx(0x1c0f11)))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .circular).strokeBorder(hx(0x4a1c22), lineWidth: 1))
    }
}

struct MealBlock: View {
    let meal: Meal
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                ZStack {
                    Circle().fill(hx(0x2a1417))
                    Image(systemName: slotIcon(meal.slot))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(hx(0xe5404a))
                }
                .frame(width: 30, height: 30)
                VStack(alignment: .leading, spacing: 2) {
                    T(meal.name, 15, .heavy, hx(0xf2eded))
                    T(L.mealSum(meal.sum.kcal, meal.sum.p), 11, .regular, hx(0x8a8a8e))
                }
                Spacer(minLength: 0)
                if !meal.mode.isEmpty { modeMenu }
                Button {
                    model.route = .addFood(meal.slot, false)
                } label: {
                    ZStack {
                        Circle().fill(hx(0x1a0c0e))
                        Circle().strokeBorder(hx(0x7a2228), lineWidth: 1)
                        NI.plusSmall(.white, 3).frame(width: 10, height: 10)
                    }
                    .frame(width: 28, height: 28)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 6)

            if meal.skip {
                T(L.mealSkip, 12, .regular, hx(0x8a8a8e)).padding(.horizontal, 14).padding(.vertical, 10)
            } else if meal.items.isEmpty {
                T(L.mealEmpty, 12, .regular, hx(0x6a6a6e)).padding(.horizontal, 14).padding(.vertical, 10)
            } else {
                ForEach(meal.items, id: \.rowID) { it in
                    ItemLine(item: it, slot: meal.slot)
                }
            }
        }
        .padding(.bottom, 6)
        .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(hx(0x161213)))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(Color.white.opacity(0.06), lineWidth: 1))
    }

    private var modeMenu: some View {
        Menu {
            Button(L.modeOut) { Task { await model.setMode(meal.slot, "out") } }
            Button(L.modeCold) { Task { await model.setMode(meal.slot, "cold") } }
            Button(L.modeCook) { Task { await model.setMode(meal.slot, "cook") } }
        } label: {
            HStack(spacing: 4) {
                T(meal.mode, 11, .semibold, hx(0xd8cccc))
                Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold)).foregroundStyle(hx(0x8a8a8e))
            }
            .padding(.horizontal, 10)
            .frame(height: 26)
            .background(Capsule().fill(hx(0x221d1e)))
        }
    }
}

struct ItemLine: View {
    let item: MealItem
    let slot: String
    @Environment(AppModel.self) private var model

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                if item.done {
                    Circle().fill(hx(0xe8434c))
                    NI.check().frame(width: 11, height: 11)
                } else {
                    Circle().strokeBorder(hx(0x4a4a4e), lineWidth: 1.6)
                }
            }
            .frame(width: 22, height: 22)
            VStack(alignment: .leading, spacing: 2) {
                T(item.n, 14, .semibold, item.done ? hx(0x6a6a6e) : hx(0xf2eded))
                    .strikethrough(item.done, color: hx(0x6a6a6e))
                    .lineLimit(1)
                T(L.itemQty(item.qtyText, item.u), 10.5, .regular, hx(0x6a6a6e))
            }
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    T(Fmt.n(item.kcal), 14, .bold, item.done ? hx(0x8a8a8e) : hx(0xf2eded))
                    T(L.kcal, 9.5, .regular, hx(0x8a8a8e))
                }
                T(L.itemSub(item.p, item.cost), 10, .regular, hx(0x6a6a6e))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .onTapGesture { Task { await model.toggle(slot, item.i) } }
        .sensoryFeedback(.selection, trigger: item.done)
        .contextMenu {
            Button(L.itemMore, systemImage: "plus") { Task { await model.setQty(slot, item.i, item.qty + 0.5) } }
            Button(L.itemLess, systemImage: "minus") { Task { await model.setQty(slot, item.i, max(0.5, item.qty - 0.5)) } }
            Button(L.itemDelete, systemImage: "trash", role: .destructive) { Task { await model.remove(slot, item.i) } }
        }
    }
}

// MARK: - 饮食整页：一周日期、智能食谱卡、记录饮食栏（预览里的 ds.chrome / week / card / rec）

struct DietPageLayers: View {
    let g: CardGeo
    @Environment(AppModel.self) private var model
    @Environment(TodayMotion.self) private var m

    var body: some View {
        let K = g.K
        let chromeOp = g.ds("chromeOp")
        let weekOp = g.ds("weekOp")
        let cardOp = g.ds("cardOp")
        let recOp = g.ds("recOp")
        ZStack(alignment: .topLeading) {
            chrome
                .offset(y: g.ds("cTop") * K)
                .opacity(chromeOp)
                .allowsHitTesting(chromeOp > 0.5)
            week
                .offset(y: g.ds("weekY") * K)
                .opacity(weekOp)
                .allowsHitTesting(weekOp > 0.5)
            RoundedRectangle(cornerRadius: 2).fill(hx(0x56565a))
                .frame(width: 28, height: 3)
                .at(180.4, g.ds("hdlY") * K + 5)
                .opacity(weekOp)
            card
                .offset(y: g.ds("cardY") * K - 2.5)
                .opacity(cardOp)
                .allowsHitTesting(cardOp > 0.5)
            rec
                .offset(y: g.ds("recY") * K + 4.8)
                .opacity(recOp)
                .allowsHitTesting(recOp > 0.5)
        }
        .frame(width: 390, height: 844, alignment: .topLeading)
    }

    private var chrome: some View {
        ZStack(alignment: .topLeading) {
            Button {
                m.closeDiet()
            } label: {
                RoundIcon(size: 37, bg: hx(0x241f20)) { NI.chevronDown(hx(0xe8e0e0), 2.6).frame(width: 15, height: 15) }
            }
            .buttonStyle(.plain)
            .at(14.5, 63)
            Button {
                model.route = .dietDetail
            } label: {
                RoundIcon(size: 37, bg: hx(0x241f20)) { NI.bars().frame(width: 16, height: 14) }
            }
            .buttonStyle(.plain)
            .at(338.6, 63)
        }
        .frame(width: 390, height: 110, alignment: .topLeading)
    }

    private var week: some View {
        let w = MonWeek.make(offset: model.dayOffset)
        let col = { (i: Int) -> Double in 32.4 + 47.55 * Double(i) }
        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 18, style: .circular).fill(Color.white.opacity(0.04))
                .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(Color.white.opacity(0.16), lineWidth: 1))
                .frame(width: 35.8, height: 57.3)
                .at(col(w.sel) + 2.1, -2)
            Circle().fill(hx(0x4a1418))
                .overlay(Circle().strokeBorder(hx(0xe5404a), lineWidth: 1.5))
                .frame(width: 27, height: 27)
                .at(col(w.sel) + 6.4, 21.4)
            ForEach(0..<7, id: \.self) { i in
                T(w.labels[i], 10, .regular, w.offsets[i] == 0 ? hx(0xe8e0e0) : hx(0x6a6a6e))
                    .frame(width: 40, height: 16)
                    .at(col(i), 4)
                T(w.numbers[i], 14, i == w.sel ? .bold : .regular, i == w.sel ? .white : hx(0xc8c8cc))
                    .frame(width: 40, height: 20)
                    .at(col(i), 25)
                Button {
                    Task { await model.setDay(w.offsets[i]) }
                } label: {
                    Color.clear.frame(width: 44, height: 58).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(w.offsets[i] < -2 || w.offsets[i] > 6)
                .at(col(i) - 2, -2)
            }
        }
        .frame(width: 390, height: 60, alignment: .topLeading)
    }

    private var card: some View {
        let h = model.home
        let eaten: [(String, MealItem)] = (h?.meals ?? []).flatMap { ml in ml.items.filter(\.done).map { (ml.name, $0) } }
        return ZStack(alignment: .topLeading) {
            Button {
                model.route = .plans
            } label: {
                ZStack(alignment: .topLeading) {
                    RoundedRectangle(cornerRadius: 18, style: .circular)
                        .fill(LinearGradient(stops: [
                            .init(color: rgba(42, 34, 36, 0.92), location: 0),
                            .init(color: rgba(48, 26, 30, 0.9), location: 0.6),
                            .init(color: rgba(78, 22, 30, 0.8), location: 1)
                        ], startPoint: UnitPoint(x: 0, y: 0.41), endPoint: UnitPoint(x: 1, y: 0.59)))
                        .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
                        .shadow(color: Color.black.opacity(0.35), radius: 9, y: 6)
                    T(L.dietRecipe, 16.5, .heavy, .white).at(18, 18)
                    T(h.map { L.dietRecipeUsing($0.planName) } ?? L.dietRecipeSub, 11.5, .regular, hx(0x9c9294)).at(18, 43)
                    T("×", 16, .regular, hx(0xb8b0b0)).at(343.4 - 16 - 9, 13)
                }
                .frame(width: 343.4, height: 79.5, alignment: .topLeading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .at(23.3, 0)

            if eaten.isEmpty {
                T(L.dietNoRecord, 13.5, .regular, hx(0x8a8a8e))
                    .frame(width: 390)
                    .at(0, 134)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    T(L.dietEatenN(eaten.count), 13, .heavy, hx(0xd8d0d0))
                        .padding(.horizontal, 26)
                        .padding(.bottom, 4)
                    ScrollView(.vertical) {
                        VStack(spacing: 0) {
                            ForEach(Array(eaten.enumerated()), id: \.offset) { _, e in
                                HStack(spacing: 10) {
                                    T(e.0, 11, .bold, hx(0xe5404a)).frame(width: 30, alignment: .leading)
                                    T(e.1.n, 13.5, .semibold, hx(0xf2eded)).lineLimit(1)
                                    Spacer(minLength: 6)
                                    T("\(Fmt.n(e.1.kcal)) \(L.kcal)", 12, .bold, hx(0xc8c8cc))
                                }
                                .padding(.horizontal, 26)
                                .frame(height: 32)
                            }
                        }
                    }
                    .scrollIndicators(.hidden)
                    .frame(height: 150)
                }
                .frame(width: 390, alignment: .leading)
                .at(0, 96)
            }
        }
        .frame(width: 390, height: 280, alignment: .topLeading)
    }

    private var rec: some View {
        ZStack(alignment: .topLeading) {
            Button {
                model.route = .addFood(Route.guessSlot(), true)
            } label: {
                ZStack(alignment: .topLeading) {
                    Capsule()
                        .fill(LinearGradient(colors: [Color.white.opacity(0.13), Color.white.opacity(0.06)], startPoint: .leading, endPoint: .trailing))
                        .overlay(Capsule().strokeBorder(Color.white.opacity(0.16), lineWidth: 1))
                    T(L.dietRecord, 15.5, .regular, hx(0xf2eeee))
                        .frame(height: 53.4)
                        .at(21, 0)
                    Circle().fill(Color.white.opacity(0.14))
                        .frame(width: 41.7, height: 41.7)
                        .overlay { NI.plusSmall(.white, 2.4).frame(width: 16, height: 16) }
                        .at(253 - 23.3, 5.8)
                }
                .frame(width: 276.5, height: 53.4, alignment: .topLeading)
                .contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .at(23.3, 0)
            Button {
                model.route = .foods
            } label: {
                ZStack {
                    Circle().fill(Color.white.opacity(0.1))
                    Circle().strokeBorder(Color.white.opacity(0.16), lineWidth: 1)
                    NI.fridge().frame(width: 16, height: 22)
                }
                .frame(width: 54, height: 54)
            }
            .buttonStyle(.plain)
            .at(312.4, 0)
        }
        .frame(width: 390, height: 60, alignment: .topLeading)
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

/// 一周日期：从 start 那天起往后 7 天（start 是相对今天的天数）
struct WeekStrip {
    let dateText: String
    let labels: [String]
    let numbers: [String]

    static func make(start: Int = 0, selected: Int = 0) -> WeekStrip {
        let cal = Calendar(identifier: .gregorian)
        let now = Date()
        var labels: [String] = []
        var numbers: [String] = []
        for i in 0..<7 {
            let o = start + i
            let d = cal.date(byAdding: .day, value: o, to: now) ?? now
            numbers.append(String(cal.component(.day, from: d)))
            labels.append(o == 0 ? L.todayShort : L.weekdays[cal.component(.weekday, from: d) - 1])
        }
        let sd = cal.date(byAdding: .day, value: selected, to: now) ?? now
        let m = cal.component(.month, from: sd)
        let d = cal.component(.day, from: sd)
        return WeekStrip(dateText: L.sheetDate(m, d, L.dayName(selected)), labels: labels, numbers: numbers)
    }
}

/// 饮食整页的一周：选中那天所在的周一到周日
struct MonWeek {
    let labels: [String]
    let numbers: [String]
    let offsets: [Int]
    let sel: Int

    static func make(offset: Int) -> MonWeek {
        let cal = Calendar(identifier: .gregorian)
        let now = Date()
        let sd = cal.date(byAdding: .day, value: offset, to: now) ?? now
        let wd = (cal.component(.weekday, from: sd) + 5) % 7   // 周一 = 0
        let names = ["一", "二", "三", "四", "五", "六", "日"]
        var labels: [String] = []
        var numbers: [String] = []
        var offsets: [Int] = []
        for i in 0..<7 {
            let o = offset - wd + i
            let d = cal.date(byAdding: .day, value: o, to: now) ?? now
            offsets.append(o)
            numbers.append(String(cal.component(.day, from: d)))
            labels.append(o == 0 ? L.todayShort : names[i])
        }
        return MonWeek(labels: labels, numbers: numbers, offsets: offsets, sel: wd)
    }
}
