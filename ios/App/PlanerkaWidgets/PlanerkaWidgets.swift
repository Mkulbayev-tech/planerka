import SwiftUI
import WidgetKit

// Виджеты из макета «Семейный бюджет» (шаг 4):
//   Бюджет    — маленький «Можно потратить», средний «потрачено + быстрые кнопки», экран блокировки: кольцо и строка у даты
//   Планёрка  — маленький «Дела сегодня», большой список дня, экран блокировки: кружок «2/5»
//   Месяц     — средний: пришло / ушло / осталось и дела месяца
//   Платёж    — маленький «Скоро платёж», экран блокировки: прямоугольник
//   Цель      — маленький с кольцом;  Обзор — большой: траты недели
// Нажатия ведут в приложение по ссылкам planerka://open/… (см. src/store.jsx).

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
        let data = WidgetData.load() ?? WidgetData()
        let cal = Calendar.current
        let start = cal.startOfDay(for: .now)
        // сейчас и две ближайшие полуночи: в новый день виджет сам покажет его дела и пересчитает «через N дней»
        var entries = [Entry(date: .now, data: data)]
        for i in 1...2 { if let d = cal.date(byAdding: .day, value: i, to: start) { entries.append(Entry(date: d, data: data)) } }
        completion(Timeline(entries: entries, policy: .after(Date().addingTimeInterval(3600))))
    }
}

// ---------- цвета и общие элементы ----------
let gold = Color(hex: "#E8B85A")
let green = Color(hex: "#8FCBA3")
let red = Color(hex: "#EE8669")
let card = Color(hex: "#1C1C1C")
let ink = Color(hex: "#131313")
let muted = Color(hex: "#9C9890")
let line = Color(hex: "#2E2E2E")
let sand = Color(hex: "#F3F1EC")
let tile = Color(hex: "#262626")

func display(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy).width(.expanded) }
func link(_ path: String) -> URL { URL(string: "planerka://open/\(path)")! }

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

// Полоса долей категорий
struct SplitBar: View {
    let parts: [WPart]; var height: CGFloat = 5
    var body: some View {
        GeometryReader { g in
            let total = max(1, parts.reduce(0) { $0 + $1.v })
            let gaps = CGFloat(max(0, parts.count - 1)) * 2
            HStack(spacing: 2) {
                if parts.isEmpty { Capsule().fill(line) }
                ForEach(Array(parts.enumerated()), id: \.offset) { _, p in
                    Capsule().fill(Color(hex: p.color)).frame(width: max(3, (g.size.width - gaps) * CGFloat(p.v / total)))
                }
            }
        }
        .frame(height: height)
    }
}

// Шкала дел: по сегменту на дело
struct SegBar: View {
    let done: Int; let total: Int
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<max(1, min(total, 12)), id: \.self) { i in Capsule().fill(i < done ? gold : line) }
        }
        .frame(height: 3)
    }
}

struct CheckMark: View {
    let done: Bool; let hot: Bool; var size: CGFloat = 15; var round = false
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: round ? size / 2 : 4, style: .continuous).fill(done ? gold : Color.clear)
            RoundedRectangle(cornerRadius: round ? size / 2 : 4, style: .continuous).stroke(done || hot ? gold : Color(hex: "#4A4A4A"), lineWidth: 1.4)
            if done { Image(systemName: "checkmark").font(.system(size: size * 0.5, weight: .heavy)).foregroundStyle(ink) }
        }
        .frame(width: size, height: size)
    }
}

struct Ring: View {
    let pct: Int; var size: CGFloat = 54; var width: CGFloat = 6
    var body: some View {
        ZStack {
            Circle().stroke(line, lineWidth: width)
            Circle().trim(from: 0, to: max(0.001, min(1, CGFloat(pct) / 100))).stroke(gold, style: StrokeStyle(lineWidth: width, lineCap: .round)).rotationEffect(.degrees(-90))
            Text("\(pct)%").font(.system(size: size * 0.24, weight: .bold)).foregroundStyle(sand)
        }
        .frame(width: size, height: size)
    }
}

// ---------- Бюджет ----------
struct BudgetSmall: View {
    let d: WidgetData
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Можно потратить").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
            Spacer(minLength: 0)
            Text(d.balance).font(display(19)).foregroundStyle(gold).lineLimit(1).minimumScaleFactor(0.55)
            Text("≈ \(d.perDay) в день").font(.system(size: 11, weight: .semibold)).foregroundStyle(sand).lineLimit(1).minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            Bar(pct: d.spentPct, track: line, fill: gold, height: 4)
        }
        .padding(14)
        .widgetURL(link("home"))
    }
}

struct QuickButton: View {
    let title: String; let symbol: String; var filled = false; var tint: Color = sand; let path: String
    var body: some View {
        Link(destination: link(path)) {
            VStack(spacing: 4) {
                Image(systemName: symbol).font(.system(size: 13, weight: .bold)).foregroundStyle(filled ? ink : tint)
                Text(title).font(.system(size: 10, weight: .semibold)).foregroundStyle(filled ? ink : sand)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(filled ? gold : tile)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

struct BudgetMedium: View {
    let d: WidgetData
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(d.monthName.isEmpty ? "Потрачено" : "\(d.monthName) · потрачено").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
                Spacer(minLength: 0)
                Text(d.spent).font(display(21)).foregroundStyle(sand).lineLimit(1).minimumScaleFactor(0.55)
                Text(d.hasBudget ? "из \(d.budgetTotal)" : "осталось \(d.balance)").font(.system(size: 11, weight: .medium)).foregroundStyle(muted).lineLimit(1)
                Spacer(minLength: 0)
                SplitBar(parts: d.split)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(spacing: 6) {
                HStack(spacing: 6) {
                    QuickButton(title: "Расход", symbol: "plus", filled: true, path: "expense")
                    QuickButton(title: "Доход", symbol: "plus", tint: green, path: "income")
                }
                HStack(spacing: 6) {
                    QuickButton(title: "Дело", symbol: "checklist", path: "chore")
                    QuickButton(title: "Отчёт", symbol: "chart.bar.fill", path: "report")
                }
            }
            .frame(width: 118)
        }
        .padding(14)
    }
}

struct BudgetCircular: View {
    let d: WidgetData
    var body: some View {
        let pct = d.hasBudget ? d.budgetPct : d.spentPct
        return Gauge(value: Double(max(0, min(100, pct))) / 100) { Text("₸") } currentValueLabel: {
            Text("\(pct)%").font(.system(size: 13, weight: .bold))
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetURL(link("home"))
    }
}

struct BudgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry
    var body: some View {
        switch family {
        case .systemMedium: BudgetMedium(d: entry.data)
        case .accessoryCircular: BudgetCircular(d: entry.data)
        case .accessoryInline: Text("₸ \(entry.data.perDayPlain.isEmpty ? entry.data.perDay : entry.data.perDayPlain) на сегодня")
        default: BudgetSmall(d: entry.data)
        }
    }
}

struct BudgetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaBudget", provider: Provider()) { entry in
            BudgetEntryView(entry: entry).foregroundStyle(sand).containerBackground(card, for: .widget)
        }
        .configurationDisplayName("Бюджет")
        .description("Сколько можно потратить, траты месяца и быстрые кнопки")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryInline])
        .contentMarginsDisabled()
    }
}

// ---------- Планёрка ----------
struct PlanSmall: View {
    let day: WDay
    var body: some View {
        // сначала несделанные — на маленьком виджете важнее, что осталось
        let rows = Array((day.rows.filter { !$0.done } + day.rows.filter { $0.done }).prefix(4))
        return VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text("Дела сегодня").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
                Spacer()
                Text("\(day.done)/\(day.total)").font(.system(size: 11, weight: .bold)).foregroundStyle(gold)
            }
            if rows.isEmpty { Text("На сегодня дел нет").font(.system(size: 11, weight: .medium)).foregroundStyle(muted) }
            ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
                HStack(spacing: 7) {
                    CheckMark(done: r.done, hot: r.hot, size: 13, round: true)
                    Text(r.hot && !r.time.isEmpty ? "\(r.name) · \(r.time)" : r.name).font(.system(size: 11, weight: .semibold)).lineLimit(1)
                        .strikethrough(r.done).foregroundStyle(r.done ? muted : sand)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .widgetURL(link("plans"))
    }
}

struct PlanLarge: View {
    let day: WDay
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .firstTextBaseline) {
                Text("Планёрка").font(display(15)).foregroundStyle(sand)
                Spacer()
                Text(day.label).font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
            }
            SegBar(done: day.done, total: day.total)
            if day.rows.isEmpty { Text("На сегодня дел нет. Добавьте их в приложении.").font(.system(size: 12, weight: .medium)).foregroundStyle(muted).padding(.top, 6) }
            ForEach(Array(day.rows.prefix(7).enumerated()), id: \.offset) { _, r in
                HStack(spacing: 9) {
                    CheckMark(done: r.done, hot: r.hot, size: 16)
                    Text(r.name).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                        .strikethrough(r.done).foregroundStyle(r.done ? muted : sand)
                    Spacer(minLength: 4)
                    Text(r.hot && !r.time.isEmpty ? r.time : (r.who.isEmpty ? r.time : r.who)).font(.system(size: 11, weight: .medium)).lineLimit(1)
                        .foregroundStyle(r.hot ? gold : muted)
                }
                .padding(.vertical, 3)
            }
            Spacer(minLength: 0)
            if !day.note.isEmpty { Text(day.note).font(.system(size: 11, weight: .medium)).foregroundStyle(muted).lineLimit(1) }
        }
        .padding(16)
        .widgetURL(link("plans"))
    }
}

struct PlanCircular: View {
    let day: WDay
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 1) {
                Image(systemName: "checklist").font(.system(size: 12, weight: .semibold))
                Text("\(day.done)/\(day.total)").font(.system(size: 13, weight: .bold))
            }
        }
        .widgetURL(link("plans"))
    }
}

struct PlanEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry
    var body: some View {
        let day = entry.data.day(for: entry.date)
        switch family {
        case .systemLarge: PlanLarge(day: day)
        case .accessoryCircular: PlanCircular(day: day)
        default: PlanSmall(day: day)
        }
    }
}

struct PlanWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaPlan", provider: Provider()) { entry in
            PlanEntryView(entry: entry).foregroundStyle(sand).containerBackground(card, for: .widget)
        }
        .configurationDisplayName("Планёрка")
        .description("Дела по дому на сегодня")
        .supportedFamilies([.systemSmall, .systemLarge, .accessoryCircular])
        .contentMarginsDisabled()
    }
}

// ---------- Месяц (средний) ----------
struct MonthView: View {
    let d: WidgetData; let date: Date
    var body: some View {
        let passed = (daysUntil(d.periodStart, from: date).map { -$0 } ?? 0) + 1
        let dayN = max(1, min(d.periodDays, passed))
        return HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(d.monthName.isEmpty ? "Месяц" : d.monthName).font(display(13)).foregroundStyle(sand)
                    Text("день \(dayN) из \(d.periodDays)").font(.system(size: 10, weight: .medium)).foregroundStyle(muted)
                }
                HStack(spacing: 1.5) {
                    ForEach(0..<max(1, min(d.periodDays, 31)), id: \.self) { i in
                        Capsule().fill(i + 1 < dayN ? gold : (i + 1 == dayN ? red : line)).frame(height: 8)
                    }
                }
                Spacer(minLength: 0)
                row("Пришло", d.income, green)
                row("Ушло", d.out, red)
                row("Осталось", d.left, gold)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text("Дела месяца").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
                    Spacer()
                    Text(d.monthRatio).font(.system(size: 11, weight: .bold)).foregroundStyle(gold)
                }
                if d.monthItems.isEmpty { Text("Всё сделано").font(.system(size: 11, weight: .medium)).foregroundStyle(muted) }
                ForEach(Array(d.monthItems.prefix(3).enumerated()), id: \.offset) { _, it in
                    HStack(spacing: 4) {
                        Text(it.name).font(.system(size: 11, weight: .semibold)).foregroundStyle(sand).lineLimit(1)
                        Spacer(minLength: 2)
                        Text(it.date).font(.system(size: 10, weight: .medium)).foregroundStyle(muted).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
                if !d.billsLeft.isEmpty { Text("Платежей ещё на \(d.billsLeft)").font(.system(size: 10, weight: .medium)).foregroundStyle(muted).lineLimit(1).minimumScaleFactor(0.8) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .widgetURL(link("home"))
    }
    func row(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack {
            Text(label).font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
            Spacer(minLength: 2)
            Text(value).font(.system(size: 12, weight: .bold)).foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

struct MonthWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaMonth", provider: Provider()) { entry in
            MonthView(d: entry.data, date: entry.date).containerBackground(card, for: .widget)
        }
        .configurationDisplayName("Месяц")
        .description("Пришло, ушло, осталось и дела месяца")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

// ---------- Скоро платёж ----------
struct BillSmall: View {
    let bill: WBill?; let date: Date
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Скоро платёж").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
            Spacer(minLength: 0)
            if let b = bill {
                let n = daysUntil(b.dateIso, from: date) ?? 0
                Text(b.title).font(.system(size: 13, weight: .semibold)).foregroundStyle(sand).lineLimit(1)
                Text(b.amount).font(display(17)).foregroundStyle(sand).lineLimit(1).minimumScaleFactor(0.6)
                Spacer(minLength: 0)
                Text("\(inDays(n)) · \(b.dateLabel)").font(.system(size: 10, weight: .semibold)).foregroundStyle(n <= 5 ? red : muted).lineLimit(1)
            } else {
                Text("Платежей нет").font(.system(size: 13, weight: .semibold)).foregroundStyle(sand)
                Spacer(minLength: 0)
                Text("Добавьте кредит или подписку").font(.system(size: 10, weight: .medium)).foregroundStyle(muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .widgetURL(link("bills"))
    }
}

struct BillRect: View {
    let bill: WBill?; let date: Date
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            if let b = bill {
                Text("\(b.title) · \(b.dateLabel)").font(.system(size: 13, weight: .semibold)).lineLimit(1)
                Text(b.amount).font(.system(size: 15, weight: .bold)).lineLimit(1)
                Text(inDays(daysUntil(b.dateIso, from: date) ?? 0)).font(.system(size: 12, weight: .medium)).lineLimit(1)
            } else {
                Text("Платежей нет").font(.system(size: 13, weight: .semibold))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(link("bills"))
    }
}

struct BillEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry
    var body: some View {
        switch family {
        case .accessoryRectangular: BillRect(bill: entry.data.bill, date: entry.date)
        default: BillSmall(bill: entry.data.bill, date: entry.date)
        }
    }
}

struct BillWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaBill", provider: Provider()) { entry in
            BillEntryView(entry: entry).containerBackground(card, for: .widget)
        }
        .configurationDisplayName("Скоро платёж")
        .description("Ближайший регулярный платёж и через сколько дней")
        .supportedFamilies([.systemSmall, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

// ---------- Цель (маленький) ----------
struct GoalView: View {
    let d: WidgetData
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(d.goal?.name ?? "Цель").font(.system(size: 11, weight: .medium)).foregroundStyle(muted).lineLimit(1)
            Spacer(minLength: 0)
            Ring(pct: d.goal?.pct ?? 0)
            Spacer(minLength: 0)
            Text(d.goal.map { "\($0.saved) из \($0.target)" } ?? "Добавьте цель").font(.system(size: 10, weight: .semibold)).foregroundStyle(sand).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .widgetURL(link("goals"))
    }
}

struct GoalWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaGoal", provider: Provider()) { entry in
            GoalView(d: entry.data).containerBackground(card, for: .widget)
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
                    Text("Эта неделя").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
                    Text(d.weekTotal).font(display(20)).lineLimit(1).minimumScaleFactor(0.6)
                }
                Spacer()
                if !d.weekDelta.isEmpty {
                    Text(d.weekDelta).font(.system(size: 10, weight: .bold)).foregroundStyle(gold)
                        .padding(.horizontal, 8).padding(.vertical, 4).background(Color(hex: "#2A2416"))
                        .clipShape(Capsule())
                }
            }
            HStack(alignment: .bottom, spacing: 7) {
                ForEach(Array(d.weekBars.enumerated()), id: \.offset) { _, b in
                    VStack(spacing: 4) {
                        GeometryReader { g in
                            VStack { Spacer(minLength: 0)
                                RoundedRectangle(cornerRadius: 5, style: .continuous)
                                    .fill(b.active ? gold : line)
                                    .frame(height: max(3, g.size.height * CGFloat(b.h) / 100))
                            }
                        }
                        Text(b.label).font(.system(size: 9, weight: .semibold)).foregroundStyle(b.active ? sand : muted)
                    }
                }
            }
            .frame(height: 64)
            Rectangle().fill(line).frame(height: 1)
            if d.txs.isEmpty {
                Text("Трат пока нет").font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
            }
            ForEach(Array(d.txs.prefix(3).enumerated()), id: \.offset) { _, t in
                HStack(spacing: 8) {
                    Text(t.letter).font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: t.color))
                        .frame(width: 24, height: 24).overlay(Circle().stroke(line, lineWidth: 1))
                    Text(t.title).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                    Spacer()
                    Text("−\(t.amount)").font(.system(size: 12, weight: .bold))
                }
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(sand)
        .padding(16)
        .widgetURL(link("home"))
    }
}

struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PlanerkaWeek", provider: Provider()) { entry in
            WeekView(d: entry.data).containerBackground(card, for: .widget)
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
        MonthWidget()
        BillWidget()
        GoalWidget()
        WeekWidget()
    }
}
