import SwiftUI
import Charts

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
            .navigationTitle("食物")
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

// ---------- 我的 ----------
struct MeView: View {
    @Environment(AppModel.self) private var model
    @State private var editProfile = false
    @State private var importing = false
    @State private var budget: Double = 30
    @State private var snack = true

    var body: some View {
        let accent = Accent.of(model.accent)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let h = model.home, let p = h.profile {
                        VStack(spacing: 10) {
                            Text("饭").font(.system(size: 34, weight: .heavy)).foregroundStyle(.white)
                                .frame(width: 78, height: 78)
                                .glassCard(cornerRadius: 39, tint: accent.tint.opacity(0.7))
                            Text("饭票同学").font(.title3.weight(.bold))
                            Text("\(h.goalName) · 每天 \(Fmt.n(h.T.kcal)) 千卡 · \(Fmt.n(p.height ?? 0)) cm \(Fmt.one(p.weight ?? 0)) kg")
                                .font(.caption).foregroundStyle(Palette.ink2)
                            HStack(spacing: 10) {
                                Stat(v: h.level.name, l: "打卡等级")
                                Stat(v: "\(Fmt.n(h.level.cur))/\(Fmt.n(h.level.need))", l: "经验")
                                Stat(v: "\(Fmt.n(h.streak)) 天", l: "连续记录")
                            }
                            .padding(.top, 6)
                        }
                        .frame(maxWidth: .infinity)
                    }

                    Text("主题色").font(.title3.weight(.bold))
                    GlassGroup(spacing: 14) {
                        HStack(spacing: 14) {
                            ForEach(Accent.all) { a in
                                Button { Task { await model.setAccent(a.id) } } label: {
                                    VStack(spacing: 6) {
                                        Circle().fill(LinearGradient(colors: [a.hi, a.tint, a.lo], startPoint: .topLeading, endPoint: .bottomTrailing))
                                            .frame(width: 40, height: 40)
                                            .overlay(Circle().strokeBorder(.white.opacity(a.id == model.accent ? 0.9 : 0), lineWidth: 2.5))
                                        Text(a.name).font(.caption).foregroundStyle(a.id == model.accent ? .primary : Palette.ink2)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .glassCard(cornerRadius: 24)
                    }

                    Text("吃饭的习惯").font(.title3.weight(.bold))
                    VStack(spacing: 14) {
                        HStack {
                            Text("每天预算")
                            Spacer()
                            Stepper("¥\(Fmt.n(budget))", value: $budget, in: 0...200, step: 5) { editing in
                                if !editing { Task { await model.setPrefs(["budget": budget]) } }
                            }
                            .fixedSize()
                        }
                        Toggle("要加餐", isOn: $snack).onChange(of: snack) { _, v in Task { await model.setPrefs(["snack": v]) } }
                    }
                    .padding(16)
                    .glassCard(cornerRadius: 22)

                    Text("设置").font(.title3.weight(.bold))
                    VStack(spacing: 0) {
                        SettingRow(icon: "person.text.rectangle", color: accent.tint, title: "改身体资料") { editProfile = true }
                        Divider().overlay(.white.opacity(0.08)).padding(.leading, 52)
                        SettingRow(icon: "wand.and.stars", color: Palette.sodium, title: "让 AI 帮你填") { importing = true }
                    }
                    .glassCard(cornerRadius: 22)

                    Text("饭票 3.0（iPhone 原生版）· 数据只存在这台手机上").font(.caption).foregroundStyle(Palette.ink3)
                        .frame(maxWidth: .infinity).padding(.top, 10)
                }
                .padding(16)
                .padding(.bottom, 30)
            }
            .background(Backdrop(accent: accent))
            .navigationTitle("我的")
            .sheet(isPresented: $editProfile) { ProfileForm(isFirst: false).presentationDetents([.large]) }
            .sheet(isPresented: $importing) { ImportSheet().presentationDetents([.large]) }
            .onAppear { if let h = model.home { budget = h.budget } }
        }
    }
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
