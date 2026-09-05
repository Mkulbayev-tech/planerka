import { useBudget } from '../store.jsx';
import { Ring, BarChart, Letter, Checkbox, ProgressBar } from '../components/ui.jsx';

export default function Home() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <div className="row-between">
        <div className="col" style={{ gap: 2 }}>
          <div className="t-eyebrow">{d.todayLabel}</div>
          <div className="t-title">Привет, {d.greetingName}</div>
        </div>
        <div className="avatar-btn" onClick={() => a.go('settings')}>{d.greetingName[0].toUpperCase()}</div>
      </div>

      <div className="hero hero--purple">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div className="col" style={{ gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.75 }}>Можно потратить до {d.periodEndLabel}</div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.4, lineHeight: 1 }}>{d.balanceFmt}</div>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>≈ {d.perDayLeftFmt} в день · {d.daysLeft} дней</div>
          </div>
          <Ring size={76} r={31} width={9} pct={d.spentPct} track="rgba(255,255,255,0.22)" color="#fff">
            <span style={{ fontSize: 15, fontWeight: 800 }}>{d.spentPct}%</span>
          </Ring>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="hero-tile" onClick={() => a.go('income')}>
            <div className="hero-tile__label"><span className="dot" style={{ background: '#7EE2B0' }} />Доходы</div>
            <div className="hero-tile__value">{d.incomeFmt}</div>
          </div>
          <div className="hero-tile" onClick={() => a.go('cats')}>
            <div className="hero-tile__label"><span className="dot" style={{ background: '#FFB4A4' }} />Расходы</div>
            <div className="hero-tile__value">{d.spentFmt}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '18px 18px 14px' }}>
        <div className="row-between" style={{ alignItems: 'baseline' }}>
          <div className="t-card">Эта неделя</div>
          <div className="t-sub">{d.weekTotalFmt}</div>
        </div>
        <BarChart items={d.weekBars} height={72} />
      </div>

      <div className="row" style={{ gap: 12 }}>
        <WalletCard label="Наличные" value={d.cashFmt} pct={d.cashPct} count={d.cashCount} color="var(--green)" kind="cash" />
        <WalletCard label="Карта" value={d.cardFmt} pct={d.cardPct} count={d.cardCount} color="var(--accent)" kind="card" />
      </div>

      <div className="chips">
        {d.catStats.map(c => (
          <div key={c.id} className="chip chip--shadow" onClick={() => a.go('cats')}>
            <Letter size={26} radius="50%" bg={c.bg} color={c.color} fontSize={12}>{c.letter}</Letter>
            <div className="col">
              <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
              <div className="chip__sub">{c.spentFmt}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <Ring size={60} r={26} width={8} pct={d.taskPct} track="var(--ip)" color="var(--green)" transition=".4s">
            <span style={{ fontSize: 13, fontWeight: 800 }}>{d.doneCount}/{d.taskTotal}</span>
          </Ring>
          <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <div className="t-card">План на сегодня</div>
            <div className="t-meta">Выполнено {d.taskPct}% · затраты по плану {d.plannedCostFmt}</div>
          </div>
          <div className="t-link" onClick={() => a.go('plans')}>Все →</div>
        </div>
        <div className="col" style={{ gap: 2 }}>
          {d.topTasks.length === 0 && <div className="empty">{d.taskTotal ? 'Все задачи на сегодня выполнены' : 'Задач на сегодня нет'}</div>}
          {d.topTasks.map(t => (
            <div key={t.id} className="task-mini" onClick={() => a.toggleTask(t.id)}>
              <Checkbox size={22} radius={7} icon={12} done={t.done} border={t.boxBorder} />
              <div className="task-mini__name">{t.name}</div>
              <div className="task-mini__time">{t.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <div className="t-card">Цели</div>
          <div className="t-link" onClick={() => a.go('goals')}>Все →</div>
        </div>
        {d.topGoals.length === 0 && <div className="empty">Пока нет целей</div>}
        {d.topGoals.map(g => (
          <div key={g.id} className="row" style={{ gap: 12 }}>
            <Letter size={40} radius={13} bg={g.bg} color={g.color} fontSize={15}>{g.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 7, minWidth: 0 }}>
              <div className="row-between" style={{ fontSize: 14, fontWeight: 700 }}>
                <span className="ellipsis">{g.name}</span><span className="muted">{g.pct}%</span>
              </div>
              <ProgressBar height={7} pct={g.pct} color={g.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="col" style={{ gap: 10 }}>
        <div className="section-head">
          <div className="t-card">Последние траты</div>
          <div className="t-link" onClick={() => a.go('cats')}>Все →</div>
        </div>
        <div className="card card--list">
          {d.recentTxs.length === 0 && <div className="empty">Пока нет трат за этот период. Нажмите + внизу.</div>}
          {d.recentTxs.map(t => (
            <div key={t.id} className="list-row list-row--tap" style={{ padding: '12px 0' }} onClick={() => a.openSheet('tx', { tx: t })}>
              <Letter size={42} radius={14} bg={t.bg} color={t.color} fontSize={16}>{t.letter}</Letter>
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <div className="ellipsis" style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</div>
                <div className="t-meta ellipsis">{t.meta}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>−{t.amountFmt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WalletCard({ label, value, pct, count, color, kind }) {
  return (
    <div className="wallet">
      <div className="row" style={{ gap: 8 }}>
        <div className="wallet__icon" style={{ background: kind === 'cash' ? '#E6F6EE' : 'var(--as)' }}>
          {kind === 'cash'
            ? <div style={{ width: 15, height: 11, border: '2px solid #2FA66F', borderRadius: 3 }} />
            : <div style={{ width: 15, height: 11, borderRadius: 3, background: '#7A4AE0' }} />}
        </div>
        <div className="t-sub">{label}</div>
      </div>
      <div className="wallet__value">{value}</div>
      <ProgressBar height={5} pct={pct} color={color} />
      <div className="t-meta">{pct}% трат · {count} операций</div>
    </div>
  );
}
