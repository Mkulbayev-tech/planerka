import { useBudget } from '../store.jsx';
import { Letter, BackHead } from '../components/ui.jsx';

export default function Income() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('home')} title="Доходы" />

      <div className="hero hero--green">
        <div className="col" style={{ gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Доход за {d.monthName}</div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1 }}>{d.incomeFmt}</div>
        </div>
        <div className="row-between" style={{ fontSize: 13, fontWeight: 700 }}>
          <span style={{ opacity: 0.85 }}>Среднее за 6 мес · {d.avg6Fmt}</span>
          <span style={{ background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 99 }}>{d.incomeDeltaText}</span>
        </div>
      </div>

      <div className="card card--list">
        {d.incomeRows.length === 0 && <div className="empty">Доходов за этот период пока нет</div>}
        {d.incomeRows.map(i => (
          <div key={i.id} className="list-row list-row--tap"
            onClick={() => (i.kind === 'salary' ? a.openSheet('salary', { value: d.salary }) : a.openSheet('income', { income: i }))}>
            <Letter size={42} radius={14} bg="#E6F6EE" color="#2FA66F" fontSize={16}>{i.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 15, fontWeight: 700 }}>{i.name}</div>
              <div className="t-meta">{i.meta}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)', whiteSpace: 'nowrap' }}>+{i.amountFmt}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Зарплата — регулярно</div>
        <div className="row-between list-row--tap" style={{ fontSize: 14, fontWeight: 600 }} onClick={() => a.openSheet('salary', { value: d.salary })}>
          <span className="muted">Сумма в месяц</span><span>{d.salary ? d.salaryFmt : 'указать'} ›</span>
        </div>
        <div className="row-between" style={{ fontSize: 14, fontWeight: 600 }}>
          <span className="muted">Следующая</span><span>{d.nextSalaryLabel}</span>
        </div>
        <div className="row-between list-row--tap" style={{ fontSize: 14, fontWeight: 600 }} onClick={() => a.openSheet('monthStart', { value: d.monthStartDay })}>
          <span className="muted">Начало периода</span><span>{d.monthStartDay}-е число ›</span>
        </div>
      </div>

      <div className="soft-btn" onClick={() => a.openSheet('income')}>+ Добавить доход</div>
    </div>
  );
}
