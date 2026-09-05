// Работа с датами: ISO-строки «YYYY-MM-DD», русские подписи, зарплатный период и неделя.
const pad = n => String(n).padStart(2, '0');

export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const MONTHS_CAP = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
export const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = s => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
export const inRange = (dateIso, startIso, endIso) => dateIso >= startIso && dateIso < endIso;

export const longLabel = d => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
export const dayMonth = d => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
export const shortDate = s => { const d = parseIso(s); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

// Зарплатный период: с startDay текущего (или прошлого) месяца до startDay следующего.
// shiftMonths = -1 даёт прошлый период и т.д.
export function periodBounds(now, startDay, shiftMonths = 0) {
  const today = startOfDay(now);
  const sd = Math.min(28, Math.max(1, Number(startDay) || 1));
  let m = today.getMonth();
  if (today.getDate() < sd) m -= 1;
  m += shiftMonths;
  const start = new Date(today.getFullYear(), m, sd);
  const end = new Date(today.getFullYear(), m + 1, sd);
  return { start, end, startIso: iso(start), endIso: iso(end) };
}

// Неделя с понедельника; index — номер сегодняшнего дня (Пн = 0).
export function weekBounds(now) {
  const today = startOfDay(now);
  const index = (today.getDay() + 6) % 7;
  const start = addDays(today, -index);
  const end = addDays(start, 7);
  return { start, end, index, startIso: iso(start), endIso: iso(end) };
}
