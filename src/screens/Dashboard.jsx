import { useBudget } from '../store.jsx';
import { BarChart, PairBars, Letter, Donut } from '../components/ui.jsx';

export default function Dashboard() {
  const { s, d, a } = useBudget();
  const seg = p => ({ background: s.period === p ? 'var(--accent)' : 'transparent', color: s.period === p ? '#fff' : 'var(--mu)' });
  return (
    <div className="screen">
      <div className="t-title">Дашборд</div>

      <div className="seg">
        <div className="seg__item" style={seg('week')} onClick={() => a.setPeriod('week')}>Неделя</div>
        <div className="seg__item" style={seg('month')} onClick={() => a.setPeriod('month')}>Месяц</div>
        <div className="seg__item" style={seg('year')} onClick={() => a.setPeriod('year')}>Год</div>
      </div>

      <div className="grid2">
        <div className="tile tile--kpi"><div className="tile__label">Расходы</div><div className="tile__value">{d.chartTotalFmt}</div><div className="tile__sub" style={{ color: d.deltaColor }}>{d.deltaText}</div></div>
        <div className="tile tile--kpi"><div className="tile__label">Доходы</div><div className="tile__value">{d.kpiIncomeFmt}</div><div className="tile__sub" style={{ color: 'var(--green)' }}>{d.incomeDeltaText} к прошлому</div></div>
        <div className="tile tile--kpi"><div className="tile__label">Отложено</div><div className="tile__value">{d.kpiSavedFmt}</div><div className="tile__sub">{d.saveRate}% от дохода</div></div>
        <div className="tile tile--kpi"><div className="tile__label">В день</div><div className="tile__value">{d.perDayFmt}</div><div className="tile__sub">в среднем</div></div>
      </div>

      <div className="card" style={{ padding: '20px 18px', gap: 16 }}>
        <div className="row-between">
          <div className="t-card">Доходы и расходы</div>
          <div className="legend">
            <span><i style={{ background: 'var(--green)' }} />Доход</span>
            <span><i style={{ background: 'var(--accent)' }} />Расход</span>
          </div>
        </div>
        <PairBars items={d.pairBars} height={130} />
      </div>

      <div className="card" style={{ padding: '20px 18px', gap: 16 }}>
        <div className="t-card">Структура расходов</div>
        <div className="row" style={{ gap: 18 }}>
          <Donut size={110} inset={17} bg={d.donut} gap={0}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>{d.topCatShare}%</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)' }}>{d.topCatName}</div>
          </Donut>
          <div className="col" style={{ flex: 1, gap: 9 }}>
            {d.catStats.map(c => (
              <div key={c.id} className="row" style={{ gap: 8 }}>
                <span className="dot9" style={{ background: c.color }} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--mu)' }}>{c.spentShort}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div className="row-between">
          <div className="t-card">Наличные и карта</div>
          <div className="t-meta" style={{ fontWeight: 700 }}>{d.cashPct}% / {d.cardPct}%</div>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 3 }}>
          <div style={{ background: 'var(--green)', borderRadius: 99, width: d.cashPct + '%' }} />
          <div style={{ background: 'var(--accent)', borderRadius: 99, flex: 1 }} />
        </div>
        <div className="row-between" style={{ fontSize: 13, fontWeight: 700 }}>
          <span className="row" style={{ gap: 6 }}><i className="dot8" style={{ background: 'var(--green)' }} />Наличные {d.cashFmt}</span>
          <span className="row" style={{ gap: 6 }}><i className="dot8" style={{ background: 'var(--accent)' }} />Карта {d.cardFmt}</span>
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <div className="t-card">Выполнение планов</div>
          <div className="t-link" onClick={() => a.go('plans')}>Все →</div>
        </div>
        <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
          <Stat label="Сегодня" value={d.taskPct + '%'} />
          <Stat label="Неделя" value={d.weekPlanPct + '%'} />
          <Stat label="Месяц" value={d.monthPct + '%'} />
          <Stat label="Серия" value={d.streak + ' дн'} />
        </div>
        <BarChart items={d.weekPlan} height={76} />
      </div>

      <div className="card card--list">
        <div className="t-card" style={{ padding: '12px 0 6px' }}>Самые крупные траты</div>
        {d.topTxs.length === 0 && <div className="empty">Пока нет трат за этот период</div>}
        {d.topTxs.map(t => (
          <div key={t.id} className="list-row list-row--tap" style={{ padding: '11px 0' }} onClick={() => a.openSheet('tx', { tx: t })}>
            <Letter size={38} radius={12} bg={t.bg} color={t.color} fontSize={15}>{t.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
              <div className="t-meta ellipsis">{t.meta}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>−{t.amountFmt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="col" style={{ flex: 1, gap: 3 }}>
      <div className="tile__label">{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}
