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
    @State private var width: CGFloat = 390

    var body: some View {
        @Bindable var ui = ui
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
        .tint(hx(0xf04d58))
        .environment(\.designK, width / 390)
        .onGeometryChange(for: CGFloat.self) { proxy in
            proxy.size.width
        } action: { w in
            if w > 0 { width = w }
        }
        .background(hx(0x0c0a0b))
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
        }
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
