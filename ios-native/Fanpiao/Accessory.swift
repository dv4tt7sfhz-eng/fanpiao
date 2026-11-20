import SwiftUI

// iOS 26 底栏上的浮窗（像音乐的迷你播放条）：显示「下一顿」。
// 往下滑页面时底栏缩小，浮窗跟着缩到底栏旁边；往上滑又展开。iOS 18 上没有这个组件，就不显示。

struct TabChrome: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .tabViewBottomAccessory { NextMealAccessory() }
                .tabBarMinimizeBehavior(.onScrollDown)
        } else {
            content
        }
    }
}

@available(iOS 26.0, *)
struct NextMealAccessory: View {
    @Environment(AppModel.self) private var model
    @Environment(UIState.self) private var ui
    @Environment(TodayMotion.self) private var m
    @Environment(\.tabViewBottomAccessoryPlacement) private var placement

    var body: some View {
        let next = nextMeal
        let inline = placement == .inline
        HStack(spacing: inline ? 8 : 12) {
            thumb(next?.slot)
            VStack(alignment: .leading, spacing: 1) {
                Text(title(next))
                    .font(.system(size: inline ? 13 : 14, weight: .semibold))
                    .lineLimit(1)
                    .contentTransition(.numericText())
                if !inline {
                    Text(sub(next))
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .contentTransition(.numericText())
                }
            }
            Spacer(minLength: 4)
            if let next {
                Button {
                    Task { await model.eatMeal(next.slot) }
                } label: {
                    Image(systemName: "checkmark")
                        .font(.system(size: inline ? 15 : 18, weight: .bold))
                        .frame(width: 36, height: 36)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .sensoryFeedback(.success, trigger: model.home?.eaten.kcal ?? 0)
            }
            if !inline {
                Button {
                    model.route = .snap
                } label: {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(width: 36, height: 36)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.leading, inline ? 6 : 10)
        .padding(.trailing, inline ? 4 : 8)
        .contentShape(Rectangle())
        .onTapGesture { openToday() }
        .animation(.spring(response: 0.4, dampingFraction: 0.86), value: next?.slot)
        .animation(.spring(response: 0.4, dampingFraction: 0.86), value: inline)
    }

    /// 从现在这个钟点往后，第一顿还有没打勾的
    private var nextMeal: Meal? {
        guard let h = model.home else { return nil }
        let order = ["b", "l", "d", "s"]
        let start = order.firstIndex(of: Route.guessSlot()) ?? 0
        let rotated = Array(order[start...]) + Array(order[..<start])
        for s in rotated {
            if let meal = h.meals.first(where: { $0.slot == s }), !meal.skip, meal.items.contains(where: { !$0.done }) { return meal }
        }
        return nil
    }

    private func title(_ next: Meal?) -> String {
        guard let h = model.home else { return L.noPlanYet }
        if let next { return L.nextTitle(next.name, next.items.filter { !$0.done }.count) }
        return h.meals.flatMap(\.items).isEmpty ? L.noPlanYet : L.allDone
    }

    private func sub(_ next: Meal?) -> String {
        guard let h = model.home else { return L.noPlanSub }
        if let next {
            let left = next.items.filter { !$0.done }
            return L.nextSub(left.reduce(0) { $0 + $1.kcal }, left.reduce(0) { $0 + $1.p })
        }
        return h.meals.flatMap(\.items).isEmpty ? L.noPlanSub : L.allDoneSub(h.eaten.kcal, h.eaten.p)
    }

    private func thumb(_ slot: String?) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 9, style: .continuous)
                .fill(LinearGradient(colors: [Color(hex: 0xff6b73), Color(hex: 0x9a2a32)], startPoint: .topLeading, endPoint: .bottomTrailing))
            Image(systemName: slot.map { slotIcon($0) } ?? "checkmark.seal.fill")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
                .contentTransition(.symbolEffect(.replace))
        }
        .frame(width: 34, height: 34)
    }

    /// 点浮窗：回到今日页，卡片长成三餐整页
    private func openToday() {
        Task {
            if ui.tab != 0 {
                ui.tab = 0
                try? await Task.sleep(for: .milliseconds(380))
            }
            if model.dayOffset != 0 { await model.setDay(0) }
            m.openSheet()
        }
    }
}
