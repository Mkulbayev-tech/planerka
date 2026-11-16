import { useBudget } from '../store.jsx';
import { ProgressBar } from '../components/ui.jsx';
import { LimitAlerts } from './Spend.jsx';

// Главная (макет «Семейный бюджет», шаг 2a): сколько можно тратить до зарплаты, куда уходят деньги, кто сколько потратил.
// Графики и сравнения — в «Ещё» → «Аналитика».
export default function Home() {
  const { d, a } = useBudget();
  const top = d.periodCats[0];
  const showMembers = d.memberStats.length > 1 && d.memberStats.some(m => m.spent > 0);
  return (
    <div className="screen">
      <div className="row-between" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="t-eyebrow ellipsis">{d.todayLabel}</div>
          <div className="t-title ellipsis">Наш бюджет</div>
        </div>
        <button type="button" className="avatar-stack" onClick={() => a.go(d.memberAvatars.length > 1 ? 'family' : 'settings')} aria-label="Семья">
          {(d.memberAvatars.length ? d.memberAvatars : [{ id: 'me', letter: d.greetingName[0].toUpperCase(), color: 'var(--accent-tx)' }]).slice(0, 3).map(m => (
            <span key={m.id} className="avatar-stack__item" style={{ color: m.color }}>{m.letter}</span>
          ))}
        </button>
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

      {d.limitAlerts.length > 0 && <LimitAlerts onOpen={() => a.openPlans('limits')} max={3} />}

      {d.nextBill && (
        <div className="card list-row--tap" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }} onClick={() => a.openPlans('bills')}>
          <div className="col" style={{ gap: 2, minWidth: 0 }}>
            <span className="t-meta">Скоро платёж, {d.nextBill.date}</span>
            <span className="ellipsis" style={{ fontSize: 15, fontWeight: 600 }}>{d.nextBill.title}</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.nextBill.amountFmt}</span>
        </div>
      )}

      <div className="card">
        <div className="row-between">
          <div className="t-card">Куда уходят деньги</div>
          <div className="t-link" onClick={() => a.go('analytics')}>Аналитика</div>
        </div>
        {!top && d.homeLastHint && (
          <div className="col" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div className="t-meta">В этом месяце трат пока нет. Последние были {d.homeLastHint.date}.</div>
            <div className="t-link" onClick={() => a.openPeriod(d.homeLastHint.shift)}>Открыть {d.homeLastHint.month}</div>
          </div>
        )}
        {!top && !d.homeLastHint && <div className="empty">Трат за этот месяц нет</div>}
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

      {showMembers && (
        <div className="card">
          <div className="t-card">Кто сколько потратил</div>
          <div className="bar-split" aria-hidden="true">
            {d.memberStats.map(m => <div key={m.id} style={{ flex: Math.max(m.spent, 1), background: m.color }} />)}
          </div>
          {d.memberStats.map(m => (
            <div key={m.id} className="row" style={{ gap: 12 }}>
              <span className="cat-ico" style={{ width: 36, height: 36, color: m.color, fontWeight: 600, fontSize: 14 }}>{m.letter}</span>
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{m.name}{m.isMe ? ' · вы' : ''}</div>
                <div className="t-meta">{m.count} операций · {m.share}%</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.spentFmt}</div>
            </div>
          ))}
          {d.settle && <SettleRow />}
        </div>
      )}
      {!showMembers && d.settle && <div className="card"><SettleRow first /></div>}

      <div className="card list-row--tap" onClick={() => a.openPlans('planner')}>
        <div className="row-between"><div className="t-card">Дела на сегодня</div><div className="t-link">Планёрка</div></div>
        <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
          <Stat label="Сегодня" value={d.taskRatio} />
          <Stat label="За неделю" value={d.weekPlanPct + '%'} />
          <Stat label="Серия" value={d.streak + ' дн'} />
        </div>
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
        <div style={{ fontSize: 15, fontWeight: 500 }}>{t.settled ? 'Расчёт: всё ровно' : `${t.fromName} → ${t.toName}`}</div>
        <div className="t-meta">С {t.sinceLabel}, делим {t.splitLabel}</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {!t.settled && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-tx)', whiteSpace: 'nowrap' }}>{t.amountFmt}</div>}
        <div className="t-link">›</div>
      </div>
    </div>
  );
}

