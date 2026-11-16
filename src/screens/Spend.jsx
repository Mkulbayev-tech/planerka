import { useBudget } from '../store.jsx';
import { Letter, ProgressBar } from '../components/ui.jsx';

// Расходы: сколько потрачено за период, по каким категориям и все траты по дням.
// Тап по категории оставляет в списке только её траты.
export default function Spend() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <div className="row-between">
        <div className="col" style={{ gap: 2 }}>
          <div className="t-eyebrow">{d.periodLabel}</div>
          <div className="t-title">Расходы</div>
        </div>
        <div className="round-add" onClick={() => a.go('add')}>+</div>
      </div>

      <div className="card" style={{ gap: 10 }}>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <div className="col" style={{ gap: 2 }}>
            <div className="t-meta">Потрачено</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }}>{d.spentFmt}</div>
          </div>
          <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
            <div className="t-meta">из лимита</div>
            <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>{d.budgetTotalFmt}</div>
          </div>
        </div>
        <ProgressBar height={8} pct={d.budgetSpentPct} color={d.budgetBarColor} />
        <div className="row-between t-meta">
          <span>Карта · {d.cardFmt}</span>
          <span>Наличные · {d.cashFmt}</span>
        </div>
        <div className="row-between" style={{ borderTop: '1px solid var(--ln)', paddingTop: 10 }}>
          <span className="t-meta">{d.autoOn ? 'Лимиты: распределяются сами' : 'Лимиты: вручную'}</span>
          <span className="t-link" onClick={() => a.openSheet('autoplan')}>{d.autoOn ? 'Настроить' : 'Распределить'} →</span>
        </div>
      </div>

      <div className="card" style={{ gap: 4 }}>
        <div className="row-between" style={{ paddingBottom: 6 }}>
          <div className="t-card">Категории</div>
          <div className="t-link" onClick={() => a.go('budget')}>Лимиты и свои →</div>
        </div>
        {d.spendCats.length === 0 && <div className="empty">Трат за этот период нет</div>}
        {d.spendCats.map(c => (
          <div key={c.id} className="cat-row" data-on={c.selected ? 'true' : 'false'} onClick={() => a.setSpendCat(c.selected ? null : c.id)}>
            <Letter size={34} radius={11} bg={c.bg} color={c.color} fontSize={14}>{c.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <div className="row-between" style={{ gap: 8 }}>
                <span className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{c.spentFmt}</span>
              </div>
              {c.limit > 0 && <ProgressBar height={5} pct={c.budgetPct} color={c.barColor} />}
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <div className="t-card ellipsis">{d.spendCatName ? 'Траты · ' + d.spendCatName : 'Все траты'}</div>
        {d.spendCatName
          ? <div className="t-link" onClick={() => a.setSpendCat(null)}>Показать все</div>
          : <div className="t-sub">{d.txCount}</div>}
      </div>
      {d.spendDays.length === 0 && <div className="card"><div className="empty">Пока нет трат за этот период. Нажмите +.</div></div>}
      {d.spendDays.map(g => (
        <div key={g.iso} className="card card--list">
          <div className="row-between" style={{ padding: '12px 0 2px' }}>
            <div className="t-sub">{g.label}</div>
            <div className="t-sub">−{g.totalFmt}</div>
          </div>
          {g.items.map(t => (
            <div key={t.id} className="list-row list-row--tap" style={{ padding: '11px 0' }} onClick={() => a.openSheet('tx', { tx: t })}>
              <Letter size={38} radius={12} bg={t.bg} color={t.color} fontSize={15}>{t.letter}</Letter>
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <div className="ellipsis" style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</div>
                <div className="t-meta ellipsis">{t.metaDay}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>−{t.amountFmt}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
