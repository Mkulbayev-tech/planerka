import { useBudget } from '../store.jsx';
import { CatIcon, Icon, ProgressBar } from '../components/ui.jsx';

// Расходы: любой месяц (‹ ›), сколько потрачено и сколько ещё можно, категории и траты по дням.
// Тап по категории оставляет в списке только её траты.
export default function Spend() {
  const { d, a } = useBudget();
  const v = d.sv;
  return (
    <div className="screen">
      <div className="row-between">
        <div className="t-title">Расходы</div>
        <div className="round-add" onClick={() => a.go('add')} aria-label="Добавить трату">+</div>
      </div>

      <div className="month-switch">
        <button type="button" className="month-switch__arrow" disabled={!v.canPrev} onClick={() => a.setShift(v.shift - 1)} aria-label="Предыдущий месяц">‹</button>
        <div className="month-switch__label">
          <div className="month-switch__title">{v.title}</div>
          <div className="t-meta">{v.range}</div>
        </div>
        <button type="button" className="month-switch__arrow" disabled={!v.canNext} onClick={() => a.setShift(v.shift + 1)} aria-label="Следующий месяц">›</button>
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <div className="col" style={{ gap: 2 }}>
            <div className="t-meta">Потрачено</div>
            <div className="t-num" style={{ fontSize: 30, lineHeight: 1.1 }}>{v.spentFmt}</div>
          </div>
          {v.isCurrent && d.budgetTotal > 0 && (
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
              <div className="t-meta">лимит</div>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.budgetTotalFmt}</div>
            </div>
          )}
        </div>
        {v.isCurrent && d.budgetTotal > 0 && <ProgressBar height={8} pct={d.budgetSpentPct} color={d.budgetBarColor} />}
        {v.say && <div className="spend-say" data-over={v.over ? 'true' : 'false'}>{v.say}</div>}
        {v.isCurrent && d.limitAlerts.length > 0 && (
          <div className="alert-pills">
            {d.limitAlerts.slice(0, 3).map(x => (
              <span key={x.id} className="alert-pill" data-over={x.over ? 'true' : 'false'} onClick={() => a.setSpendCat(x.id)}>
                {x.name} · {x.over ? x.short : x.pct + '%'}
              </span>
            ))}
          </div>
        )}
        {!v.empty && (
          <div className="row-between t-meta">
            <span>Карта {v.cardFmt}</span>
            <span>Наличные {v.cashFmt}</span>
          </div>
        )}
      </div>

      {v.isCurrent && (
        <div className="quick-row">
          <QuickTile icon="pie" title="Распределить" sub={d.autoOn ? 'включено' : 'по доходу'} onClick={() => a.openSheet('autoplan')} />
          <QuickTile icon="repeat" title="Платежи" sub={d.nextBillText} onClick={() => a.go('bills')} />
          <QuickTile icon="file" title="Выписка" sub="из Kaspi" onClick={() => a.openSheet('import')} />
        </div>
      )}

      {d.spendCats.length > 0 && (
        <div className="card" style={{ gap: 4 }}>
          <div className="row-between" style={{ paddingBottom: 6 }}>
            <div className="t-card">По категориям</div>
            <div className="t-link" onClick={() => a.go('budget')}>Лимиты</div>
          </div>
          {d.spendCats.map(c => (
            <div key={c.id} className="cat-row" data-on={c.selected ? 'true' : 'false'} onClick={() => a.setSpendCat(c.selected ? null : c.id)}>
              <CatIcon size={38} icon={c.icon} letter={c.letter} color={c.color} />
              <div className="col" style={{ flex: 1, gap: 6, minWidth: 0 }}>
                <div className="row-between" style={{ gap: 8 }}>
                  <span className="ellipsis" style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.spentFmt}</span>
                </div>
                {v.isCurrent && c.limit > 0 && <ProgressBar height={5} pct={c.budgetPct} color={c.barColor} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {v.empty
        ? <EmptyMonth v={v} />
        : (
          <>
            <div className="section-head">
              <div className="t-card ellipsis">{d.spendCatName ? d.spendCatName : 'Все траты'}</div>
              {d.spendCatName
                ? <div className="t-link" onClick={() => a.setSpendCat(null)}>Показать все</div>
                : <div className="t-sub">{v.count}</div>}
            </div>
            {d.spendDays.map(g => (
              <div key={g.iso} className="card card--list">
                <div className="row-between" style={{ padding: '12px 0 2px' }}>
                  <div className="t-sub">{g.label}</div>
                  <div className="t-sub">−{g.totalFmt}</div>
                </div>
                {g.items.map(t => (
                  <div key={t.id} className="list-row list-row--tap" style={{ padding: '11px 0' }} onClick={() => a.openSheet('tx', { tx: t })}>
                    <CatIcon size={40} icon={t.icon} letter={t.letter} color={t.color} />
                    <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                      <div className="ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{t.title}</div>
                      <div className="t-meta ellipsis">{t.metaDay}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>−{t.amountFmt}</div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
    </div>
  );
}

function QuickTile({ icon, title, sub, onClick }) {
  return (
    <button type="button" className="quick-tile" onClick={onClick}>
      <span className="quick-tile__icon"><Icon name={icon} size={22} /></span>
      <span className="quick-tile__title">{title}</span>
      <span className="quick-tile__sub">{sub}</span>
    </button>
  );
}

// Пустой месяц — не тупик: где последние траты и что сделать
function EmptyMonth({ v }) {
  const { a } = useBudget();
  return (
    <div className="card empty-month">
      <div className="empty-month__icon"><Icon name="inbox" size={40} stroke={1.5} /></div>
      {v.isCurrent && v.lastHint && (
        <>
          <div className="empty-month__title">В этом месяце трат пока нет</div>
          <div className="t-meta">Последние траты были {v.lastHint.date} — они в прошлых месяцах.</div>
          <div className="soft-btn" style={{ alignSelf: 'stretch' }} onClick={() => a.openPeriod(v.lastHint.shift)}>Открыть {v.lastHint.month}</div>
          <div className="t-link" onClick={() => a.go('add')}>Добавить трату</div>
        </>
      )}
      {v.isCurrent && !v.lastHint && (
        <>
          <div className="empty-month__title">Трат пока нет</div>
          <div className="t-meta">Нажмите +, чтобы внести первую, или загрузите выписку из Kaspi.</div>
        </>
      )}
      {!v.isCurrent && (
        <>
          <div className="empty-month__title">В этом месяце трат не было</div>
          {v.lastHint && <div className="soft-btn" style={{ alignSelf: 'stretch' }} onClick={() => a.openPeriod(v.lastHint.shift)}>Открыть {v.lastHint.month}</div>}
        </>
      )}
    </div>
  );
}

// Категории, где потрачено 80% лимита и больше; превышенные — первыми
export function LimitAlerts({ onOpen, max = 4 }) {
  const { d } = useBudget();
  return (
    <div className="card" style={{ gap: 10 }} onClick={onOpen}>
      <div className="row-between">
        <div className="t-card">Осторожно с тратами</div>
        <div className="t-link">Расходы</div>
      </div>
      {d.limitAlerts.slice(0, max).map(x => (
        <div key={x.id} className="alert-row">
          <CatIcon size={34} icon={x.icon} letter={x.letter} color={x.color} />
          <div className="ellipsis" style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{x.name}</div>
          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: x.over ? 'var(--red)' : 'var(--amber)' }}>{x.short}</div>
        </div>
      ))}
    </div>
  );
}
