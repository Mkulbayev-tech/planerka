import { useBudget } from '../store.jsx';
import { CatIcon, BackHead } from '../components/ui.jsx';

// Платежи (Планы → «Платежи», макет шаг 2b): сколько спишется до конца месяца, неделя с днями списаний и список.
// В день платежа трата вносится сама, в 10:00 приходит напоминание.
export function BillsPanel() {
  const { d, a } = useBudget();
  return (
    <>
      <div className="card" style={{ gap: 12 }}>
        <div className="row-between">
          <div className="t-meta">До {d.billsUntilLabel} спишется</div>
          <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.billsLeftFmt}</div>
        </div>
        <div className="week-strip">
          {d.billWeek.map(x => (
            <div key={x.iso} className="week-strip__day" data-today={x.isToday ? 'true' : 'false'}>
              <span className="week-strip__wd">{x.label}</span>
              <span className="week-strip__num">{x.day}</span>
              <span className="week-strip__dot" style={{ opacity: x.has ? 1 : 0 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card card--list">
        {d.billRows.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Пока нет платежей. Добавьте кредит, рассрочку, связь или подписку — внесутся сами в свой день.</div>}
        {d.billRows.map(b => (
          <div key={b.id} className="list-row list-row--tap" onClick={() => a.openSheet('bill', { bill: b })}>
            <CatIcon size={42} icon={b.icon} letter={b.letter} color={b.color} />
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{b.title}</div>
              <div className="t-meta ellipsis" style={{ color: b.paid ? 'var(--green)' : undefined }}>{b.paid ? 'внесено' : b.status} · {b.day}-го числа{b.payerName ? ' · ' + b.payerName : ''}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{b.amountFmt}</div>
          </div>
        ))}
      </div>

      <div className="soft-btn" onClick={() => a.openSheet('bill')}>+ Добавить платёж</div>
      <div className="t-meta" style={{ padding: '0 4px' }}>Удалённую вручную трату приложение не вернёт. Категории платежей автораспределение считает обязательными.</div>
    </>
  );
}

// Отдельный экран (старый адрес «bills») — то же содержимое
export default function Bills() {
  const { a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.openPlans('bills')} title="Регулярные платежи" />
      <BillsPanel />
    </div>
  );
}
