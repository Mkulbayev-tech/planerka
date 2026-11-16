import { useBudget } from '../store.jsx';
import { useLongPress } from '../hooks.js';
import { Checkbox, ProgressBar, Ring } from '../components/ui.jsx';
import { iso, addDays, parseIso } from '../lib/dates.js';
import { plural } from '../data.js';
import { LimitsPanel } from './Budget.jsx';
import { BillsPanel } from './Bills.jsx';

const VIEWS = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];
const TABS = [
  { id: 'planner', label: 'Планёрка' },
  { id: 'limits', label: 'Лимиты' },
  { id: 'goals', label: 'Цели' },
  { id: 'bills', label: 'Платежи' },
];

// Планы (макет «Семейный бюджет», шаги 2b и 3a): дела по дому, лимиты, цели накоплений и регулярные платежи.
export default function Plans() {
  const { s, d, a } = useBudget();
  const tab = TABS.some(t => t.id === s.planTab) ? s.planTab : 'planner';
  const add = {
    planner: () => a.openSheet('chore', { date: d.pl.dateIso }),
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

// Планёрка (макет, шаг 3): дела по дому на день, неделю и месяц
function Planner() {
  const { d, a } = useBudget();
  const p = d.pl;
  const shiftDay = n => a.setPlanDate(iso(addDays(parseIso(p.dateIso), n)));
  return (
    <>
      <div className="row-between" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          {VIEWS.map(v => (
            <button key={v.id} type="button" className="filter-chip" aria-pressed={p.view === v.id ? 'true' : 'false'} onClick={() => a.setPlanView(v.id)}>{v.label}</button>
          ))}
        </div>
        {!p.isToday && p.view !== 'month' && <div className="t-link" onClick={a.planToday}>Сегодня</div>}
      </div>

      {p.empty && (
        <div className="card" style={{ gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Здесь будут дела по дому: посуда, садик, уборка, показания счётчиков.</div>
          <div className="t-meta">Добавьте дело один раз — оно будет появляться в свой день само. Можно назначить исполнителя или чередовать по неделям.</div>
          <div className="soft-btn" onClick={() => a.openSheet('chore', { date: p.dateIso })}>+ Добавить дело</div>
        </div>
      )}

      {p.view === 'day' && !p.empty && (
        <>
          <div className="col" style={{ gap: 8 }}>
            <div className="row-between">
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="strip-nav" aria-label="Предыдущий день" onClick={() => shiftDay(-1)}>‹</button>
                <span className="t-meta" style={{ fontSize: 14 }}>{p.day.label}</span>
                <button type="button" className="strip-nav" aria-label="Следующий день" onClick={() => shiftDay(1)}>›</button>
              </div>
            </div>
            <div className="row-between" style={{ alignItems: 'baseline' }}>
              <div className="t-num" style={{ fontSize: 20 }}>{p.day.total ? `${p.day.done} из ${p.day.total} готово` : 'Дел нет'}</div>
              <div className="t-meta">{p.day.people}</div>
            </div>
            {p.day.total > 0 && (
              <div className="seg-bar" aria-hidden="true">{p.day.segments.map((on, i) => <span key={i} data-on={on ? 'true' : 'false'} />)}</div>
            )}
          </div>
          {p.day.rows.length > 0 && <div className="card card--list">{p.day.rows.map(r => <ChoreRow key={r.key} r={r} timeRight />)}</div>}
          {p.day.note && (
            <div className="card" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', background: 'var(--as)', padding: 16 }}>
              <span className="dot9" style={{ background: 'var(--accent)', marginTop: 6 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.day.note}</div>
            </div>
          )}
        </>
      )}

      {p.view === 'week' && !p.empty && (
        <>
          <div className="col" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="strip-nav" aria-label="Прошлая неделя" onClick={() => a.shiftPlanWeek(-1)}>‹</button>
              <span className="t-meta" style={{ fontSize: 14 }}>{p.week.label}</span>
              <button type="button" className="strip-nav" aria-label="Следующая неделя" onClick={() => a.shiftPlanWeek(1)}>›</button>
            </div>
            <div className="row-between" style={{ alignItems: 'baseline' }}>
              <div className="t-num" style={{ fontSize: 20 }}>{p.week.total} {plural(p.week.total, 'дело', 'дела', 'дел')}</div>
              <div className="t-meta">сделано {p.week.done}</div>
            </div>
          </div>
          <div className="week-strip">
            {p.week.strip.map(x => (
              <button key={x.iso} type="button" className="week-strip__day week-strip__day--btn" data-today={x.isToday ? 'true' : 'false'} data-on={x.selected ? 'true' : 'false'} onClick={() => a.openPlanDay(x.iso)}>
                <span className="week-strip__wd">{x.wd}</span>
                <span className="week-strip__num">{x.day}</span>
                <span className="cal-dots">{x.dots.map((c, i) => <i key={i} style={{ background: x.isToday ? 'var(--on-accent)' : c }} />)}</span>
              </button>
            ))}
          </div>
          <div className="section-head"><div className="t-card">На неделю</div></div>
          <div className="card card--list">
            {p.week.rows.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>На эту неделю дел нет</div>}
            {p.week.rows.map(r => <ChoreRow key={r.key} r={r} />)}
          </div>
        </>
      )}

      {p.view === 'month' && !p.empty && (
        <>
          <div className="card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <div className="t-meta">{p.month.label}</div>
              <div className="t-num" style={{ fontSize: 20 }}>{p.month.total ? `${p.month.done} из ${p.month.total} готово` : 'Дел на месяц нет'}</div>
              <div className="t-meta">{p.month.people}</div>
            </div>
            {p.month.total > 0 && (
              <Ring size={64} r={26} width={6} pct={p.month.pct} track="var(--ln)" color="var(--accent)"><span style={{ fontSize: 14, fontWeight: 600 }}>{p.month.pct}%</span></Ring>
            )}
          </div>
          <div className="section-head"><div className="t-card">Осталось</div><div className="t-meta">{p.month.left.length}</div></div>
          <div className="card card--list">
            {p.month.left.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Всё сделано</div>}
            {p.month.left.map(r => <ChoreRow key={r.key} r={r} />)}
          </div>
          {p.month.finished.length > 0 && (
            <>
              <div className="section-head"><div className="t-card">Готово</div><div className="t-meta">{p.month.finished.length}</div></div>
              <div className="card card--list">{p.month.finished.map(r => <ChoreRow key={r.key} r={r} />)}</div>
            </>
          )}
        </>
      )}
      {!p.empty && <div className="t-meta" style={{ textAlign: 'center' }}>Тап — отметить, удержать — изменить</div>}
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

// Строка дела: тап — отметить (у дела с подзадачами — открыть их), удержание — изменить
function ChoreRow({ r, timeRight = false }) {
  const { d, a } = useBudget();
  const edit = () => (r.choreId ? a.openSheet('chore', { chore: d.choreDefs.find(c => c.id === r.choreId) }) : a.openSheet('task', { task: r.raw }));
  const tapRow = () => {
    if (!r.choreId) { a.toggleTask(r.taskId); return; }
    if (r.hasSubs) a.openSheet('choreSubs', { choreId: r.choreId, dateIso: r.dateIso });
    else a.toggleChore(r.choreId, r.dateIso);
  };
  const press = useLongPress(edit, tapRow);
  return (
    <div className="list-row list-row--tap pressable" {...press} style={{ flexWrap: 'wrap' }}>
      <Checkbox size={24} radius={8} icon={13} done={r.done} border={r.hot ? 'var(--red)' : 'var(--off)'} />
      <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, textDecoration: r.done ? 'line-through' : 'none', color: r.done ? 'var(--mu)' : 'var(--tx)' }}>{r.name}</div>
        {r.sub && <div className="t-meta ellipsis" style={{ color: r.hot && !timeRight ? 'var(--red)' : undefined }}>{r.sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', color: r.hot && timeRight ? 'var(--accent-tx)' : 'var(--mu)' }}>{r.right}</div>
      {typeof r.pct === 'number' && <div style={{ flexBasis: '100%', paddingLeft: 36 }}><ProgressBar height={3} pct={r.pct} color="var(--green)" track="var(--ln)" /></div>}
    </div>
  );
}
