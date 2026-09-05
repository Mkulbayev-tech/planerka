import SwiftUI
import WidgetKit

// Четыре виджета из макета: Бюджет (средний), Планы и Накопления (маленькие), Обзор недели (большой).

struct Entry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, data: .sample) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, data: context.isPreview ? .sample : (WidgetData.load() ?? .sample)))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let entry = Entry(date: .now, data: WidgetData.load() ?? WidgetData())
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(3600))))
    }
}

// ---------- общие элементы ----------
struct Bar: View {
    let pct: Int; let track: Color; let fill: Color; var height: CGFloat = 6
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(track)
                Capsule().fill(fill).frame(width: max(0, min(1, CGFloat(pct) / 100)) * g.size.width)
            }
        }
        .frame(height: height)
    }
}

struct LetterBadge: View {
    let letter: String; let bg: Color; let fg: Color; var size: CGFloat = 20; var radius: CGFloat? = nil
    var body: some View {
        Text(letter).font(.system(size: size * 0.5, weight: .heavy)).foregroundStyle(fg)
            .frame(width: size, height: size).background(bg)
            .clipShape(RoundedRectangle(cornerRadius: radius ?? size / 2, style: .continuous))
    }
}

let accent = Color(hex: "#7A4AE0")
let green = Color(hex: "#2FA66F")
let darkCard = Color(hex: "#1C1A26")
let mutedDark = Color(hex: "#9D9AAA")

// ---------- Бюджет (средний) ----------
struct BudgetView: View {
    let d: WidgetData
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Остаток до зарплаты").font(.system(size: 11, weight: .bold)).opacity(0.8)
                    Text(d.balance).font(.system(size: 26, weight: .heavy)).lineLimit(1).minimumScaleFactor(0.6)
                }
                Spacer(minLength: 4)
                Text("₸").font(.system(size: 13, weight: .heavy))
                    .frame(width: 28, height: 28).background(Color.white.opacity(0.2))
                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            }
            Bar(pct: d.spentPct, track: .white.opacity(0.22), fill: .white)
            HStack {
                Text("Потрачено \(d.spent)")
                Spacer()
                Text("\(d.daysLeft) дн · \(d.perDay)/день")
            }
            .font(.system(size: 10, weight: .bold)).opacity(0.85).lineLimit(1).minimumScaleFactor(0.8)
            HStack(spacing: 6) {
                ForEach(Array(d.cats.prefix(3).enumerated()), id: \.offset) { _, c in
                    HStack(spacing: 6) {
                        LetterBadge(letter: c.letter, bg: Color(hex: c.bg), fg: Color(hex: c.color), size: 20)
                        VStack(alignment: .leading, spacing: 0) {
                            Text(c.name).font(.system(size: 9, weight: .bold)).opacity(0.8).lineLimit(1)
                            Text(c.spent).font(.system(size: 10, weight: .heavy)).lineLimit(1).minimumScaleFactor(0.8)
                        }
                    }
                    .padding(.horizontal, 8).padding(.vertical, 6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
            }
        }
        .foregroundStyle(.white)
        .padding(14)
    }
}

struct BudgetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaBudget", provider: Provider()) { entry in
            BudgetView(d: entry.data)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color(hex: "#9A6BF5"), Color(hex: "#7A4AE0"), Color(hex: "#5F35C4")], startPoint: .topTrailing, endPoint: .bottomLeading)
                }
        }
        .configurationDisplayName("Бюджет")
        .description("Остаток до зарплаты и главные категории")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

// ---------- Планы (маленький) ----------
struct PlanView: View {
    let d: WidgetData
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("План дня").font(.system(size: 11, weight: .bold)).foregroundStyle(mutedDark)
                Spacer()
                Text(d.taskRatio).font(.system(size: 11, weight: .heavy)).foregroundStyle(Color(hex: "#7EE2B0"))
            }
            if d.tasks.isEmpty {
                Text("Задач на сегодня нет").font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: "#7B7889"))
            }
            ForEach(Array(d.tasks.prefix(4).enumerated()), id: \.offset) { _, t in
                HStack(spacing: 7) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .fill(t.done ? green : Color.clear)
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .stroke(t.done ? green : Color(hex: "#3A3746"), lineWidth: 1.5)
                        if t.done { Image(systemName: "checkmark").font(.system(size: 8, weight: .heavy)).foregroundStyle(.white) }
                    }
                    .frame(width: 14, height: 14)
                    Text(t.name).font(.system(size: 11, weight: .bold)).lineLimit(1)
                        .strikethrough(t.done).foregroundStyle(t.done ? Color(hex: "#7B7889") : .white)
                }
            }
            Spacer(minLength: 0)
            Bar(pct: d.taskPct, track: Color(hex: "#2A2833"), fill: green, height: 5)
        }
        .padding(14)
    }
}

struct PlanWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaPlan", provider: Provider()) { entry in
            PlanView(d: entry.data).containerBackground(darkCard, for: .widget)
        }
        .configurationDisplayName("Планы")
        .description("Задачи на сегодня")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

// ---------- Накопления (маленький) ----------
struct GoalView: View {
    let d: WidgetData
    var body: some View {
        let ink = Color(hex: "#3A2600")
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Цель").font(.system(size: 11, weight: .heavy))
                Spacer()
                Text(d.goal?.letter ?? "+").font(.system(size: 11, weight: .heavy))
                    .frame(width: 24, height: 24).background(ink.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            Spacer(minLength: 0)
            Text(d.goal?.name ?? "Нет целей").font(.system(size: 12, weight: .bold)).opacity(0.8).lineLimit(1)
            Text("\(d.goal?.pct ?? 0)%").font(.system(size: 26, weight: .heavy))
            Spacer(minLength: 0)
            Bar(pct: d.goal?.pct ?? 0, track: ink.opacity(0.18), fill: ink)
            Text(d.goal.map { "\($0.saved) из \($0.target)" } ?? "Добавьте цель").font(.system(size: 10, weight: .bold)).opacity(0.85).lineLimit(1).minimumScaleFactor(0.8)
        }
        .foregroundStyle(ink)
        .padding(14)
    }
}

struct GoalWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaGoal", provider: Provider()) { entry in
            GoalView(d: entry.data)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color(hex: "#FFC46A"), Color(hex: "#F2A83B")], startPoint: .topTrailing, endPoint: .bottomLeading)
                }
        }
        .configurationDisplayName("Накопления")
        .description("Первая цель и её прогресс")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

// ---------- Обзор недели (большой) ----------
struct WeekView: View {
    let d: WidgetData
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Эта неделя").font(.system(size: 11, weight: .bold)).foregroundStyle(mutedDark)
                    Text(d.weekTotal).font(.system(size: 24, weight: .heavy)).lineLimit(1).minimumScaleFactor(0.6)
                }
                Spacer()
                if !d.weekDelta.isEmpty {
                    Text(d.weekDelta).font(.system(size: 10, weight: .heavy)).foregroundStyle(Color(hex: "#C9B5FF"))
                        .padding(.horizontal, 8).padding(.vertical, 4).background(Color(hex: "#2A2145"))
                        .clipShape(Capsule())
                }
            }
            HStack(alignment: .bottom, spacing: 7) {
                ForEach(Array(d.weekBars.enumerated()), id: \.offset) { _, b in
                    VStack(spacing: 4) {
                        GeometryReader { g in
                            VStack { Spacer(minLength: 0)
                                RoundedRectangle(cornerRadius: 5, style: .continuous)
                                    .fill(b.active ? accent : Color(hex: "#2E2C3A"))
                                    .frame(height: max(3, g.size.height * CGFloat(b.h) / 100))
                            }
                        }
                        Text(b.label).font(.system(size: 9, weight: .bold)).foregroundStyle(b.active ? .white : mutedDark)
                    }
                }
            }
            .frame(height: 64)
            Rectangle().fill(Color(hex: "#2A2833")).frame(height: 1)
            if d.txs.isEmpty {
                Text("Трат пока нет").font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: "#7B7889"))
            }
            ForEach(Array(d.txs.prefix(3).enumerated()), id: \.offset) { _, t in
                HStack(spacing: 8) {
                    LetterBadge(letter: t.letter, bg: Color(hex: t.bg), fg: Color(hex: t.color), size: 24, radius: 8)
                    Text(t.title).font(.system(size: 12, weight: .bold)).lineLimit(1)
                    Spacer()
                    Text("−\(t.amount)").font(.system(size: 12, weight: .heavy))
                }
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(16)
    }
}

struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaWeek", provider: Provider()) { entry in
            WeekView(d: entry.data).containerBackground(darkCard, for: .widget)
        }
        .configurationDisplayName("Обзор")
        .description("Траты недели и последние операции")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct PlanerkaWidgetBundle: WidgetBundle {
    var body: some Widget {
        BudgetWidget()
        PlanWidget()
        GoalWidget()
        WeekWidget()
    }
}
