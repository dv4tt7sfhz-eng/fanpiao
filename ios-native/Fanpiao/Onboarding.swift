import SwiftUI

// ---------- 第一次打开：先认识一下你 ----------
struct OnboardingView: View {
    @State private var importing = false
    @State private var form = false
    var body: some View {
        let accent = Accent.of("")
        ZStack {
            Backdrop(accent: accent)
            VStack(alignment: .leading, spacing: 18) {
                Spacer()
                Image(systemName: "ticket.fill").font(.system(size: 44)).foregroundStyle(accent.tint)
                Text("先认识一下你").font(.system(size: 36, weight: .heavy))
                Text("用来算你一天该吃多少。数据只存在这台手机上。").foregroundStyle(Palette.ink2)
                Spacer()
                GlassGroup(spacing: 12) {
                    VStack(spacing: 12) {
                        Button { form = true } label: {
                            Text("自己填（1 分钟）").font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 8)
                        }
                        .glassProminentButton()
                        Button { importing = true } label: {
                            VStack(spacing: 3) {
                                Text("让 AI 帮你填").font(.subheadline.weight(.semibold))
                                Text("把说明发给任何 AI，再把它写的那段粘回来").font(.caption).foregroundStyle(Palette.ink2)
                            }
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                        }
                        .glassButton()
                    }
                }
            }
            .padding(24)
        }
        .sheet(isPresented: $form) { ProfileForm(isFirst: true).presentationDetents([.large]) }
        .sheet(isPresented: $importing) { ImportSheet().presentationDetents([.large]) }
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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
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
