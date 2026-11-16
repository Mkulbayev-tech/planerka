import Foundation
import Capacitor
import WidgetKit
import Vision
import UIKit

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

// Распознавание текста на фото чека (Vision). Картинку присылает веб-часть уже повёрнутой и уменьшенной;
// обратно уходят куски текста с координатами (0…1, y — сверху), разбор — в src/lib/receipt.js.
@objc(ReceiptOCRPlugin)
public class ReceiptOCRPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReceiptOCRPlugin"
    public let jsName = "ReceiptOCR"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise)
    ]

    @objc func recognize(_ call: CAPPluginCall) {
        guard let b64 = call.getString("base64"), let data = Data(base64Encoded: b64),
              let image = UIImage(data: data), let cg = image.cgImage else { call.reject("image required"); return }
        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest { req, err in
                if let err = err { call.reject(err.localizedDescription); return }
                let obs = (req.results as? [VNRecognizedTextObservation]) ?? []
                let lines: [[String: Any]] = obs.compactMap { o in
                    guard let top = o.topCandidates(1).first else { return nil }
                    let b = o.boundingBox
                    return ["text": top.string, "x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height]
                }
                call.resolve(["lines": lines])
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = false
            request.recognitionLanguages = ["ru-RU", "en-US"]
            do { try VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:]).perform([request]) }
            catch { call.reject(error.localizedDescription) }
        }
    }
}
