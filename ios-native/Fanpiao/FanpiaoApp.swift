import SwiftUI

@main
struct FanpiaoApp: App {
    @State private var model = AppModel()
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        let accent = Accent.of(model.accent)
        ZStack(alignment: .top) {
            if model.hasProfile { MainTabs() } else { OnboardingView() }
            if let t = model.toast {
                Text(t)
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 18).padding(.vertical, 12)
                    .glassCapsule(interactive: false)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(10)
            }
        }
        .tint(accent.tint)
        .animation(.snappy, value: model.toast)
        .animation(.smooth, value: model.hasProfile)
    }
}

/// 底部 4 个标签：系统 TabView。iOS 26 上自动是液态玻璃的底栏，往下滑会缩小。
struct MainTabs: View {
    @Environment(AppModel.self) private var model
    @State private var tab: Int = {
        let a = ProcessInfo.processInfo.arguments
        if let i = a.firstIndex(of: "-fpTab"), i + 1 < a.count, let n = Int(a[i + 1]) { return n }
        return 0
    }()
    var body: some View {
        TabView(selection: $tab) {
            Tab("今天", systemImage: "fork.knife", value: 0) { TodayView() }
            Tab("食物", systemImage: "basket", value: 1) { FoodsView() }
            Tab("记录", systemImage: "chart.bar", value: 2) { RecordsView() }
            Tab("我的", systemImage: "person.crop.circle", value: 3) { MeView() }
        }
        .minimizeTabBarOnScroll()
    }
}
