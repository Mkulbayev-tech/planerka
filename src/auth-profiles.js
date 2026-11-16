// Два профиля семьи: вход по номеру и короткому паролю, без почты.
export const PROFILES = [
  { login: '01', name: 'Айнур', letter: 'А' },
  { login: '02', name: 'Мэлс', letter: 'М' },
];
export const HOUSEHOLD_NAME = 'Наша семья';

// В Supabase у каждого профиля есть техническая почта и длинный пароль, собранный из короткого.
export const loginEmail = login => `${login}@planerka.app`;
export const pinToPassword = pin => `${String(pin).trim()}-planerka-2026`;

// Схема пароля видна в открытом коде, поэтому вся защита — в самом пароле: не короче 6 и не очевидный.
export function pinProblem(pin) {
  const p = String(pin || '').trim();
  if (p.length < 6) return 'Минимум 6 символов';
  if (/^(.)\1+$/.test(p) || '01234567890'.includes(p) || '09876543210'.includes(p)) return 'Слишком простой пароль';
  return '';
}
