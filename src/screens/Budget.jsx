import { useBudget } from '../store.jsx';
import { Letter, ProgressBar, BackHead } from '../components/ui.jsx';

export default function Budget() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('cats')} title="Бюджет на месяц" />

      <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <div className="col" style={{ gap: 2 }}><div className="t-meta">Лимит</div><div style={{ fontSize: 18, fontWeight: 800 }}>{d.budgetTotalFmt}</div></div>
        <div className="col" style={{ gap: 2 }}><div className="t-meta">Потрачено</div><div style={{ fontSize: 18, fontWeight: 800 }}>{d.spentFmt}</div></div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}><div className="t-meta">Осталось</div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{d.budgetLeftFmt}</div></div>
      </div>

      <div className="t-meta" style={{ padding: '0 4px' }}>Нажмите на категорию, чтобы изменить лимит</div>

      <div className="col" style={{ gap: 10 }}>
        {d.catStats.map(c => (
          <div key={c.id} className="card list-row--tap" style={{ borderRadius: 22, padding: 16, gap: 12 }} onClick={() => a.openSheet('limit', { cat: c })}>
            <div className="row" style={{ gap: 12 }}>
              <Letter size={38} radius={12} bg={c.bg} color={c.color} fontSize={15}>{c.letter}</Letter>
              <div className="col" style={{ flex: 1, gap: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
                <div className="t-meta" style={{ color: c.statusColor }}>{c.status}</div>
              </div>
              <div className="col" style={{ gap: 2, textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{c.spentFmt}</div>
                <div className="t-meta">из {c.limitFmt}</div>
              </div>
            </div>
            <ProgressBar height={8} pct={c.budgetPct} color={c.barColor} />
          </div>
        ))}
      </div>
    </div>
  );
}
