import SwiftUI
import PhotosUI
import UIKit

// 4.3 拍一下就识别：拍饭菜、拍营养成分表、说一句。用的是用户自己在「AI 设置」里填的密钥。

private let pink = Color(hex: 0xff8a90)

struct SnapSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var mode = 0
    @State private var images: [UIImage] = []
    @State private var desc = ""
    @State private var phase = 0          // 0 选照片，1 正在认，2 结果
    @State private var result: SnapResult?
    @State private var picked: Set<UUID> = []
    @State private var slot = Route.guessSlot()
    @State private var ate = true
    @State private var err: String?
    @State private var photo: PhotosPickerItem?
    @State private var camera = false
    @State private var settings = false
    @State private var copyPrompt = false
    @State private var job: Task<Void, Never>?
    @State private var info: AIInfo?
    @Namespace private var ns

    private let slots = ["b", "l", "d", "s"]

    var body: some View {
        let visionOK = info.map { !$0.vision.key.isEmpty && !$0.vision.model.isEmpty } ?? false
        let textOK = info.map { !$0.text.key.isEmpty } ?? false
        let ready = mode == 2 ? textOK : visionOK
        SheetFrame(title: L.snapTitle) {
            Picker("", selection: $mode) {
                ForEach(0..<L.snapModes.count, id: \.self) { i in Text(L.snapModes[i]).tag(i) }
            }
            .pickerStyle(.segmented)
            .disabled(phase == 1)
            .onChange(of: mode) { _, _ in withAnimation(Motion.quick) { phase = 0; result = nil; err = nil } }

            if !ready {
                setupCard
                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
            } else if phase == 0 {
                pickCard
                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
            } else if phase == 1 {
                ScanCard(image: images.first) { job?.cancel(); withAnimation(Motion.quick) { phase = 0 } }
                    .transition(.opacity.combined(with: .scale(scale: 0.96)))
            } else if let r = result {
                resultCard(r)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            if let err {
                Text(err).font(.subheadline.weight(.semibold)).foregroundStyle(Color(hex: 0xff4d58))
                    .transition(.opacity)
            }
            Text(L.snapPrivacy).font(.caption).foregroundStyle(Palette.ink3)
        }
        .animation(.spring(response: 0.45, dampingFraction: 0.9), value: phase)
        .animation(.spring(response: 0.45, dampingFraction: 0.9), value: ready)
        .onAppear { info = model.aiInfo() }
        .onChange(of: photo) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: data) {
                    images = [img]
                    run()
                }
                photo = nil
            }
        }
        .sheet(isPresented: $camera) {
            CameraPicker { img in images = [img]; run() }.ignoresSafeArea()
        }
        .sheet(isPresented: $settings, onDismiss: { info = model.aiInfo() }) {
            AISettingsSheet().navigationTransition(.zoom(sourceID: "ai", in: ns))
        }
        .sheet(isPresented: $copyPrompt) {
            ImportSheet().navigationTransition(.zoom(sourceID: "copy", in: ns))
        }
    }

    // 还没填密钥：说清楚怎么办
    private var setupCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(mode == 2 ? L.snapNeedText : L.snapNeedVision).font(.subheadline)
            Button { settings = true } label: {
                Label(L.aiSetTitle, systemImage: "key.fill").font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .glassProminentButton()
            .matchedTransitionSource(id: "ai", in: ns)
            Button { copyPrompt = true } label: {
                Text(L.snapOrCopy).font(.subheadline).frame(maxWidth: .infinity).padding(.vertical, 4)
            }
            .glassButton()
            .matchedTransitionSource(id: "copy", in: ns)
        }
        .padding(16)
        .glassCard(cornerRadius: 22)
    }

    private var pickCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L.snapHints[mode]).font(.subheadline).foregroundStyle(Palette.ink2)
            if mode == 2 {
                TextField(L.snapSayHint, text: $desc, axis: .vertical)
                    .lineLimit(2...4)
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.white.opacity(0.06)))
                Button { run() } label: {
                    Label(L.snapGo, systemImage: "sparkles").font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassProminentButton()
                .disabled(desc.trimmingCharacters(in: .whitespaces).isEmpty)
            } else {
                HStack(spacing: 10) {
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button { camera = true } label: {
                            Label(L.snapCamera, systemImage: "camera.fill").font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                        }
                        .glassProminentButton()
                    }
                    PhotosPicker(selection: $photo, matching: .images) {
                        Label(L.snapAlbum, systemImage: "photo.on.rectangle").font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassButton()
                }
            }
        }
        .padding(16)
        .glassCard(cornerRadius: 22)
    }

    private func resultCard(_ r: SnapResult) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if !r.note.isEmpty { Text(r.note).font(.subheadline).foregroundStyle(Palette.ink2) }
            ForEach(r.warn ?? [], id: \.self) { w in
                Label(w, systemImage: "exclamationmark.triangle.fill").font(.caption).foregroundStyle(Color(hex: 0xffb35c))
            }
            ForEach(Array(r.items.enumerated()), id: \.element.id) { i, it in
                let on = picked.contains(it.id)
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        if on { picked.remove(it.id) } else { picked.insert(it.id) }
                    }
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().strokeBorder(on ? Color.clear : Color(hex: 0x4a4a4e), lineWidth: 1.6)
                            if on {
                                Circle().fill(Color(hex: 0xe8434c))
                                Image(systemName: "checkmark").font(.system(size: 11, weight: .heavy)).foregroundStyle(.white)
                                    .transition(.scale(scale: 0.3).combined(with: .opacity))
                            }
                        }
                        .frame(width: 24, height: 24)
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(it.n).font(.subheadline.weight(.bold))
                                if it.label == true || it.pack == true { tag(L.snapFromLabel) }
                                else if it.sure < 0.5 { tag(L.snapUnsure) }
                                if it.match != nil { tag(L.snapInLib) }
                            }
                            Text("\(Fmt.one(it.qty)) × \(it.u) · 蛋白 \(Fmt.one(it.p * it.qty)) g").font(.caption).foregroundStyle(Palette.ink2)
                        }
                        Spacer(minLength: 6)
                        Text("\(Fmt.n(it.k * it.qty)) kcal").font(.subheadline.weight(.heavy)).monospacedDigit()
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(on ? Color(hex: 0x2a1214) : Color.white.opacity(0.05)))
                    .contentShape(Rectangle())
                }
                .buttonStyle(PressScale())
                .appear(i)
            }
            if !r.items.isEmpty {
                Picker("", selection: $slot) {
                    ForEach(slots, id: \.self) { s in Text(slotName(s)).tag(s) }
                }
                .pickerStyle(.segmented)
                Toggle(L.snapAte, isOn: $ate)
                Button {
                    let chosen = r.items.filter { picked.contains($0.id) }
                    Task {
                        await model.snapSave(chosen, slot: slot, ate: ate)
                        dismiss()
                    }
                } label: {
                    Text(L.snapSave(picked.count)).font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassProminentButton()
                .disabled(picked.isEmpty)
            }
            Button { withAnimation(Motion.quick) { phase = 0; result = nil } } label: {
                Text(L.snapAgain).font(.subheadline).frame(maxWidth: .infinity)
            }
            .glassButton()
        }
        .padding(16)
        .glassCard(cornerRadius: 22)
    }

    private func tag(_ s: String) -> some View {
        Text(s).font(.caption2.weight(.bold)).foregroundStyle(pink)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(Capsule().fill(Color(hex: 0x2a1214)))
    }

    private func run() {
        err = nil
        withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) { phase = 1 }
        let m = mode, imgs = images, d = desc
        job = Task {
            do {
                let r = try await model.snap(mode: m, images: m == 2 ? [] : imgs, desc: d)
                guard !Task.isCancelled else { return }
                withAnimation(.spring(response: 0.5, dampingFraction: 0.88)) {
                    result = r
                    picked = Set(r.items.map(\.id))
                    phase = 2
                }
                if r.items.isEmpty { err = r.note.isEmpty ? L.snapNothing : r.note }
            } catch {
                guard !Task.isCancelled else { return }
                withAnimation(Motion.quick) { phase = 0 }
                err = error.localizedDescription
            }
        }
    }
}

/// 正在认：照片上一道暖光慢慢扫过去
private struct ScanCard: View {
    let image: UIImage?
    var stop: () -> Void
    @State private var start = Date()

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                if let image {
                    Image(uiImage: image).resizable().scaledToFill()
                } else {
                    Color.white.opacity(0.04)
                }
                TimelineView(.animation) { tl in
                    let t = tl.date.timeIntervalSince(start)
                    let p = (sin(t * 2 * .pi / 1.8) + 1) / 2
                    GeometryReader { g in
                        LinearGradient(colors: [.clear, Color(hex: 0xffb08a).opacity(0.55), .clear], startPoint: .top, endPoint: .bottom)
                            .frame(height: 90)
                            .offset(y: -45 + p * g.size.height)
                            .blendMode(.plusLighter)
                    }
                }
            }
            .frame(height: 220)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            HStack(spacing: 8) {
                ProgressView()
                Text(L.snapReading).font(.subheadline.weight(.semibold))
            }
            Button(L.snapStop, action: stop).font(.subheadline)
        }
        .padding(16)
        .glassCard(cornerRadius: 22)
    }
}

/// 打开相机拍一张
struct CameraPicker: UIViewControllerRepresentable {
    var onPick: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let c = UIImagePickerController()
        c.sourceType = .camera
        c.delegate = context.coordinator
        return c
    }

    func updateUIViewController(_ vc: UIImagePickerController, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ p: CameraPicker) { parent = p }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let img = info[.originalImage] as? UIImage { parent.onPick(img) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}

// MARK: - AI 设置

struct AISettingsSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var info: AIInfo?
    @State private var provider = "zhipu"
    @State private var key = ""
    @State private var base = ""
    @State private var textModel = ""
    @State private var vmodel = ""

    var body: some View {
        let p = info?.providers.first { $0.id == provider }
        SheetFrame(title: L.aiSetTitle) {
            Text(L.aiSetSub).font(.subheadline).foregroundStyle(Palette.ink2)
            VStack(alignment: .leading, spacing: 12) {
                Picker(L.aiProvider, selection: $provider) {
                    ForEach(info?.providers ?? []) { pr in Text(pr.n).tag(pr.id) }
                }
                .pickerStyle(.menu)
                SecureField(L.aiKey, text: $key)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                if provider == "custom" {
                    TextField(L.aiBase, text: $base)
                        .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
                        .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                    TextField(L.aiModel, text: $textModel)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                }
                TextField(p.map { $0.vmodel.isEmpty ? L.aiNoVisionHere : L.aiVisionDefault($0.vmodel) } ?? L.aiVModel, text: $vmodel)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .padding(.horizontal, 14).padding(.vertical, 10).glassCapsule(interactive: false)
                if let site = p?.site, !site.isEmpty, let url = URL(string: "https://" + site) {
                    Link(destination: url) { Label(L.aiGetKey(site), systemImage: "arrow.up.right.square").font(.caption.weight(.semibold)) }
                }
                Button {
                    Task {
                        var patch: [String: Any] = ["provider": provider, "key": key.trimmingCharacters(in: .whitespaces), "vmodel": vmodel.trimmingCharacters(in: .whitespaces)]
                        if provider == "custom" { patch["base"] = base; patch["model"] = textModel }
                        await model.setAI(patch)
                        model.say(L.aiSaved)
                        dismiss()
                    }
                } label: {
                    Text(L.aiSave).font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassProminentButton()
            }
            .padding(16)
            .glassCard(cornerRadius: 22)
            Text(L.aiRecommend).font(.caption).foregroundStyle(Palette.ink2)
            Text(L.aiKeyPrivacy).font(.caption).foregroundStyle(Palette.ink3)
        }
        .onAppear {
            let i = model.aiInfo()
            info = i
            if let i {
                provider = i.providers.contains { $0.id == i.provider } ? i.provider : "zhipu"
                key = i.key
                base = i.base
                textModel = i.model
                vmodel = i.vmodel
            }
        }
    }
}
