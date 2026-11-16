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
export function warn() { if (isNative) Haptics.notification({ type: NotificationType.Warning }).catch(() => {}); }

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
    id: REMINDER_ID, title: 'Бюджет семьи', body: 'Не забудьте внести сегодняшние траты',
    schedule: { on: { hour: 20, minute: 0 }, repeats: true, allowWhileIdle: true },
  }] });
  return true;
}
// Переключатель включён по умолчанию, поэтому при запуске ставим напоминание в расписание по-настоящему.
// Если уведомления запрещены в настройках телефона — возвращаем false, чтобы переключатель показал правду.
export async function syncReminder(want) {
  if (!isNative || !want) return want;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'denied') return false;
    return await enableReminder();
  } catch { return want; }
}
export async function disableReminder() {
  if (!isNative) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }); } catch { /* ignore */ }
}

// Поделиться текстом (список покупок): системное окно на телефоне, в браузере — «Поделиться» или копирование
export async function shareText(text) {
  if (isNative) { try { await Share.share({ text }); return 'shared'; } catch { return 'cancel'; } }
  if (navigator.share) { try { await navigator.share({ text }); return 'shared'; } catch { return 'cancel'; } }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'fail'; }
}

// Напоминания о регулярных платежах: в день платежа в 10:00. list — [{ date: 'YYYY-MM-DD', title, body }].
// Пустой список снимает все. Разрешение не запрашиваем — его спрашивает переключатель напоминаний.
const BILL_IDS = Array.from({ length: 60 }, (_, i) => 100 + i);
export async function scheduleBillReminders(list) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: BILL_IDS.map(id => ({ id })) });
    if (!list.length) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    const now = Date.now();
    const notifications = list
      .map(x => { const [y, m, d] = x.date.split('-').map(Number); return { ...x, at: new Date(y, m - 1, d, 10, 0) }; })
      .filter(x => x.at.getTime() > now)
      .slice(0, 20) // iOS держит не больше 64 запланированных уведомлений на приложение: 20 платежам, 36 делам, 1 ежедневное
      .map((x, i) => ({ id: BILL_IDS[i], title: x.title, body: x.body, schedule: { at: x.at, allowWhileIdle: true } }));
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (e) { console.warn('bills:', e && e.message); }
}

// Напоминания о делах Планёрки: list — [{ date: 'YYYY-MM-DD', time: 'HH:MM', title, body }], ближайшие 36
const CHORE_IDS = Array.from({ length: 36 }, (_, i) => 200 + i);
export async function scheduleChoreReminders(list) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: CHORE_IDS.map(id => ({ id })) });
    if (!list.length) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    const now = Date.now();
    const notifications = list
      .map(x => { const [y, m, d] = x.date.split('-').map(Number); const [hh, mm] = x.time.split(':').map(Number); return { ...x, at: new Date(y, m - 1, d, hh, mm) }; })
      .filter(x => x.at.getTime() > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, CHORE_IDS.length)
      .map((x, i) => ({ id: CHORE_IDS[i], title: x.title, body: x.body, schedule: { at: x.at, allowWhileIdle: true } }));
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (e) { console.warn('chores:', e && e.message); }
}

// Чек по фото: текст распознаёт iPhone (Vision), разбор — в lib/receipt.js. В браузере и на Android недоступно.
const ReceiptOCR = registerPlugin('ReceiptOCR');
export const canScanReceipt = isNative && platform === 'ios';
export async function recognizeImage(base64) {
  const r = await ReceiptOCR.recognize({ base64 });
  return Array.isArray(r.lines) ? r.lines : [];
}

// Виджеты iOS: приложение передаёт сводку, расширение WidgetKit её рисует
const WidgetBridge = registerPlugin('WidgetBridge');
export async function updateWidgets(payload) {
  if (!isNative || platform !== 'ios') return;
  try { await WidgetBridge.update({ json: JSON.stringify(payload) }); } catch (e) { console.warn('widgets:', e && e.message); }
}
// Сколько виджетов приложения стоит на экране «Домой»; null — узнать нельзя (браузер, Android)
export async function widgetCount() {
  if (!isNative || platform !== 'ios') return null;
  try { const r = await WidgetBridge.count(); return typeof r.count === 'number' ? r.count : null; } catch { return null; }
}
