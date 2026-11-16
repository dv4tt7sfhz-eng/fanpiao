import SwiftUI

// ---------- 加食物：先找自己勾选的食物，再搜 1700 种食物库 ----------
struct AddFoodSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var slot: String
    @State private var q = ""
    @State private var mine: [Food] = []
    @State private var hits: [LibHit] = []
    @State private var pick: LibHit?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("记到", selection: $slot) {
                        ForEach(["b", "l", "d", "s"], id: \.self) { Text(slotName($0)).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                }
                if !hits.isEmpty {
                    Section("食物库（每 100 克）") {
                        ForEach(hits) { h in
                            Button { pick = h } label: {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(h.n).font(.body.weight(.medium)).foregroundStyle(.primary)
                                    Text("\(Fmt.n(h.k)) 千卡 · 蛋白 \(Fmt.one(h.p)) g · 碳水 \(Fmt.one(h.cb)) g · 脂肪 \(Fmt.one(h.f)) g")
                                        .font(.caption).foregroundStyle(Palette.ink2)
                                }
                            }
                        }
                    }
                }
                Section(q.isEmpty ? "我的食物" : "我的食物里的") {
                    ForEach(filteredMine) { f in
                        Button {
                            Task { await model.addFood(slot, id: f.id, qty: 1, done: false); model.say("加到\(slotName(slot))：\(f.n)"); dismiss() }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(f.n).font(.body.weight(.medium)).foregroundStyle(.primary)
                                    Text("每\(f.u)：\(Fmt.n(f.k)) 千卡 · 蛋白 \(Fmt.one(f.p)) g · ¥\(Fmt.yuan(f.price))")
                                        .font(.caption).foregroundStyle(Palette.ink2)
                                }
                                Spacer()
                                Image(systemName: "plus.circle.fill").foregroundStyle(.tint).font(.title3)
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("加到\(slotName(slot))")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $q, placement: .navigationBarDrawer(displayMode: .always), prompt: "搜食物，比如 鸡胸、豆浆")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("完成") { dismiss() } } }
            .task { mine = (await model.foods())?.foods.filter(\.on) ?? [] }
            .task(id: q) {
                try? await Task.sleep(for: .milliseconds(180))
                hits = q.trimmingCharacters(in: .whitespaces).isEmpty ? [] : await model.search(q)
            }
            .sheet(item: $pick) { h in GramSheet(hit: h, slot: slot) { dismiss() }.presentationDetents([.height(420)]) }
        }
    }
    private var filteredMine: [Food] { q.isEmpty ? mine : mine.filter { $0.n.contains(q) } }
}

/// 选好克数，记到某一餐
struct GramSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let hit: LibHit
    let slot: String
    var done: () -> Void
    @State private var grams: Double = 100
    @State private var ate = true

    var body: some View {
        let q = grams / 100
        VStack(alignment: .leading, spacing: 18) {
            Text(hit.n).font(.title2.weight(.bold))
            GlassGroup(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach([50.0, 100, 150, 200, 300], id: \.self) { g in
                        Button { withAnimation(.snappy) { grams = g } } label: {
                            Text("\(Fmt.n(g)) 克").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                        .glassCapsule(tint: grams == g ? Accent.of(model.accent).tint.opacity(0.6) : nil)
                    }
                }
            }
            HStack(spacing: 10) {
                Stat(v: Fmt.n(hit.k * q), l: "千卡")
                Stat(v: Fmt.one(hit.p * q) + " g", l: "蛋白质")
                Stat(v: Fmt.one(hit.cb * q) + " g", l: "碳水")
            }
            Text("脂肪 \(Fmt.one(hit.f * q)) g · 膳食纤维 \(Fmt.one(hit.fb * q)) g · 钠 \(Fmt.n(hit.na * q)) mg")
                .font(.footnote).foregroundStyle(Palette.ink2)
            Toggle("已经吃了（直接打勾）", isOn: $ate)
            Button {
                Task { await model.addLib(hit, grams: grams, slot: slot, done: ate); dismiss(); done() }
            } label: {
                Text("记到\(slotName(slot))").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .glassProminentButton()
        }
        .padding(22)
    }
}

struct Stat: View {
    let v: String; let l: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(v).font(.title3.weight(.bold)).contentTransition(.numericText())
            Text(l).font(.caption).foregroundStyle(Palette.ink2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard(cornerRadius: 18)
    }
}

// ---------- 饮食计划 ----------
struct PlansSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var vm: PlansVM?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let vm {
                        if let cur = vm.plans.first(where: { $0.id == vm.cur }) {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("正在用").font(.caption).foregroundStyle(Palette.ink2)
                                Text(cur.n).font(.title.weight(.bold))
                                Text(cur.d).font(.subheadline).foregroundStyle(Palette.ink2)
                                RhythmStrip(days: vm.rhythm)
                            }
                            .padding(18)
                            .glassCard(cornerRadius: 26, tint: Accent.of(model.accent).tint.opacity(0.18))
                        }
                        ForEach(groups(vm), id: \.self) { g in
                            Text(g).font(.headline).padding(.top, 6)
                            ForEach(vm.plans.filter { $0.g == g }) { p in
                                PlanRow(p: p, current: p.id == vm.cur) {
                                    guard p.simple else { model.say("「\(p.n)」要填的东西多，下一版做到 iPhone 原生版里"); return }
                                    Task { await model.setPlan(p.id); self.vm = await model.plans(); model.say("换成「\(p.n)」") }
                                }
                            }
                        }
                    } else { ProgressView().frame(maxWidth: .infinity).padding(.top, 80) }
                }
                .padding(16)
            }
            .background(Backdrop(accent: Accent.of(model.accent)))
            .navigationTitle("饮食计划")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("完成") { dismiss() } } }
            .task { vm = await model.plans() }
        }
    }
    private func groups(_ vm: PlansVM) -> [String] { var seen: [String] = []; for p in vm.plans where !seen.contains(p.g) { seen.append(p.g) }; return seen }
}

struct PlanRow: View {
    let p: PlanInfo; let current: Bool; var tap: () -> Void
    var body: some View {
        Button(action: tap) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(p.n).font(.headline)
                        if current { Text("生效中").font(.caption2.weight(.bold)).padding(.horizontal, 7).padding(.vertical, 3).background(Palette.good.opacity(0.2), in: Capsule()).foregroundStyle(Palette.good) }
                    }
                    Text(p.tag).font(.caption.weight(.semibold)).foregroundStyle(.tint)
                    Text(p.d).font(.footnote).foregroundStyle(Palette.ink2).multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").foregroundStyle(Palette.ink3)
            }
            .padding(16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .glassCard(cornerRadius: 22, interactive: true)
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(current ? Color.accentColor : .clear, lineWidth: 1.5))
    }
}

/// 接下来 14 天每天是高 / 中 / 低碳
struct RhythmStrip: View {
    let days: [RhythmDay]
    var body: some View {
        let maxK = days.map(\.kcal).max() ?? 1
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(days) { d in
                VStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 5, style: .continuous)
                        .fill(Palette.kind(d.kind).opacity(d.kind == nil ? 0.45 : 0.9))
                        .frame(height: max(14, 70 * d.kcal / maxK))
                    Text(weekday(d.d)).font(.system(size: 10)).foregroundStyle(Palette.ink3)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(height: 92, alignment: .bottom)
    }
    private func weekday(_ s: String) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: s) else { return "" }
        if s == AppModel.today { return "今" }
        return ["日", "一", "二", "三", "四", "五", "六"][Calendar(identifier: .gregorian).component(.weekday, from: d) - 1]
    }
}

// ---------- 点封面卡放大出来的「饮食详情」 ----------
struct DietDetailView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        let accent = Accent.of(model.accent)
        ScrollView {
            if let h = model.home {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(Fmt.n(h.eaten.kcal)).font(.system(size: 64, weight: .bold, design: .rounded))
                        Text("千卡").font(.title3.weight(.semibold)).foregroundStyle(Palette.ink2)
                    }
                    Text("目标 \(Fmt.n(h.T.kcal)) 千卡 · 还可以吃 \(Fmt.n(max(0, h.T.kcal - h.eaten.kcal)))").foregroundStyle(Palette.ink2)
                    ProgressBar(value: h.T.kcal > 0 ? min(1, h.eaten.kcal / h.T.kcal) : 0, tint: accent)
                    HStack(spacing: 10) {
                        Ring(name: "蛋白质", v: h.eaten.p, t: h.T.protein, color: Palette.protein)
                        Ring(name: "碳水", v: h.eaten.cb, t: h.T.carb, color: Palette.carb)
                        Ring(name: "脂肪", v: h.eaten.f, t: h.T.fat, color: Palette.fat)
                    }
                    Text("钠和膳食纤维").font(.title3.weight(.bold)).padding(.top, 6)
                    HStack(spacing: 10) {
                        NaFb(title: "钠", v: h.planned.na, unit: "mg", sub: "约 \(Fmt.one(h.salt)) 克盐 · 上限 \(Fmt.n(h.T.naMax))", ok: h.planned.na <= h.T.naMax, color: Palette.sodium)
                        NaFb(title: "膳食纤维", v: h.planned.fb, unit: "g", sub: "目标 \(Fmt.n(h.T.fbMin)) g 以上", ok: h.planned.fb >= h.T.fbMin, color: Palette.fiber)
                    }
                    Text("钠和纤维按今天全部安排算；三大营养按已经打勾的算。").font(.caption).foregroundStyle(Palette.ink3)
                    Text("今天安排的每一餐").font(.title3.weight(.bold)).padding(.top, 6)
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
                .padding(16)
            }
        }
        .background(Backdrop(accent: accent))
        .navigationTitle("饮食")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct Ring: View {
    let name: String; let v: Double; let t: Double; let color: Color
    var body: some View {
        let r = t > 0 ? min(1, v / t) : 0
        VStack(spacing: 8) {
            ZStack {
                Circle().stroke(color.opacity(0.2), lineWidth: 8)
                Circle().trim(from: 0, to: r).stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round)).rotationEffect(.degrees(-90))
                Text("\(Fmt.n(r * 100))%").font(.footnote.weight(.bold))
            }
            .frame(width: 62, height: 62)
            Text(name).font(.caption).foregroundStyle(Palette.ink2)
            Text("\(Fmt.n(v)) / \(Fmt.n(t)) g").font(.caption2).foregroundStyle(Palette.ink3)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassCard(cornerRadius: 22)
    }
}

struct NaFb: View {
    let title: String; let v: Double; let unit: String; let sub: String; let ok: Bool; let color: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) { Circle().fill(color).frame(width: 8, height: 8); Text(title).font(.subheadline.weight(.semibold)) }
            HStack(alignment: .firstTextBaseline, spacing: 3) { Text(Fmt.n(v)).font(.title.weight(.bold)); Text(unit).font(.caption).foregroundStyle(Palette.ink2) }
            Text(sub).font(.caption).foregroundStyle(Palette.ink2)
            Text(ok ? "没问题" : (unit == "mg" ? "超了，少吃点咸的" : "还差一点，多吃蔬菜")).font(.caption.weight(.semibold)).foregroundStyle(ok ? Palette.good : Palette.warn)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard(cornerRadius: 20, tint: (ok ? Palette.good : Palette.warn).opacity(0.1))
    }
}
