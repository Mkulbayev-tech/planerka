import { useEffect, useState } from 'react';
import { useBudget } from '../store.jsx';
import { widgetCount } from '../native.js';
import { Letter, Switch } from '../components/ui.jsx';

const widgetsText = n => (n === 0 ? 'не добавлены' : n % 10 === 1 && n % 100 !== 11 ? `${n} активный` : `${n} активных`);

export default function Settings() {
  const { s, d, a, mode } = useBudget();
  const offBg = d.dark ? '#3A3746' : '#D9D6E3';
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

      <div className="card card--profile">
        <Letter size={52} radius="50%" bg="var(--accent)" color="#fff" fontSize={20}>{d.greetingName[0].toUpperCase()}</Letter>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="t-card ellipsis">{d.greetingName}</div>
          <div className="t-sub ellipsis" style={{ fontWeight: 600 }}>{d.householdName || 'Личный бюджет'} · ₸ KZT</div>
        </div>
      </div>

      {mode === 'supabase' && (
        <div className="card card--menu">
          <div className="menu-row menu-row--link" onClick={a.copyInvite}>
            <span className="menu-row__title">Код приглашения</span>
            <span className="menu-row__value" style={{ color: 'var(--accent)', letterSpacing: 2 }}>{d.inviteCode || '—'}</span>
          </div>
          <div className="menu-row"><span className="menu-row__title">Участники</span><span className="menu-row__value">{d.membersCount}</span></div>
        </div>
      )}

      <div className="card card--menu">
        <MenuLink title="Доходы и зарплата" onClick={() => a.go('income')} />
        <MenuLink title="Лимиты и категории" onClick={() => a.go('budget')} />
        <div className="menu-row menu-row--link" onClick={() => a.openSheet('autoplan')}>
          <span className="menu-row__title">Автораспределение</span><span className="menu-row__value">{d.autoOn ? 'включено ›' : 'выключено ›'}</span>
        </div>
        <div className="menu-row menu-row--link" onClick={() => a.go('bills')}>
          <span className="menu-row__title">Регулярные платежи</span><span className="menu-row__value">{d.billRows.length || 'нет'} ›</span>
        </div>
        <div className="menu-row menu-row--link" onClick={() => a.openSheet('sweep')}>
          <span className="menu-row__title">Остаток месяца в цель</span><span className="menu-row__value">{d.sweep.on ? 'включено ›' : 'выключено ›'}</span>
        </div>
        {d.settleAvailable && (
          <div className="menu-row menu-row--link" onClick={() => a.openSheet('settle')}>
            <span className="menu-row__title">Расчёт между нами</span><span className="menu-row__value">{d.settleOn ? 'включён ›' : 'выключен ›'}</span>
          </div>
        )}
        <MenuLink title="Импорт выписки Kaspi" onClick={() => a.openSheet('import')} />
      </div>

      <div className="card card--menu">
        <div className="menu-row menu-row--switch" onClick={a.toggleDark}>
          <span className="menu-row__title">Тёмная тема</span>
          <Switch on={d.dark} offBg={offBg} />
        </div>
        <div className="menu-row menu-row--switch" onClick={a.toggleNotif}>
          <span className="menu-row__title">Напоминать вносить траты</span>
          <Switch on={s.notif} offBg={offBg} />
        </div>
        {widgets !== null && <div className="menu-row"><span className="menu-row__title">Виджеты на экране</span><span className="menu-row__value">{widgetsText(widgets)}</span></div>}
        <div className="menu-row"><span className="menu-row__title">Валюта</span><span className="menu-row__value">₸ Тенге</span></div>
        <div className="menu-row menu-row--link" onClick={() => a.openSheet('monthStart', { value: d.monthStartDay })}>
          <span className="menu-row__title">Начало месяца</span><span className="menu-row__value">{d.monthStartDay}-е число ›</span>
        </div>
      </div>

      <div className="card card--menu">
        <MenuLink title="Экспорт в Excel" onClick={a.exportCsv} />
        {mode === 'supabase' && <MenuLink title="Сменить пароль" onClick={() => a.openSheet('pin')} />}
        {mode === 'supabase' && <MenuLink title="Выйти из аккаунта" onClick={a.signOut} />}
        <div className="menu-row menu-row--link" onClick={a.resetData}>
          <span className="menu-row__title" style={{ color: 'var(--red)' }}>{mode === 'local' ? 'Сбросить данные' : 'Удалить все данные семьи'}</span>
        </div>
      </div>
    </div>
  );
}

function MenuLink({ title, onClick }) {
  return (
    <div className="menu-row menu-row--link" onClick={onClick}>
      <span className="menu-row__title">{title}</span>
      <span className="menu-row__chev">›</span>
    </div>
  );
}
