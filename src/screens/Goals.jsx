import { useBudget } from '../store.jsx';
import { Letter, ProgressBar } from '../components/ui.jsx';

export default function Goals() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <div className="row-between">
        <div className="t-title">Цели накоплений</div>
        <div className="round-add" onClick={() => a.openSheet('goal')}>+</div>
      </div>

      <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="col" style={{ gap: 2 }}>
          <div className="t-meta">Накоплено всего</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.6 }}>{d.savedTotalFmt}</div>
        </div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end', flex: 'none', whiteSpace: 'nowrap' }}>
          <div className="t-meta">В месяц</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>{d.perMonthFmt}</div>
        </div>
      </div>

      {d.goals.length === 0 && (
        <div className="card"><div className="empty">Пока нет целей. Нажмите +, чтобы добавить первую.</div></div>
      )}

      {d.goals.map(g => (
        <div key={g.id} className="card" style={{ borderRadius: 26 }}>
          <div className="row list-row--tap" style={{ gap: 12 }} onClick={() => a.openSheet('goal', { goal: g })}>
            <Letter size={48} radius={16} bg={g.bg} color={g.color} fontSize={18}>{g.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="t-card ellipsis">{g.name}</div>
              <div className="t-meta">{g.eta}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, color: g.color }}>{g.pct}%</div>
          </div>
          <ProgressBar height={10} pct={g.pct} color={g.color} transition />
          <div className="row-between">
            <div className="t-sub" style={{ fontWeight: 600 }}>
              <b style={{ color: 'var(--tx)', fontWeight: 800 }}>{g.savedFmt}</b> из {g.targetFmt}
            </div>
            <div className="pill" style={{ padding: '9px 14px', fontWeight: 800, background: g.bg, color: g.color }} onClick={() => a.openSheet('topup', { goal: g })}>
              + Пополнить
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
