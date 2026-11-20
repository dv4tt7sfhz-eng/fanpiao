import SwiftUI
import Charts
import UIKit

// 饭票旧版（3.0）的二级页面：加食物、克数、官方食谱、食物库、记录、身体资料、让 AI 帮你填。
// 内容和功能照旧版搬回来，从 Norg 框架的按钮里弹出来。


// ---------- 加食物：先找自己勾选的食物，再搜 1700 种食物库 ----------
struct AddFoodSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var slot: String
    /// true：直接记成「已经吃了」
    var done: Bool = false
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
                                    Text(h.n).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
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
                            Task { await model.addFood(slot, id: f.id, qty: 1, done: done); model.say((done ? "记到" : "加到") + "\(slotName(slot))：\(f.n)"); dismiss() }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(f.n).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
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
            .navigationTitle((done ? "记到" : "加到") + slotName(slot))
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
            Text(hit.n).font(.title3.weight(.bold))
            GlassGroup(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach([50.0, 100, 150, 200, 300], id: \.self) { g in
                        Button { withAnimation(Motion.quick) { grams = g } } label: {
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
                .font(.caption).foregroundStyle(Palette.ink2)
            Toggle("已经吃了（直接打勾）", isOn: $ate)
            Button {
                Task { await model.addLib(hit, grams: grams, slot: slot, done: ate); dismiss(); done() }
            } label: {
                Text("记到\(slotName(slot))").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 6)
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
            Text(v).font(.title3.weight(.bold)).monospacedDigit().contentTransition(.numericText())
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
                                Text(cur.n).font(.title3.weight(.bold))
                                Text(cur.d).font(.subheadline).foregroundStyle(Palette.ink2)
                                RhythmStrip(days: vm.rhythm)
                            }
                            .padding(18)
                            .glassCard(cornerRadius: 26, tint: Accent.of(model.accent).tint.opacity(0.18))
                        }
                        ForEach(groups(vm), id: \.self) { g in
                            Text(g).font(.subheadline.weight(.semibold)).padding(.top, 6)
                            ForEach(vm.plans.filter { $0.g == g }) { p in
                                PlanRow(p: p, current: p.id == vm.cur) {
                                    guard p.simple else { model.say("「\(p.n)」要填的东西多，可以先用「让 AI 帮你填」"); return }
                                    Task { await model.setPlan(p.id); self.vm = await model.plans(); model.say("换成「\(p.n)」") }
                                }
                            }
                        }
                    } else { ProgressView().frame(maxWidth: .infinity).padding(.top, 80) }
                }
                .padding(16)
            }
            .background(Backdrop(accent: Accent.of(model.accent)))
            .navigationTitle(L.plansTitle)
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
                        Text(p.n).font(.subheadline.weight(.semibold))
                        if current { Text("生效中").font(.caption.weight(.bold)).padding(.horizontal, 7).padding(.vertical, 3).background(Palette.good.opacity(0.2), in: Capsule()).foregroundStyle(Palette.good) }
                    }
                    Text(p.tag).font(.caption.weight(.semibold)).foregroundStyle(.tint)
                    Text(p.d).font(.caption).foregroundStyle(Palette.ink2).multilineTextAlignment(.leading)
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
                        Text(Fmt.n(h.eaten.kcal)).font(.system(size: 48, weight: .bold, design: .rounded))
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
                            Text(m.name).font(.subheadline.weight(.semibold))
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
                Text("\(Fmt.n(r * 100))%").font(.caption.weight(.bold))
            }
            .frame(width: 62, height: 62)
            Text(name).font(.caption).foregroundStyle(Palette.ink2)
            Text("\(Fmt.n(v)) / \(Fmt.n(t)) g").font(.caption).foregroundStyle(Palette.ink3)
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
            HStack(alignment: .firstTextBaseline, spacing: 3) { Text(Fmt.n(v)).font(.title3.weight(.bold)); Text(unit).font(.caption).foregroundStyle(Palette.ink2) }
            Text(sub).font(.caption).foregroundStyle(Palette.ink2)
            Text(ok ? "没问题" : (unit == "mg" ? "超了，少吃点咸的" : "还差一点，多吃蔬菜")).font(.caption.weight(.semibold)).foregroundStyle(ok ? Palette.good : Palette.warn)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard(cornerRadius: 20, tint: (ok ? Palette.good : Palette.warn).opacity(0.1))
    }
}


// ---------- 食物：勾上的才会被排进餐里 ----------
struct FoodsView: View {
    @Environment(AppModel.self) private var model
    @State private var vm: FoodsVM?
    @State private var q = ""
    @State private var onlyOn = false
    @State private var hits: [LibHit] = []

    var body: some View {
        NavigationStack {
            List {
                if !hits.isEmpty {
                    Section("食物库（每 100 克，点一下记到今天）") {
                        ForEach(hits) { h in LibRowLink(hit: h) }
                    }
                }
                if let vm {
                    ForEach(vm.cats, id: \.self) { c in
                        let items = vm.foods.filter { $0.c == c && (!onlyOn || $0.on) && (q.isEmpty || $0.n.contains(q)) }
                        if !items.isEmpty {
                            Section(c) {
                                ForEach(items) { f in FoodRow(food: f) { on in Task { await model.setOn(f.id, on); self.vm = await model.foods() } } }
                            }
                        }
                    }
                } else { ProgressView() }
            }
            .scrollContentBackground(.hidden)
            .background(Backdrop(accent: Accent.of(model.accent)))
            .navigationTitle("食物库")
            .searchable(text: $q, prompt: "搜我的食物和 1700 种食物库")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { withAnimation(Motion.quick) { onlyOn.toggle() } } label: {
                        Label(onlyOn ? "全部" : "只看勾选的", systemImage: onlyOn ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .task { vm = await model.foods() }
            .task(id: q) {
                try? await Task.sleep(for: .milliseconds(200))
                hits = q.trimmingCharacters(in: .whitespaces).isEmpty ? [] : await model.search(q)
            }
        }
    }
}

struct FoodRow: View {
    let food: Food
    var set: (Bool) -> Void
    var body: some View {
        Toggle(isOn: Binding(get: { food.on }, set: set)) {
            VStack(alignment: .leading, spacing: 3) {
                Text(food.n).font(.subheadline.weight(.medium))
                Text("每\(food.u)：\(Fmt.n(food.k)) 千卡 · 蛋白 \(Fmt.one(food.p)) g · ¥\(Fmt.yuan(food.price))\(food.ck >= 2 ? " · 要开火" : "")")
                    .font(.caption).foregroundStyle(Palette.ink2)
            }
        }
        .listRowBackground(Color.white.opacity(0.06))
    }
}

struct LibRowLink: View {
    let hit: LibHit
    @State private var open = false
    var body: some View {
        Button { open = true } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text(hit.n).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
                Text("\(Fmt.n(hit.k)) 千卡 · 蛋白 \(Fmt.one(hit.p)) g · 碳水 \(Fmt.one(hit.cb)) g").font(.caption).foregroundStyle(Palette.ink2)
            }
        }
        .listRowBackground(Color.white.opacity(0.06))
        .sheet(isPresented: $open) { GramSheet(hit: hit, slot: guessSlot()) {}.presentationDetents([.height(420)]) }
    }
    private func guessSlot() -> String {
        let h = Calendar.current.component(.hour, from: Date())
        return h < 10 ? "b" : h < 15 ? "l" : h < 20 ? "d" : "s"
    }
}

// ---------- 记录：最近 7 / 30 天的热量（苹果的图表）+ 体重 ----------
struct RecordsView: View {
    @Environment(AppModel.self) private var model
    @State private var n = 7
    @State private var vm: RecordsVM?
    @State private var kg = ""
    @State private var metric = 0   // 0 热量 1 蛋白 2 花费

    var body: some View {
        let accent = Accent.of(model.accent)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("", selection: $n.animation(Motion.quick)) { Text("最近 7 天").tag(7); Text("最近 30 天").tag(30) }
                        .pickerStyle(.segmented)
                    if let vm {
                        let logged = vm.days.filter { $0.e.kcal > 0 }
                        HStack(spacing: 10) {
                            Stat(v: logged.isEmpty ? "—" : Fmt.n(logged.map(\.e.kcal).reduce(0, +) / Double(logged.count)), l: "日均千卡")
                            Stat(v: logged.isEmpty ? "—" : Fmt.n(logged.map(\.e.p).reduce(0, +) / Double(logged.count)) + " g", l: "日均蛋白")
                            Stat(v: "\(Fmt.n(vm.streak)) 天", l: "连续记录")
                        }
                        VStack(alignment: .leading, spacing: 12) {
                            Picker("", selection: $metric.animation(Motion.quick)) { Text("热量").tag(0); Text("蛋白").tag(1); Text("花费").tag(2) }
                                .pickerStyle(.segmented)
                            Chart {
                                ForEach(vm.days) { d in
                                    BarMark(x: .value("日期", short(d.d)), y: .value("吃了", value(d)))
                                        .foregroundStyle(LinearGradient(colors: [accent.lo, accent.tint], startPoint: .bottom, endPoint: .top))
                                        .cornerRadius(5)
                                }
                                if metric < 2, let last = vm.days.last {
                                    RuleMark(y: .value("目标", metric == 0 ? last.T.kcal : last.T.protein))
                                        .foregroundStyle(Palette.ink2)
                                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                                        .annotation(position: .top, alignment: .trailing) { Text("目标").font(.caption).foregroundStyle(Palette.ink2) }
                                }
                            }
                            .chartXAxis { AxisMarks(values: .automatic(desiredCount: n == 7 ? 7 : 6)) }
                            .frame(height: 220)
                        }
                        .padding(16)
                        .glassCard(cornerRadius: 26)

                        Text("体重").font(.title3.weight(.bold)).padding(.top, 4)
                        VStack(alignment: .leading, spacing: 12) {
                            if vm.weights.count >= 2 {
                                Chart(vm.weights) { w in
                                    LineMark(x: .value("日期", short(w.d)), y: .value("kg", w.kg)).interpolationMethod(.catmullRom).foregroundStyle(accent.tint)
                                    PointMark(x: .value("日期", short(w.d)), y: .value("kg", w.kg)).foregroundStyle(accent.tint)
                                }
                                .chartYScale(domain: .automatic(includesZero: false))
                                .frame(height: 160)
                            } else {
                                Text(vm.weights.last.map { "最近一次：\(Fmt.one($0.kg)) kg（\($0.d)）" } ?? "还没有体重记录").foregroundStyle(Palette.ink2)
                            }
                            HStack {
                                TextField("今天的体重 kg", text: $kg).keyboardType(.decimalPad)
                                    .padding(.horizontal, 14).padding(.vertical, 10)
                                    .glassCapsule(interactive: false)
                                Button("记") {
                                    if let v = Double(kg.replacingOccurrences(of: ",", with: ".")), v > 20, v < 300 {
                                        Task { await model.addWeight(v); kg = ""; self.vm = await model.records(n) }
                                    } else { model.say("体重请填 20–300 之间的数字") }
                                }
                                .glassProminentButton()
                            }
                        }
                        .padding(16)
                        .glassCard(cornerRadius: 26)
                    } else { ProgressView().frame(maxWidth: .infinity).padding(.top, 80) }
                }
                .padding(16)
                .padding(.bottom, 30)
            }
            .background(Backdrop(accent: accent))
            .navigationTitle("记录")
            .task(id: n) { vm = await model.records(n) }
        }
    }
    private func value(_ d: DayRecord) -> Double { metric == 0 ? d.e.kcal : metric == 1 ? d.e.p : d.e.cost }
    private func short(_ s: String) -> String { String(s.suffix(5)).replacingOccurrences(of: "-", with: "/") }
}

struct SettingRow: View {
    let icon: String; let color: Color; let title: String; var tap: () -> Void
    var body: some View {
        Button(action: tap) {
            HStack(spacing: 14) {
                Image(systemName: icon).font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                    .frame(width: 30, height: 30).background(color, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                Text(title).foregroundStyle(.primary)
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Palette.ink3)
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}


struct ProfileForm: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let isFirst: Bool
    @State private var sex = "m"
    @State private var age = ""
    @State private var height = ""
    @State private var weight = ""
    @State private var goal = "gain"
    @State private var activity = 1.375
    @State private var herOn = false
    @State private var nonum = false

    var body: some View {
        let g = model.goals()
        NavigationStack {
            Form {
                Section("性别（用来算基础代谢）") {
                    Picker("", selection: $sex) { Text("男").tag("m"); Text("女").tag("f") }.pickerStyle(.segmented)
                }
                Section("身体") {
                    LabeledContent("年龄") { TextField("岁", text: $age).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                    LabeledContent("身高") { TextField("cm", text: $height).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("体重") { TextField("kg", text: $weight).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                }
                Section("目标") {
                    Picker("", selection: $goal) { ForEach(g?.goals ?? [], id: \.id) { Text($0.n).tag($0.id) } }.pickerStyle(.segmented)
                    if let d = g?.goals.first(where: { $0.id == goal })?.d { Text(d).font(.caption).foregroundStyle(Palette.ink2) }
                }
                Section("平时动得多不多") {
                    Picker("", selection: $activity) {
                        ForEach(g?.activity ?? [], id: \.v) { a in VStack(alignment: .leading) { Text(a.n); Text(a.d).font(.caption).foregroundStyle(Palette.ink2) }.tag(a.v) }
                    }
                    .pickerStyle(.inline).labelsHidden()
                }
                // 建档最后一步：两个开关，不强推，以后在设置里也能改
                Section {
                    if sex == "f" {
                        Toggle(isOn: $herOn) {
                            VStack(alignment: .leading, spacing: 2) { Text(L.herOnTitle); Text(L.herOnSub).font(.caption).foregroundStyle(Palette.ink2) }
                        }
                    }
                    Toggle(isOn: $nonum) {
                        VStack(alignment: .leading, spacing: 2) { Text(L.herNonum); Text(L.herNonumSub).font(.caption).foregroundStyle(Palette.ink2) }
                    }
                } header: { Text("可以不开，以后在设置里也能改") }
            }
            .scrollContentBackground(.hidden)
            .background(Backdrop(accent: Accent.of(model.accent)))
            .interactiveDismissDisabled()
            .navigationTitle(isFirst ? "先认识一下你" : "身体资料")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) { Button("好了") { save() }.fontWeight(.semibold) }
            }
            .onAppear {
                if let p = model.home?.profile {
                    herOn = model.home?.her?.on ?? false; nonum = model.home?.her?.nonum ?? false
                    sex = p.sex ?? "m"; goal = p.goal ?? "gain"
                    age = p.age.map { Fmt.n($0) } ?? ""; height = p.height.map { Fmt.one($0) } ?? ""; weight = p.weight.map { Fmt.one($0) } ?? ""
                }
            }
        }
    }
    private func save() {
        let num = { (s: String) in Double(s.replacingOccurrences(of: ",", with: ".")) }
        guard let a = num(age), a >= 10, a <= 90 else { return model.say("年龄请填 10–90") }
        guard let h = num(height), h >= 120, h <= 230 else { return model.say("身高请填 120–230 cm") }
        guard let w = num(weight), w >= 30, w <= 250 else { return model.say("体重请填 30–250 kg") }
        Task {
            await model.setProfile(["sex": sex, "age": a, "height": h, "weight": w, "goal": goal, "activity": activity])
            await model.herSet(["on": sex == "f" && herOn, "nonum": nonum])
            dismiss()
        }
    }
}

// ---------- 让 AI 帮你填：粘贴 → 先看要改什么 → 确认才写进去 ----------
struct ImportSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var pv: ImportPreview?
    @State private var err: String?
    @State private var copied = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(L.aiStep1).font(.subheadline.weight(.semibold))
                        Text(L.aiStep1Sub).font(.caption).foregroundStyle(Palette.ink2)
                        Button {
                            UIPasteboard.general.string = model.aiPrompt()
                            copied = true
                            model.say(L.aiCopied)
                        } label: {
                            Label(copied ? L.aiCopyAgain : L.aiCopy, systemImage: "doc.on.doc")
                                .font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                        }
                        .glassProminentButton()
                    }
                    .padding(16)
                    .glassCard(cornerRadius: 20)
                    Text(L.aiStep2).font(.subheadline.weight(.semibold))
                    Text("把 AI 写的那段（连着说明文字一起也行）粘到下面。导入前会先给你看要改什么。")
                        .font(.subheadline).foregroundStyle(Palette.ink2)
                    TextEditor(text: $text)
                        .frame(minHeight: 160)
                        .scrollContentBackground(.hidden)
                        .padding(10)
                        .glassCard(cornerRadius: 18)
                    HStack {
                        Button("粘贴") { if let s = UIPasteboard.general.string { text = s } }.glassButton()
                        Spacer()
                        Button("检查一下") { check() }.glassProminentButton().disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    if let err { Note(icon: "xmark.octagon.fill", text: err, color: Palette.bad) }
                    if let pv {
                        Text("导入后会这样改").font(.subheadline.weight(.semibold))
                        VStack(spacing: 0) {
                            ForEach(Array(pv.rows.enumerated()), id: \.offset) { _, r in
                                HStack(alignment: .top) {
                                    Text(r.first ?? "").foregroundStyle(Palette.ink2)
                                    Spacer(minLength: 16)
                                    Text(r.count > 1 ? r[1] : "").multilineTextAlignment(.trailing)
                                }
                                .font(.subheadline)
                                .padding(.horizontal, 14).padding(.vertical, 10)
                            }
                        }
                        .glassCard(cornerRadius: 18)
                        ForEach(pv.warns, id: \.self) { Note(icon: "exclamationmark.triangle.fill", text: $0, color: Palette.warn) }
                        if !pv.note.isEmpty { Note(icon: "sparkles", text: "AI 说：" + pv.note, color: Accent.of(model.accent).tint) }
                        Button {
                            Task { await model.importApply(pv); dismiss() }
                        } label: { Text("确认导入").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 6) }
                        .glassProminentButton()
                    }
                }
                .padding(16)
            }
            .background(Backdrop(accent: Accent.of(model.accent)))
            .interactiveDismissDisabled(!text.isEmpty)
            .navigationTitle("让 AI 帮你填")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("取消") { dismiss() } } }
        }
    }
    private func check() {
        err = nil; pv = nil
        Task {
            do { let r = try await model.importPreview(text); withAnimation(Motion.quick) { pv = r } }
            catch { withAnimation(Motion.quick) { err = error.localizedDescription } }
        }
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
        .animation(Motion.quick, value: value)
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
