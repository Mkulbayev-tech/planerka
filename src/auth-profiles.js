// Два профиля семьи: вход по номеру и короткому паролю, без почты.
export const PROFILES = [
  { login: '01', name: 'Айнур', letter: 'А' },
  { login: '02', name: 'Мэлс', letter: 'М' },
];
export const HOUSEHOLD_NAME = 'Наша семья';

// В Supabase у каждого профиля есть техническая почта и длинный пароль, собранный из короткого.
export const loginEmail = login => `${login}@planerka.app`;
export const pinToPassword = pin => `${String(pin).trim()}-planerka-2026`;
