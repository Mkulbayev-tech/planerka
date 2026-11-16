import { useEffect } from 'react';
import { BudgetProvider, useBudget } from './store.jsx';
import { isNative, syncStatusBar, hideSplash, onBackButton, exitApp, initKeyboard } from './native.js';
import { useMediaQuery } from './hooks.js';
import { IOSDevice } from './ios-frame.jsx';
import TabBar from './components/TabBar.jsx';
import SheetHost, { PinSheet } from './components/SheetHost.jsx';
import Access from './screens/Access.jsx';
import Home from './screens/Home.jsx';
import Add from './screens/Add.jsx';
import Spend from './screens/Spend.jsx';
import Budget from './screens/Budget.jsx';
import Income from './screens/Income.jsx';
import Plans from './screens/Plans.jsx';
import Settings from './screens/Settings.jsx';
import Bills from './screens/Bills.jsx';
import WidgetsBoard from './widgets/WidgetsBoard.jsx';

// Вкладки: home — «Аналитика», plans — «Планы» (задачи и цели), spend — «Расходы», settings — «Ещё».
// Старые адреса (stats, cats, goals) ведут в новые вкладки.
const SCREENS = {
  home: Home, plans: Plans, spend: Spend, settings: Settings,
  add: Add, budget: Budget, income: Income, bills: Bills,
  stats: Home, cats: Spend, goals: Plans,
};

export const themeVars = th => ({
  '--bg': th.bg, '--cd': th.cd, '--tx': th.tx, '--mu': th.mu,
  '--ln': th.ln, '--as': th.as, '--ip': th.ip, '--sh': th.sh, '--bd': th.bd, '--bar': th.bar, '--off': th.off,
  '--accent': th.ac, '--accent-tx': th.at, '--on-accent': th.on, '--green': th.gr, '--red': th.rd, '--amber': th.am,
});

export function Phone({ mobile = false }) {
  const { s, d } = useBudget();
  const ready = s.auth === 'in' && !!s.household && !!s.data;
  const Screen = ready ? (SCREENS[s.screen] || Home) : Access;
  // Пароль ещё простой (совпадает с номером профиля) — сначала сменить
  const needPin = ready && !!s.user && s.user.pinSet === false;
  return (
    <div className={'phone' + (mobile ? ' phone--mobile' : '')} style={themeVars(d.th)}>
      <Screen />
      {ready && s.screen !== 'add' && <TabBar />}
      {ready && !needPin && s.sheet && <SheetHost />}
      {needPin && <PinSheet force />}
      {s.toast && <div className="toast" key={s.toast}>{s.toast}</div>}
    </div>
  );
}

function Stage() {
  const wide = useMediaQuery('(min-width: 900px)');
  const desktop = wide && !isNative;
  const { s, d, a } = useBudget();

  // Цвет за пределами приложения (отскок прокрутки на iPhone, полосы по краям) — как фон темы
  useEffect(() => { syncStatusBar(d.dark); document.documentElement.style.background = d.th.bg; document.body.style.background = d.th.bg; }, [d.dark, d.th.bg]);
  useEffect(() => { if (s.auth !== 'loading') hideSplash(); }, [s.auth]);
  useEffect(() => { const t = setTimeout(hideSplash, 4000); initKeyboard(); return () => clearTimeout(t); }, []);
  useEffect(() => onBackButton(() => { if (!a.back()) exitApp(); }), [a]);

  if (!desktop) {
    return (
      <div className="stage stage--mobile" style={themeVars(d.th)}>
        <Phone mobile />
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="stage-col">
        <div className="stage-label"><b>ПРИЛОЖЕНИЕ</b><span>Семейный бюджет · тапайте по вкладкам</span></div>
        <IOSDevice dark={d.dark}><Phone /></IOSDevice>
      </div>
      <div className="stage-col">
        <div className="stage-label"><b>ВИДЖЕТЫ iOS</b><span>Главный экран iPhone · обновляются вместе с приложением</span></div>
        <IOSDevice dark><WidgetsBoard /></IOSDevice>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BudgetProvider>
      <Stage />
    </BudgetProvider>
  );
}
