import { useEffect, useState } from 'react';
import { useBudget } from '../store.jsx';
import { widgetCount } from '../native.js';
import { Letter, Switch, Icon } from '../components/ui.jsx';

const widgetsText = n => (n === 0 ? 'не добавлены' : n % 10 === 1 && n % 100 !== 11 ? `${n} активный` : `${n} активных`);

// Ещё: все разделы, которых нет на нижней панели, и настройки
export default function Settings() {
  const { s, d, a, mode } = useBudget();
  // Число виджетов спрашиваем у iOS; в браузере и на Android строку не показываем
  const [widgets, setWidgets] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => widgetCount().then(n => { if (alive) setWidgets(n); });
    load();
    const vis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); };
  }, []);
  return (
    <div className="screen">
      <div className="t-title">Ещё</div>

      <div className="card card--profile list-row--tap" onClick={() => a.go('family')}>
        <Letter size={52} radius="50%" bg="var(--accent)" color="var(--on-accent)" fontSize={20}>{d.greetingName[0].toUpperCase()}</Letter>
        <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
          <div className="t-card ellipsis">{d.greetingName}</div>
          <div className="t-meta ellipsis">{d.householdName || 'Личный бюджет'} · {d.membersCount > 1 ? `${d.membersCount} участника` : 'один участник'}</div>
        </div>
        <span className="menu-row__chev">›</span>
      </div>

      <div className="card card--menu">
        <MenuLink icon="chart" title="Аналитика" value="месяц, полгода, год" onClick={() => a.go('analytics')} />
        <MenuLink icon="users" title="Семья" value={d.membersCount > 1 ? `${d.membersCount} участника` : ''} onClick={() => a.go('family')} />
        <MenuLink icon="wallet" title="Доходы и зарплаты" value={d.incomeFmt} onClick={() => a.go('income')} />
        <MenuLink icon="file" title="Импорт выписки Kaspi" onClick={() => a.openSheet('import')} />
      </div>

      <div className="card card--menu">
        <MenuLink icon="pie" title="Автораспределение" value={d.autoOn ? 'включено' : 'выключено'} onClick={() => a.openSheet('autoplan')} />
        <MenuLink icon="target" title="Остаток месяца в цель" value={d.sweep.on ? 'включено' : 'выключено'} onClick={() => a.openSheet('sweep')} />
        <MenuLink icon="repeat" title="Регулярные платежи" value={d.billRows.length ? String(d.billRows.length) : 'нет'} onClick={() => a.openPlans('bills')} />
        {d.settleAvailable && <MenuLink icon="swap" title="Кто кому должен" value={d.settleOn ? 'включено' : 'выключено'} onClick={() => a.openSheet('settle')} />}
      </div>

      <div className="card card--menu">
        <div className="menu-row">
          <span className="menu-row__title row" style={{ gap: 12 }}><MenuIcon name="moon" />Тема</span>
          <div className="theme-seg" role="group" aria-label="Тема">
            <button type="button" aria-pressed={d.dark ? 'true' : 'false'} onClick={() => a.setTheme('dark')}>Тёмная</button>
            <button type="button" aria-pressed={d.dark ? 'false' : 'true'} onClick={() => a.setTheme('light')}>Светлая</button>
          </div>
        </div>
        <div className="menu-row menu-row--switch" onClick={a.toggleNotif}>
          <span className="menu-row__title row" style={{ gap: 12 }}><MenuIcon name="bell" />Напоминать вносить траты</span>
          <Switch on={s.notif} offBg="var(--off)" />
        </div>
        {widgets !== null && <div className="menu-row"><span className="menu-row__title row" style={{ gap: 12 }}><MenuIcon name="phone" />Виджеты на экране</span><span className="menu-row__value">{widgetsText(widgets)}</span></div>}
      </div>

      <div className="card card--menu">
        <MenuLink icon="download" title="Экспорт в Excel" onClick={a.exportCsv} />
        {mode === 'supabase' && <MenuLink icon="lock" title="Сменить пароль" onClick={() => a.openSheet('pin')} />}
        {mode === 'supabase' && <MenuLink icon="logout" title="Выйти из аккаунта" onClick={a.signOut} />}
        <div className="menu-row menu-row--link" onClick={a.resetData}>
          <span className="menu-row__title" style={{ color: 'var(--red)' }}>{mode === 'local' ? 'Сбросить данные' : 'Удалить все данные семьи'}</span>
        </div>
      </div>
    </div>
  );
}

function MenuIcon({ name }) {
  return <span style={{ color: 'var(--mu)', display: 'flex' }}><Icon name={name} size={20} /></span>;
}

function MenuLink({ icon, title, value, onClick }) {
  return (
    <div className="menu-row menu-row--link" onClick={onClick}>
      <span className="menu-row__title row" style={{ gap: 12, minWidth: 0 }}>{icon && <MenuIcon name={icon} />}<span className="ellipsis">{title}</span></span>
      <span className="menu-row__value" style={{ whiteSpace: 'nowrap' }}>{value ? value + ' ' : ''}›</span>
    </div>
  );
}
