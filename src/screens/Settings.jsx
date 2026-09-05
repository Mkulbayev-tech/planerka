import { useBudget } from '../store.jsx';
import { Letter, Switch } from '../components/ui.jsx';

export default function Settings() {
  const { s, d, a, mode } = useBudget();
  const offBg = d.dark ? '#3A3746' : '#D9D6E3';
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
        <MenuLink title="Бюджет по категориям" onClick={() => a.go('budget')} />
        <MenuLink title="Категории" onClick={() => a.go('cats')} />
        <MenuLink title="Планы и задачи" onClick={() => a.go('plans')} />
        <MenuLink title="Цели накоплений" onClick={() => a.go('goals')} />
        <MenuLink title="Доходы и зарплата" onClick={() => a.go('income')} />
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
        <div className="menu-row"><span className="menu-row__title">Виджеты на экране</span><span className="menu-row__value">3 активных</span></div>
        <div className="menu-row"><span className="menu-row__title">Валюта</span><span className="menu-row__value">₸ Тенге</span></div>
        <div className="menu-row menu-row--link" onClick={() => a.openSheet('monthStart', { value: d.monthStartDay })}>
          <span className="menu-row__title">Начало месяца</span><span className="menu-row__value">{d.monthStartDay}-е число ›</span>
        </div>
      </div>

      <div className="card card--menu">
        <MenuLink title="Экспорт в Excel" onClick={a.exportCsv} />
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
