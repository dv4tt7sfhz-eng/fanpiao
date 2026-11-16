import SwiftUI

/// 今天：封面卡（饮食 / 计划两面）+ 快捷按钮 + 今天吃什么
struct TodayView: View {
    @Environment(AppModel.self) private var model
    @Namespace private var hero
    @State private var face = 0            // 0 饮食，1 计划
    @State private var addSlot: String?
    @State private var showPlans = false
    @State private var open: Int?          // 展开成整页的是哪一面
    @State private var cardH: CGFloat = 320
    /// 和 2.1.0 录屏量出来的一样：0.46 秒长满，收的时候稍快
    static let grow = Animation.spring(response: 0.46, dampingFraction: 0.86)
    static let shrink = Animation.spring(response: 0.38, dampingFraction: 0.9)

    var body: some View {
        let accent = Accent.of(model.accent)
        ZStack {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let h = model.home {
                        if open == nil {
                            CoverCard(h: h, face: $face, accent: accent, ns: hero, onPlans: { expand(1) })
                                .onTapGesture { expand(face) }
                                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { cardH = $0 }
                        } else {
                            Color.clear.frame(height: cardH)
                        }
                        QuickRow(onAdd: { addSlot = suggestSlot() }, onReplan: { Task { await model.replan() } }, onPlans: { showPlans = true })
                        SectionTitle(text: "今天吃什么", trailing: h.label.isEmpty ? h.planName : h.label)
                        if h.issues.isEmpty {
                            Note(icon: "checkmark.circle.fill", text: "热量、蛋白、预算都对上了，照着吃就行。", color: Palette.good)
                        } else {
                            ForEach(h.issues, id: \.self) { Note(icon: "exclamationmark.circle.fill", text: $0, color: Palette.warn) }
                        }
                        ForEach(h.meals) { m in
                            MealCard(meal: m, accent: accent, onAdd: { addSlot = m.slot })
                        }
                        Text("每份的热量和价格是常见值，以包装和食堂实际为准。")
                            .font(.caption).foregroundStyle(Palette.ink3).padding(.top, 4)
                    } else {
                        ProgressView().padding(.top, 120)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }
            .scrollIndicators(.hidden)
            .background(Backdrop(accent: accent))
            .navigationTitle("今日")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Label("饭票", systemImage: "ticket").labelStyle(.titleAndIcon).font(.headline)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if let h = model.home {
                        Label("\(Fmt.n(h.streak))", systemImage: "flame.fill").labelStyle(.titleAndIcon).foregroundStyle(accent.tint)
                    }
                }
            }
            .toolbar(open == nil ? .visible : .hidden, for: .tabBar)
            .sheet(item: Binding(get: { addSlot.map { SlotBox(slot: $0) } }, set: { addSlot = $0?.slot })) { box in
                AddFoodSheet(slot: box.slot).presentationDetents([.medium, .large])
            }
            .sheet(isPresented: $showPlans) { PlansSheet().presentationDetents([.large]) }
            .refreshable { await model.refresh() }
        }
            // 卡片长成的整页：卡片、大标题、按钮各自从原来的位置连续变过去
            if let o = open, let h = model.home {
                ExpandedPage(kind: o, h: h, accent: accent, ns: hero,
                             close: { withAnimation(Self.shrink) { open = nil } },
                             onPlans: { showPlans = true },
                             onAdd: { addSlot = suggestSlot() })
                    .zIndex(5)
            }
        }
        .task { if model.home == nil { await model.refresh() } ; openFromArgs() }
    }

    private func expand(_ which: Int) {
        if which != face { face = which }
        withAnimation(Self.grow) { open = which }
    }

    private func suggestSlot() -> String {
        let h = Calendar.current.component(.hour, from: Date())
        return h < 10 ? "b" : h < 15 ? "l" : h < 20 ? "d" : "s"
    }
    /// 截图用：-fpShow add / plans / detail
    private func openFromArgs() {
        let a = ProcessInfo.processInfo.arguments
        guard let i = a.firstIndex(of: "-fpShow"), i + 1 < a.count else { return }
        switch a[i + 1] {
        case "add": addSlot = "l"
        case "plans": showPlans = true
        case "detail": open = 0
        case "planpage": face = 1; open = 1
        case "cycle":   // 录视频用：1.6 秒后展开，3.6 秒后收回
            face = 1
            Task {
                try? await Task.sleep(for: .milliseconds(1600)); expand(1)
                try? await Task.sleep(for: .milliseconds(2000)); withAnimation(Self.shrink) { open = nil }
            }
        case "plan": face = 1
        default: break
        }
    }
}

struct SlotBox: Identifiable { let slot: String; var id: String { slot } }

// ---------- 封面卡 ----------
struct CoverCard: View {
    let h: HomeVM
    @Binding var face: Int
    let accent: Accent
    var ns: Namespace.ID
    var onPlans: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Picker("", selection: $face.animation(.snappy)) {
                    Text("饮食").tag(0)
                    Text("计划").tag(1)
                }
                .pickerStyle(.segmented)
                .frame(width: 130)
                Spacer()
                Text(h.goalName)
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .glassCapsule(interactive: false)
            }
            if face == 0 { dietFace.transition(.blurReplace) } else { planFace.transition(.blurReplace) }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(alignment: .bottom) {
            // 卡片底部沉着一汪主题色的光
            RadialGradient(colors: [accent.tint.opacity(face == 0 ? 0.55 : 0.75), accent.lo.opacity(0.25), .clear], center: .bottom, startRadius: 0, endRadius: 260)
                .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
                .allowsHitTesting(false)
        }
        .glassCard(cornerRadius: 30, tint: accent.tint.opacity(face == 0 ? 0.12 : 0.3))
        .matchedGeometryEffect(id: "card", in: ns)
    }

    private var dietFace: some View {
        let ratio = h.T.kcal > 0 ? min(1, h.eaten.kcal / h.T.kcal) : 0
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(Fmt.n(h.eaten.kcal)).font(.system(size: 52, weight: .bold, design: .rounded)).contentTransition(.numericText())
                    .matchedGeometryEffect(id: "num", in: ns)
                Text("/ \(Fmt.n(h.T.kcal)) 千卡").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink2)
            }
            Text(h.eaten.kcal > 0 ? "已经吃了 \(Fmt.n(ratio * 100))%" : "还没打勾，吃完一样点一下")
                .font(.footnote).foregroundStyle(Palette.ink2)
            ProgressBar(value: ratio, tint: accent)
            HStack(spacing: 0) {
                Macro(name: "蛋白质", eaten: h.eaten.p, target: h.T.protein, color: Palette.protein)
                Divider().frame(height: 34).overlay(.white.opacity(0.15))
                Macro(name: "碳水", eaten: h.eaten.cb, target: h.T.carb, color: Palette.carb)
                Divider().frame(height: 34).overlay(.white.opacity(0.15))
                Macro(name: "脂肪", eaten: h.eaten.f, target: h.T.fat, color: Palette.fat)
            }
        }
    }

    private var planFace: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(h.kindName.isEmpty ? h.planName : h.kindName).font(.system(size: 40, weight: .heavy, design: .rounded))
                .matchedGeometryEffect(id: "title", in: ns, anchor: .topLeading)
            Text(h.label.isEmpty ? h.planTag : h.label).font(.footnote).foregroundStyle(Palette.ink2)
            Text("今天 \(Fmt.n(h.T.kcal)) 千卡 · 蛋白 \(Fmt.n(h.T.protein)) g · 碳水 \(Fmt.n(h.T.carb)) g")
                .font(.subheadline.weight(.medium))
            HStack {
                Spacer()
                Button(action: onPlans) {
                    CtaPill(wide: false, accent: accent)
                }
                .buttonStyle(.plain)
                .matchedGeometryEffect(id: "cta", in: ns)
            }
            .padding(.top, 6)
        }
    }
}

struct Macro: View {
    let name: String; let eaten: Double; let target: Double; let color: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) { Circle().fill(color).frame(width: 6, height: 6); Text(name).font(.caption).foregroundStyle(Palette.ink2) }
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(Fmt.n(eaten)).font(.title3.weight(.bold)).contentTransition(.numericText())
                Text("/ \(Fmt.n(target)) g").font(.caption).foregroundStyle(Palette.ink3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.leading, 10)
    }
}

struct ProgressBar: View {
    let value: Double; let accent: Accent
    init(value: Double, tint: Accent) { self.value = value; self.accent = tint }
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color(white: 0.5, opacity: 0.22))
                Capsule().fill(LinearGradient(colors: [accent.lo, accent.tint, accent.hi], startPoint: .leading, endPoint: .trailing))
                    .frame(width: max(8, g.size.width * value))
            }
        }
        .frame(height: 10)
        .animation(.smooth, value: value)
    }
}

// ---------- 快捷按钮：一组玻璃，靠近时会融在一起 ----------
struct QuickRow: View {
    var onAdd: () -> Void
    var onReplan: () -> Void
    var onPlans: () -> Void
    var body: some View {
        GlassGroup(spacing: 10) {
            HStack(spacing: 10) {
                quick("记录饮食", "plus", onAdd)
                quick("换一份", "arrow.triangle.2.circlepath", onReplan)
                quick("饮食计划", "calendar", onPlans)
            }
        }
    }
    private func quick(_ t: String, _ icon: String, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.title3.weight(.semibold))
                Text(t).font(.footnote.weight(.semibold))
            }
            .frame(maxWidth: .infinity).padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .glassCard(cornerRadius: 22, interactive: true)
    }
}

struct SectionTitle: View {
    let text: String; var trailing: String = ""
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(text).font(.title2.weight(.bold))
            Spacer()
            Text(trailing).font(.footnote).foregroundStyle(Palette.ink2)
        }
        .padding(.top, 8)
    }
}

struct Note: View {
    let icon: String; let text: String; let color: Color
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(color)
            Text(text).font(.subheadline).foregroundStyle(color).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(14)
        .glassCard(cornerRadius: 18, tint: color.opacity(0.12))
    }
}

// ---------- 每一餐 ----------
struct MealCard: View {
    @Environment(AppModel.self) private var model
    let meal: Meal
    let accent: Accent
    var onAdd: () -> Void
    @State private var tick = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: slotIcon(meal.slot)).font(.title3).foregroundStyle(accent.tint).frame(width: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text(meal.name).font(.headline)
                    Text("\(Fmt.n(meal.sum.kcal)) 千卡 · 蛋白 \(Fmt.n(meal.sum.p)) g").font(.caption).foregroundStyle(Palette.ink2)
                }
                Spacer()
                if !meal.mode.isEmpty {
                    Menu {
                        Button("食堂 / 外面吃") { Task { await model.setMode(meal.slot, "out") } }
                        Button("不开火") { Task { await model.setMode(meal.slot, "cold") } }
                        Button("自己做") { Task { await model.setMode(meal.slot, "cook") } }
                    } label: {
                        HStack(spacing: 4) { Text(meal.mode); Image(systemName: "chevron.down").font(.caption2) }
                            .font(.footnote.weight(.semibold)).padding(.horizontal, 12).padding(.vertical, 7)
                    }
                    .glassCapsule()
                }
            }
            .padding(.bottom, 8)
            if meal.skip {
                Text("轻断食：这一餐不吃").font(.subheadline).foregroundStyle(Palette.ink2).padding(.vertical, 10)
            }
            ForEach(meal.items, id: \.rowID) { it in
                ItemRow(item: it, accent: accent) {
                    tick += 1
                    Task { await model.toggle(meal.slot, it.i) }
                }
                .contextMenu {
                    Button { Task { await model.setQty(meal.slot, it.i, it.qty + 1) } } label: { Label("多一份", systemImage: "plus") }
                    if it.qty > 1 { Button { Task { await model.setQty(meal.slot, it.i, it.qty - 1) } } label: { Label("少一份", systemImage: "minus") } }
                    Button(role: .destructive) { Task { await model.remove(meal.slot, it.i) } } label: { Label("删掉", systemImage: "trash") }
                }
                if it.rowID != meal.items.last?.rowID { Divider().overlay(.white.opacity(0.08)).padding(.leading, 40) }
            }
            HStack {
                Button(action: onAdd) { Label("加食物", systemImage: "plus").font(.subheadline.weight(.semibold)) }
                    .foregroundStyle(accent.tint)
                Spacer()
                Text("碳水 \(Fmt.n(meal.sum.cb)) g  脂肪 \(Fmt.n(meal.sum.f)) g  ¥\(Fmt.yuan(meal.sum.cost))")
                    .font(.caption).foregroundStyle(Palette.ink3)
            }
            .padding(.top, 10)
        }
        .padding(16)
        .glassCard(cornerRadius: 26)
        .sensoryFeedback(.success, trigger: tick)
    }
}

struct ItemRow: View {
    let item: MealItem
    let accent: Accent
    var onToggle: () -> Void
    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(item.done ? accent.tint : Palette.ink3)
                    .symbolEffect(.bounce, value: item.done)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.n).font(.body.weight(.medium)).strikethrough(item.done, color: Palette.ink3)
                    .foregroundStyle(item.done ? Palette.ink3 : .primary)
                Text("\(item.qtyText) × \(item.u)").font(.caption).foregroundStyle(Palette.ink3)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                (Text(Fmt.n(item.kcal)).font(.body.weight(.bold)) + Text(" 千卡").font(.caption2).foregroundColor(Palette.ink2))
                Text("蛋白 \(Fmt.one(item.p)) g · ¥\(Fmt.yuan(item.cost))").font(.caption).foregroundStyle(Palette.ink3)
            }
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .onTapGesture(perform: onToggle)
    }
}
