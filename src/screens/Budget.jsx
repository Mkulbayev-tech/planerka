import { useBudget } from '../store.jsx';
import { ProgressBar, BackHead } from '../components/ui.jsx';

// Лимиты (Планы → «Лимиты», макет шаг 2b): бюджет периода и каждая категория — сколько потрачено и сколько осталось.
// «Изменить» — автораспределение; тап по категории — её лимит (своя категория — имя, иконка, цвет).
export function LimitsPanel() {
  const { d, a } = useBudget();
  const status = c => {
    if (!c.limit) return { text: 'без лимита', color: 'var(--mu)' };
    if (c.spent > c.limit) return { text: 'превышен', color: 'var(--red)' };
    if (c.spent === c.limit) return { text: 'оплачено', color: 'var(--green)' };
    const p = Math.round(c.spent / c.limit * 100);
    // тратится быстрее, чем идёт месяц
    if (p / 100 > d.periodShare + 0.2) return { text: `${p}% · рано`, color: 'var(--amber)' };
    return { text: `${p}%`, color: 'var(--mu)' };
  };
  return (
    <>
      <div className="card" style={{ gap: 10 }}>
        <div className="row-between">
          <div className="t-meta">Бюджет на период</div>
          <div className="t-link" onClick={() => a.openSheet('autoplan')}>Изменить</div>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <div className="t-num" style={{ fontSize: 26 }}>{d.spentFmt}</div>
          <div className="t-meta">из {d.budgetTotalFmt}</div>
        </div>
        <ProgressBar height={4} pct={d.budgetSpentPct} color={d.budgetBarColor} track="var(--ln)" />
        {d.autoOn && <div className="t-meta">Лимиты пересчитываются сами {d.monthStartDay}-го числа</div>}
      </div>

      <div className="card" style={{ gap: 0, padding: '6px 18px' }}>
        {d.catStats.map(c => {
          const st = status(c);
          return (
            <div key={c.id} className="list-row--tap" style={{ padding: '14px 0', borderBottom: '1px solid var(--ln)', display: 'flex', flexDirection: 'column', gap: 8 }}
              onClick={() => (c.custom ? !c.hidden && a.openSheet('cat', { cat: c }) : c.id !== 'other' && a.openSheet('limit', { cat: c }))}>
              <div className="row-between">
                <div className="row" style={{ gap: 8, minWidth: 0 }}>
                  <span className="dot9" style={{ background: c.color, width: 10, height: 10 }} />
                  <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: st.color, whiteSpace: 'nowrap' }}>{st.text}</span>
              </div>
              {c.limit > 0 && <ProgressBar height={4} pct={c.budgetPct} color={c.spent > c.limit ? 'var(--red)' : c.color} track="var(--ln)" />}
              <div className="row-between t-meta">
                <span>{c.spentFmt}</span>
                <span>{!c.limit ? '' : c.spent >= c.limit ? 'из ' + c.limitFmt : 'осталось ' + c.status.replace('Осталось ', '')}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="soft-btn" onClick={() => a.openSheet('cat')}>+ Новая категория</div>
    </>
  );
}

// Отдельный экран (старый адрес «budget») — то же содержимое
export default function Budget() {
  const { a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.openPlans('limits')} title="Лимиты и категории" />
      <LimitsPanel />
    </div>
  );
}
