import { useBudget } from '../store.jsx';
import { CatIcon, ProgressBar, BackHead, PlanBar } from '../components/ui.jsx';

export default function Budget() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('spend')} title="Лимиты и категории" />

      <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <div className="col" style={{ gap: 2 }}><div className="t-meta">Лимит</div><div style={{ fontSize: 18, fontWeight: 600 }}>{d.budgetTotalFmt}</div></div>
        <div className="col" style={{ gap: 2 }}><div className="t-meta">Потрачено</div><div style={{ fontSize: 18, fontWeight: 600 }}>{d.spentFmt}</div></div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}><div className="t-meta">Осталось</div><div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>{d.budgetLeftFmt}</div></div>
      </div>

      <div className="card list-row--tap" style={{ gap: 12 }} onClick={() => a.openSheet('autoplan')}>
        <div className="row-between">
          <div className="t-card">Автораспределение</div>
          <div className="t-link">{d.autoOn ? 'Включено' : 'Распределить'} →</div>
        </div>
        <div className="t-meta">{d.autoOn
          ? `Лимиты пересчитываются сами ${d.monthStartDay}-го числа: цели, обязательные платежи, остальное по привычным тратам`
          : 'Приложение само разложит доход по категориям: сначала цели и обязательные платежи, остальное — по привычным тратам'}</div>
        {d.autoPlan.income > 0 && <PlanBar parts={d.autoPlan.parts} height={8} />}
      </div>

      <div className="t-meta" style={{ padding: '0 4px' }}>Нажмите на категорию, чтобы изменить лимит. Свои категории можно переименовать или удалить.</div>

      <div className="col" style={{ gap: 10 }}>
        {d.catStats.map(c => (
          <div key={c.id} className="card list-row--tap" style={{ borderRadius: 22, padding: 16, gap: 12 }} onClick={() => (c.custom ? !c.hidden && a.openSheet('cat', { cat: c }) : c.id !== 'other' && a.openSheet('limit', { cat: c }))}>
            <div className="row" style={{ gap: 12 }}>
              <CatIcon size={40} icon={c.icon} letter={c.letter} color={c.color} />
              <div className="col" style={{ flex: 1, gap: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{c.name}</div>
                <div className="t-meta" style={{ color: c.statusColor }}>{c.status}</div>
              </div>
              <div className="col" style={{ gap: 2, textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.spentFmt}</div>
                <div className="t-meta">{c.limit ? 'из ' + c.limitFmt : 'без лимита'}</div>
              </div>
            </div>
            {c.limit > 0 && <ProgressBar height={8} pct={c.budgetPct} color={c.barColor} />}
          </div>
        ))}
      </div>

      <div className="soft-btn" onClick={() => a.openSheet('cat')}>+ Новая категория</div>
    </div>
  );
}
