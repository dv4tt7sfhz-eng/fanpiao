import SwiftUI

// 4.4 女生模式：周期卡、周期页、经前关怀卡、无数字模式、浅色分享卡。
// 原则（女生专项文档）：先说「这很正常」，再给办法；不诊断；经期数据只存在这台手机上。

private let pink = hx(0xff7a96)

// MARK: - 文案

extension L {
    static let herTitle = "女生模式"
    static let herOnTitle = "打开女生模式"
    static let herOnSub = "按周期调热量、提醒补铁。经期数据只存在这台手机上，不会发给 AI。"
    static let herNonum = "无数字模式"
    static let herNonumSub = "不看热量数字，只看「够了 / 差一点 / 多了」"
    static let herPill = "在吃短效避孕药"
    static let herPillSub = "吃药期间代谢基本不变，所以不加经前热量"
    static let herCycleRow = "周期记录"
    static let herCard = "周期"
    static func herDay(_ n: Double) -> String { "第 \(Fmt.n(n)) 天" }
    static let herNoLog = "还没记"
    static let herNoLogSub = "来月经那天点一下"
    static func herNext(_ until: Double, _ late: Double) -> String {
        late > 0 ? "比预计晚了 \(Fmt.n(late)) 天" : until <= 0 ? "预计就这两天" : "下次大约 \(Fmt.n(until)) 天后"
    }
    static let herStart = "月经来了"
    static let herEnd = "月经结束了"
    static let herStarted = "记下了。这几天对自己好一点。"
    static let herEnded = "记下了，辛苦了。"
    static let herCleared = "经期记录都删掉了"
    static let herSymTitle = "今天感觉怎么样（可以不填）"
    static let herSymNames = ["痛经", "情绪", "水肿"]
    static let herSymKeys = ["pain", "mood", "swell"]
    static let herSymLevels = ["没有", "一点", "明显", "很难受"]
    static let herHistory = "最近几次"
    static func herCycleLine(_ s: String, _ days: Double) -> String { days > 0 ? "\(s) 开始 · 来了 \(Fmt.n(days)) 天" : "\(s) 开始" }
    static func herAvg(_ len: Double, _ p: Double) -> String { "平均 \(Fmt.n(len)) 天一次，每次 \(Fmt.n(p)) 天左右" }
    static let herIrregular = "最近几次长短不太一样，预测仅供参考。"
    static let herPrivacy = "经期数据只存在这台手机上，不上传、不发给 AI。"
    static let herClear = "删掉所有经期记录"
    static let herClearAsk = "确定删掉所有经期记录吗？删了就找不回来了。"
    static let herDelete = "删掉"
    static let herCancel = "先不删"
    static let herDoctor: [String: String] = [
        "range": "最近的周期短于 21 天或长于 35 天。这种情况可以找校医院或妇科医生看看，放心，很常见。",
        "missing": "已经很久没记到月经了。如果真的没来，建议去看看医生；最近吃得很少的话也要说一下，长期吃太少也会让月经变乱。",
        "pain": "痛到影响上课的话，不用硬扛，可以去校医院看看。"
    ]
    static let herNotDoctor = "饭票只给饮食建议，不做诊断。"

    struct Phase { let name: String; let body: String; let food: String; let color: UInt32 }
    static let phases: [String: Phase] = [
        "period": Phase(name: "月经期", body: "可能痛经、累、怕冷；第 1 天最容易水肿。", food: "多吃点含铁的：鸡蛋、北豆腐、瘦肉，配个橙子或猕猴桃帮助吸收。不舒服就把运动换成散步、拉伸。", color: 0xff6b8a),
        "follicular": Phase(name: "卵泡期", body: "精力和心情通常最好，皮肤也最稳定。", food: "适合开始新目标、试试新食物。", color: 0x8fcaa5),
        "ovulation": Phase(name: "排卵期", body: "精力好；有的人会有一点点腹痛。", food: "这几天一般吃得最少，照常吃就行。", color: 0xd4bf8f),
        "luteal": Phase(name: "黄体期", body: "体温略高、代谢变快一点，开始更容易饿。", food: "多消耗的那一点，饭票已经帮你加进今天的热量里了。", color: 0xb08aff),
        "pre": Phase(name: "经前一周", body: "可能烦躁、水肿、想吃甜的咸的，也最容易冒痘。", food: "这几天容易饿，是激素在起作用，不是你自制力差。", color: 0xff8a90)
    ]
    static func herPlus(_ v: Double) -> String { "今天热量 +\(Fmt.n(v)) kcal" }
    static let herFlex = "再多吃 100 kcal 也不算超标"
    static let herSnackAsk = "想吃点什么？"
    static let herIronAsk = "补点铁："
    static func herIron(_ v: Double, _ t: Double) -> String { "今天铁 \(Fmt.one(v)) / \(Fmt.n(t)) mg" }
    static let herAdded = "放进加餐了"
    static let herWater = "这几天体重涨一点多半是水，别被吓到"

    // 无数字
    static func word(_ v: Double, _ t: Double, more: Bool = true) -> String {
        guard t > 0 else { return "—" }
        let r = v / t
        if more { return r < 0.85 ? "差一点" : r <= 1.1 ? "够了" : "多了" }
        return r <= 1 ? "还好" : "多了"
    }
    static let wordLeft = "今天"

    // 浅色分享卡
    static let shareCardBtn = "浅色状态卡"
    static let shareCardTitle = "本周状态卡"
    static let shareCardSub = "只写吃得怎么样，不写体重。可以直接发小红书。"
    static let shareCardSave = "分享这张卡"
    static func shareWeek(_ n: Double) -> String { "\(Fmt.n(n)) / 7" }
    static let shareLabels = ["本周好好吃饭", "这个月蛋白吃够", "平均每天花"]
    static let shareFoot = "饭票 · 宿舍党的饭票管家"
    static let shareLine = "这周也有好好照顾自己 ✦"
}

extension L.Phase {
    var tint: Color { hx(color) }
}

// MARK: - 今日页：身体数据里的周期卡（换掉虚线「+」）

struct CycleCard: View {
    let her: HerVM
    @Environment(AppModel.self) private var model

    var body: some View {
        let ph = L.phases[her.phase]
        Button { model.route = .cycle } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 5) {
                    Circle().fill(ph?.tint ?? pink).frame(width: 6, height: 6)
                    T(L.herCard, 12, .regular, hx(0x8a8a8e))
                }
                if her.logged && her.day > 0 {
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        T(Fmt.n(her.day), 26, .black, hx(0xf2eded)).monospacedDigit().contentTransition(.numericText())
                        T("天 · " + (ph?.name ?? ""), 11, .bold, ph?.tint ?? hx(0x8a8a8e))
                    }
                    .padding(.top, 6)
                    T(L.herNext(her.until, her.late), 11, .regular, hx(0x6a6a6e)).lineLimit(1).padding(.top, 2)
                    Spacer(minLength: 0)
                    CycleBar(her: her).frame(height: 8)
                } else {
                    T(L.herNoLog, 22, .black, hx(0xf2eded)).padding(.top, 6)
                    T(L.herNoLogSub, 11, .regular, hx(0x6a6a6e)).padding(.top, 2)
                    Spacer(minLength: 0)
                }
            }
            .padding(14)
            .frame(width: 170, height: 123, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .circular)
                    .fill(LinearGradient(colors: [hx(0x241a1e), hx(0x151517)], startPoint: .top, endPoint: .bottom))
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(PressScale())
        .zoomSource(.cycle)
    }
}

/// 一条周期小横条：几段颜色 + 今天的位置
struct CycleBar: View {
    let her: HerVM
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, len = max(21, her.len), ov = len - 14
            let segs: [(Double, Double, String)] = [
                (0, her.pLen, "period"), (her.pLen, ov - 2, "follicular"), (ov - 2, ov + 1, "ovulation"),
                (ov + 1, len - 7, "luteal"), (len - 7, len, "pre")
            ]
            ZStack(alignment: .leading) {
                HStack(spacing: 2) {
                    ForEach(0..<segs.count, id: \.self) { i in
                        Capsule().fill((L.phases[segs[i].2]?.tint ?? .gray).opacity(her.phase == segs[i].2 ? 1 : 0.35))
                            .frame(width: max(2, w * (segs[i].1 - segs[i].0) / len - 2))
                    }
                }
                Circle().fill(.white).frame(width: 8, height: 8)
                    .shadow(color: .white.opacity(0.6), radius: 3)
                    .offset(x: min(w - 8, max(0, w * (min(her.day, len) - 0.5) / len - 4)))
            }
            .frame(height: 8)
            .animation(.spring(response: 0.6, dampingFraction: 0.85), value: her.day)
        }
    }
}

// MARK: - 今日页：按周期说一句话（经前给零食、经期给补铁）

struct HerCareCard: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        if let h = model.home, let her = h.her, her.on, her.logged, her.day > 0, let ph = L.phases[her.phase] {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    BreathDot(color: ph.tint)
                    T("\(L.herDay(her.day)) · \(ph.name)", 14, .heavy)
                    Spacer(minLength: 0)
                    T(L.herNext(her.until, her.late), 11, .regular, hx(0x8a8a8e))
                }
                T(her.phase == "pre" ? ph.food : ph.body, 15, .semibold, hx(0xf6eeee))
                    .fixedSize(horizontal: false, vertical: true)
                if her.phase != "pre" {
                    T(ph.food, 12.5, .regular, hx(0xb8b0b0)).fixedSize(horizontal: false, vertical: true)
                }
                if (h.T.plus ?? 0) > 0 {
                    HStack(spacing: 6) {
                        chipLabel(L.herPlus(h.T.plus ?? 0), ph.tint)
                        if (h.T.flex ?? 0) > 0 { chipLabel(L.herFlex, ph.tint) }
                    }
                }
                if her.phase == "pre" {
                    T(L.herSnackAsk, 12.5, .heavy, hx(0xd8d0d0)).padding(.top, 2)
                    FlowChips(items: [
                        ("无糖酸奶 + 水果", { await model.addFood("s", id: "yogurt", qty: 1, done: false); await model.addFood("s", id: "apple", qty: 1, done: false) }),
                        ("卤蛋", { await model.addFood("s", id: "tea_egg", qty: 1, done: false) }),
                        ("海苔", { await model.addQuickQuiet("s", name: "海苔（小包）", k: 15, p: 2, f: 0.2, cb: 2, cost: 1.5) }),
                        ("一小块黑巧克力", { await model.addQuickQuiet("s", name: "黑巧克力（10g）", k: 60, p: 0.8, f: 4.3, cb: 4.6, cost: 1.5) })
                    ])
                } else if her.phase == "period" {
                    HStack {
                        T(L.herIronAsk, 12.5, .heavy, hx(0xd8d0d0))
                        Spacer(minLength: 0)
                        T(L.herIron(h.eaten.fe ?? 0, her.ironT), 11.5, .semibold, ph.tint)
                            .contentTransition(.numericText())
                    }
                    .padding(.top, 2)
                    FlowChips(items: [
                        ("鸡蛋", { await model.addFood("s", id: "egg", qty: 1, done: false) }),
                        ("北豆腐", { await model.addFood("d", id: "tofu", qty: 1, done: false) }),
                        ("橙子", { await model.addFood("s", id: "orange", qty: 1, done: false) }),
                        ("猕猴桃", { await model.addFood("s", id: "kiwi", qty: 1, done: false) })
                    ])
                }
                if !her.doctor.isEmpty, let note = L.herDoctor[her.doctor] {
                    T(note, 11.5, .regular, hx(0xa8a0a0)).fixedSize(horizontal: false, vertical: true).padding(.top, 2)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 22, style: .circular)
                        .fill(LinearGradient(colors: [ph.tint.opacity(0.16), hx(0x161213)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    RadialGradient(colors: [ph.tint.opacity(0.22), .clear], center: .topLeading, startRadius: 0, endRadius: 160)
                        .clipShape(RoundedRectangle(cornerRadius: 22, style: .circular))
                }
            )
            .overlay(RoundedRectangle(cornerRadius: 22, style: .circular).strokeBorder(ph.tint.opacity(0.3), lineWidth: 1))
            .padding(.horizontal, 18)
            .padding(.top, 24)
            .transition(.opacity.combined(with: .scale(scale: 0.97)))
        }
    }

    private func chipLabel(_ s: String, _ c: Color) -> some View {
        T(s, 11, .bold, c)
            .padding(.horizontal, 9).frame(height: 22)
            .background(Capsule().fill(c.opacity(0.14)))
    }
}

/// 会呼吸的小光点
struct BreathDot: View {
    let color: Color
    @State private var on = false
    var body: some View {
        Circle().fill(color).frame(width: 8, height: 8)
            .shadow(color: color, radius: on ? 7 : 2)
            .scaleEffect(on ? 1.15 : 0.9)
            .onAppear { withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) { on = true } }
    }
}

/// 一排可以点的小胶囊（点了把东西放进加餐）
struct FlowChips: View {
    let items: [(String, () async -> Void)]
    @Environment(AppModel.self) private var model
    @State private var tapped: Set<Int> = []

    var body: some View {
        let rows = [Array(items.indices.prefix(3)), Array(items.indices.dropFirst(3))]
        VStack(alignment: .leading, spacing: 8) {
            ForEach(0..<rows.count, id: \.self) { r in
                HStack(spacing: 8) {
                    ForEach(rows[r], id: \.self) { i in
                        Button {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) { _ = tapped.insert(i) }
                            Task { await items[i].1(); model.say(L.herAdded) }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: tapped.contains(i) ? "checkmark" : "plus")
                                    .font(.system(size: 10, weight: .bold))
                                    .contentTransition(.symbolEffect(.replace))
                                T(items[i].0, 12, .semibold, .white)
                            }
                            .padding(.horizontal, 11).frame(height: 30)
                            .background(Capsule().fill(tapped.contains(i) ? hx(0x3a1a22) : hx(0x241a1e)))
                            .overlay(Capsule().strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
                        }
                        .buttonStyle(PressScale())
                    }
                }
            }
        }
    }
}

// MARK: - 周期页

struct CycleSheet: View {
    @Environment(AppModel.self) private var model
    @State private var askClear = false

    var body: some View {
        let her = model.home?.her
        SheetFrame(title: L.herCycleRow) {
            if let her {
                let ph = L.phases[her.phase]
                // 大圆环
                VStack(spacing: 10) {
                    CycleRing(her: her).frame(width: 210, height: 210)
                    if let ph, her.logged {
                        T(ph.name, 16, .heavy, ph.tint)
                        T(ph.body, 13, .regular, hx(0xc8c0c0)).multilineTextAlignment(.center)
                        T(ph.food, 13, .semibold, hx(0xf2eded)).multilineTextAlignment(.center)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)

                HStack(spacing: 10) {
                    bigButton(L.herStart, "drop.fill", filled: !her.open) { await model.periodStart() }
                    bigButton(L.herEnd, "checkmark", filled: her.open) { await model.periodEnd() }
                }

                // 症状
                VStack(alignment: .leading, spacing: 12) {
                    Text(L.herSymTitle).font(.subheadline.weight(.semibold))
                    ForEach(0..<3, id: \.self) { i in
                        let cur = symValue(her.sym, i)
                        HStack {
                            Text(L.herSymNames[i]).font(.subheadline).frame(width: 44, alignment: .leading)
                            Picker("", selection: Binding(get: { cur }, set: { v in Task { await model.setSym(L.herSymKeys[i], v) } })) {
                                ForEach(0..<4, id: \.self) { Text(L.herSymLevels[$0]).tag($0) }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                }
                .padding(16)
                .glassCard(cornerRadius: 22)

                if let note = L.herDoctor[her.doctor] {
                    Label(note, systemImage: "stethoscope").font(.footnote).foregroundStyle(Palette.ink2)
                        .padding(14).glassCard(cornerRadius: 18)
                }

                // 历史
                if !her.cycles.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(L.herHistory).font(.subheadline.weight(.semibold))
                        Text(L.herAvg(her.len, her.pLen)).font(.footnote).foregroundStyle(Palette.ink2)
                        if her.irregular { Text(L.herIrregular).font(.footnote).foregroundStyle(Palette.warn) }
                        ForEach(her.cycles) { c in
                            HStack {
                                Circle().fill(pink).frame(width: 6, height: 6)
                                Text(L.herCycleLine(c.s, c.days)).font(.subheadline)
                                Spacer()
                                Button { Task { await model.periodDelete(c.s) } } label: {
                                    Image(systemName: "xmark.circle.fill").foregroundStyle(Palette.ink3)
                                }
                                .buttonStyle(.plain)
                            }
                            .transition(.opacity.combined(with: .move(edge: .leading)))
                        }
                    }
                    .padding(16)
                    .glassCard(cornerRadius: 22)
                    .animation(.spring(response: 0.45, dampingFraction: 0.86), value: her.cycles)
                }

                // 开关
                VStack(spacing: 12) {
                    Toggle(isOn: Binding(get: { her.nonum }, set: { v in Task { await model.herSet(["nonum": v]) } })) {
                        VStack(alignment: .leading, spacing: 2) { Text(L.herNonum); Text(L.herNonumSub).font(.caption).foregroundStyle(Palette.ink2) }
                    }
                    Toggle(isOn: Binding(get: { her.pill }, set: { v in Task { await model.herSet(["pill": v]) } })) {
                        VStack(alignment: .leading, spacing: 2) { Text(L.herPill); Text(L.herPillSub).font(.caption).foregroundStyle(Palette.ink2) }
                    }
                }
                .padding(16)
                .glassCard(cornerRadius: 22)

                Label(L.herPrivacy, systemImage: "lock.fill").font(.footnote).foregroundStyle(Palette.ink2)
                Text(L.herNotDoctor).font(.caption).foregroundStyle(Palette.ink3)
                Button(role: .destructive) { askClear = true } label: {
                    Text(L.herClear).frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .confirmationDialog(L.herClearAsk, isPresented: $askClear, titleVisibility: .visible) {
                    Button(L.herDelete, role: .destructive) { Task { await model.herClear() } }
                    Button(L.herCancel, role: .cancel) {}
                }
            }
        }
    }

    private func symValue(_ s: HerVM.Sym?, _ i: Int) -> Int {
        let v = i == 0 ? s?.pain : i == 1 ? s?.mood : s?.swell
        return Int(v ?? 0)
    }

    private func bigButton(_ t: String, _ icon: String, filled: Bool, _ act: @escaping () async -> Void) -> some View {
        Button { Task { await act() } } label: {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 14, weight: .bold))
                T(t, 15, .heavy, filled ? .white : hx(0xd8d0d0))
            }
            .frame(maxWidth: .infinity).frame(height: 50)
            .background(Capsule().fill(filled ? AnyShapeStyle(LinearGradient(colors: [hx(0xff7a96), hx(0xc23a5a)], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(hx(0x221a1d))))
            .shadow(color: filled ? pink.opacity(0.4) : .clear, radius: 10, y: 3)
        }
        .buttonStyle(PressScale())
    }
}

/// 周期大圆环：一圈五段颜色，白点是今天
struct CycleRing: View {
    let her: HerVM
    @State private var grow = false
    var body: some View {
        let len = max(21, her.len), ov = len - 14
        let segs: [(Double, Double, String)] = [
            (0, her.pLen, "period"), (her.pLen, ov - 2, "follicular"), (ov - 2, ov + 1, "ovulation"),
            (ov + 1, len - 7, "luteal"), (len - 7, len, "pre")
        ]
        let ang = Angle.degrees(360 * (min(max(her.day, 1), len) - 0.5) / len - 90)
        ZStack {
            ForEach(0..<segs.count, id: \.self) { i in
                Circle()
                    .trim(from: grow ? segs[i].0 / len + 0.004 : 0, to: grow ? segs[i].1 / len - 0.004 : 0)
                    .stroke((L.phases[segs[i].2]?.tint ?? .gray).opacity(her.phase == segs[i].2 ? 1 : 0.35), style: StrokeStyle(lineWidth: 14, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            if her.logged && her.day > 0 {
                Circle().fill(.white).frame(width: 18, height: 18)
                    .shadow(color: .white.opacity(0.7), radius: 6)
                    .offset(x: 98 * cos(ang.radians), y: 98 * sin(ang.radians))
                    .opacity(grow ? 1 : 0)
            }
            VStack(spacing: 2) {
                if her.logged && her.day > 0 {
                    T(L.herCard, 12, .regular, hx(0x8a8a8e))
                    T(Fmt.n(her.day), 52, .black).contentTransition(.numericText())
                    T(L.herNext(her.until, her.late), 11, .regular, hx(0xa8a0a0))
                } else {
                    T(L.herNoLog, 26, .black)
                    T(L.herNoLogSub, 11, .regular, hx(0xa8a0a0))
                }
            }
        }
        .padding(7)
        .onAppear { withAnimation(.spring(response: 0.9, dampingFraction: 0.85).delay(0.15)) { grow = true } }
    }
}

// MARK: - 浅色分享卡

struct ShareCardSheet: View {
    @Environment(AppModel.self) private var model
    @State private var image: Image?

    var body: some View {
        SheetFrame(title: L.shareCardTitle) {
            Text(L.shareCardSub).font(.footnote).foregroundStyle(Palette.ink2)
            LightCard(week: model.home?.week ?? model.stats?.week ?? 0, protein: model.stats?.monthProtein ?? 0, avg: model.stats?.monthAvg ?? 0)
                .frame(width: 330, height: 440)
                .frame(maxWidth: .infinity)
                .shadow(color: .black.opacity(0.4), radius: 18, y: 8)
                .appear(0)
            if let image {
                ShareLink(item: image, preview: SharePreview(L.shareCardTitle, image: image)) {
                    Label(L.shareCardSave, systemImage: "square.and.arrow.up").frame(maxWidth: .infinity).frame(height: 44)
                }
                .buttonStyle(.borderedProminent)
                .tint(pink)
            }
        }
        .task {
            let r = ImageRenderer(content: LightCard(week: model.home?.week ?? model.stats?.week ?? 0, protein: model.stats?.monthProtein ?? 0, avg: model.stats?.monthAvg ?? 0).frame(width: 330, height: 440))
            r.scale = 3
            if let ui = r.uiImage { image = Image(uiImage: ui) }
        }
    }
}

/// 浅色、柔光的状态卡（不写体重）
struct LightCard: View {
    let week: Double
    let protein: Double
    let avg: Double

    var body: some View {
        let ink = hx(0x3a2a30), soft = hx(0x9a8a90)
        ZStack(alignment: .topLeading) {
            LinearGradient(colors: [hx(0xfff4ef), hx(0xfde6ea), hx(0xf3e8ff)], startPoint: .topLeading, endPoint: .bottomTrailing)
            Circle().fill(hx(0xffd3dc).opacity(0.8)).frame(width: 260).blur(radius: 50).offset(x: 140, y: -60)
            Circle().fill(hx(0xe2d4ff).opacity(0.7)).frame(width: 220).blur(radius: 50).offset(x: -60, y: 280)
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Image(systemName: "sparkle").font(.system(size: 13, weight: .bold)).foregroundStyle(hx(0xe0708a))
                    Text(L.shareCardTitle).font(.system(size: 14, weight: .bold)).foregroundStyle(ink)
                }
                Text(L.shareLine).font(.system(size: 22, weight: .heavy)).foregroundStyle(ink).padding(.top, 18)
                VStack(alignment: .leading, spacing: 16) {
                    row(L.shareLabels[0], L.shareWeek(week), ink, soft)
                    row(L.shareLabels[1], "\(Fmt.n(protein)) 天", ink, soft)
                    row(L.shareLabels[2], "¥\(Fmt.yuan(avg))", ink, soft)
                }
                .padding(.top, 28)
                Spacer(minLength: 0)
                Text(L.shareFoot).font(.system(size: 11, weight: .semibold)).foregroundStyle(soft)
            }
            .padding(26)
        }
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
    }

    private func row(_ k: String, _ v: String, _ ink: Color, _ soft: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(k).font(.system(size: 12, weight: .medium)).foregroundStyle(soft)
            Text(v).font(.system(size: 30, weight: .black)).foregroundStyle(ink).monospacedDigit()
        }
    }
}
