import { useBudget } from '../store.jsx';
import { BackHead, Icon } from '../components/ui.jsx';

// Семья (Ещё → «Семья», макет шаг 2c): участники и их траты за месяц, приглашение, общие настройки бюджета.
export default function Family() {
  const { d, a, mode } = useBudget();
  const people = d.memberStats.filter(m => m.id !== 'unknown');
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Семья" />

      <div className="card card--list">
        {people.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Пока вы одни — пригласите партнёра</div>}
        {people.map(m => (
          <div key={m.id} className="list-row">
            <span className="cat-ico" style={{ width: 42, height: 42, color: m.color, fontWeight: 600, fontSize: 16 }}>{m.letter}</span>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{m.name}</div>
              <div className="t-meta">{m.isMe ? 'Это вы' : 'Участник'} · полный доступ</div>
            </div>
            <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.spentFmt}</div>
              <div className="t-meta">траты за месяц</div>
            </div>
          </div>
        ))}
      </div>

      {mode === 'supabase' && d.inviteCode && (
        <button type="button" className="soft-btn" style={{ border: '1px dashed var(--bd)', width: '100%', font: 'inherit', fontSize: 15, fontWeight: 600 }} onClick={a.copyInvite}>
          + Пригласить участника · код {d.inviteCode}
        </button>
      )}

      <div className="section-head"><div className="t-card">Настройки бюджета</div></div>
      <div className="card card--menu">
        <div className="menu-row menu-row--link" onClick={() => a.openSheet('monthStart', { value: d.monthStartDay })}>
          <span className="menu-row__title">Начало периода</span><span className="menu-row__value">{d.monthStartDay} число ›</span>
        </div>
        <div className="menu-row menu-row--link" onClick={() => a.go('income')}>
          <span className="menu-row__title">Зарплаты и доходы</span><span className="menu-row__value">{d.incomeFmt} ›</span>
        </div>
        <div className="menu-row">
          <span className="menu-row__title">Основная валюта</span><span className="menu-row__value">Тенге ₸</span>
        </div>
        {d.settleAvailable && (
          <div className="menu-row menu-row--link" onClick={() => a.openSheet('settle')}>
            <span className="menu-row__title">Кто кому должен</span><span className="menu-row__value">{d.settleOn ? (d.settle && !d.settle.settled ? d.settle.amountFmt : 'всё ровно') : 'выключено'} ›</span>
          </div>
        )}
      </div>
      <div className="t-meta" style={{ padding: '0 4px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Icon name="users" size={16} /> Все траты, планы и цели видны обоим участникам сразу.
      </div>
    </div>
  );
}
