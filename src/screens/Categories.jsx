import { useBudget } from '../store.jsx';
import { Letter, Donut, BackHead } from '../components/ui.jsx';

export default function Categories() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('home')} title="Категории затрат" />

      <div className="card" style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <Donut size={120} inset={18} bg={d.donut}>
          <div className="t-sub" style={{ fontSize: 11 }}>Всего</div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>{d.spentShort}</div>
        </Donut>
        <div className="col" style={{ flex: 1, gap: 8 }}>
          {d.catStats.map(c => (
            <div key={c.id} className="row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>
              <span className="dot9" style={{ background: c.color }} />
              <div style={{ flex: 1 }}>{c.name}</div>
              <div className="muted">{c.share}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card--list">
        {d.catStats.map(c => (
          <div key={c.id} className="list-row">
            <Letter size={42} radius={14} bg={c.bg} color={c.color} fontSize={16}>{c.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 2 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
              <div className="t-meta">{c.count} операций</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{c.spentFmt}</div>
          </div>
        ))}
      </div>

      <div className="cta" onClick={() => a.go('budget')}>
        <div className="col" style={{ gap: 2 }}>
          <div className="cta__title">Лимиты по категориям</div>
          <div className="t-meta">{d.overCount} превышено</div>
        </div>
        <div className="cta__chev">›</div>
      </div>
    </div>
  );
}
