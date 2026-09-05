// Мостик к нативным возможностям Capacitor (iOS/Android). В браузере все функции ничего не делают.
import { Capacitor } from '@capacitor/core';
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
