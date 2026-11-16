import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { CatIcon, Icon, ProgressBar } from '../components/ui.jsx';

// Расходы (макет «Семейный бюджет», шаг 2a): месяц ‹ ›, сколько потрачено и сколько ещё можно,
// фильтр «Все / участники / Категории», поиск и траты по дням со значком автора.
export default function Spend() {
  const { d, a } = useBudget();
  const v = d.sv;
  const [searching, setSearching] = useState(!!d.spendQuery);
  const multi = d.memberAvatars.length > 1;
  const filtered = !!(d.spendWho || d.spendCatName || d.spendQuery);
  return (
    <div className="screen">
      <div className="row-between" style={{ gap: 10 }}>
        <div className="t-title">Расходы</div>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="back-btn" aria-label="Поиск" onClick={() => { if (searching) a.setSpendQuery(''); setSearching(!searching); }}>
            <Icon name={searching ? 'close' : 'search'} size={18} />
          </button>
          <div className="round-add" onClick={() => a.go('add')} aria-label="Добавить трату">+</div>
        </div>
      </div>

      {searching && (
        <input className="input" autoFocus value={d.spendQuery} onChange={e => a.setSpendQuery(e.target.value)} placeholder="Magnum, кафе, такси…" enterKeyHint="search" />
      )}

      <div className="month-switch">
        <button type="button" className="month-switch__arrow" disabled={!v.canPrev} onClick={() => a.setShift(v.shift - 1)} aria-label="Предыдущий месяц">‹</button>
        <div className="month-switch__label">
          <div className="month-switch__title">{v.isCurrent ? d.monthName[0].toUpperCase() + d.monthName.slice(1) : v.title}</div>
          <div className="t-meta">{v.range}</div>
        </div>
        <button type="button" className="month-switch__arrow" disabled={!v.canNext} onClick={() => a.setShift(v.shift + 1)} aria-label="Следующий месяц">›</button>
      </div>

      <div className="col" style={{ gap: 10 }}>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <div className="t-num" style={{ fontSize: 32, lineHeight: 1.1 }}>{v.spentFmt}</div>
          {v.isCurrent && d.budgetTotal > 0 && <div className="t-meta" style={{ paddingBottom: 4 }}>из {d.budgetTotalFmt}</div>}
        </div>
        {v.isCurrent && d.budgetTotal > 0 && <ProgressBar height={4} pct={d.budgetSpentPct} color={d.budgetBarColor} track="var(--ln)" />}
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
      </div>

      {!v.empty && (
        <div className="chips" style={{ flex: 'none' }}>
          <button type="button" className="filter-chip" aria-pressed={!d.spendWho ? 'true' : 'false'} onClick={() => a.setSpendWho(null)}>Все</button>
          {multi && d.memberAvatars.map(m => (
            <button type="button" key={m.id} className="filter-chip" aria-pressed={d.spendWho === m.id ? 'true' : 'false'} onClick={() => a.setSpendWho(d.spendWho === m.id ? null : m.id)}>{m.name}</button>
          ))}
          <button type="button" className="filter-chip" aria-pressed={d.spendCatName ? 'true' : 'false'} onClick={() => (d.spendCatName ? a.setSpendCat(null) : a.openSheet('catFilter'))}>
            {d.spendCatName ? d.spendCatName + ' ×' : 'Категории ▾'}
          </button>
        </div>
      )}

      {v.empty && <EmptyMonth v={v} />}
      {!v.empty && d.spendDays.length === 0 && (
        <div className="card"><div className="empty">Ничего не нашлось{filtered ? ' — сбросьте фильтр' : ''}</div></div>
      )}
      {d.spendDays.map(g => (
        <div key={g.iso} className="card card--list">
          <div className="row-between" style={{ padding: '12px 0 2px' }}>
            <div className="t-sub">{g.label}</div>
            <div className="t-sub">−{g.totalFmt}</div>
          </div>
          {g.items.map(t => (
            <div key={t.id} className="list-row list-row--tap" style={{ padding: '11px 0' }} onClick={() => a.openSheet('tx', { tx: t })}>
              <div style={{ position: 'relative', flex: 'none' }}>
                <CatIcon size={42} icon={t.icon} letter={t.letter} color={t.color} />
                {t.whoLetter && <span className="who-badge" style={{ color: t.whoColor }}>{t.whoLetter}</span>}
              </div>
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{t.title}</div>
                <div className="t-meta ellipsis">{t.metaDay}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>−{t.amountFmt}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
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
          <div className="t-meta">Нажмите +, чтобы внести первую, или загрузите выписку из Kaspi: «Ещё» → «Импорт».</div>
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
        <div className="t-link">Лимиты</div>
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
