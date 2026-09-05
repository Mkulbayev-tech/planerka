import SwiftUI
import WidgetKit

// Сводка, которую приложение кладёт в общий контейнер (см. WidgetBridgePlugin в приложении).
struct WCat: Codable { var letter = ""; var name = ""; var spent = ""; var color = "#7A4AE0"; var bg = "#EFE9FC" }
struct WTask: Codable { var name = ""; var done = false }
struct WGoal: Codable { var letter = ""; var name = ""; var pct = 0; var saved = ""; var target = "" }
struct WBar: Codable { var label = ""; var h = 0; var active = false }
struct WTx: Codable { var letter = ""; var title = ""; var amount = ""; var color = "#7A4AE0"; var bg = "#EFE9FC" }

struct WidgetData: Codable {
    var updatedAt: Double = 0
    var balance = "0 ₸"
    var spentPct = 0
    var spent = "0 ₸"
    var daysLeft = 0
    var perDay = "0 ₸"
    var cats: [WCat] = []
    var taskRatio = "0/0"
    var taskPct = 0
    var tasks: [WTask] = []
    var goal: WGoal? = nil
    var weekTotal = "0 ₸"
    var weekDelta = ""
    var weekBars: [WBar] = []
    var txs: [WTx] = []

    init() {}

    // Нестрогий разбор: отсутствующие поля получают значения по умолчанию.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        updatedAt = (try? c.decodeIfPresent(Double.self, forKey: .updatedAt)) ?? 0
        balance = (try? c.decodeIfPresent(String.self, forKey: .balance)) ?? "0 ₸"
        spentPct = (try? c.decodeIfPresent(Int.self, forKey: .spentPct)) ?? 0
        spent = (try? c.decodeIfPresent(String.self, forKey: .spent)) ?? "0 ₸"
        daysLeft = (try? c.decodeIfPresent(Int.self, forKey: .daysLeft)) ?? 0
        perDay = (try? c.decodeIfPresent(String.self, forKey: .perDay)) ?? "0 ₸"
        cats = (try? c.decodeIfPresent([WCat].self, forKey: .cats)) ?? []
        taskRatio = (try? c.decodeIfPresent(String.self, forKey: .taskRatio)) ?? "0/0"
        taskPct = (try? c.decodeIfPresent(Int.self, forKey: .taskPct)) ?? 0
        tasks = (try? c.decodeIfPresent([WTask].self, forKey: .tasks)) ?? []
        goal = try? c.decodeIfPresent(WGoal.self, forKey: .goal)
        weekTotal = (try? c.decodeIfPresent(String.self, forKey: .weekTotal)) ?? "0 ₸"
        weekDelta = (try? c.decodeIfPresent(String.self, forKey: .weekDelta)) ?? ""
        weekBars = (try? c.decodeIfPresent([WBar].self, forKey: .weekBars)) ?? []
        txs = (try? c.decodeIfPresent([WTx].self, forKey: .txs)) ?? []
    }

    static let appGroup = "group.kz.planerka.app"

    static func load() -> WidgetData? {
        guard let ud = UserDefaults(suiteName: appGroup),
              let json = ud.string(forKey: "widgetData"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    static var sample: WidgetData {
        var d = WidgetData()
        d.balance = "486 250 ₸"; d.spentPct = 25; d.spent = "163 750 ₸"; d.daysLeft = 18; d.perDay = "27 014 ₸"
        d.cats = [WCat(letter: "П", name: "Продукты", spent: "58 тыс ₸", color: "#2FA66F", bg: "#E6F6EE"),
                  WCat(letter: "Ж", name: "Жильё", spent: "45 тыс ₸", color: "#7A4AE0", bg: "#EFE9FC"),
                  WCat(letter: "К", name: "Кафе", spent: "25 тыс ₸", color: "#E0553F", bg: "#FCE9E5")]
        d.taskRatio = "2/6"; d.taskPct = 33
        d.tasks = [WTask(name: "Выпечка на заказ", done: true), WTask(name: "Уборка кухни", done: true), WTask(name: "Закупка продуктов", done: false), WTask(name: "Оплатить коммунальные", done: false)]
        d.goal = WGoal(letter: "О", name: "Отпуск в Турции", pct: 38, saved: "450 тыс ₸", target: "1,2 млн ₸")
        d.weekTotal = "75 600 ₸"; d.weekDelta = "−8% к прошлой"
        d.weekBars = [WBar(label: "Пн", h: 82, active: false), WBar(label: "Вт", h: 56, active: false), WBar(label: "Ср", h: 60, active: true), WBar(label: "Чт", h: 100, active: false), WBar(label: "Пт", h: 33, active: false), WBar(label: "Сб", h: 84, active: false), WBar(label: "Вс", h: 80, active: false)]
        d.txs = [WTx(letter: "П", title: "Galmart", amount: "12 200 ₸", color: "#2FA66F", bg: "#E6F6EE"), WTx(letter: "К", title: "Ужин в ресторане", amount: "12 800 ₸", color: "#E0553F", bg: "#FCE9E5")]
        return d
    }
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
