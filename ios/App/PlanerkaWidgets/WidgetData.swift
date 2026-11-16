import SwiftUI
import WidgetKit

// Сводка, которую приложение кладёт в общий контейнер (см. WidgetBridgePlugin в приложении, src/model.js → widget).
// Разбор нестрогий: отсутствующие поля получают значения по умолчанию — старое приложение и новый виджет совместимы.

extension KeyedDecodingContainer {
    func v<T: Decodable>(_ key: Key, _ def: T) -> T { ((try? decodeIfPresent(T.self, forKey: key)) ?? nil) ?? def }
}

struct WCat: Codable {
    var letter = ""; var name = ""; var spent = ""; var color = "#E8B85A"; var bg = "#242424"
    init(letter: String = "", name: String = "", spent: String = "", color: String = "#E8B85A", bg: String = "#242424") { self.letter = letter; self.name = name; self.spent = spent; self.color = color; self.bg = bg }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); letter = c.v(.letter, ""); name = c.v(.name, ""); spent = c.v(.spent, ""); color = c.v(.color, "#E8B85A"); bg = c.v(.bg, "#242424") }
}
struct WTask: Codable {
    var name = ""; var done = false
    init(name: String = "", done: Bool = false) { self.name = name; self.done = done }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); name = c.v(.name, ""); done = c.v(.done, false) }
}
struct WGoal: Codable {
    var letter = ""; var name = ""; var pct = 0; var saved = ""; var target = ""
    init(letter: String = "", name: String = "", pct: Int = 0, saved: String = "", target: String = "") { self.letter = letter; self.name = name; self.pct = pct; self.saved = saved; self.target = target }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); letter = c.v(.letter, ""); name = c.v(.name, ""); pct = c.v(.pct, 0); saved = c.v(.saved, ""); target = c.v(.target, "") }
}
struct WBar: Codable {
    var label = ""; var h = 0; var active = false
    init(label: String = "", h: Int = 0, active: Bool = false) { self.label = label; self.h = h; self.active = active }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); label = c.v(.label, ""); h = c.v(.h, 0); active = c.v(.active, false) }
}
struct WTx: Codable {
    var letter = ""; var title = ""; var amount = ""; var color = "#E8B85A"; var bg = "#242424"
    init(letter: String = "", title: String = "", amount: String = "", color: String = "#E8B85A", bg: String = "#242424") { self.letter = letter; self.title = title; self.amount = amount; self.color = color; self.bg = bg }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); letter = c.v(.letter, ""); title = c.v(.title, ""); amount = c.v(.amount, ""); color = c.v(.color, "#E8B85A"); bg = c.v(.bg, "#242424") }
}
struct WPart: Codable {
    var color = "#E8B85A"; var v: Double = 0
    init(color: String = "#E8B85A", v: Double = 0) { self.color = color; self.v = v }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); color = c.v(.color, "#E8B85A"); v = c.v(.v, 0) }
}
struct WRow: Codable {
    var name = ""; var done = false; var time = ""; var who = ""; var hot = false
    init(name: String = "", done: Bool = false, time: String = "", who: String = "", hot: Bool = false) { self.name = name; self.done = done; self.time = time; self.who = who; self.hot = hot }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); name = c.v(.name, ""); done = c.v(.done, false); time = c.v(.time, ""); who = c.v(.who, ""); hot = c.v(.hot, false) }
}
struct WDay: Codable {
    var label = ""; var done = 0; var total = 0; var rows: [WRow] = []; var note = ""
    init(label: String = "", done: Int = 0, total: Int = 0, rows: [WRow] = [], note: String = "") { self.label = label; self.done = done; self.total = total; self.rows = rows; self.note = note }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); label = c.v(.label, ""); done = c.v(.done, 0); total = c.v(.total, 0); rows = c.v(.rows, []); note = c.v(.note, "") }
}
struct WItem: Codable {
    var name = ""; var date = ""
    init(name: String = "", date: String = "") { self.name = name; self.date = date }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); name = c.v(.name, ""); date = c.v(.date, "") }
}
struct WBill: Codable {
    var title = ""; var amount = ""; var dateIso = ""; var dateLabel = ""
    init(title: String = "", amount: String = "", dateIso: String = "", dateLabel: String = "") { self.title = title; self.amount = amount; self.dateIso = dateIso; self.dateLabel = dateLabel }
    init(from d: Decoder) throws { let c = try d.container(keyedBy: CodingKeys.self); title = c.v(.title, ""); amount = c.v(.amount, ""); dateIso = c.v(.dateIso, ""); dateLabel = c.v(.dateLabel, "") }
}

struct WidgetData: Codable {
    var updatedAt: Double = 0
    var balance = "0 ₸"; var spentPct = 0; var spent = "0 ₸"; var daysLeft = 0; var perDay = "0 ₸"
    var cats: [WCat] = []
    var taskRatio = "0/0"; var taskPct = 0; var tasks: [WTask] = []
    var goal: WGoal? = nil
    var weekTotal = "0 ₸"; var weekDelta = ""; var weekBars: [WBar] = []; var txs: [WTx] = []
    // макет «Семейный бюджет», шаг 4
    var monthName = ""; var budgetTotal = ""; var hasBudget = false; var budgetPct = 0
    var split: [WPart] = []
    var income = ""; var out = ""; var left = ""; var perDayPlain = ""
    var periodStart = ""; var periodDays = 30
    var monthRatio = "0/0"; var monthItems: [WItem] = []; var billsLeft = ""
    var planner: [String: WDay] = [:]
    var bill: WBill? = nil

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        updatedAt = c.v(.updatedAt, 0)
        balance = c.v(.balance, "0 ₸"); spentPct = c.v(.spentPct, 0); spent = c.v(.spent, "0 ₸"); daysLeft = c.v(.daysLeft, 0); perDay = c.v(.perDay, "0 ₸")
        cats = c.v(.cats, [])
        taskRatio = c.v(.taskRatio, "0/0"); taskPct = c.v(.taskPct, 0); tasks = c.v(.tasks, [])
        goal = (try? c.decodeIfPresent(WGoal.self, forKey: .goal)) ?? nil
        weekTotal = c.v(.weekTotal, "0 ₸"); weekDelta = c.v(.weekDelta, ""); weekBars = c.v(.weekBars, []); txs = c.v(.txs, [])
        monthName = c.v(.monthName, ""); budgetTotal = c.v(.budgetTotal, ""); hasBudget = c.v(.hasBudget, false); budgetPct = c.v(.budgetPct, 0)
        split = c.v(.split, [])
        income = c.v(.income, ""); out = c.v(.out, ""); left = c.v(.left, ""); perDayPlain = c.v(.perDayPlain, "")
        periodStart = c.v(.periodStart, ""); periodDays = c.v(.periodDays, 30)
        monthRatio = c.v(.monthRatio, "0/0"); monthItems = c.v(.monthItems, []); billsLeft = c.v(.billsLeft, "")
        planner = c.v(.planner, [:])
        bill = (try? c.decodeIfPresent(WBill.self, forKey: .bill)) ?? nil
    }

    static let appGroup = "group.kz.planerka.app"

    static func load() -> WidgetData? {
        guard let ud = UserDefaults(suiteName: appGroup),
              let json = ud.string(forKey: "widgetData"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    // Дела на день date: точное совпадение, иначе самый поздний из известных дней не позже date
    func day(for date: Date) -> WDay {
        let key = isoDay(date)
        if let d = planner[key] { return d }
        let earlier = planner.keys.filter { $0 <= key }.sorted().last
        if let k = earlier, let d = planner[k] { return d }
        return WDay()
    }

    static var sample: WidgetData {
        var d = WidgetData()
        d.balance = "312 400 ₸"; d.spentPct = 34; d.spent = "158 600 ₸"; d.daysLeft = 23; d.perDay = "13 600 ₸"
        d.taskRatio = "2/5"; d.taskPct = 40
        d.goal = WGoal(letter: "О", name: "Отпуск в Турции", pct: 47, saved: "420 000", target: "900 000 ₸")
        d.weekTotal = "75 600 ₸"; d.weekDelta = "−8% к прошлой"
        d.weekBars = [WBar(label: "Пн", h: 82), WBar(label: "Вт", h: 56), WBar(label: "Ср", h: 60, active: true), WBar(label: "Чт", h: 100), WBar(label: "Пт", h: 33), WBar(label: "Сб", h: 84), WBar(label: "Вс", h: 80)]
        d.txs = [WTx(letter: "П", title: "Magnum", amount: "18 400 ₸", color: "#8FCBA3"), WTx(letter: "К", title: "Кофейня", amount: "1 900 ₸", color: "#B4A7EC")]
        d.monthName = "Ноябрь"; d.budgetTotal = "205 000 ₸"; d.hasBudget = true; d.budgetPct = 77
        d.split = [WPart(color: "#E8B85A", v: 65), WPart(color: "#8FCBA3", v: 62), WPart(color: "#EE8669", v: 25), WPart(color: "#B4A7EC", v: 4)]
        d.income = "+471 000"; d.out = "−158 600"; d.left = "312 400"; d.perDayPlain = "13 600"
        d.periodStart = isoDay(Calendar.current.date(byAdding: .day, value: -6, to: .now) ?? .now); d.periodDays = 30
        d.monthRatio = "4/9"; d.monthItems = [WItem(name: "Фильтр для воды", date: "20 ноя"), WItem(name: "Счётчики", date: "25 ноя"), WItem(name: "Генуборка", date: "6 дек")]
        d.billsLeft = "131 790 ₸"
        d.planner = [isoDay(.now): WDay(label: "пн, 16 ноября", done: 2, total: 5, rows: [
            WRow(name: "Помыть посуду", done: true, time: "08:30", who: "Арман"),
            WRow(name: "Отвести Алию в садик", done: true, time: "08:00", who: "Айгерим"),
            WRow(name: "Вынести мусор", done: false, time: "", who: "Арман"),
            WRow(name: "Забрать Алию из садика", done: false, time: "18:00", who: "Айгерим", hot: true),
            WRow(name: "Полить цветы", done: false, time: "", who: "Алия")], note: "Завтра: стирка · Арман")]
        d.bill = WBill(title: "Kaspi Red", amount: "25 000 ₸", dateIso: isoDay(Calendar.current.date(byAdding: .day, value: 4, to: .now) ?? .now), dateLabel: "20 ноя")
        return d
    }
}

func isoDay(_ date: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}
func dateFromIso(_ s: String) -> Date? {
    let p = s.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return nil }
    return Calendar.current.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
}
func daysUntil(_ iso: String, from: Date) -> Int? {
    guard let d = dateFromIso(iso) else { return nil }
    return Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: from), to: d).day
}
func plural(_ n: Int, _ one: String, _ few: String, _ many: String) -> String {
    let a = abs(n) % 100, b = a % 10
    return a > 10 && a < 20 ? many : b == 1 ? one : (b >= 2 && b <= 4) ? few : many
}
func inDays(_ n: Int) -> String {
    n < 0 ? "просрочен" : n == 0 ? "сегодня" : n == 1 ? "завтра" : "через \(n) \(plural(n, "день", "дня", "дней"))"
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r = Double((v >> 16) & 0xFF) / 255, g = Double((v >> 8) & 0xFF) / 255, b = Double(v & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
