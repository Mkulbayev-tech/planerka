import UIKit
import Capacitor

// Регистрирует локальный плагин моста виджетов.
class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
