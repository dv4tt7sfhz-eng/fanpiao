import SwiftUI
import UIKit

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
    var body: some View {
        DesignPage {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    BrandMark()
                    Spacer(minLength: 0)
                    ProBadge()
                    Streak().padding(.leading, 13)
                }
                .frame(height: 28)

                T(L.planTitle, 28, .black).frame(height: 34).padding(.top, 40)

                HStack(spacing: 10) {
                    tile(NI.clipboard(), 16, 20, L.planNew)
                    tile(NI.sparkles(), 18, 20, L.planPhoto)
                }
                .padding(.top, 23)

                Button {
                } label: {
                    HStack(spacing: 12) {
                        NI.plus(.white, 2.2).frame(width: 16, height: 16)
                        T(L.planBlank, 14, .semibold)
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
                    HStack(spacing: 10) {
                        NI.chevronDown(hx(0x8a8a8e), 2.6).frame(width: 13, height: 13)
                        T(L.planList, 18, .heavy)
                        T(L.planCount, 13, .regular, hx(0x6a6a6e))
                    }
                    Spacer(minLength: 0)
                    Button {
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

                VStack(spacing: 0) {
                    NI.clipboardBig().frame(width: 27, height: 36)
                    T(L.planEmpty, 17, .heavy).padding(.top, 16).padding(.bottom, 10)
                    T(L.planEmptySub, 13, .regular, hx(0x8a8a8e))
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 52)

                Color.clear.frame(height: 110)
            }
            .padding(.top, 77)
            .padding(.horizontal, 20)
        }
    }

    private func tile(_ icon: Icon, _ w: CGFloat, _ h: CGFloat, _ text: String) -> some View {
        Button {
        } label: {
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

// MARK: - 发现

struct FindPage: View {
    @State private var feed = 0
    @State private var vote = 2
    @State private var liked = false

    private let red = hx(0xf04d58)

    var body: some View {
        DesignPage {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    BrandMark()
                    Spacer(minLength: 0)
                    Button {
                    } label: {
                        NI.search().frame(width: 21, height: 21).frame(width: 36, height: 36)
                    }
                    .buttonStyle(.plain)
                    Button {
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
                            feed = i
                        } label: {
                            T(L.feedTabs[i], 18, .heavy, feed == i ? .white : hx(0x55555a)).frame(minHeight: 32)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 26)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)

                VStack(alignment: .leading, spacing: 0) {
                    officialHeader
                    pollCard.padding(.top, 12)
                    actions.padding(.top, 8).padding(.bottom, 26)
                    postHeader
                    T(L.postTitle, 18, .heavy).padding(.top, 14).padding(.horizontal, 2).padding(.bottom, 12)
                    media
                }
                .padding(.horizontal, 14)

                Color.clear.frame(height: 110)
            }
            .padding(.top, 77)
        }
    }

    private var officialHeader: some View {
        HStack(spacing: 10) {
            T(L.officialAvatar, 12, .bold)
                .frame(width: 32, height: 32)
                .background(Circle().fill(hx(0x1c1c1f)))
            VStack(alignment: .leading, spacing: 2) {
                T(L.officialName, 14, .semibold)
                T(L.officialMeta, 11, .regular, hx(0x8a8a8e))
            }
            Spacer(minLength: 0)
            moreButton
        }
    }

    private var moreButton: some View {
        Button {
        } label: {
            NI.dots().frame(width: 20, height: 6).frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
    }

    private var pollCard: some View {
        let base = [8, 2, 10]
        let counts = base.indices.map { base[$0] + (vote == $0 ? 1 : 0) }
        let total = counts.reduce(0, +)
        return VStack(alignment: .leading, spacing: 0) {
            T(L.pollQuestion, 18, .heavy).padding(.bottom, 14)
            VStack(spacing: 10) {
                ForEach(0..<L.pollOptions.count, id: \.self) { i in
                    option(i, pct: Int((Double(counts[i]) * 100 / Double(total)).rounded()))
                }
            }
            HStack {
                T("\(total) \(L.pollJoined)", 12, .regular, hx(0x6e6e72))
                Spacer()
                T(L.pollVoted, 12, .regular, hx(0x6e6e72))
            }
            .padding(.top, 14)
        }
        .padding(EdgeInsets(top: 16, leading: 16, bottom: 14, trailing: 16))
        .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(hx(0x121214)))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .circular).strokeBorder(hx(0x222226), lineWidth: 1))
    }

    private func option(_ i: Int, pct: Int) -> some View {
        let picked = vote == i
        let barW: CGFloat = 292
        let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
        return Button {
            vote = i
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
                        .frame(width: barW * CGFloat(pct) / 100)
                    HStack(spacing: 8) {
                        T(L.pollOptions[i], 15, .semibold).frame(maxWidth: .infinity, alignment: .leading)
                        T("\(pct)%", 15, .bold, hx(0xd8d8dc))
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

    private var actions: some View {
        HStack(spacing: 10) {
            Button {
                liked.toggle()
            } label: {
                NI.heart(fill: liked ? red : nil, stroke: liked ? red : .white)
                    .frame(width: 25, height: 23).frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
            Button {
            } label: {
                NI.comment().frame(width: 27, height: 24).frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            Button {
            } label: {
                NI.send().frame(width: 25, height: 25).frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
        }
    }

    private var postHeader: some View {
        HStack(spacing: 12) {
            T(L.postAvatar, 15, .heavy, hx(0x111111))
                .frame(width: 40, height: 40)
                .background(Circle().fill(RadialGradient(colors: [hx(0xf2f2f2), hx(0x9a9a9e)], center: UnitPoint(x: 0.4, y: 0.35), startRadius: 0, endRadius: 35)))
            VStack(alignment: .leading, spacing: 2) {
                T(L.postName, 16, .medium)
                T(L.postTime, 11, .regular, hx(0x8a8a8e))
            }
            Spacer(minLength: 0)
            moreButton
        }
    }

    private var media: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient(colors: [hx(0x1e1f24), hx(0x131417)], startPoint: .top, endPoint: .bottom)
            HStack(spacing: 28) {
                NI.figure(false).frame(width: 66, height: 170)
                NI.figure(true).frame(width: 66, height: 170)
            }
            .opacity(0.6)
            .at(30, 20)
            HStack(spacing: 8) {
                ForEach(0..<L.postChips.count, id: \.self) { i in
                    if i > 0 { T("|", 12, .semibold, hx(0x4a4a4e)) }
                    T(L.postChips[i], 12, .semibold)
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 30)
            .background(Capsule().fill(rgba(28, 28, 30, 0.95)))
            .at(0, 12)
        }
        .overlay(alignment: .topTrailing) {
            VStack(alignment: .trailing, spacing: 0) {
                T(L.postStatA, 22, .black, hx(0xe8e2d4))
                T(L.postStatALabel, 9, .regular, hx(0xa5a5aa))
                T(L.postStatB, 22, .black, hx(0xe8e2d4)).padding(.top, 18)
                T(L.postStatBLabel, 9, .regular, hx(0xa5a5aa))
            }
            .padding(.top, 2)
            .padding(.trailing, 16)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .circular))
    }
}

// MARK: - 我的

struct MePage: View {
    var body: some View {
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
                        ForEach(0..<L.meStats.count, id: \.self) { i in
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                T(L.meStats[i].0, 16, .bold)
                                T(L.meStats[i].1, 13, .regular, hx(0xc8c8cc))
                            }
                        }
                    }
                    .padding(.top, 12)
                    Button {
                    } label: {
                        T(L.meBio, 13, .regular, hx(0x8a8a8e)).frame(minHeight: 32)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 8)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 294)

                HStack(spacing: 7) {
                    card {
                        VStack(spacing: 8) {
                            NI.diamond(hx(0x707076), hx(0x2a2a2e), hx(0xcfcfd2)).frame(width: 50, height: 54)
                            T(L.meRank, 18, .black)
                        }
                    }
                    card {
                        VStack(spacing: 10) {
                            badgeStack
                            T(L.meBadges, 12, .regular, hx(0xbdbdc2))
                        }
                    }
                    card {
                        VStack(spacing: 0) {
                            T(L.meMonth, 12, .regular, hx(0xbdbdc2))
                            HStack(alignment: .firstTextBaseline, spacing: 3) {
                                T(L.meMonthValue, 34, .heavy)
                                T(L.meMonthUnit, 12, .medium, hx(0xbdbdc2))
                            }
                            .padding(.vertical, 4)
                            T(L.meMonthTotal, 10, .regular, hx(0x8a8a8e))
                        }
                    }
                }
                .padding(.top, 22)
                .padding(.horizontal, 23)

                HStack {
                    T(L.meFeed, 18, .heavy)
                    Spacer()
                    Button {
                    } label: {
                        NI.grid().frame(width: 18, height: 18).frame(width: 32, height: 32)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 30)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)

                VStack(spacing: 6) {
                    NI.stickFigure().frame(width: 34, height: 34)
                    T(L.meFeedEmpty, 20, .black, hx(0x4a4a4e))
                    T(L.meFeedEmptySub, 12, .regular, hx(0x8a8a8e))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 180)
                .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(hx(0x121214)))
                .padding(.horizontal, 16)

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
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity)
            .frame(height: 123)
            .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(hx(0x121214)))
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
            } label: {
                NI.picture().frame(width: 22, height: 19).frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            Button {
            } label: {
                NI.pencil(.white, 2.4).frame(width: 16, height: 16).frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            Button {
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
