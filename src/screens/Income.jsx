import { useBudget } from '../store.jsx';
import { Letter, BackHead } from '../components/ui.jsx';

export default function Income() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('home')} title="Доходы" />

      <div className="hero">
        <div className="hero__label">Доход за {d.monthName}</div>
        <div className="hero__value" style={{ color: 'var(--green)' }}>{d.incomeFmt}</div>
        <div className="row-between" style={{ fontSize: 14 }}>
          <span style={{ color: 'var(--mu)' }}>Среднее за 6 мес · {d.avg6Fmt}</span>
          {d.incomeDeltaText && <span style={{ background: 'var(--ip)', padding: '4px 10px', borderRadius: 99, fontWeight: 500 }}>{d.incomeDeltaText}</span>}
        </div>
      </div>

      <div className="card card--list">
        {d.incomeRows.length === 0 && <div className="empty">Доходов за этот период пока нет</div>}
        {d.incomeRows.map(i => (
          <div key={i.id} className="list-row list-row--tap"
            onClick={() => (i.kind === 'salary' ? a.openSheet('salary', { value: d.salary }) : a.openSheet('income', { income: i }))}>
            <Letter size={42} radius="50%" bg="var(--ip)" color="var(--green)" fontSize={16}>{i.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{i.name}</div>
              <div className="t-meta">{i.meta}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>+{i.amountFmt}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Зарплата — регулярно</div>
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
