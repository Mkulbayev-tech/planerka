import { useBudget } from '../store.jsx';
import { BackHead } from '../components/ui.jsx';
import { iso } from '../lib/dates.js';

const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

// Семейный календарь (макет, шаг 5c): месяц сеткой с точками событий и платежей, события выбранного дня и ближайшие
export function Calendar() {
  const { d, a } = useBudget();
  const c = d.calendar;
  const shiftMonth = n => { const m = new Date(c.monthIso + 'T12:00:00'); a.setView({ calMonth: iso(new Date(m.getFullYear(), m.getMonth() + n, 1)) }); };
  const EventRow = ({ e }) => (
    <div className="list-row list-row--tap" onClick={() => a.openSheet('event', { event: e })}>
      <div className="col" style={{ width: 34, alignItems: 'center', flex: 'none' }}>
        <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{e.day}</span>
        <span className="t-meta" style={{ fontSize: 11 }}>{e.wd}</span>
      </div>
      <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: e.color, flex: 'none' }} />
      <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{e.title}</div>
        {e.meta && <div className="t-meta ellipsis">{e.meta}</div>}
      </div>
      {e.costFmt && <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{e.costFmt}</span>}
    </div>
  );
  return (
    <div className="screen">
      <div className="row-between">
        <BackHead onBack={() => a.go('settings')} title="Календарь" />
        <div className="round-add" onClick={() => a.openSheet('event', { date: c.selected })} aria-label="Добавить событие">+</div>
      </div>
      <div className="row-between">
        <div className="t-num" style={{ fontSize: 20 }}>{c.monthTitle}</div>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="strip-nav" aria-label="Прошлый месяц" onClick={() => shiftMonth(-1)}>‹</button>
          <button type="button" className="strip-nav" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>›</button>
        </div>
      </div>

      <div className="cal-grid">
        {WD.map(w => <span key={w} className="cal-wd">{w}</span>)}
        {c.cells.map((x, i) => (x ? (
          <button key={x.iso} type="button" className="cal-day" data-today={x.isToday ? 'true' : 'false'} data-on={x.selected ? 'true' : 'false'} onClick={() => a.setView({ calDay: x.iso })}>
            <span>{x.day}</span>
            <span className="cal-dots">{x.dots.map((col, k) => <i key={k} style={{ background: col }} />)}</span>
          </button>
        ) : <span key={'e' + i} />))}
      </div>
      <div className="plan-legend">{c.legend.map(l => <span key={l.label}><i style={{ background: l.color, borderRadius: '50%' }} />{l.label}</span>)}</div>

      {c.dayEvents.length > 0 && (
        <>
          <div className="section-head"><div className="t-card">{c.selectedLabel}</div></div>
          <div className="card card--list">{c.dayEvents.map(e => <EventRow key={e.id} e={e} />)}</div>
        </>
      )}
      <div className="section-head"><div className="t-card">Ближайшее</div></div>
      <div className="card card--list">
        {c.upcoming.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Событий нет. Добавьте врача, праздник или утренник — с суммой, если нужны деньги.</div>}
        {c.upcoming.map(e => <EventRow key={e.id} e={e} />)}
      </div>
    </div>
  );
}

// Итог прошлого месяца (макет, шаг 5c): пришло/ушло/отложили, лимиты, лучшее и перерасход, дела, вопросы на семейный разбор
export function Review() {
  const { d, a } = useBudget();
  const r = d.review;
  const toggle = id => a.setKey('review', cur => {
    const all = cur && typeof cur === 'object' ? cur : {};
    const list = Array.isArray(all[r.periodIso]) ? all[r.periodIso] : [];
    return { ...all, [r.periodIso]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
  });
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title={r.title} />
      <div className="t-meta" style={{ marginTop: -6, fontSize: 14 }}>{r.range}</div>
      {!r.hasData && <div className="card"><div className="empty">За прошлый месяц нет записей — итог появится после первого полного месяца.</div></div>}
      {r.hasData && (
        <>
          <div className="card" style={{ gap: 12 }}>
            <div className="grid3">
              <div className="col" style={{ gap: 2 }}><span className="t-meta">Пришло</span><span style={{ fontSize: 17, fontWeight: 600, color: 'var(--green)' }}>{r.incomeFmt}</span></div>
              <div className="col" style={{ gap: 2 }}><span className="t-meta">Ушло</span><span style={{ fontSize: 17, fontWeight: 600, color: 'var(--red)' }}>{r.spentFmt}</span></div>
              <div className="col" style={{ gap: 2 }}><span className="t-meta">Отложили</span><span style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent-tx)' }}>{r.savedFmt}</span></div>
            </div>
            {(r.budgetText || r.overText) && <div style={{ fontSize: 15, fontWeight: 500 }}>{r.budgetText} {r.overText}</div>}
          </div>
          {(r.best || r.worst) && (
            <div className="grid2">
              {r.best && <div className="card" style={{ padding: 14, gap: 3 }}><span className="t-meta">Лучше всего</span><span style={{ fontSize: 16, fontWeight: 600 }}>{r.best.name}</span><span style={{ fontSize: 13, color: 'var(--green)' }}>{r.best.text}</span></div>}
              {r.worst && <div className="card" style={{ padding: 14, gap: 3 }}><span className="t-meta">Перерасход</span><span style={{ fontSize: 16, fontWeight: 600 }}>{r.worst.name}</span><span style={{ fontSize: 13, color: 'var(--red)' }}>{r.worst.text}</span></div>}
            </div>
          )}
          {r.tasksTotal > 0 && (
            <div className="card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
              <div className="col" style={{ gap: 2 }}><span className="t-meta">Дела по дому</span><span style={{ fontSize: 17, fontWeight: 600 }}>{r.tasksDone} из {r.tasksTotal}</span></div>
              <span className="t-meta">{r.tasksBy}</span>
            </div>
          )}
        </>
      )}
      <div className="section-head"><div className="t-card">Семейный разбор</div><div className="t-meta">обсудить вместе</div></div>
      <div className="card card--list">
        {r.agenda.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Вопросов нет — всё по плану</div>}
        {r.agenda.map(x => (
          <div key={x.id} className="list-row list-row--tap" onClick={() => toggle(x.id)}>
            <span className="shop-check" data-on={x.done ? 'true' : 'false'} style={{ borderRadius: 7 }}>{x.done ? '✓' : ''}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, textDecoration: x.done ? 'line-through' : 'none', color: x.done ? 'var(--mu)' : 'var(--tx)' }}>{x.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
