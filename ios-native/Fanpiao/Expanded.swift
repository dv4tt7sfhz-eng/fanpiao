import SwiftUI

/// 「安排计划」按钮：在卡片里是一颗小胶囊，飞到整页底部变成一条长按钮（和录屏一样）
struct CtaPill: View {
    let wide: Bool
    let accent: Accent
    var body: some View {
        HStack(spacing: 10) {
            Text("安排计划").font(wide ? .headline : .subheadline.weight(.semibold)).foregroundStyle(.white)
            if wide { Spacer(minLength: 0) }
            Image(systemName: "arrow.right")
                .font(.system(size: wide ? 16 : 13, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: wide ? 40 : 28, height: wide ? 40 : 28)
                .background(accent.tint, in: Circle())
        }
        .padding(.leading, wide ? 22 : 14)
        .padding(.trailing, wide ? 8 : 5)
        .padding(.vertical, wide ? 8 : 5)
        .frame(maxWidth: wide ? .infinity : nil)
        .glassCapsule(tint: accent.lo.opacity(wide ? 0.55 : 0.4))
    }
}

/// 封面卡长成的整页（饮食 / 计划）
struct ExpandedPage: View {
    @Environment(AppModel.self) private var model
    let kind: Int
    let h: HomeVM
    let accent: Accent
    let ns: Namespace.ID
    var close: () -> Void
    var onPlans: () -> Void
    var onAdd: () -> Void
    @State private var plans: PlansVM?
    @State private var shown = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // 整页的底：就是那张卡片，一路长满屏幕
            ZStack {
                Color.black
                RadialGradient(colors: [accent.tint.opacity(kind == 1 ? 0.6 : 0.38), accent.lo.opacity(0.22), .clear],
                               center: UnitPoint(x: 0.15, y: 0), startRadius: 0, endRadius: 560)
                RadialGradient(colors: [accent.glowB.opacity(0.5), .clear], center: UnitPoint(x: 1.1, y: 0.45), startRadius: 0, endRadius: 420)
            }
            .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
            .matchedGeometryEffect(id: "card", in: ns)
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 12) {
                        Button(action: close) {
                            Image(systemName: "chevron.down").font(.headline).frame(width: 44, height: 44)
                        }
                        .buttonStyle(.plain)
                        .glassCapsule()
                        Text(dateText).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink2)
                        Spacer()
                    }
                    .opacity(shown ? 1 : 0)
                    if kind == 0 { diet } else { plan }
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 120)
            }
            .scrollIndicators(.hidden)

            // 底部按钮
            Group {
                if kind == 1 {
                    Button(action: onPlans) { CtaPill(wide: true, accent: accent) }
                        .buttonStyle(.plain)
                        .matchedGeometryEffect(id: "cta", in: ns)
                } else {
                    Button(action: onAdd) {
                        HStack {
                            Text("记录饮食").font(.headline)
                            Spacer()
                            Image(systemName: "plus").font(.headline).frame(width: 40, height: 40).background(accent.tint, in: Circle())
                        }
                        .padding(.leading, 22).padding(.trailing, 8).padding(.vertical, 8)
                        .foregroundStyle(.white)
                        .glassCapsule(tint: accent.lo.opacity(0.5))
                    }
                    .buttonStyle(.plain)
                    .offset(y: shown ? 0 : 140)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .onAppear { withAnimation(.easeOut(duration: 0.3).delay(0.16)) { shown = true } }
        .task { if kind == 1 { plans = await model.plans() } }
    }

    private var dateText: String {
        let f = DateFormatter(); f.locale = Locale(identifier: "zh_CN"); f.dateFormat = "M月d日"
        return f.string(from: Date()) + " · 今日"
    }

    // ---------- 饮食这一面长出来的 ----------
    private var diet: some View {
        let ratio = h.T.kcal > 0 ? min(1, h.eaten.kcal / h.T.kcal) : 0
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(Fmt.n(h.eaten.kcal)).font(.system(size: 52, weight: .bold, design: .rounded))
                    .matchedGeometryEffect(id: "num", in: ns)
                Text("千卡").font(.title3.weight(.semibold)).foregroundStyle(Palette.ink2)
            }
            Group {
                Text("目标 \(Fmt.n(h.T.kcal)) 千卡 · 还可以吃 \(Fmt.n(max(0, h.T.kcal - h.eaten.kcal)))").foregroundStyle(Palette.ink2)
                ProgressBar(value: ratio, tint: accent)
                HStack(spacing: 10) {
                    Ring(name: "蛋白质", v: h.eaten.p, t: h.T.protein, color: Palette.protein)
                    Ring(name: "碳水", v: h.eaten.cb, t: h.T.carb, color: Palette.carb)
                    Ring(name: "脂肪", v: h.eaten.f, t: h.T.fat, color: Palette.fat)
                }
                Text("钠和膳食纤维").font(.title3.weight(.bold)).padding(.top, 4)
                HStack(spacing: 10) {
                    NaFb(title: "钠", v: h.planned.na, unit: "mg", sub: "约 \(Fmt.one(h.salt)) 克盐 · 上限 \(Fmt.n(h.T.naMax))", ok: h.planned.na <= h.T.naMax, color: Palette.sodium)
                    NaFb(title: "膳食纤维", v: h.planned.fb, unit: "g", sub: "目标 \(Fmt.n(h.T.fbMin)) g 以上", ok: h.planned.fb >= h.T.fbMin, color: Palette.fiber)
                }
                Text("今天安排的每一餐").font(.title3.weight(.bold)).padding(.top, 4)
                ForEach(h.meals) { m in
                    HStack {
                        Image(systemName: slotIcon(m.slot)).foregroundStyle(accent.tint).frame(width: 26)
                        Text(m.name).font(.headline)
                        Spacer()
                        Text("\(Fmt.n(m.sum.kcal)) 千卡 · ¥\(Fmt.yuan(m.sum.cost))").foregroundStyle(Palette.ink2)
                    }
                    .padding(14)
                    .glassCard(cornerRadius: 18)
                }
            }
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : 24)
        }
    }

    // ---------- 计划这一面长出来的 ----------
    private var plan: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(h.kindName.isEmpty ? h.planName : h.kindName).font(.system(size: 40, weight: .heavy, design: .rounded))
                .matchedGeometryEffect(id: "title", in: ns, anchor: .topLeading)
            Group {
                Text(h.label.isEmpty ? h.planTag : h.label).font(.subheadline).foregroundStyle(Palette.ink2)
                HStack(spacing: 10) {
                    Stat(v: Fmt.n(h.T.kcal), l: "千卡")
                    Stat(v: Fmt.n(h.T.protein) + " g", l: "蛋白质")
                    Stat(v: Fmt.n(h.T.carb) + " g", l: "碳水")
                    Stat(v: Fmt.n(h.T.fat) + " g", l: "脂肪")
                }
                if let p = plans {
                    Text("接下来两周").font(.title3.weight(.bold)).padding(.top, 4)
                    RhythmStrip(days: p.rhythm)
                        .padding(16)
                        .glassCard(cornerRadius: 24)
                    if let cur = p.plans.first(where: { $0.id == p.cur }) {
                        Text(cur.d).font(.subheadline).foregroundStyle(Palette.ink2)
                    }
                }
            }
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : 24)
        }
    }
}
