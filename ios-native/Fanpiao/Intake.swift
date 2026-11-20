import SwiftUI

// 4.4：今日页「今日摄入」一栏 + 底栏「记录」页（按钟点问你这一餐吃了什么，记好后后面几餐自动重排）

private let red = hx(0xff4d58)

// MARK: - 今日摄入（身体数据下面）

struct IntakeSection: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        if let h = model.home {
            let e = h.eaten, t = h.T
            // 名字、吃了、目标、单位、颜色、多了要不要变红
            let rows: [(Int, Double, Double, UInt32, Bool)] = [
                (0, e.kcal, t.kcal, 0xe5404a, true),
                (1, e.p, t.protein, 0x9ccf5a, false),
                (2, e.cb, t.carb, 0x5ac08a, false),
                (3, e.f, t.fat, 0xd9c45a, true),
                (4, e.na, t.naMax, 0x6aa8ff, true),
                (5, e.fb, t.fbMin, 0xb08aff, false),
                (6, e.cost, h.budget, 0xff9a6a, true)
            ]
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 9) {
                    Circle().fill(hx(0xe5404a)).frame(width: 7, height: 7).shadow(color: hx(0xe5404a), radius: 4)
                    T(L.intakeTitle, 18, .heavy)
                    Spacer(minLength: 0)
                    T(L.intakeMore, 13, .regular, hx(0x8a8a8e))
                }
                .padding(.top, 30)
                .padding(.bottom, 10)

                Button {
                    model.route = .dietDetail
                } label: {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(0..<rows.count, id: \.self) { i in
                            IntakeRow(name: L.intakeNames[rows[i].0], unit: L.intakeUnits[rows[i].0], v: rows[i].1, target: rows[i].2, color: hx(rows[i].3), redOver: rows[i].4, money: rows[i].0 == 6)
                        }
                        Divider().overlay(Color.white.opacity(0.08))
                        HStack(spacing: 8) {
                            ForEach(h.meals) { m in
                                let k = m.items.filter(\.done).reduce(0) { $0 + $1.kcal }
                                let done = !m.items.isEmpty && m.items.allSatisfy(\.done)
                                HStack(spacing: 4) {
                                    Image(systemName: done ? "checkmark.circle.fill" : (k > 0 ? "circle.lefthalf.filled" : "circle"))
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(k > 0 ? hx(0xe5404a) : hx(0x4a4a4e))
                                    T(L.intakeMeal(m.name, k), 11, .semibold, k > 0 ? hx(0xd8d0d0) : hx(0x6a6a6e))
                                        .contentTransition(.numericText(value: k))
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 22, style: .circular)
                            .fill(LinearGradient(colors: [hx(0x1e1e21), hx(0x151517)], startPoint: .top, endPoint: .bottom))
                    )
                    .contentShape(Rectangle())
                }
                .buttonStyle(PressScale())
                .zoomSource(.dietDetail)
            }
            .padding(.horizontal, 18)
        }
    }
}

private struct IntakeRow: View {
    let name: String
    let unit: String
    let v: Double
    let target: Double
    let color: Color
    let redOver: Bool
    let money: Bool

    var body: some View {
        let has = target > 0
        let over = has && redOver && v > target
        let pct = has ? min(1, v / target) : 0
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                T(name, 13, .regular, hx(0xc8c8cc))
                if over {
                    T(L.over, 10, .heavy, .white)
                        .padding(.horizontal, 5).frame(height: 16)
                        .background(Capsule().fill(red))
                        .transition(.scale.combined(with: .opacity))
                }
                Spacer(minLength: 0)
                T(has ? L.intakeVal(v, target, unit, money: money) : (money ? "¥\(Fmt.yuan(v)) · \(L.intakeNoBudget)" : "\(Fmt.k(v)) \(unit)"), 13, .bold, over ? red : hx(0xf2eded))
                    .monospacedDigit()
                    .contentTransition(.numericText(value: v))
            }
            ZStack(alignment: .leading) {
                Capsule().fill(hx(0x2a2a2e))
                Capsule().fill(over ? red : color)
                    .frame(width: max(has && v > 0 ? 6 : 0, 322 * pct))
                    .shadow(color: (over ? red : color).opacity(0.5), radius: 4)
            }
            .frame(height: 5)
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.86), value: v)
    }
}

// MARK: - 记录页（底栏第三个）

struct RecordPage: View {
    @Environment(AppModel.self) private var model
    @State private var slot = LaunchArgs.value("-fpSlot") ?? Route.guessSlot()
    @State private var justDone: String?
    @Namespace private var chip

    private let slots = ["b", "l", "d", "s"]

    var body: some View {
        let h = model.home
        let meal = h?.meals.first { $0.slot == slot }
        DesignPage {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    BrandMark()
                    Spacer(minLength: 0)
                    Streak(n: Int(model.home?.week ?? model.stats?.week ?? 0))
                }
                .frame(height: 28)

                T(L.recordAsk(slotName(slot)), 28, .black)
                    .contentTransition(.opacity)
                    .padding(.top, 34)
                    .id("ask-" + slot)
                    .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .move(edge: .leading).combined(with: .opacity)))
                T(WeekStrip.make(start: model.dayOffset, selected: model.dayOffset).dateText, 13, .regular, hx(0x8a8a8e))
                    .padding(.top, 6)
                if model.dayOffset != 0 {
                    T(L.recordNotToday, 12, .semibold, red).padding(.top, 4)
                }

                // 早餐 / 午餐 / 晚餐 / 加餐
                HStack(spacing: 8) {
                    ForEach(slots, id: \.self) { s in
                        Button {
                            withAnimation(.spring(response: 0.42, dampingFraction: 0.84)) { slot = s; justDone = nil }
                        } label: {
                            T(slotName(s), 14, slot == s ? .heavy : .regular, slot == s ? .white : hx(0x8a8a8e))
                                .frame(maxWidth: .infinity).frame(height: 38)
                                .background {
                                    if slot == s {
                                        Capsule().fill(LinearGradient(colors: [hx(0xff5a64), hx(0xb3262f)], startPoint: .top, endPoint: .bottom))
                                            .matchedGeometryEffect(id: "chip", in: chip)
                                            .shadow(color: hx(0xe5404a).opacity(0.5), radius: 8)
                                    } else {
                                        Capsule().fill(hx(0x1a1a1c))
                                    }
                                }
                        }
                        .buttonStyle(PressScale())
                    }
                }
                .padding(.top, 20)

                // 饭票给你排的
                VStack(alignment: .leading, spacing: 0) {
                    T(L.recordPlanned, 15, .heavy).padding(.horizontal, 14).padding(.top, 14)
                    T(L.recordPlannedSub, 11, .regular, hx(0x6a6a6e)).padding(.horizontal, 14).padding(.top, 3).padding(.bottom, 6)
                    if let meal, !meal.items.isEmpty {
                        ForEach(meal.items, id: \.rowID) { it in
                            ItemLine(item: it, slot: slot)
                                .transition(.asymmetric(insertion: .move(edge: .top).combined(with: .opacity), removal: .opacity))
                        }
                    } else {
                        T(L.recordEmpty, 13, .regular, hx(0x6a6a6e)).padding(14)
                    }
                }
                .padding(.bottom, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(hx(0x161213)))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .circular).strokeBorder(Color.white.opacity(0.06), lineWidth: 1))
                .padding(.top, 16)
                .id("planned-" + slot)
                .transition(.opacity.combined(with: .scale(scale: 0.98)))

                // 还吃了别的
                T(L.recordOther, 15, .heavy).padding(.top, 22)
                HStack(spacing: 10) {
                    other("magnifyingglass", L.recordLib, .addFood(slot, true))
                    other("camera.fill", L.recordSnap, .snap)
                    other("cup.and.saucer.fill", L.recordTea, .tea)
                }
                .padding(.top, 10)

                // 记好了
                Button {
                    let s = slot
                    Task {
                        await model.rebalance(s)
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.88)) { justDone = s }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.seal.fill").font(.system(size: 16, weight: .bold))
                        T(L.recordDone, 15, .heavy, .white)
                    }
                    .frame(maxWidth: .infinity).frame(height: 54)
                    .background(Capsule().fill(LinearGradient(colors: [hx(0xff5a64), hx(0xb3262f)], startPoint: .top, endPoint: .bottom)))
                    .shadow(color: hx(0xe5404a).opacity(0.45), radius: 12, y: 4)
                }
                .buttonStyle(PressScale())
                .padding(.top, 22)

                if let h {
                    T(L.recordLeftLine(h.T.kcal - h.eaten.kcal, h.T.protein - h.eaten.p), 12.5, .semibold, h.eaten.kcal > h.T.kcal ? red : hx(0xb8b0b0))
                        .contentTransition(.numericText())
                        .frame(maxWidth: .infinity)
                        .padding(.top, 12)
                }

                // 记好后：后面几餐怎么调的
                if let s = justDone, let h {
                    LaterMeals(h: h, after: s) { next in
                        withAnimation(.spring(response: 0.42, dampingFraction: 0.84)) { slot = next; justDone = nil }
                    }
                    .padding(.top, 20)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                Color.clear.frame(height: 130)
            }
            .padding(.top, 77)
            .padding(.horizontal, 18)
        }
        .onAppear {
            model.focusSlot = slot
        }
        .task {
            // 截图用：-fpRecordDone 直接演示「记好了」之后的样子
            if LaunchArgs.has("-fpRecordDone") {
                try? await Task.sleep(for: .milliseconds(800))
                await model.rebalance(slot)
                withAnimation(.spring(response: 0.5, dampingFraction: 0.88)) { justDone = slot }
            }
        }
        .onChange(of: slot) { _, s in model.focusSlot = s }
    }

    private func other(_ icon: String, _ text: String, _ route: Route) -> some View {
        Button {
            model.focusSlot = slot
            model.route = route
        } label: {
            VStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 18, weight: .semibold)).foregroundStyle(hx(0xff8a90))
                T(text, 12, .semibold, hx(0xe8e0e0))
            }
            .frame(maxWidth: .infinity).frame(height: 76)
            .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(hx(0x1a1a1c)))
            .contentShape(Rectangle())
        }
        .buttonStyle(PressScale())
        .zoomSource(route)
    }
}

/// 记好一餐后，后面几餐新的安排（一层层浮上来）
private struct LaterMeals: View {
    let h: HomeVM
    let after: String
    var goNext: (String) -> Void

    var body: some View {
        let order = ["b", "l", "d", "s"]
        let idx = order.firstIndex(of: after) ?? 0
        let later = h.meals.filter { (order.firstIndex(of: $0.slot) ?? 0) > idx && !$0.items.isEmpty }
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles").foregroundStyle(hx(0xff8a90))
                T(later.isEmpty ? L.recordLaterNone : L.recordLater, 15, .heavy)
            }
            ForEach(Array(later.enumerated()), id: \.element.id) { i, m in
                Button { goNext(m.slot) } label: {
                    HStack(alignment: .top, spacing: 12) {
                        ZStack {
                            Circle().fill(hx(0x2a1417))
                            Image(systemName: slotIcon(m.slot)).font(.system(size: 13, weight: .semibold)).foregroundStyle(hx(0xe5404a))
                        }
                        .frame(width: 30, height: 30)
                        VStack(alignment: .leading, spacing: 3) {
                            T(m.name, 14, .heavy)
                            T(m.items.map(\.n).joined(separator: "、"), 12, .regular, hx(0xa8a0a0))
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                        }
                        Spacer(minLength: 6)
                        T(L.mealSum(m.sum.kcal, m.sum.p, m.sum.cost), 10.5, .regular, hx(0x8a8a8e))
                            .multilineTextAlignment(.trailing)
                            .frame(width: 92, alignment: .trailing)
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(hx(0x1a1a1c)))
                    .contentShape(Rectangle())
                }
                .buttonStyle(PressScale())
                .appear(i)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(LinearGradient(colors: [hx(0x2a1214), hx(0x161213)], startPoint: .topLeading, endPoint: .bottomTrailing)))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .circular).strokeBorder(hx(0x4a1c22), lineWidth: 1))
    }
}
