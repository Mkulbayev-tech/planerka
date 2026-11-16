import { useBudget } from '../store.jsx';
import { useLongPress } from '../hooks.js';
import { Checkbox, ProgressBar } from '../components/ui.jsx';
import { LimitsPanel } from './Budget.jsx';
import { BillsPanel } from './Bills.jsx';

const TABS = [
  { id: 'planner', label: 'Планёрка' },
  { id: 'limits', label: 'Лимиты' },
  { id: 'goals', label: 'Цели' },
  { id: 'bills', label: 'Платежи' },
];

// Планы (макет «Семейный бюджет», шаги 2b и 3a): дела по дому, лимиты, цели накоплений и регулярные платежи.
export default function Plans() {
  const { s, d, a } = useBudget();
  const p = d.plan;
  const tab = TABS.some(t => t.id === s.planTab) ? s.planTab : 'planner';
  const add = {
    planner: () => a.openSheet('task', { date: p.dateIso, owner: p.ownerDefault }),
    limits: () => a.openSheet('cat'),
    goals: () => a.openSheet('goal'),
    bills: () => a.openSheet('bill'),
  }[tab];
  return (
    <div className="screen">
      <div className="row-between">
        <div className="t-title">Планы</div>
        <div className="round-add" onClick={add} aria-label="Добавить">+</div>
      </div>

      <div className="tabs-seg" role="tablist" aria-label="Разделы планов">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-pressed={tab === t.id ? 'true' : 'false'} aria-selected={tab === t.id} onClick={() => a.setPlanTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'planner' && <Planner />}
      {tab === 'limits' && <LimitsPanel />}
      {tab === 'goals' && <GoalsPanel />}
      {tab === 'bills' && <BillsPanel />}
    </div>
  );
}

// Планёрка: дела на выбранный день, неделя, чьи дела
function Planner() {
  const { d, a } = useBudget();
  const p = d.plan;
  const seg = id => ({ background: p.ownerId === id ? 'var(--accent)' : 'transparent', color: p.ownerId === id ? 'var(--on-accent)' : 'var(--mu)' });
  return (
    <>
      {p.owners.length > 0 && (
        <div className="seg">
          {p.owners.map(o => <div key={o.id} className="seg__item" style={seg(o.id)} onClick={() => a.setPlanOwner(o.id)}>{o.name}</div>)}
        </div>
      )}

      <div className="card" style={{ gap: 10, padding: '12px 10px 10px' }}>
        <div className="row-between" style={{ padding: '0 4px' }}>
          <div className="strip-nav" onClick={() => a.shiftPlanWeek(-1)}>‹</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.weekLabel}</div>
          <div className="strip-nav" onClick={() => a.shiftPlanWeek(1)}>›</div>
        </div>
        <div className="strip">
          {p.weekPlan.map(dd => (
            <div key={dd.iso} className="strip__day" data-on={dd.selected ? 'true' : 'false'} data-today={dd.isToday ? 'true' : 'false'} onClick={() => a.setPlanDate(dd.iso)}>
              <div className="strip__wd">{dd.label}</div>
              <div className="strip__num">{dd.day}</div>
              <div className="strip__count">{dd.total ? `${dd.done}/${dd.total}` : '·'}</div>
            </div>
          ))}
        </div>
        {!p.isToday && <div className="t-link" style={{ textAlign: 'center' }} onClick={a.planToday}>Вернуться к сегодня</div>}
      </div>

      <div className="section-head">
        <div className="t-card">Задачи на {p.isToday ? 'сегодня' : p.dateShort}</div>
        {p.total > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>{p.done} из {p.total}</div>}
      </div>
      <div className="card card--list">
        {p.total > 0 && <div style={{ padding: '12px 0 6px' }}><ProgressBar height={6} pct={p.pct} color="var(--green)" transition /></div>}
        {p.tasks.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>На этот день задач нет. Нажмите +, чтобы добавить.</div>}
        {p.tasks.map(t => <TaskRow key={t.id} t={t} showOwner={p.showOwner} />)}
        {p.hasCost && <div className="t-meta" style={{ padding: '12px 0' }}>Затраты по плану {p.costFmt} · осталось {p.leftFmt}</div>}
      </div>
      {p.tasks.length > 0 && <div className="t-meta" style={{ textAlign: 'center', marginTop: -6 }}>Тап — отметить, удержать — изменить</div>}

    </>
  );
}

// Цели: сколько отложено всего и в этом месяце, у каждой — идёт ли по графику
function GoalsPanel() {
  const { d, a } = useBudget();
  return (
    <>
      <div className="col" style={{ gap: 4 }}>
        <div className="t-meta" style={{ fontSize: 14 }}>Отложено на все цели</div>
        <div className="t-num" style={{ fontSize: 34, lineHeight: 1.1, color: 'var(--accent-tx)' }}>{d.savedTotalFmt}</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>В этом месяце +{d.goalsMonthFmt}</div>
      </div>

      {d.goals.length > 0 && (
        <div className="card list-row--tap" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '14px 16px' }} onClick={() => a.openSheet('sweep')}>
          <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Остаток месяца {d.sweep.on ? '→ ' + d.sweep.goalName : 'в цель'}</div>
            <div className="t-meta ellipsis">{d.sweep.on
              ? (d.sweep.last ? `Последний раз ${d.sweep.lastFmt}` : `Каждое ${d.monthStartDay}-е число — то, что не потратили`)
              : 'Что не потратили за месяц — само уйдёт в цель'}</div>
          </div>
          <div className="t-link">{d.sweep.on ? 'Вкл' : 'Включить'} ›</div>
        </div>
      )}
      {d.goals.length === 0 && (
        <div className="card"><div className="empty">Пока нет целей. Нажмите +, чтобы добавить первую.</div></div>
      )}
      {d.goalCards.map(g => (
        <div key={g.id} className="card" style={{ gap: 10 }}>
          <div className="row-between list-row--tap" style={{ gap: 12, alignItems: 'flex-start' }} onClick={() => a.openSheet('goal', { goal: g })}>
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 17, fontWeight: 600 }}>{g.name}</div>
              <div style={{ fontSize: 15 }}><b style={{ fontWeight: 600 }}>{g.savedFmt}</b> <span className="t-meta">из {g.targetFmt}</span></div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-tx)' }}>{g.pct}%</div>
          </div>
          <ProgressBar height={6} pct={g.pct} color={g.color} track="var(--ln)" transition />
          <div className="row-between" style={{ gap: 10 }}>
            <div className="t-meta ellipsis" style={{ color: g.planColor }}>{g.planText}</div>
            <button type="button" className="filter-chip" style={{ height: 34 }} onClick={() => a.openSheet('topup', { goal: g })}>Пополнить</button>
          </div>
        </div>
      ))}
    </>
  );
}

function TaskRow({ t, showOwner }) {
  const { a } = useBudget();
  const press = useLongPress(() => a.openSheet('task', { task: t }), () => a.toggleTask(t.id));
  return (
    <div className="list-row list-row--tap pressable" {...press}>
      <Checkbox size={24} radius={8} icon={13} done={t.done} border={t.boxBorder} />
      <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <div className="ellipsis" style={{ fontSize: 15, fontWeight: 500, textDecoration: t.titleStyle, color: t.titleColor }}>{t.name}</div>
        <div className="row" style={{ gap: 6 }}>
          <div className="tag" style={{ background: t.bg, color: t.color }}>{t.tag}</div>
          <div className="t-meta" style={{ whiteSpace: 'nowrap' }}>{t.time}{showOwner && t.ownerName ? ' · ' + t.ownerName : ''}{showOwner && !t.owner ? ' · общая' : ''}</div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: t.costColor }}>{t.costFmt}</div>
    </div>
  );
}
