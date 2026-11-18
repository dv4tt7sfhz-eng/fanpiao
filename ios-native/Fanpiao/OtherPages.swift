import SwiftUI
import UIKit
import Charts

// 排餐、发现、我的三页：照 Norg 可点预览的「训练 / 发现 / 我的」，只换字。

/// 标志 + 名字（排餐页、发现页顶上那一行左边）
struct BrandMark: View {
    var body: some View {
        HStack(spacing: 0) {
            NI.logo().frame(width: 25, height: 28)
            T(L.brand, 28, .heavy, .white, track: -1).padding(.leading, 4)
        }
    }
}

/// 一页可以上下滑的设计稿
struct DesignPage<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ZStack {
            hx(0x0c0a0b).ignoresSafeArea()
            ScrollView(.vertical) {
                DesignScaled { content }
            }
            .scrollIndicators(.hidden)
            .ignoresSafeArea()
        }
    }
}

// MARK: - 排餐（预览里的「训练」）

struct PlanPage: View {
    @Environment(AppModel.self) private var model
    @Environment(UIState.self) private var ui
    @Environment(TodayMotion.self) private var m
    @State private var vm: PlansVM?
    @State private var open = true

    var body: some View {
        let hasItems = !(model.home?.meals.flatMap(\.items).isEmpty ?? true)
        DesignPage {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    BrandMark()
                    Spacer(minLength: 0)
                    ProBadge()
                    Streak(n: Int(model.stats?.streak ?? 0)).padding(.leading, 13)
                }
                .frame(height: 28)

                T(L.planTitle, 28, .black).frame(height: 34).padding(.top, 40)

                HStack(spacing: 10) {
                    tile(NI.clipboard(), 16, 20, L.planNew) { newRecipe() }
                    tile(NI.sparkles(), 18, 20, L.planPhoto) { model.route = .importAI }
                }
                .padding(.top, 23)

                Button {
                    model.route = .addFood(Route.guessSlot(), false)
                } label: {
                    HStack(spacing: 12) {
                        NI.plus(.white, 2.2).frame(width: 16, height: 16)
                        T(hasItems ? L.planContinue : L.planBlank, 14, .semibold)
                    }
                    .padding(.leading, 20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frame(height: 46)
                    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(hx(0x1a1a1c)))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.top, 10)

                HStack(spacing: 0) {
                    Button {
                        withAnimation(Motion.quick) { open.toggle() }
                    } label: {
                        HStack(spacing: 10) {
                            NI.chevronDown(hx(0x8a8a8e), 2.6).frame(width: 13, height: 13)
                                .rotationEffect(.degrees(open ? 0 : -90))
                            T(L.planList, 18, .heavy)
                            T(vm.map { String($0.plans.count) } ?? L.planCount, 13, .regular, hx(0x6a6a6e))
                        }
                        .frame(minHeight: 36)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    Spacer(minLength: 0)
                    Button {
                        model.route = .foods
                    } label: {
                        HStack(spacing: 8) {
                            NI.books().frame(width: 18, height: 16)
                            T(L.planLib, 14)
                        }
                        .frame(minHeight: 36)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 22)

                if let vm {
                    if open {
                        VStack(spacing: 10) {
                            ForEach(vm.plans) { p in
                                PlanCard(p: p, current: p.id == vm.cur, rhythm: p.id == vm.cur ? vm.rhythm : []) { pick(p) }
                            }
                        }
                        .padding(.top, 12)
                    }
                } else {
                    VStack(spacing: 0) {
                        NI.clipboardBig().frame(width: 27, height: 36)
                        T(L.planEmpty, 17, .heavy).padding(.top, 16).padding(.bottom, 10)
                        T(L.planEmptySub, 13, .regular, hx(0x8a8a8e))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 52)
                }

                Color.clear.frame(height: 110)
            }
            .padding(.top, 77)
            .padding(.horizontal, 20)
        }
        .task { vm = await model.plans() }
    }

    /// 新食谱：回到今天，让饭票重新排一份，再打开三餐整页
    private func newRecipe() {
        Task {
            await model.setDay(0)
            await model.replan()
            ui.tab = 0
            try? await Task.sleep(for: .milliseconds(450))
            m.openSheet()
        }
    }

    private func pick(_ p: PlanInfo) {
        guard p.simple else { model.say("「\(p.n)」" + L.planLocked); return }
        Task {
            await model.setPlan(p.id)
            vm = await model.plans()
            model.say(L.planSwitched(p.n))
        }
    }

    private func tile(_ icon: Icon, _ w: CGFloat, _ h: CGFloat, _ text: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                icon.frame(width: w, height: h)
                T(text, 14, .semibold)
            }
            .padding(.leading, 20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: 52)
            .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(hx(0x1a1a1c)))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// 我的食谱里的一张：名字、标签、说明；正在用的那张多一排两周的高中低碳
struct PlanCard: View {
    let p: PlanInfo
    let current: Bool
    let rhythm: [RhythmDay]
    var tap: () -> Void

    var body: some View {
        Button(action: tap) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    T(p.n, 15, .heavy)
                    T(p.tag, 11, .semibold, hx(0xf04d58))
                    Spacer(minLength: 0)
                    if current {
                        T(L.planCurrent, 11, .bold, hx(0x1a0608))
                            .padding(.horizontal, 8).frame(height: 20)
                            .background(Capsule().fill(hx(0xe8434c)))
                    } else {
                        NI.chevronRight().frame(width: 8, height: 12)
                    }
                }
                T(p.d, 12, .regular, hx(0x8a8a8e))
                    .fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.leading)
                if !rhythm.isEmpty {
                    T(L.planRhythm, 11, .bold, hx(0x6a6a6e)).padding(.top, 6)
                    RhythmStrip(days: rhythm)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(current ? hx(0x1e1214) : hx(0x1a1a1c)))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .circular).strokeBorder(current ? hx(0x7a2228) : Color.clear, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 发现

struct FindPage: View {
    @Environment(AppModel.self) private var model
    @State private var feed = 0
    @AppStorage("fp.poll") private var vote = -1
    @State private var liked: Set<Int> = []

    private let red = hx(0xf04d58)

    var body: some View {
        DesignPage {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    BrandMark()
                    Spacer(minLength: 0)
                    Button {
                        model.route = .foods
                    } label: {
                        NI.search().frame(width: 21, height: 21).frame(width: 36, height: 36)
                    }
                    .buttonStyle(.plain)
                    Button {
                        model.route = .notice
                    } label: {
                        NI.bell().frame(width: 20, height: 22).frame(width: 36, height: 36)
                    }
                    .buttonStyle(.plain)
                    .padding(.leading, 14)
                }
                .frame(height: 28)
                .padding(.horizontal, 18)

                HStack(spacing: 28) {
                    ForEach(0..<L.feedTabs.count, id: \.self) { i in
                        Button {
                            withAnimation(Motion.quick) { feed = i }
                        } label: {
                            T(L.feedTabs[i], 18, .heavy, feed == i ? .white : hx(0x55555a)).frame(minHeight: 32)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 26)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)

                Group {
                    if feed == 0 {
                        recommend
                    } else if feed == 1 {
                        friends
                    } else {
                        ThemeList().padding(.horizontal, 4)
                    }
                }
                .padding(.horizontal, 14)

                Color.clear.frame(height: 110)
            }
            .padding(.top, 77)
        }
    }

    // 推荐：官方投票、我的今日饭票、学堂科普
    private var recommend: some View {
        VStack(alignment: .leading, spacing: 0) {
            officialHeader(L.officialMeta)
            pollCard.padding(.top, 12)
            actions(100).padding(.top, 8).padding(.bottom, 26)
            if let h = model.home, !h.meals.flatMap(\.items).isEmpty {
                postHeader
                T(L.myPostTitle(h.planned.p), 18, .heavy).padding(.top, 14).padding(.horizontal, 2).padding(.bottom, 12)
                media(h)
                actions(101).padding(.top, 8).padding(.bottom, 26)
            }
            ForEach(Lore.articles.prefix(5)) { a in
                officialHeader(a.tag + " · " + L.officialMetaTip)
                Button {
                    model.route = .article(a.id)
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        T(a.title, 18, .heavy)
                        T(a.summary, 13.5, .regular, hx(0xb8b8bc))
                            .fixedSize(horizontal: false, vertical: true)
                            .multilineTextAlignment(.leading)
                        T(L.readMore, 13, .semibold, red)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(hx(0x121214)))
                    .overlay(RoundedRectangle(cornerRadius: 20, style: .circular).strokeBorder(hx(0x222226), lineWidth: 1))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.top, 12)
                actions(a.id).padding(.top, 8).padding(.bottom, 26)
            }
        }
    }

    private var friends: some View {
        VStack(spacing: 8) {
            NI.stickFigure().frame(width: 34, height: 34)
            T(L.friendsEmpty, 20, .black, hx(0x4a4a4e))
            T(L.friendsEmptySub, 12, .regular, hx(0x8a8a8e))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 220)
        .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(hx(0x121214)))
    }

    private func officialHeader(_ meta: String) -> some View {
        HStack(spacing: 10) {
            T(L.officialAvatar, 12, .bold)
                .frame(width: 32, height: 32)
                .background(Circle().fill(hx(0x1c1c1f)))
            VStack(alignment: .leading, spacing: 2) {
                T(L.officialName, 14, .semibold)
                T(meta, 11, .regular, hx(0x8a8a8e))
            }
            Spacer(minLength: 0)
            moreButton
        }
    }

    private var moreButton: some View {
        Button {
            model.route = .school
        } label: {
            NI.dots().frame(width: 20, height: 6).frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
    }

    // 投票只存在这台手机上：投了以后显示你的选择和一句小知识
    private var pollCard: some View {
        let voted = vote >= 0 && vote < L.pollOptions.count
        return VStack(alignment: .leading, spacing: 0) {
            T(L.pollTitle, 18, .heavy).padding(.bottom, 14)
            VStack(spacing: 10) {
                ForEach(0..<L.pollOptions.count, id: \.self) { i in
                    option(i, pct: voted ? (vote == i ? 100 : 0) : nil)
                }
            }
            if voted {
                T(L.pollTips[vote], 12.5, .regular, hx(0xc8c8cc))
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 12)
            }
            HStack {
                T("\(voted ? 1 : 0) \(L.pollJoined)", 12, .regular, hx(0x6e6e72))
                Spacer()
                T(voted ? L.pollVoted : L.pollPick, 12, .regular, hx(0x6e6e72))
            }
            .padding(.top, 14)
        }
        .padding(EdgeInsets(top: 16, leading: 16, bottom: 14, trailing: 16))
        .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(hx(0x121214)))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .circular).strokeBorder(hx(0x222226), lineWidth: 1))
    }

    private func option(_ i: Int, pct: Int?) -> some View {
        let picked = vote == i
        let barW: CGFloat = 292
        let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
        return Button {
            withAnimation(Motion.quick) { vote = i }
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    if picked {
                        Circle().fill(hx(0xe8434c))
                        NI.check().frame(width: 12, height: 12)
                    } else {
                        Circle().strokeBorder(hx(0x4a4a4e), lineWidth: 1.6)
                    }
                }
                .frame(width: 24, height: 24)
                ZStack(alignment: .leading) {
                    shape.fill(picked ? hx(0x1a1214) : hx(0x1e1e21))
                    shape.fill(picked ? hx(0x9a333c) : hx(0x2e2e32))
                        .frame(width: barW * CGFloat(pct ?? 0) / 100)
                    HStack(spacing: 8) {
                        T(L.pollOptions[i], 15, .semibold).frame(maxWidth: .infinity, alignment: .leading)
                        if let pct { T("\(pct)%", 15, .bold, hx(0xd8d8dc)) }
                    }
                    .padding(.horizontal, 14)
                }
                .frame(height: 48)
                .clipShape(shape)
                .overlay(shape.strokeBorder(picked ? hx(0x4a1c22) : hx(0x26262a), lineWidth: 1))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func actions(_ id: Int) -> some View {
        let on = liked.contains(id)
        return HStack(spacing: 10) {
            Button {
                if on { liked.remove(id) } else { liked.insert(id) }
            } label: {
                NI.heart(fill: on ? red : nil, stroke: on ? red : .white)
                    .frame(width: 25, height: 23).frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
            .sensoryFeedback(.impact(weight: .light), trigger: on)
            Button {
                model.route = id < 100 ? .article(id) : .school
            } label: {
                NI.comment().frame(width: 27, height: 24).frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            ShareLink(item: id < Lore.articles.count ? Lore.articles[id].title + "\n" + Lore.articles[id].summary : L.brand) {
                NI.send().frame(width: 25, height: 25).frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
        }
    }

    private var postHeader: some View {
        HStack(spacing: 12) {
            T(L.meAvatar, 15, .heavy, hx(0x111111))
                .frame(width: 40, height: 40)
                .background(Circle().fill(RadialGradient(colors: [hx(0xf2f2f2), hx(0x9a9a9e)], center: UnitPoint(x: 0.4, y: 0.35), startRadius: 0, endRadius: 35)))
            VStack(alignment: .leading, spacing: 2) {
                T(L.myPostName, 16, .medium)
                T(L.myPostTime, 11, .regular, hx(0x8a8a8e))
            }
            Spacer(minLength: 0)
            Button {
                model.route = .records
            } label: {
                NI.dots().frame(width: 20, height: 6).frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
        }
    }

    private func media(_ h: HomeVM) -> some View {
        let items = h.meals.flatMap(\.items)
        let mealsN = h.meals.filter { !$0.items.isEmpty }.count
        let chips = L.myPostChips(mealsN, h.planned.kcal, items.count, Int(model.stats?.streak ?? 0))
        return ZStack(alignment: .topLeading) {
            LinearGradient(colors: [hx(0x1e1f24), hx(0x131417)], startPoint: .top, endPoint: .bottom)
            HStack(spacing: 28) {
                NI.figure(false).frame(width: 66, height: 170)
                NI.figure(true).frame(width: 66, height: 170)
            }
            .opacity(0.6)
            .at(30, 20)
            HStack(spacing: 8) {
                ForEach(0..<chips.count, id: \.self) { i in
                    if i > 0 { T("|", 12, .semibold, hx(0x4a4a4e)) }
                    T(chips[i], 12, .semibold)
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 30)
            .background(Capsule().fill(rgba(28, 28, 30, 0.95)))
            .at(0, 12)
        }
        .overlay(alignment: .topTrailing) {
            VStack(alignment: .trailing, spacing: 0) {
                T(Fmt.n(h.planned.kcal), 22, .black, hx(0xe8e2d4))
                T(L.postStatALabel, 9, .regular, hx(0xa5a5aa))
                T(Fmt.n(h.planned.p), 22, .black, hx(0xe8e2d4)).padding(.top, 18)
                T(L.postStatBLabel, 9, .regular, hx(0xa5a5aa))
            }
            .padding(.top, 2)
            .padding(.trailing, 16)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .circular))
        .contentShape(Rectangle())
        .onTapGesture { model.route = .records }
    }
}

// MARK: - 我的

struct MePage: View {
    @Environment(AppModel.self) private var model
    @State private var rec: RecordsVM?

    var body: some View {
        let st = model.stats
        let stats = [Fmt.n(st?.days ?? 0), Fmt.n(st?.streak ?? 0), Fmt.n(st?.weights ?? 0)]
        let badges = Lore.badges(st).filter(\.got).count
        DesignPage {
            VStack(spacing: 0) {
                VStack(spacing: 0) {
                    ZStack {
                        Circle().fill(rgba(36, 34, 36, 0.8))
                        Circle().strokeBorder(Color.white.opacity(0.25), lineWidth: 1.5)
                        T(L.meAvatar, 30, .heavy)
                    }
                    .frame(width: 82, height: 82)
                    T(L.meName, 26, .black).padding(.top, 16)
                    HStack(alignment: .firstTextBaseline, spacing: 16) {
                        ForEach(0..<L.meStatLabels.count, id: \.self) { i in
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                T(stats[i], 16, .bold)
                                T(L.meStatLabels[i], 13, .regular, hx(0xc8c8cc))
                            }
                        }
                    }
                    .padding(.top, 12)
                    Button {
                        model.route = .profile
                    } label: {
                        T(bio, 13, .regular, hx(0x8a8a8e)).frame(minHeight: 32)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 294)

                HStack(spacing: 7) {
                    card(to: .level) {
                        VStack(spacing: 8) {
                            NI.diamond(hx(0x707076), hx(0x2a2a2e), hx(0xcfcfd2)).frame(width: 50, height: 54)
                            T(st?.level.name ?? L.meRank, 18, .black)
                        }
                    }
                    card(to: .achievements) {
                        VStack(spacing: 10) {
                            badgeStack
                            T(L.meBadgesN(badges), 12, .regular, hx(0xbdbdc2))
                        }
                    }
                    card(to: .records) {
                        VStack(spacing: 0) {
                            T(L.meMonth, 12, .regular, hx(0xbdbdc2))
                            HStack(alignment: .firstTextBaseline, spacing: 3) {
                                T(Fmt.n(st?.month ?? 0), 34, .heavy)
                                T(L.meMonthUnit, 12, .medium, hx(0xbdbdc2))
                            }
                            .padding(.vertical, 4)
                            T(L.meMonthTotalN(Int(st?.days ?? 0)), 10, .regular, hx(0x8a8a8e))
                        }
                    }
                }
                .padding(.top, 22)
                .padding(.horizontal, 23)

                HStack {
                    T(L.meFeed, 18, .heavy)
                    Spacer()
                    Button {
                        model.route = .records
                    } label: {
                        NI.grid().frame(width: 18, height: 18).frame(width: 32, height: 32)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 30)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)

                if let rec, rec.days.contains(where: { $0.e.kcal > 0 }) {
                    WeekBars(days: rec.days)
                        .padding(.horizontal, 16)
                        .onTapGesture { model.route = .records }
                } else {
                    VStack(spacing: 6) {
                        NI.stickFigure().frame(width: 34, height: 34)
                        T(L.meFeedEmpty, 20, .black, hx(0x4a4a4e))
                        T(L.meFeedEmptySub, 12, .regular, hx(0x8a8a8e))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 180)
                    .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(hx(0x121214)))
                    .padding(.horizontal, 16)
                }

                Color.clear.frame(height: 110)
            }
            .frame(width: 390)
            .background(alignment: .top) {
                LinearGradient(stops: [
                    .init(color: hx(0x4a161b), location: 0),
                    .init(color: hx(0x3a1015), location: 0.3),
                    .init(color: hx(0x1a0a0c), location: 0.55),
                    .init(color: hx(0x0a0a0b), location: 0.68),
                    .init(color: hx(0x0a0a0b), location: 1)
                ], startPoint: .top, endPoint: .bottom)
            }
            .overlay(alignment: .topLeading) {
                ZStack(alignment: .topLeading) {
                    if let img = UIImage(named: "me_bg") {
                        Image(uiImage: img)
                            .resizable()
                            .frame(width: 390, height: 240)
                            .mask(LinearGradient(stops: [
                                .init(color: .black, location: 0.7),
                                .init(color: .clear, location: 1)
                            ], startPoint: .top, endPoint: .bottom))
                            .at(0, 49)
                            .allowsHitTesting(false)
                    }
                    topButtons.at(233, 61)
                }
            }
        }
        .task(id: model.home?.eaten.kcal) { rec = await model.records(7) }
    }

    private var bio: String {
        guard let h = model.home, let p = h.profile else { return L.meBio }
        return L.meBioText(h.goalName, p.height ?? 0, p.weight ?? 0, h.T.kcal)
    }

    private func card<C: View>(to route: Route, @ViewBuilder _ content: () -> C) -> some View {
        Button {
            model.route = route
        } label: {
            content()
                .frame(maxWidth: .infinity)
                .frame(height: 123)
                .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(hx(0x121214)))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var badgeStack: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 3).fill(hx(0x29292c))
                .frame(width: 34, height: 54).rotationEffect(.degrees(-8)).at(3, 6)
            RoundedRectangle(cornerRadius: 3).fill(hx(0x29292c))
                .frame(width: 34, height: 54).rotationEffect(.degrees(8)).at(35, 6)
            ZStack {
                RoundedRectangle(cornerRadius: 3).fill(hx(0x313134))
                RoundedRectangle(cornerRadius: 3).strokeBorder(hx(0x444444), lineWidth: 1)
                T("+", 18, .regular, hx(0x8a8a8e))
            }
            .frame(width: 34, height: 56)
            .at(19, 0)
        }
        .frame(width: 72, height: 62, alignment: .topLeading)
    }

    private var topButtons: some View {
        HStack(spacing: 0) {
            Spacer(minLength: 0)
            Button {
                model.route = .themes
            } label: {
                NI.picture().frame(width: 22, height: 19).frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            Button {
                model.route = .profile
            } label: {
                NI.pencil(.white, 2.4).frame(width: 16, height: 16).frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            Button {
                model.route = .settings
            } label: {
                NI.gear().frame(width: 19, height: 19).frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 6)
        .frame(width: 133, height: 41)
        .background(Capsule().fill(rgba(40, 22, 26, 0.7)))
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
    }
}

/// 我的动态：最近 7 天每天吃了多少千卡，虚线是目标
struct WeekBars: View {
    let days: [DayRecord]
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            T(L.meWeekTitle, 14, .heavy)
            T(L.meWeekSub, 11, .regular, hx(0x8a8a8e))
            Chart {
                ForEach(days) { d in
                    BarMark(x: .value("日期", label(d.d)), y: .value("千卡", d.e.kcal))
                        .foregroundStyle(LinearGradient(colors: [hx(0x5a1418), hx(0xe5404a)], startPoint: .bottom, endPoint: .top))
                        .cornerRadius(4)
                }
                if let t = days.last?.T.kcal {
                    RuleMark(y: .value("目标", t))
                        .foregroundStyle(hx(0x8a8a8e))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                }
            }
            .chartYAxis(.hidden)
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel().foregroundStyle(hx(0x8a8a8e))
                }
            }
            .frame(height: 120)
            .padding(.top, 8)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(hx(0x121214)))
        .contentShape(Rectangle())
    }

    private func label(_ s: String) -> String {
        if s == AppModel.today { return L.todayShort }
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: s) else { return "" }
        return L.weekdays[Calendar(identifier: .gregorian).component(.weekday, from: d) - 1]
    }
}

