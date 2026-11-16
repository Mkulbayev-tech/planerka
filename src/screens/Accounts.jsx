import { useBudget } from '../store.jsx';
import { BackHead } from '../components/ui.jsx';

// Счета (Ещё → «Счета»): остатки по картам, наличным и валюте, курсы, куда приходит зарплата, переводы между счетами
export default function Accounts() {
  const { d, a } = useBudget();
  const ac = d.accounts;
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Счета" />
      {ac.list.length > 0 && (
        <div className="col" style={{ gap: 4 }}>
          <div className="t-meta" style={{ fontSize: 14 }}>Всего на счетах</div>
          <div className="t-num" style={{ fontSize: 34, lineHeight: 1.1 }}>≈ {ac.totalFmt}</div>
        </div>
      )}
      {ac.list.length === 0 && (
        <div className="card" style={{ gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Добавьте карту, наличные или валюту и укажите, сколько там сейчас.</div>
          <div className="t-meta">Остатки будут меняться сами по вашим тратам и доходам. Они появятся на главной.</div>
        </div>
      )}
      <div className="card card--list">
        {ac.list.map(x => (
          <div key={x.id} className="list-row list-row--tap" onClick={() => a.openSheet('account', { account: x })}>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{x.name}</div>
              <div className="t-meta">{x.kindLabel}{ac.salaryAcc === x.id ? ' · сюда приходит зарплата' : ''}</div>
            </div>
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
              <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', color: x.balance < 0 ? 'var(--red)' : 'var(--tx)' }}>{x.balanceFmt}</div>
              {x.cur !== 'KZT' && <div className="t-meta">≈ {Math.round(x.kzt).toLocaleString('ru-RU')} ₸</div>}
            </div>
          </div>
        ))}
        <div className="list-row list-row--tap" onClick={() => a.openSheet('account')}><span className="t-link" style={{ fontSize: 15 }}>+ Счёт</span></div>
      </div>

      {ac.list.length >= 2 && <div className="soft-btn" onClick={() => a.openSheet('op', { kind: 'transfer' })}>Перевод между счетами</div>}

      {ac.list.filter(x => x.kind === 'card' && x.cur === 'KZT').length > 1 && (
        <div className="col" style={{ gap: 8 }}>
          <div className="t-meta" style={{ padding: '0 4px' }}>Зарплата приходит на</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {ac.list.filter(x => x.cur === 'KZT').map(x => (
              <button key={x.id} type="button" className="filter-chip" aria-pressed={ac.salaryAcc === x.id ? 'true' : 'false'} onClick={() => a.setKey('salaryAcc', () => x.id)}>{x.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="section-head"><div className="t-card">Курсы к тенге</div><div className="t-meta">задаются вручную</div></div>
      <div className="card card--menu">
        {ac.rateRows.map(r => (
          <label key={r.id} className="menu-row">
            <span className="menu-row__title">1 {r.sign}</span>
            <input className="input" style={{ width: 110, textAlign: 'right', padding: '8px 10px' }} inputMode="decimal" defaultValue={r.value} key={r.id + r.value}
              onBlur={e => a.setRate(r.id, e.target.value)} aria-label={`Курс ${r.id}`} />
          </label>
        ))}
      </div>

      {ac.transfers.length > 0 && (
        <>
          <div className="section-head"><div className="t-card">Переводы</div></div>
          <div className="card card--list">
            {ac.transfers.map(x => (
              <div key={x.id} className="list-row">
                <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{x.text}</div>
                  <div className="t-meta">{x.dateLabel}{x.amountFmt !== x.gotFmt ? ' · пришло ' + x.gotFmt : ''}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{x.amountFmt}</div>
                <button type="button" className="t-link" style={{ background: 'none', border: 'none', color: 'var(--mu)', padding: '0 0 0 8px' }} aria-label="Удалить перевод" onClick={() => a.deleteTransfer(x.id)}>×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
