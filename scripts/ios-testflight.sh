#!/bin/sh
# Архивирует приложение и загружает в TestFlight (App Store Connect).
# Нужен ключ App Store Connect API (App Store Connect → Users and Access → Integrations → App Store Connect API):
#   ASC_KEY_ID=XXXXXXXXXX ASC_ISSUER_ID=xxxxxxxx-xxxx-... ASC_KEY_PATH=~/AuthKey_XXXXXXXXXX.p8 sh scripts/ios-testflight.sh
# Перед первой загрузкой создайте запись приложения в App Store Connect с Bundle ID kz.planerka.app.
set -e
cd "$(dirname "$0")/.."
: "${ASC_KEY_ID:?нужен ASC_KEY_ID}"; : "${ASC_ISSUER_ID:?нужен ASC_ISSUER_ID}"; : "${ASC_KEY_PATH:?нужен ASC_KEY_PATH}"
npm run build >/dev/null
npx cap sync ios >/dev/null
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos \
  -destination 'generic/platform=iOS' -archivePath build/App.xcarchive -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID" -quiet archive
xcodebuild -exportArchive -archivePath build/App.xcarchive -exportOptionsPlist ios/ExportOptions.plist -exportPath build/export \
  -allowProvisioningUpdates -authenticationKeyPath "$ASC_KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID"
echo "Загружено в App Store Connect. Через 10–20 минут сборка появится в TestFlight."
