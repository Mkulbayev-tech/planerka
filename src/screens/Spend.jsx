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

      {d.limitAlerts.length > 0 && <LimitAlerts onOpen={() => a.go('budget')} />}

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

      <div className="card" style={{ gap: 10 }}>
        <div className="row-between">
          <div className="t-card">Регулярные платежи</div>
          <div className="t-link" onClick={() => a.go('bills')}>{d.billRows.length ? 'Все →' : 'Добавить →'}</div>
        </div>
        {d.billRows.length === 0 && <div className="t-meta">Кредит, рассрочка, связь, подписки — внесутся сами в свой день, с напоминанием.</div>}
        {d.billRows.slice(0, 3).map(b => (
          <div key={b.id} className="row list-row--tap" style={{ gap: 12 }} onClick={() => a.openSheet('bill', { bill: b })}>
            <Letter size={34} radius={11} bg={b.bg} color={b.color} fontSize={14}>{b.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 1, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>{b.title}</div>
              <div className="t-meta" style={{ color: b.statusColor }}>{b.status}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{b.amountFmt}</div>
          </div>
        ))}
        {d.billRows.length > 3 && <div className="t-meta">и ещё {d.billRows.length - 3}</div>}
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

      <div className="soft-btn" onClick={() => a.openSheet('import')}>Загрузить выписку Kaspi</div>

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

// Категории, где потрачено 80% лимита и больше; превышенные — красным
export function LimitAlerts({ onOpen, max = 4 }) {
  const { d } = useBudget();
  return (
    <div className="card" style={{ gap: 10 }} onClick={onOpen}>
      <div className="row-between">
        <div className="t-card">{d.limitAlerts.some(x => x.over) ? 'Лимиты превышены' : 'Лимиты почти исчерпаны'}</div>
        <div className="t-link">Лимиты →</div>
      </div>
      {d.limitAlerts.slice(0, max).map(x => (
        <div key={x.id} className="alert-row">
          <Letter size={30} radius={10} bg={x.bg} color={x.color} fontSize={13}>{x.letter}</Letter>
          <div className="ellipsis" style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{x.name}</div>
          <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', color: x.over ? 'var(--red)' : 'var(--amber)' }}>{x.short}</div>
        </div>
      ))}
    </div>
  );
}
