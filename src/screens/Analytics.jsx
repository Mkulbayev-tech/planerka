import { useBudget } from '../store.jsx';
import { BackHead } from '../components/ui.jsx';

const RANGES = [
  { id: 'month', label: 'Месяц' },
  { id: 'half', label: 'Полгода' },
  { id: 'year', label: 'Год' },
];

// Аналитика (Ещё → «Аналитика», макет шаг 2c): сколько тратим в среднем, столбики по месяцам
// (текущий — штриховкой, он ещё идёт), сравнение категорий с прошлым месяцем. Тап по столбику — траты того месяца.
export default function Analytics() {
  const { d, a } = useBudget();
  const an = d.analytics;
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Аналитика" />

      <div className="row" style={{ gap: 8 }}>
        {RANGES.map(r => (
          <button key={r.id} type="button" className="filter-chip" aria-pressed={an.range === r.id ? 'true' : 'false'} onClick={() => a.setAnRange(r.id)}>{r.label}</button>
        ))}
      </div>

      <div className="card" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 4 }}>
          <div className="t-meta">{an.title}</div>
          <div className="t-num" style={{ fontSize: 30, lineHeight: 1.1 }}>{an.valueFmt}</div>
        </div>
        <div className="an-bars">
          {an.bars.map((b, i) => (
            <button key={i} type="button" className="an-bar" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={() => a.openPeriod(i - (an.bars.length - 1))} aria-label={`${b.label}: ${b.valueShort || 'нет трат'}`}>
              <div className="an-bar__col" data-cur={b.current ? 'true' : 'false'} style={{ height: b.h + '%' }} />
              <span className="an-bar__label" style={{ color: b.current ? 'var(--accent-tx)' : undefined }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-head"><div className="t-card">{an.compareTitle}</div></div>
      <div className="card card--list">
        {an.compare.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Пока не с чем сравнить</div>}
        {an.compare.map(c => (
          <div key={c.id} className="list-row list-row--tap" onClick={() => { a.openPeriod(0); a.setSpendCat(c.id); }}>
            <span className="dot9" style={{ background: c.color, width: 10, height: 10 }} />
            <div className="ellipsis" style={{ flex: 1, fontSize: 15 }}>{c.name}</div>
            <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.curFmt}</div>
            <div style={{ width: 58, textAlign: 'right', fontSize: 13, fontWeight: 600, color: c.deltaColor, whiteSpace: 'nowrap' }}>{c.deltaText}</div>
          </div>
        ))}
      </div>
      <div className="t-meta" style={{ padding: '0 4px' }}>Этот месяц ещё идёт, поэтому сравнение с прошлым — пока неполное.</div>
    </div>
  );
}
