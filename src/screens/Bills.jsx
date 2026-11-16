import { useBudget } from '../store.jsx';
import { CatIcon, BackHead } from '../components/ui.jsx';

// Регулярные платежи: кредит, рассрочка, связь, подписки — в свой день сами становятся тратой.
export default function Bills() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('spend')} title="Регулярные платежи" />

      <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <div className="col" style={{ gap: 2 }}><div className="t-meta">В месяц</div><div style={{ fontSize: 18, fontWeight: 600 }}>{d.billsMonthlyFmt}</div></div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}><div className="t-meta">Ещё внести до {d.periodEndLabel}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{d.billsLeftFmt}</div></div>
      </div>

      <div className="t-meta" style={{ padding: '0 4px' }}>
        В день платежа трата внесётся сама, а в 10:00 придёт напоминание. Удалённую вручную трату приложение не вернёт.
        Категории этих платежей автораспределение считает обязательными.
      </div>

      <div className="card card--list">
        {d.billRows.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Пока нет платежей. Добавьте кредит, связь или подписку.</div>}
        {d.billRows.map(b => (
          <div key={b.id} className="list-row list-row--tap" onClick={() => a.openSheet('bill', { bill: b })}>
            <CatIcon size={40} icon={b.icon} letter={b.letter} color={b.color} />
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{b.title}</div>
              <div className="t-meta ellipsis">{b.meta}</div>
            </div>
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{b.amountFmt}</div>
              <div className="t-meta" style={{ color: b.statusColor, whiteSpace: 'nowrap' }}>{b.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="soft-btn" onClick={() => a.openSheet('bill')}>+ Добавить платёж</div>
    </div>
  );
}
