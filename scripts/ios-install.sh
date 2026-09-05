#!/bin/sh
# Собирает приложение для iPhone и ставит его на подключённый телефон (по USB или Wi‑Fi через Xcode).
#   sh scripts/ios-install.sh                # покажет список устройств
#   sh scripts/ios-install.sh "iPhone (Мэлс)" # соберёт и установит на указанное устройство
set -e
cd "$(dirname "$0")/.."
DEVICE="$1"
if [ -z "$DEVICE" ]; then
  echo "Подключённые устройства:"; xcrun devicectl list devices; echo
  echo "Использование: sh scripts/ios-install.sh \"<имя устройства>\""; exit 0
fi
npm run build >/dev/null
npx cap sync ios >/dev/null
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos \
  -destination 'generic/platform=iOS' -derivedDataPath build/ios-device -allowProvisioningUpdates -quiet build
APP="build/ios-device/Build/Products/Release-iphoneos/App.app"
xcrun devicectl device install app --device "$DEVICE" "$APP"
xcrun devicectl device process launch --device "$DEVICE" kz.planerka.app || true
echo "Готово: приложение установлено на «$DEVICE»."
