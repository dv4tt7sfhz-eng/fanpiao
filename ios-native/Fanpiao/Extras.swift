import SwiftUI
import Charts

// 今日页五个入口、我的页按钮弹出来的页面：饭票学堂、成就、段位、主题市场、设置、体重、通知，还有第一次打开的欢迎页。

private struct SheetFrame<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) { content }
                    .padding(16)
                    .padding(.bottom, 30)
            }
            .background(Backdrop(accent: Accent.of(model.accent)))
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(L.done) { dismiss() } } }
            .navigationDestination(for: Article.self) { ArticleView(a: $0) }
        }
    }
}

// MARK: - 饭票学堂

struct SchoolSheet: View {
    var body: some View {
        SheetFrame(title: Lore.schoolTitle) {
            Text(Lore.schoolSub).font(.subheadline).foregroundStyle(Palette.ink2)
            ForEach(Lore.articles) { a in
                NavigationLink(value: a) { ArticleRow(a: a) }
                    .buttonStyle(.plain)
            }
        }
    }
}

struct ArticleRow: View {
    let a: Article
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text(a.tag).font(.caption.weight(.bold)).foregroundStyle(.tint)
                Text(a.title).font(.headline)
                Text(a.summary).font(.caption).foregroundStyle(Palette.ink2).multilineTextAlignment(.leading)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").foregroundStyle(Palette.ink3).padding(.top, 4)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(cornerRadius: 22)
        .contentShape(Rectangle())
    }
}

struct ArticleView: View {
    let a: Article
    var closable = false
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(a.tag).font(.subheadline.weight(.bold)).foregroundStyle(.tint)
                Text(a.title).font(.system(size: 28, weight: .heavy))
                Text(a.summary).font(.headline).foregroundStyle(Palette.ink2)
                ForEach(Array(a.body.enumerated()), id: \.offset) { _, p in
                    Text(p).font(.body).lineSpacing(5).fixedSize(horizontal: false, vertical: true)
                }
                Text(Lore.schoolSub).font(.caption).foregroundStyle(Palette.ink3).padding(.top, 10)
            }
            .padding(20)
            .padding(.bottom, 30)
        }
        .background(Backdrop(accent: Accent.of(model.accent)))
        .navigationTitle(Lore.schoolTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if closable { Button(L.done) { dismiss() } }
            }
        }
    }
}

// MARK: - 成就

struct BadgesSheet: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        let list = Lore.badges(model.stats)
        let got = list.filter(\.got).count
        SheetFrame(title: L.meBadgesN(got) + " / \(list.count)") {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                ForEach(list) { b in BadgeCell(b: b) }
            }
        }
    }
}

private struct BadgeCell: View {
    let b: Lore.Badge
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().fill(b.got ? AnyShapeStyle(LinearGradient(colors: [Color(hex: 0xff8a90), Color(hex: 0xc2303a)], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(Color.white.opacity(0.08)))
                Image(systemName: b.got ? "rosette" : "lock.fill")
                    .font(.system(size: b.got ? 24 : 16, weight: .bold))
                    .foregroundStyle(b.got ? Color.white : Palette.ink3)
            }
            .frame(width: 54, height: 54)
            Text(b.name).font(.subheadline.weight(.bold)).foregroundStyle(b.got ? Color.primary : Palette.ink2)
            Text(b.how).font(.caption2).foregroundStyle(Palette.ink3).multilineTextAlignment(.center).lineLimit(3)
        }
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .top)
        .padding(.vertical, 14).padding(.horizontal, 6)
        .glassCard(cornerRadius: 20)
    }
}

// MARK: - 段位

struct LevelSheet: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        let lv = model.home?.level ?? model.stats?.level
        SheetFrame(title: L.rankTitle) {
            if let lv {
                VStack(alignment: .leading, spacing: 10) {
                    Text(L.rankTitle).font(.caption).foregroundStyle(Palette.ink2)
                    Text(lv.name).font(.system(size: 34, weight: .black))
                    ProgressBar(value: lv.need > 0 ? min(1, lv.cur / lv.need) : 0, tint: Accent.of(model.accent))
                    HStack {
                        Text(L.rankXPText(lv.cur, lv.need)).font(.caption.weight(.bold))
                        Spacer()
                        Text(L.rankHintNext(lv.need - lv.cur, lv.next)).font(.caption).foregroundStyle(Palette.ink2)
                    }
                    Text("累计 \(Fmt.n(lv.xp)) XP").font(.caption).foregroundStyle(Palette.ink3)
                }
                .padding(18)
                .glassCard(cornerRadius: 24, tint: Accent.of(model.accent).tint.opacity(0.15))
            }
            Text("七个段位").font(.title3.weight(.bold)).padding(.top, 4)
            VStack(spacing: 0) {
                ForEach(Array(Lore.tiers.enumerated()), id: \.offset) { i, t in
                    let cur = Int(lv?.tier ?? 0)
                    HStack {
                        Text("\(i + 1)").font(.caption.weight(.bold)).foregroundStyle(Palette.ink3).frame(width: 22)
                        Text(t).font(.subheadline.weight(i == cur ? .heavy : .regular))
                        Spacer()
                        if i == cur { Text(L.planCurrent).font(.caption.weight(.bold)).foregroundStyle(.tint) }
                        else if i < cur { Image(systemName: "checkmark").font(.caption.weight(.bold)).foregroundStyle(Palette.good) }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 12)
                    if i < Lore.tiers.count - 1 { Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 52) }
                }
            }
            .glassCard(cornerRadius: 22)
            Text("怎么得 XP").font(.title3.weight(.bold)).padding(.top, 4)
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Lore.levelRules, id: \.self) { r in
                    HStack(alignment: .top, spacing: 10) {
                        Circle().fill(Color(hex: 0xe5404a)).frame(width: 6, height: 6).padding(.top, 6)
                        Text(r).font(.subheadline)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(cornerRadius: 22)
        }
    }
}

// MARK: - 主题市场

struct ThemeSheet: View {
    var body: some View {
        SheetFrame(title: L.themeTitle) {
            ThemeList()
        }
    }
}

/// 主题色列表（主题市场页、发现页的「主题市场」都用它）
struct ThemeList: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L.themeNote).font(.subheadline).foregroundStyle(Palette.ink2)
            ForEach(Accent.all) { a in
                Button {
                    Task { await model.setAccent(a.id) }
                } label: {
                    HStack(spacing: 14) {
                        Circle().fill(LinearGradient(colors: [a.hi, a.tint, a.lo], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 44, height: 44)
                            .overlay(Circle().strokeBorder(.white.opacity(a.id == model.accent ? 0.9 : 0), lineWidth: 2.5))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(a.name).font(.headline).foregroundStyle(.white)
                            Text(a.note).font(.caption).foregroundStyle(Palette.ink2)
                        }
                        Spacer()
                        if a.id == model.accent {
                            Text(L.themeUsing).font(.caption.weight(.bold)).foregroundStyle(a.tint)
                                .padding(.horizontal, 9).padding(.vertical, 4)
                                .background(a.tint.opacity(0.18), in: Capsule())
                        }
                    }
                    .padding(14)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .glassCard(cornerRadius: 22)
            }
        }
    }
}

// MARK: - 设置

struct SettingsSheet: View {
    @Environment(AppModel.self) private var model
    @State private var budget: Double = 30
    @State private var snack = true
    @State private var ready = false
    @State private var sub: Route?

    var body: some View {
        let accent = Accent.of(model.accent)
        SheetFrame(title: L.setTitle) {
            Text(L.setHabits).font(.title3.weight(.bold))
            VStack(spacing: 14) {
                HStack {
                    Text(L.setBudget)
                    Spacer()
                    Stepper(budget > 0 ? "¥\(Fmt.n(budget))" : L.setNoLimit, value: $budget, in: 0...200, step: 5) { editing in
                        if !editing { Task { await model.setPrefs(["budget": budget]) } }
                    }
                    .fixedSize()
                }
                Toggle(L.setSnack, isOn: $snack)
                    .onChange(of: snack) { _, v in if ready { Task { await model.setPrefs(["snack": v]) } } }
            }
            .padding(16)
            .glassCard(cornerRadius: 22)

            VStack(spacing: 0) {
                SettingRow(icon: "person.text.rectangle", color: accent.tint, title: L.setProfile) { sub = .profile }
                Divider().overlay(.white.opacity(0.08)).padding(.leading, 52)
                SettingRow(icon: "wand.and.stars", color: Palette.sodium, title: L.setAI) { sub = .importAI }
                Divider().overlay(.white.opacity(0.08)).padding(.leading, 52)
                SettingRow(icon: "paintpalette", color: Palette.fat, title: L.setTheme) { sub = .themes }
                Divider().overlay(.white.opacity(0.08)).padding(.leading, 52)
                SettingRow(icon: "chart.bar", color: Palette.carb, title: L.setRecords) { sub = .records }
                Divider().overlay(.white.opacity(0.08)).padding(.leading, 52)
                SettingRow(icon: "basket", color: Palette.protein, title: L.setFoods) { sub = .foods }
            }
            .glassCard(cornerRadius: 22)

            Text(L.meVersion).font(.caption).foregroundStyle(Palette.ink3)
                .frame(maxWidth: .infinity).padding(.top, 10)
        }
        .sheet(item: $sub) { RouteView(route: $0) }
        .onAppear {
            if let h = model.home {
                budget = h.budget
                snack = h.meals.contains { $0.slot == "s" }
            }
            Task { @MainActor in ready = true }
        }
    }
}

// MARK: - 体重

struct WeightSheet: View {
    @Environment(AppModel.self) private var model
    @State private var vm: RecordsVM?
    @State private var kg = ""
    @FocusState private var focus: Bool

    var body: some View {
        let accent = Accent.of(model.accent)
        SheetFrame(title: L.weightTitle) {
            VStack(alignment: .leading, spacing: 12) {
                if let last = vm?.weights.last {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(Fmt.one(last.kg)).font(.system(size: 48, weight: .black)).monospacedDigit()
                        Text(L.cardKg).font(.title3.weight(.semibold)).foregroundStyle(Palette.ink2)
                    }
                    Text(last.d).font(.caption).foregroundStyle(Palette.ink2)
                } else {
                    Text(L.weightNone).foregroundStyle(Palette.ink2)
                }
                HStack {
                    TextField(L.weightInput, text: $kg)
                        .keyboardType(.decimalPad)
                        .focused($focus)
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .glassCapsule(interactive: false)
                    Button(L.weightSave) { save() }.glassProminentButton()
                }
            }
            .padding(16)
            .glassCard(cornerRadius: 24)

            if let vm, vm.weights.count >= 2 {
                Chart(vm.weights) { w in
                    LineMark(x: .value("日期", short(w.d)), y: .value("kg", w.kg)).interpolationMethod(.catmullRom).foregroundStyle(accent.tint)
                    PointMark(x: .value("日期", short(w.d)), y: .value("kg", w.kg)).foregroundStyle(accent.tint)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 180)
                .padding(16)
                .glassCard(cornerRadius: 24)
            }
            if let vm, !vm.weights.isEmpty {
                Text(L.weightHistory).font(.title3.weight(.bold)).padding(.top, 4)
                VStack(spacing: 0) {
                    ForEach(Array(vm.weights.reversed().prefix(14))) { w in
                        HStack {
                            Text(w.d).foregroundStyle(Palette.ink2)
                            Spacer()
                            Text("\(Fmt.one(w.kg)) kg").font(.subheadline.weight(.semibold))
                        }
                        .padding(.horizontal, 16).padding(.vertical, 11)
                    }
                }
                .glassCard(cornerRadius: 22)
            }
        }
        .task { vm = await model.records(30) }
    }

    private func save() {
        if let v = Double(kg.replacingOccurrences(of: ",", with: ".")), v > 20, v < 300 {
            Task {
                await model.addWeight(v)
                kg = ""
                focus = false
                vm = await model.records(30)
                await model.refresh()
            }
        } else {
            model.say(L.weightBad)
        }
    }

    private func short(_ s: String) -> String { String(s.suffix(5)).replacingOccurrences(of: "-", with: "/") }
}

// MARK: - 通知

struct NoticeSheet: View {
    var body: some View {
        SheetFrame(title: L.noticeTitle) {
            VStack(spacing: 10) {
                Image(systemName: "bell.slash").font(.system(size: 34)).foregroundStyle(Palette.ink3)
                Text(L.noticeEmpty).font(.headline)
                Text(L.noticeSub).font(.caption).foregroundStyle(Palette.ink2).multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 60)
        }
    }
}

// MARK: - 第一次打开

struct WelcomeView: View {
    @State private var form = false
    @State private var importing = false

    var body: some View {
        ZStack {
            Color(hex: 0x0c0a0b).ignoresSafeArea()
            RadialGradient(colors: [Color(hex: 0x5a1a20).opacity(0.9), .clear], center: UnitPoint(x: 0.5, y: 0.25), startRadius: 0, endRadius: 360)
                .ignoresSafeArea()
            VStack(alignment: .leading, spacing: 18) {
                Spacer()
                HStack(spacing: 8) {
                    NI.logoSplash().frame(width: 34, height: 37)
                    T(L.brand, 34, .heavy, .white, track: -1)
                }
                Text(L.welcomeTitle).font(.system(size: 36, weight: .heavy)).foregroundStyle(.white)
                Text(L.welcomeSub).foregroundStyle(Palette.ink2)
                Spacer()
                GlassGroup(spacing: 12) {
                    VStack(spacing: 12) {
                        Button { form = true } label: {
                            Text(L.welcomeSelf).font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 8)
                        }
                        .glassProminentButton()
                        Button { importing = true } label: {
                            VStack(spacing: 3) {
                                Text(L.welcomeAI).font(.subheadline.weight(.semibold))
                                Text(L.welcomeAISub).font(.caption).foregroundStyle(Palette.ink2)
                            }
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                        }
                        .glassButton()
                    }
                }
            }
            .padding(24)
        }
        .tint(Color(hex: 0xf04d58))
        .sheet(isPresented: $form) { ProfileForm(isFirst: true).presentationDetents([.large]) }
        .sheet(isPresented: $importing) { ImportSheet().presentationDetents([.large]) }
    }
}
