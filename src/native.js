// Мостик к нативным возможностям Capacitor (iOS/Android). В браузере все функции ничего не делают.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

// Цвет иконок статус-бара под тему приложения.
export async function syncStatusBar(dark) {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (platform === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: dark ? '#0F0E13' : '#F4F3F8' });
    }
  } catch { /* плагин недоступен */ }
}

export async function hideSplash() {
  if (!isNative) return;
  try { await SplashScreen.hide({ fadeOutDuration: 200 }); } catch { /* ignore */ }
}

// Аппаратная кнопка «назад» на Android.
export function onBackButton(handler) {
  if (!isNative || platform !== 'android') return () => {};
  const pending = CapApp.addListener('backButton', handler);
  return () => { pending.then(h => h.remove()).catch(() => {}); };
}
export function exitApp() { if (isNative) CapApp.exitApp(); }

// Лёгкая вибрация на действиях.
export function tap() { if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); }
export function success() { if (isNative) Haptics.notification({ type: NotificationType.Success }).catch(() => {}); }

// Надёжное хранилище сессии Supabase на телефоне (localStorage в WebView могут очистить).
export const nativeStorage = isNative
  ? {
    getItem: async key => (await Preferences.get({ key })).value ?? null,
    setItem: async (key, value) => { await Preferences.set({ key, value }); },
    removeItem: async key => { await Preferences.remove({ key }); },
  }
  : undefined;

// Ссылка из письма для входа открывает приложение по схеме planerka://login
export const AUTH_REDIRECT = 'planerka://login';
export function onAppUrlOpen(handler) {
  if (!isNative) return () => {};
  const pending = CapApp.addListener('appUrlOpen', e => handler(e.url));
  return () => { pending.then(h => h.remove()).catch(() => {}); };
}
export async function getLaunchUrl() {
  if (!isNative) return null;
  try { const r = await CapApp.getLaunchUrl(); return r && r.url ? r.url : null; } catch { return null; }
}

// Клавиатура: показываем панель с «Готово» (на цифровой клавиатуре iOS иначе нечем её закрыть)
export async function initKeyboard() {
  if (!isNative) return;
  try { await Keyboard.setAccessoryBarVisible({ isVisible: true }); } catch { /* android */ }
}
export async function hideKeyboard() { if (isNative) { try { await Keyboard.hide(); } catch { /* ignore */ } } }

// Экспорт файла через системное окно «Поделиться» (в приложении скачивание ссылкой не работает)
export async function shareTextFile(name, text) {
  if (!isNative) return false;
  const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: name, url: res.uri });
  return true;
}

// Ежедневное напоминание вносить траты (20:00)
const REMINDER_ID = 1;
export async function enableReminder() {
  if (!isNative) return true;
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;
  await LocalNotifications.schedule({ notifications: [{
    id: REMINDER_ID, title: 'Семейные планы', body: 'Не забудьте внести сегодняшние траты',
    schedule: { on: { hour: 20, minute: 0 }, repeats: true, allowWhileIdle: true },
  }] });
  return true;
}
export async function disableReminder() {
  if (!isNative) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }); } catch { /* ignore */ }
}

// Виджеты iOS: приложение передаёт сводку, расширение WidgetKit её рисует
const WidgetBridge = registerPlugin('WidgetBridge');
export async function updateWidgets(payload) {
  if (!isNative || platform !== 'ios') return;
  try { await WidgetBridge.update({ json: JSON.stringify(payload) }); } catch (e) { console.warn('widgets:', e && e.message); }
}
