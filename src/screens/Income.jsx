import { useBudget } from '../store.jsx';
import { BackHead } from '../components/ui.jsx';

// Доходы (макет «Семейный бюджет», шаг 2a): сколько пришло за месяц, у кого сколько, зарплаты, разовые и ожидаемые доходы.
export default function Income() {
  const { d, a } = useBudget();
  const multi = d.incomeMembers.length > 1;
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('home')} title="Доходы" />

      <div className="col" style={{ gap: 4 }}>
        <div className="t-meta" style={{ fontSize: 14 }}>{d.monthName[0].toUpperCase() + d.monthName.slice(1)} · {d.periodLabel}</div>
        <div className="t-num" style={{ fontSize: 40, lineHeight: 1.1, color: 'var(--green)' }}>+{d.incomeFmt}</div>
        {d.incomeSay && <div style={{ fontSize: 15, fontWeight: 500 }}>{d.incomeSay}</div>}
      </div>

      {multi && (
        <div className="grid2">
          {d.incomeMembers.map(m => (
            <div key={m.id} className="card" style={{ padding: 14, gap: 4 }}>
              <div className="row" style={{ gap: 6 }}><span className="dot9" style={{ background: m.color }} /><span className="t-meta">{m.name}</span></div>
              <div style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.amountFmt}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card card--list">
        {d.incomeRows.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Доходов за этот месяц пока нет</div>}
        {d.incomeRows.map(i => (
          <IncomeRow key={i.id} i={i} onClick={() => (i.kind === 'salary' ? a.openSheet('salary', { who: i.who, value: i.amount }) : a.openSheet('income', { income: i }))} />
        ))}
      </div>

      {d.incomeExpected.length > 0 && (
        <>
          <div className="section-head"><div className="t-card">Ожидается</div></div>
          <div className="card card--list" style={{ borderStyle: 'dashed' }}>
            {d.incomeExpected.map(i => <IncomeRow key={i.id} i={i} onClick={() => a.openSheet('income', { income: i })} />)}
          </div>
        </>
      )}

      <div className="row" style={{ gap: 10 }}>
        <div className="soft-btn" style={{ flex: 1 }} onClick={() => a.openSheet('op', { kind: 'income' })}>+ Доход</div>
        <div className="soft-btn" style={{ flex: 1 }} onClick={() => a.openSheet('salary', { who: d.me, value: d.salaries[d.me] || '' })}>Зарплата</div>
      </div>
      <div className="t-meta" style={{ padding: '0 4px' }}>
        Зарплаты приходят {d.monthStartDay}-го числа — это начало вашего месяца. Изменить: «Ещё» → «Семья».
      </div>
    </div>
  );
}

function IncomeRow({ i, onClick }) {
  return (
    <div className="list-row list-row--tap" onClick={onClick}>
      <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{i.name}</div>
        <div className="t-meta ellipsis">{i.meta}</div>
      </div>
      <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>+{i.amountFmt}</div>
        <div className="t-meta">{i.sub}</div>
      </div>
    </div>
  );
}
