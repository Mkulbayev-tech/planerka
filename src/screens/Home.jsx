import { useBudget } from '../store.jsx';
import { PairBars, Letter, ProgressBar } from '../components/ui.jsx';
import { LimitAlerts } from './Spend.jsx';

// Аналитика: сколько можно тратить до зарплаты и куда уходят деньги за выбранный период.
export default function Home() {
  const { s, d, a } = useBudget();
  const seg = p => ({ background: s.period === p ? 'var(--accent)' : 'transparent', color: s.period === p ? 'var(--on-accent)' : 'var(--mu)' });
  const top = d.periodCats[0];
  return (
    <div className="screen">
      <div className="row-between" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="t-eyebrow ellipsis">{d.todayLabel}</div>
          <div className="t-title ellipsis">Наш бюджет</div>
        </div>
        <div className="avatar-btn" style={{ flex: 'none' }} onClick={() => a.go('settings')}>{d.greetingName[0].toUpperCase()}</div>
      </div>

      <div className="hero">
        <div className="hero__label">Можно потратить до {d.periodEndLabel}</div>
        <div className="hero__value">{d.balanceFmt}</div>
        <div className="hero__sub">≈ {d.perDayLeftFmt} в день · ещё {d.daysLeft} дн.</div>
        <ProgressBar height={4} pct={d.spentPct} color="var(--accent)" track="var(--ln)" />
        <div className="hero-split">
          <button type="button" className="hero-tile" onClick={() => a.go('income')}>
            <span className="hero-tile__label">Пришло</span>
            <span className="hero-tile__value" style={{ color: 'var(--green)' }}>+{d.incomeFmt}</span>
          </button>
          <button type="button" className="hero-tile" onClick={() => a.go('spend')}>
            <span className="hero-tile__label">Потрачено</span>
            <span className="hero-tile__value" style={{ color: 'var(--red)' }}>−{d.spentFmt}</span>
          </button>
        </div>
      </div>

      {d.nextBill && (
        <div className="card list-row--tap" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }} onClick={() => a.go('bills')}>
          <div className="col" style={{ gap: 2, minWidth: 0 }}>
            <span className="t-meta">Скоро платёж, {d.nextBill.date}</span>
            <span className="ellipsis" style={{ fontSize: 15, fontWeight: 600 }}>{d.nextBill.title}</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.nextBill.amountFmt}</span>
        </div>
      )}

      {d.limitAlerts.length > 0 && <LimitAlerts onOpen={() => a.go('spend')} max={3} />}

      <div className="seg">
        <div className="seg__item" style={seg('week')} onClick={() => a.setPeriod('week')}>Неделя</div>
        <div className="seg__item" style={seg('month')} onClick={() => a.setPeriod('month')}>Месяц</div>
        <div className="seg__item" style={seg('year')} onClick={() => a.setPeriod('year')}>Год</div>
      </div>

      <div className="card" style={{ gap: 14 }}>
        <div className="row-between">
          <div className="t-card">Доходы и расходы</div>
          <div className="legend">
            <span><i style={{ background: 'var(--green)' }} />Доход</span>
            <span><i style={{ background: 'var(--accent)' }} />Расход</span>
          </div>
        </div>
        <PairBars items={d.pairBars} height={120} onPick={s.period === 'month' ? i => a.openPeriod(i - (d.pairBars.length - 1)) : undefined} />
        {s.period === 'month' && <div className="t-meta" style={{ marginTop: -6 }}>Нажмите на месяц, чтобы открыть его траты</div>}
        <div className="col">
          <KpiRow label="Расходы" value={d.chartTotalFmt} sub={d.deltaText} color={d.deltaColor} />
          <KpiRow label="Доходы" value={d.kpiIncomeFmt} sub={d.kpiIncomeDeltaText} color={d.kpiIncomeDeltaColor} />
          <KpiRow label="Отложено в цели" value={d.kpiSavedFmt} sub={d.saveRate + '% от дохода'} />
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <div className="col" style={{ gap: 1 }}>
            <div className="t-card">Куда уходят деньги</div>
            <div className="t-meta">{d.periodWord}</div>
          </div>
          <div className="t-link" onClick={() => a.go('spend')}>Все траты</div>
        </div>
        {!top && s.period === 'month' && d.homeLastHint && (
          <div className="col" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div className="t-meta">В этом месяце трат пока нет. Последние были {d.homeLastHint.date}.</div>
            <div className="t-link" onClick={() => a.openPeriod(d.homeLastHint.shift)}>Открыть {d.homeLastHint.month}</div>
          </div>
        )}
        {!top && !(s.period === 'month' && d.homeLastHint) && <div className="empty">Трат за этот период нет</div>}
        {top && (
          <div className="col" style={{ gap: 12 }}>
            <div className="bar-split" aria-hidden="true">
              {d.periodCats.map(c => <div key={c.id} style={{ flex: Math.max(c.spent, 1), background: c.color }} />)}
            </div>
            <div className="col" style={{ gap: 11, minWidth: 0 }}>
              {d.periodCats.slice(0, 5).map(c => (
                <div key={c.id} className="row" style={{ gap: 10 }}>
                  <span className="dot9" style={{ background: c.color, width: 10, height: 10 }} />
                  <div className="ellipsis" style={{ flex: 1, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--mu)', whiteSpace: 'nowrap' }}>{c.share}%</div>
                  <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', width: 96, textAlign: 'right' }}>{c.spentShort}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!(d.memberStatsPeriod.length > 1 && d.memberStatsPeriod.some(m => m.spent > 0)) && d.settle && (
        <div className="card"><SettleRow first /></div>
      )}

      {d.memberStatsPeriod.length > 1 && d.memberStatsPeriod.some(m => m.spent > 0) && (
        <div className="card">
          <div className="row-between"><div className="t-card">Кто сколько потратил</div><div className="t-meta">{d.periodWord}</div></div>
          <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 3 }}>
            {d.memberStatsPeriod.map(m => <div key={m.id} style={{ flex: Math.max(m.spent, 1), background: m.color, borderRadius: 99 }} />)}
          </div>
          {d.memberStatsPeriod.map(m => (
            <div key={m.id} className="row" style={{ gap: 12 }}>
              <Letter size={36} radius="50%" bg={m.bg} color={m.color} fontSize={14}>{m.letter}</Letter>
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                <div className="t-meta">{m.count} операций · {m.share}%</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.spentFmt}</div>
            </div>
          ))}
          {d.settle && <SettleRow />}
        </div>
      )}

      <div className="card list-row--tap" onClick={() => a.go('plans')}>
        <div className="row-between"><div className="t-card">Планы</div><div className="t-link">Открыть →</div></div>
        <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
          <Stat label="Сегодня" value={d.taskRatio} />
          <Stat label="За неделю" value={d.weekPlanPct + '%'} />
          <Stat label="Серия" value={d.streak + ' дн'} />
        </div>
      </div>
    </div>
  );
}

function KpiRow({ label, value, sub, color }) {
  return (
    <div className="kpi-row">
      <div className="t-sub">{label}</div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', color: color || 'var(--mu)' }}>{sub}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="col" style={{ flex: 1, gap: 3 }}>
      <div className="tile__label">{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

// Кто кому переводит, чтобы общие траты делились как договорились
function SettleRow({ first = false }) {
  const { d, a } = useBudget();
  const t = d.settle;
  return (
    <div className="row-between list-row--tap" style={first ? { gap: 10 } : { borderTop: '1px solid var(--ln)', paddingTop: 12, gap: 10 }} onClick={() => a.openSheet('settle')}>
      <div className="col" style={{ gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{t.settled ? 'Расчёт: всё ровно' : `${t.fromName} → ${t.toName}`}</div>
        <div className="t-meta">С {t.sinceLabel}, делим {t.splitLabel}</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {!t.settled && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-tx)', whiteSpace: 'nowrap' }}>{t.amountFmt}</div>}
        <div className="t-link">›</div>
      </div>
    </div>
  );
}
