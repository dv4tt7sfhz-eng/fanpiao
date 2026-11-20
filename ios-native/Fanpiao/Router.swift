import SwiftUI

/// 从 Norg 框架的按钮弹出来的页面
enum Route: Identifiable, Hashable {
    case addFood(String, Bool)
    case foods, plans, records, dietDetail, profile, importAI
    case school, achievements, level, themes, settings, weight, notice
    case stock, value, tea, snap, aiSettings, cycle, shareCard
    case article(Int)

    var id: String {
        switch self {
        case .addFood(let s, let d): return "add-\(s)-\(d)"
        case .article(let i): return "article-\(i)"
        default: return String(describing: self)
        }
    }

    /// 截图用：-fpRoute foods
    static func named(_ s: String) -> Route? {
        let all: [String: Route] = [
            "add": .addFood("l", false), "foods": .foods, "plans": .plans, "records": .records, "diet": .dietDetail,
            "profile": .profile, "ai": .importAI, "school": .school, "badges": .achievements, "level": .level,
            "themes": .themes, "settings": .settings, "weight": .weight, "notice": .notice, "article": .article(0),
            "stock": .stock, "value": .value, "tea": .tea, "snap": .snap, "aiset": .aiSettings, "cycle": .cycle, "share": .shareCard
        ]
        return all[s]
    }

    /// 按现在几点猜是哪一餐
    static func guessSlot() -> String {
        let h = Calendar.current.component(.hour, from: Date())
        return h < 10 ? "b" : h < 15 ? "l" : h < 20 ? "d" : "s"
    }
}

struct RouteView: View {
    let route: Route
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        content
            .tint(Accent.of(model.accent).tint)
            .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var content: some View {
        switch route {
        case .addFood(let slot, let done): AddFoodSheet(slot: slot, done: done)
        case .foods: FoodsView()
        case .plans: PlansSheet()
        case .records: RecordsView()
        case .dietDetail:
            NavigationStack {
                DietDetailView()
                    .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(L.done) { dismiss() } } }
            }
        case .profile: ProfileForm(isFirst: false)
        case .importAI: ImportSheet()
        case .school: SchoolSheet()
        case .achievements: BadgesSheet()
        case .level: LevelSheet()
        case .themes: ThemeSheet()
        case .settings: SettingsSheet()
        case .weight: WeightSheet()
        case .notice: NoticeSheet()
        case .stock: StockSheet()
        case .value: ValueSheet()
        case .tea: TeaSheet()
        case .snap: SnapSheet()
        case .aiSettings: AISettingsSheet()
        case .cycle: CycleSheet()
        case .shareCard: ShareCardSheet()
        case .article(let i): NavigationStack { ArticleView(a: Lore.articles[min(max(0, i), Lore.articles.count - 1)], closable: true) }
        }
    }
}

/// 顶上弹一下的提示
struct ToastView: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18).padding(.vertical, 12)
            .glassCapsule(interactive: false)
            .padding(.top, 8)
    }
}

// MARK: - 新页面从点的那个框里长出来

extension EnvironmentValues {
    @Entry var zoomNS: Namespace.ID? = nil
}

private struct ZoomSource: ViewModifier {
    let id: String
    @Environment(\.zoomNS) private var ns
    @ViewBuilder func body(content: Content) -> some View {
        if let ns { content.matchedTransitionSource(id: id, in: ns) } else { content }
    }
}

extension View {
    /// 点这个框打开 route 时，新页面从这个框放大出来；关掉时缩回这个框
    func zoomSource(_ route: Route) -> some View { modifier(ZoomSource(id: route.id)) }
}
