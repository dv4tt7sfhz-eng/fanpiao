import SwiftUI

@main
struct FanpiaoApp: App {
    @State private var model = AppModel()
    @State private var ui = UIState()
    @State private var motion = TodayMotion()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(ui)
                .environment(motion)
                .preferredColorScheme(.dark)
        }
    }
}

/// 整体框架照 Norg 可点预览：开场标志 → 四个标签页。底栏用苹果原生 TabView，iOS 26 上就是液态玻璃（按住拖动时的玻璃泡泡也是系统自带的）。
struct RootView: View {
    @Environment(UIState.self) private var ui
    @Environment(AppModel.self) private var model
    @State private var width: CGFloat = 390
    /// 新页面从点的那个框里长出来（iOS 18 的缩放转场）
    @Namespace private var zoom

    var body: some View {
        @Bindable var ui = ui
        @Bindable var model = model
        TabView(selection: $ui.tab) {
            Tab(L.tabToday, systemImage: "calendar", value: 0) {
                NavigationStack {
                    TodayPage()
                        .toolbar(.hidden, for: .navigationBar)
                }
            }
            Tab(L.tabPlan, systemImage: "dumbbell.fill", value: 1) {
                PlanPage()
            }
            Tab(L.tabFind, systemImage: "safari", value: 2) {
                FindPage()
            }
            Tab(L.tabMe, systemImage: "person.fill", value: 3) {
                MePage()
            }
        }
        .tint(Accent.of(model.accent).tint)
        .environment(\.designK, width / 390)
        .environment(\.zoomNS, zoom)
        .onGeometryChange(for: CGFloat.self) { proxy in
            proxy.size.width
        } action: { w in
            if w > 0 { width = w }
        }
        .background(hx(0x0c0a0b))
        .overlay(alignment: .top) {
            if let t = model.toast {
                ToastView(text: t)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .allowsHitTesting(false)
            }
        }
        .animation(Motion.quick, value: model.toast)
        .overlay {
            if let m = model.moment {
                MomentView(m: m) { model.moment = nil }
                    .id(m.id)
            }
        }
        .sheet(item: $model.route) { r in
            RouteView(route: r)
                .navigationTransition(.zoom(sourceID: r.id, in: zoom))
        }
        .fullScreenCover(isPresented: Binding(get: { !model.hasProfile && !ui.bootShow }, set: { _ in })) {
            WelcomeView()
                .environment(model)
                .preferredColorScheme(.dark)
                .overlay(alignment: .top) {
                    if let t = model.toast { ToastView(text: t).allowsHitTesting(false) }
                }
        }
        .overlay {
            if ui.bootShow {
                SplashView()
                    .opacity(ui.splashOpacity)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
            }
        }
        .task {
            if !LaunchArgs.has("-fpNoSplash") { ui.playBoot() }
            await model.refresh()
            // 隔了两天以上再打开：欢迎回来
            if let last = model.stats?.last, !last.isEmpty, AppModel.daysSince(last) >= 2 { model.show(.welcome) }
            if let k = LaunchArgs.value("-fpMoment"), let kind = MomentKind(rawValue: k) {
                try? await Task.sleep(for: .milliseconds(600))
                model.show(kind)
            }
            // 录屏用：依次从入口框里放大打开 囤货柜 → 每元蛋白 → 奶茶计算
            if LaunchArgs.has("-fpZoomDemo") {
                for r in [Route.stock, .value, .tea] {
                    try? await Task.sleep(for: .milliseconds(1600))
                    model.route = r
                    try? await Task.sleep(for: .milliseconds(2200))
                    model.route = nil
                }
            }
        }
        .onChange(of: model.hasProfile) { _, v in if v { Task { await model.refresh() } } }
    }
}

/// 开场：黑底 + 标志 + 名字
struct SplashView: View {
    var body: some View {
        ZStack {
            hx(0x0c0c0d)
            HStack(spacing: 8) {
                NI.logoSplash().frame(width: 44, height: 48)
                T(L.brand, 44, .heavy, .white, track: -1.5)
            }
        }
    }
}
