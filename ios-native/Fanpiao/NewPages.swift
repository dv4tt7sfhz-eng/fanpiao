import SwiftUI

// 4.2 新页面：我的柜子、每元蛋白、奶茶计算。都从今日页的入口框里放大出来。

private let red = Color(hex: 0xff4d58)
private let pink = Color(hex: 0xff8a90)

/// 「袋(100g)」→「袋」
private func unitWord(_ u: String) -> String {
    let w = u.split(separator: "(").first.map(String.init) ?? u
    return w.split(separator: "（").first.map(String.init) ?? w
}

// MARK: - 我的柜子

struct StockSheet: View {
    @Environment(AppModel.self) private var model
    @State private var vm: StockVM?
    @State private var filter = 0
    @State private var adding = false
    @State private var editing: StockItem?
    @Namespace private var ns

    var body: some View {
        let items = (vm?.items ?? []).filter { filter == 0 || $0.low }
        SheetFrame(title: L.stockTitle) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L.stockSumA).font(.caption).foregroundStyle(Palette.ink2)
                    Text(L.stockDays(vm?.proteinDays ?? 0)).font(.system(size: 30, weight: .black))
                    Text(L.stockSumB).font(.caption2).foregroundStyle(Palette.ink3)
                }
                Spacer()
                Button {
                    adding = true
                } label: {
                    Label(L.stockIn, systemImage: "plus").font(.subheadline.weight(.bold))
                }
                .glassProminentButton()
                .matchedTransitionSource(id: "stock-in", in: ns)
            }
            .padding(16)
            .glassCard(cornerRadius: 22)

            Picker("", selection: $filter) {
                ForEach(0..<L.stockFilters.count, id: \.self) { i in Text(L.stockFilters[i]).tag(i) }
            }
            .pickerStyle(.segmented)

            if vm != nil && items.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "shippingbox").font(.system(size: 30)).foregroundStyle(Palette.ink3)
                    Text(L.stockEmpty).font(.headline)
                    Text(L.stockEmptySub).font(.caption).foregroundStyle(Palette.ink2).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            }
            ForEach(Array(items.enumerated()), id: \.element.id) { i, it in
                Button { editing = it } label: { StockRow(it: it) }
                    .buttonStyle(PressScale())
                    .matchedTransitionSource(id: it.id, in: ns)
                    .appear(i)
            }
            Text(L.stockNote).font(.caption).foregroundStyle(Palette.ink3)
        }
        .task { vm = await model.stock() }
        .sheet(isPresented: $adding, onDismiss: { Task { vm = await model.stock() } }) {
            StockInSheet().navigationTransition(.zoom(sourceID: "stock-in", in: ns))
        }
        .sheet(item: $editing, onDismiss: { Task { vm = await model.stock() } }) { it in
            StockEditSheet(it: it).navigationTransition(.zoom(sourceID: it.id, in: ns))
        }
    }
}

private struct StockRow: View {
    let it: StockItem
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(it.n).font(.subheadline.weight(.bold))
                Text(L.stockEach(unitWord(it.u), it.price, it.p)).font(.caption).foregroundStyle(Palette.ink2)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(Fmt.one(it.left)) \(unitWord(it.u))").font(.headline.weight(.heavy)).monospacedDigit()
                Text(it.low ? L.stockLow : L.stockLasts(it.days))
                    .font(.caption.weight(it.low ? .bold : .regular))
                    .foregroundStyle(it.low ? red : Palette.ink2)
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(it.low ? Color(hex: 0x2a1214) : Color.white.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(it.low ? Color(hex: 0x7a2228) : Color.white.opacity(0.08), lineWidth: 1))
        .contentShape(Rectangle())
    }
}

/// 进货：选食物 → 填数量和这一批的总价 → 自动算单价
private struct StockInSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var foods: [Food] = []
    @State private var q = ""
    @State private var pick: Food?
    @State private var count = ""
    @State private var total = ""

    var body: some View {
        let n = Double(count.replacingOccurrences(of: ",", with: ".")) ?? 0
        let t = Double(total.replacingOccurrences(of: ",", with: ".")) ?? 0
        let list = foods.filter { q.isEmpty || $0.n.contains(q) }.prefix(40)
        SheetFrame(title: L.stockIn) {
            if let f = pick {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(f.n).font(.headline)
                        Spacer()
                        Button { pick = nil } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Palette.ink3) }
                    }
                    HStack(spacing: 10) {
                        TextField(L.stockCount, text: $count).keyboardType(.decimalPad)
                            .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                        Text(unitWord(f.u)).foregroundStyle(Palette.ink2)
                    }
                    TextField(L.stockTotal, text: $total).keyboardType(.decimalPad)
                        .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                    Text(L.stockUnit(n, t, f.p)).font(.subheadline.weight(.semibold)).foregroundStyle(pink)
                    Button {
                        Task {
                            await model.stockIn(f.id, n, total: t)
                            model.say("\(L.stockSave)：\(f.n) × \(Fmt.one(n))")
                            dismiss()
                        }
                    } label: {
                        Text(L.stockSave).font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassProminentButton()
                    .disabled(n <= 0)
                }
                .padding(16)
                .glassCard(cornerRadius: 22)
            } else {
                Text(L.stockPick).font(.title3.weight(.bold))
                TextField(L.stockSearch, text: $q)
                    .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                VStack(spacing: 0) {
                    ForEach(Array(list)) { f in
                        Button {
                            pick = f
                            count = ""
                            total = ""
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(f.n).font(.subheadline.weight(.semibold))
                                    Text("\(f.u) · ¥\(Fmt.yuan(f.price)) · 蛋白 \(Fmt.one(f.p)) g").font(.caption).foregroundStyle(Palette.ink2)
                                }
                                Spacer()
                                Image(systemName: "plus.circle").foregroundStyle(.tint)
                            }
                            .padding(.horizontal, 14).padding(.vertical, 10)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .glassCard(cornerRadius: 22)
            }
        }
        .task {
            // 先列开着的、不是外食的（宿舍能囤的）
            let all = (await model.foods())?.foods ?? []
            foods = all.filter { !$0.out }.sorted { ($0.on ? 0 : 1, $0.n) < ($1.on ? 0 : 1, $1.n) }
        }
    }
}

private struct StockEditSheet: View {
    let it: StockItem
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var n: Double = 0

    var body: some View {
        SheetFrame(title: it.n) {
            VStack(spacing: 14) {
                Text("\(Fmt.one(n)) \(unitWord(it.u))").font(.system(size: 40, weight: .black)).monospacedDigit()
                Stepper(L.stockEdit, value: $n, in: 0...999, step: 1)
                Button {
                    Task { await model.setStock(it.id, n); dismiss() }
                } label: {
                    Text(L.done).font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassProminentButton()
                Button(role: .destructive) {
                    Task { await model.setStock(it.id, 0); dismiss() }
                } label: {
                    Text(L.stockRemove).frame(maxWidth: .infinity)
                }
            }
            .padding(16)
            .glassCard(cornerRadius: 22)
        }
        .onAppear { n = it.left }
    }
}

// MARK: - 每元蛋白

struct ValueSheet: View {
    @Environment(AppModel.self) private var model
    @State private var all: [ValueItem] = []
    @State private var mode = 0

    var body: some View {
        let list = mode == 0
            ? all.filter { $0.p >= 1 }.sorted { $0.gpy > $1.gpy }
            : all.filter { $0.k > 0 }.sorted { $0.kpy > $1.kpy }
        SheetFrame(title: L.valueTitle) {
            Text(L.valueSub).font(.subheadline).foregroundStyle(Palette.ink2)
            Picker("", selection: $mode) {
                ForEach(0..<2, id: \.self) { i in Text(L.valueModes[i]).tag(i) }
            }
            .pickerStyle(.segmented)
            if mode == 0, let sw = swap(all) { SwapCard(a: sw.0, b: sw.1).appear(0) }
            ForEach(Array(list.prefix(30).enumerated()), id: \.element.id) { i, v in
                HStack(spacing: 12) {
                    Text("\(i + 1)").font(.headline.weight(.heavy)).foregroundStyle(i < 3 ? pink : Palette.ink3).frame(width: 26)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(v.n).font(.subheadline.weight(.bold))
                            if v.stocked {
                                Text(L.valueCupboard).font(.caption2.weight(.bold)).foregroundStyle(pink)
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Capsule().fill(Color(hex: 0x2a1214)))
                            }
                        }
                        Text(L.valueEach(v.price, unitWord(v.u), v.p)).font(.caption).foregroundStyle(Palette.ink2)
                    }
                    Spacer(minLength: 6)
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(mode == 0 ? Fmt.one(v.gpy) : Fmt.n(v.kpy)).font(.headline.weight(.heavy)).monospacedDigit()
                        Text(mode == 0 ? L.valueUnitP : L.valueUnitK).font(.caption2).foregroundStyle(Palette.ink3)
                    }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(i == 0 ? Color(hex: 0x2a1214) : Color.white.opacity(0.05)))
                .appear(i)
            }
            Text(L.valueNote).font(.caption).foregroundStyle(Palette.ink3)
        }
        .animation(.spring(response: 0.45, dampingFraction: 0.88), value: mode)
        .task { all = await model.values() }
    }

    /// 蛋白最多的那几样里，最贵的换成最划算的，蛋白一样多能省多少
    private func swap(_ all: [ValueItem]) -> (ValueItem, ValueItem)? {
        let rich = all.filter { $0.p >= 8 }
        guard let best = rich.max(by: { $0.gpy < $1.gpy }), let worst = rich.min(by: { $0.gpy < $1.gpy }),
              best.id != worst.id, worst.gpy < best.gpy * 0.7 else { return nil }
        let save = worst.price - worst.p / best.p * best.price
        return save > 0.3 ? (worst, best) : nil
    }
}

private struct SwapCard: View {
    let a: ValueItem
    let b: ValueItem
    var body: some View {
        let q = a.p / b.p
        let cost = q * b.price
        VStack(alignment: .leading, spacing: 6) {
            Text(L.swapTitle).font(.subheadline.weight(.heavy))
            Text(L.swapA(a.n, a.price, a.p)).font(.subheadline)
            Text(L.swapB(b.n, q, cost)).font(.subheadline)
            Text(L.swapSave(a.price - cost)).font(.headline.weight(.heavy)).foregroundStyle(pink)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(hex: 0x2a1214)))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color(hex: 0x7a2228), lineWidth: 1))
    }
}

// MARK: - 奶茶计算（粗略估算）

struct TeaSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var base = 0
    @State private var size = 0
    @State private var sugar = 2
    @State private var tops: Set<Int> = []
    @State private var price = ""

    // 中杯（约 500 ml）不加糖的底：千卡、蛋白、脂肪、碳水
    private let bases: [(Double, Double, Double, Double)] = [(150, 2, 8, 15), (160, 7, 8, 12), (60, 0.5, 0, 15), (5, 0, 0, 1)]
    // 中杯每档甜度的糖（克）
    private let sugars: [Double] = [50, 35, 25, 15, 0]
    // 加料：千卡、蛋白、脂肪、碳水、其中的糖
    private let toppings: [(Double, Double, Double, Double, Double)] = [(150, 0, 0, 35, 10), (50, 0, 0, 12, 8), (120, 1, 0, 28, 5), (150, 2, 12, 8, 6), (100, 2, 4, 14, 10)]

    var body: some View {
        let m = size == 0 ? 1.0 : 1.4
        let b = bases[base]
        let sg = sugars[sugar] * m
        let tk = tops.reduce(0.0) { $0 + toppings[$1].0 }
        let kcal = b.0 * m + sg * 4 + tk
        let prot = b.1 * m + tops.reduce(0.0) { $0 + toppings[$1].1 }
        let fat = b.2 * m + tops.reduce(0.0) { $0 + toppings[$1].2 }
        let carb = b.3 * m + sg + tops.reduce(0.0) { $0 + toppings[$1].3 }
        let sugarAll = sg + tops.reduce(0.0) { $0 + toppings[$1].4 }
        SheetFrame(title: L.teaTitle) {
            VStack(alignment: .leading, spacing: 4) {
                Text(L.teaKcal).font(.caption).foregroundStyle(Palette.ink2)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(Fmt.k(kcal)).font(.system(size: 44, weight: .black)).monospacedDigit().contentTransition(.numericText())
                    Text(L.kcal).font(.headline).foregroundStyle(Palette.ink2)
                }
                Text(L.teaSugarG(sugarAll)).font(.subheadline.weight(.semibold)).foregroundStyle(sugarAll >= 50 ? red : pink)
                Text(L.teaSub).font(.caption).foregroundStyle(Palette.ink3).padding(.top, 4)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(cornerRadius: 22)
            .animation(Motion.quick, value: kcal)

            picker(L.teaBase, L.teaBases, $base)
            picker(L.teaSize, L.teaSizes, $size)
            picker(L.teaSugar, L.teaSugars, $sugar)

            Text(L.teaTops).font(.subheadline.weight(.bold))
            HStack(spacing: 8) {
                ForEach(0..<L.teaTopNames.count, id: \.self) { i in
                    let on = tops.contains(i)
                    Button {
                        if on { tops.remove(i) } else { tops.insert(i) }
                    } label: {
                        Text(L.teaTopNames[i]).font(.subheadline.weight(on ? .bold : .regular))
                            .padding(.horizontal, 12).padding(.vertical, 7)
                            .background(Capsule().fill(on ? Color(hex: 0x3a1215) : Color.white.opacity(0.06)))
                            .overlay(Capsule().strokeBorder(on ? Color(hex: 0x7a2228) : Color.clear, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            Text(L.teaTip).font(.caption).foregroundStyle(Palette.ink2)

            HStack(spacing: 10) {
                TextField(L.teaPrice, text: $price).keyboardType(.decimalPad)
                    .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                Button {
                    let name = L.teaName(L.teaBases[base], L.teaSizes[size], L.teaSugars[sugar])
                    let cost = Double(price.replacingOccurrences(of: ",", with: ".")) ?? 0
                    Task {
                        await model.addQuick(model.focusSlot ?? "s", name: name, k: kcal.rounded(), p: prot, f: fat, cb: carb, cost: cost)
                        model.say("\(L.teaAdd)：\(name)")
                        dismiss()
                    }
                } label: {
                    Text(L.teaAdd).font(.subheadline.weight(.bold)).padding(.vertical, 4)
                }
                .glassProminentButton()
            }
        }
    }

    private func picker(_ title: String, _ names: [String], _ sel: Binding<Int>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.bold))
            Picker(title, selection: sel) {
                ForEach(0..<names.count, id: \.self) { i in Text(names[i]).tag(i) }
            }
            .pickerStyle(.segmented)
        }
    }
}
