import { useBudget } from '../store.jsx';
import { useLongPress } from '../hooks.js';
import { Letter, Checkbox, ProgressBar } from '../components/ui.jsx';

// Планы и цели: задачи на выбранный день и накопления — всё, что семья собирается сделать.
export default function Plans() {
  const { d, a } = useBudget();
  const p = d.plan;
  const seg = id => ({ background: p.ownerId === id ? 'var(--accent)' : 'transparent', color: p.ownerId === id ? '#fff' : 'var(--mu)' });
  return (
    <div className="screen">
      <div className="row-between">
        <div className="col" style={{ gap: 2 }}>
          <div className="t-eyebrow">{p.dateLabel}</div>
          <div className="t-title">Планы</div>
        </div>
        <div className="round-add" onClick={() => a.openSheet('task', { date: p.dateIso, owner: p.ownerDefault })}>+</div>
      </div>

      {p.owners.length > 0 && (
        <div className="seg">
          {p.owners.map(o => <div key={o.id} className="seg__item" style={seg(o.id)} onClick={() => a.setPlanOwner(o.id)}>{o.name}</div>)}
        </div>
      )}

      <div className="card" style={{ gap: 10, padding: '12px 10px 10px' }}>
        <div className="row-between" style={{ padding: '0 4px' }}>
          <div className="strip-nav" onClick={() => a.shiftPlanWeek(-1)}>‹</div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{p.weekLabel}</div>
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
        {p.total > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', whiteSpace: 'nowrap' }}>{p.done} из {p.total}</div>}
      </div>
      <div className="card card--list">
        {p.total > 0 && <div style={{ padding: '12px 0 6px' }}><ProgressBar height={6} pct={p.pct} color="var(--green)" transition /></div>}
        {p.tasks.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>На этот день задач нет. Нажмите +, чтобы добавить.</div>}
        {p.tasks.map(t => <TaskRow key={t.id} t={t} showOwner={p.showOwner} />)}
        {p.hasCost && <div className="t-meta" style={{ padding: '12px 0' }}>Затраты по плану {p.costFmt} · осталось {p.leftFmt}</div>}
      </div>
      {p.tasks.length > 0 && <div className="t-meta" style={{ textAlign: 'center', marginTop: -6 }}>Тап — отметить, удержать — изменить</div>}

      <div className="section-head" style={{ marginTop: 6 }}>
        <div className="col" style={{ gap: 1 }}>
          <div className="t-card">Цели накоплений</div>
          <div className="t-meta">Накоплено {d.savedTotalFmt}{d.goals.length ? ' · в месяц ' + d.perMonthFmt : ''}</div>
        </div>
        <div className="round-add round-add--soft" onClick={() => a.openSheet('goal')}>+</div>
      </div>
      {d.goals.length === 0 && (
        <div className="card"><div className="empty">Пока нет целей. Нажмите +, чтобы добавить первую.</div></div>
      )}
      {d.goals.map(g => (
        <div key={g.id} className="card" style={{ gap: 10 }}>
          <div className="row list-row--tap" style={{ gap: 12 }} onClick={() => a.openSheet('goal', { goal: g })}>
            <Letter size={40} radius={13} bg={g.bg} color={g.color} fontSize={15}>{g.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 15, fontWeight: 800 }}>{g.name}</div>
              <div className="t-meta">{g.savedFmt} из {g.targetFmt}</div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: g.color }}>{g.pct}%</div>
          </div>
          <ProgressBar height={8} pct={g.pct} color={g.color} transition />
          <div className="row-between" style={{ gap: 10 }}>
            <div className="t-meta ellipsis">{g.eta}</div>
            <div className="pill" style={{ padding: '7px 12px', fontWeight: 800, background: g.bg, color: g.color, whiteSpace: 'nowrap', flex: 'none' }} onClick={() => a.openSheet('topup', { goal: g })}>+ Пополнить</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskRow({ t, showOwner }) {
  const { a } = useBudget();
  const press = useLongPress(() => a.openSheet('task', { task: t }), () => a.toggleTask(t.id));
  return (
    <div className="list-row list-row--tap pressable" {...press}>
      <Checkbox size={24} radius={8} icon={13} done={t.done} border={t.boxBorder} />
      <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <div className="ellipsis" style={{ fontSize: 15, fontWeight: 700, textDecoration: t.titleStyle, color: t.titleColor }}>{t.name}</div>
        <div className="row" style={{ gap: 6 }}>
          <div className="tag" style={{ background: t.bg, color: t.color }}>{t.tag}</div>
          <div className="t-meta" style={{ whiteSpace: 'nowrap' }}>{t.time}{showOwner && t.ownerName ? ' · ' + t.ownerName : ''}{showOwner && !t.owner ? ' · общая' : ''}</div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', color: t.costColor }}>{t.costFmt}</div>
    </div>
  );
}
