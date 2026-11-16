import Foundation
import Capacitor
import WidgetKit

// Мост из веб-части: сохраняет сводку в общий контейнер и просит WidgetKit перерисовать виджеты.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "count", returnType: CAPPluginReturnPromise)
    ]
    static let appGroup = "group.kz.planerka.app"

    @objc func update(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else { call.reject("json required"); return }
        guard let ud = UserDefaults(suiteName: WidgetBridgePlugin.appGroup) else { call.reject("app group unavailable"); return }
        ud.set(json, forKey: "widgetData")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // Сколько виджетов приложения сейчас добавлено (экран «Домой», StandBy).
    @objc func count(_ call: CAPPluginCall) {
        WidgetCenter.shared.getCurrentConfigurations { result in
            switch result {
            case .success(let list): call.resolve(["count": list.count])
            case .failure(let error): call.reject(error.localizedDescription)
            }
        }
    }
}
