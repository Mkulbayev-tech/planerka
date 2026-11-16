import { useBudget } from '../store.jsx';
import { BackHead, ProgressBar, Icon } from '../components/ui.jsx';

// Кто кому должен (макет, шаг 5b): сумма между двумя, из чего сложилось, личные долги, «Рассчитаться»
export function Debts() {
  const { d, a } = useBudget();
  const t = d.settle;
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Кто кому должен" />
      {!d.settleAvailable && <div className="card"><div className="empty">Расчёт появится, когда в семье будет двое участников.</div></div>}
      {d.settleAvailable && !t && (
        <div className="card" style={{ gap: 12 }}>
          <div style={{ fontSize: 15 }}>Приложение посчитает, кто сколько заплатил за общие траты, и подскажет, кому сколько перевести.</div>
          <div className="t-meta">Считаются траты с дня включения: раньше один из вас мог вносить траты за всю семью.</div>
          <div className="submit" style={{ background: 'var(--accent)' }} onClick={() => a.setSettle(true)}>Включить с сегодняшнего дня</div>
        </div>
      )}
      {t && (
        <>
          <div className="card" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <Person name={t.settled ? t.aName : t.fromName} id={t.settled ? t.aId : t.fromId} />
              <div className="col" style={{ flex: 1, alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div className="t-num" style={{ fontSize: 26, color: 'var(--accent-tx)' }}>{t.settled ? 'ровно' : t.amountFmt}</div>
                <div style={{ width: '100%', height: 2, background: 'var(--green)', position: 'relative', borderRadius: 2 }}>
                  {!t.settled && <span style={{ position: 'absolute', right: -2, top: -4, width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid var(--green)' }} />}
                </div>
              </div>
              <Person name={t.settled ? t.bName : t.toName} id={t.settled ? t.bId : t.toId} />
            </div>
            <div className="row-between" style={{ borderTop: '1px solid var(--ln)', paddingTop: 12 }}>
              <span className="t-meta" style={{ fontSize: 14 }}>Общие траты делим {t.splitLabel} · с {t.sinceLabel}</span>
              <span className="t-link" onClick={() => a.openSheet('settle')}>Изменить</span>
            </div>
          </div>

          <div className="section-head"><div className="t-card">Из чего сложилось</div><div className="t-link" onClick={() => a.openSheet('loan')}>+ Личный долг</div></div>
          <div className="card card--list">
            {d.debtsDetail.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>Пока нет общих трат с дня включения</div>}
            {d.debtsDetail.map(x => (
              <div key={x.id} className="list-row">
                <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{x.title}</div>
                  <div className="t-meta ellipsis">{x.meta}</div>
                </div>
                <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: x.whoColor, whiteSpace: 'nowrap' }}>{x.who} −{x.amountFmt}</div>
                  <div className="t-meta">{x.share}</div>
                </div>
              </div>
            ))}
          </div>
          {!t.settled && <div className="submit" style={{ background: 'var(--accent)' }} onClick={() => a.openSheet('settle')}>Рассчитаться · {t.amountFmt}</div>}
        </>
      )}
    </div>
  );
}

function Person({ name, id }) {
  const { d } = useBudget();
  const m = d.memberAvatars.find(x => x.id === id);
  return (
    <div className="col" style={{ alignItems: 'center', gap: 6, flex: 'none', width: 64 }}>
      <span className="cat-ico" style={{ width: 44, height: 44, color: m ? m.color : 'var(--mu)', fontWeight: 600, fontSize: 17 }}>{(name || '?')[0]}</span>
      <span className="ellipsis" style={{ fontSize: 13, fontWeight: 500, maxWidth: 64 }}>{name}</span>
    </div>
  );
}

// Кредиты и рассрочки (макет, шаг 5b): остаток, платёж в месяц, переплата, выгода досрочного платежа
export function Credits() {
  const { d, a } = useBudget();
  const c = d.credits;
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Кредиты" />
      <div className="col" style={{ gap: 4 }}>
        <div className="t-meta" style={{ fontSize: 14 }}>Осталось выплатить</div>
        <div className="t-num" style={{ fontSize: 36, lineHeight: 1.1 }}>{c.leftFmt}</div>
      </div>
      <div className="grid2">
        <div className="card" style={{ padding: 14, gap: 4 }}><span className="t-meta">В месяц</span><span style={{ fontSize: 18, fontWeight: 600 }}>{c.monthlyFmt}</span></div>
        <div className="card" style={{ padding: 14, gap: 4 }}><span className="t-meta">Переплата всего</span><span style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>{c.overpayFmt}</span></div>
      </div>

      {c.list.length === 0 && <div className="card"><div className="empty">Добавьте кредит или рассрочку — приложение посчитает переплату и подскажет, выгодно ли внести досрочно.</div></div>}
      {c.list.map(x => (
        <div key={x.id} className="card list-row--tap" style={{ gap: 10 }} onClick={() => a.openSheet('credit', { credit: x })}>
          <div className="row-between" style={{ gap: 10 }}>
            <span className="ellipsis" style={{ fontSize: 17, fontWeight: 600 }}>{x.name}</span>
            <span className="t-meta" style={{ whiteSpace: 'nowrap' }}>{x.rateText || x.leftFmt}</span>
          </div>
          <div className="row-between" style={{ fontSize: 14 }}>
            <span>осталось <b style={{ fontWeight: 600 }}>{x.leftFmt}</b></span>
            <span className="t-meta">{x.paid} из {x.total}</span>
          </div>
          <ProgressBar height={4} pct={x.pct} color={x.color} track="var(--ln)" />
          <div className="row-between t-meta">
            <span>{x.monthlyFmt} · {x.nextLabel}</span>
            <span style={{ color: x.overpay ? 'var(--red)' : 'var(--green)' }}>{x.overpay ? 'переплата ' + x.overpayFmt.replace(' ₸', '') : 'без переплаты'}</span>
          </div>
          {c.tip && c.tip.id === x.id && (
            <div style={{ background: 'var(--as)', border: '1px solid var(--bd)', borderRadius: 14, padding: '12px 14px', fontSize: 14, fontWeight: 500 }}>
              Внести досрочно {c.tip.amountFmt} — сэкономите <span style={{ color: 'var(--accent-tx)' }}>{c.tip.savedFmt}</span>{c.tip.months ? ` и закроете на ${c.tip.months} мес. раньше` : ''}
            </div>
          )}
        </div>
      ))}
      <div className="soft-btn" onClick={() => a.openSheet('credit')}>+ Кредит или рассрочка</div>
    </div>
  );
}

// Коммуналка (макет, шаг 5b): к оплате в этом месяце, история, счётчики с показаниями, постоянные платежи
export function Utilities() {
  const { d, a } = useBudget();
  const u = d.utilities;
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Коммуналка" />
      <div className="card" style={{ gap: 8 }}>
        <div className="row-between">
          <span className="t-meta" style={{ fontSize: 14 }}>{u.monthName[0].toUpperCase() + u.monthName.slice(1)} · к оплате</span>
          <span style={{ fontSize: 14, color: 'var(--red)', fontWeight: 500 }}>до {u.dueLabel}</span>
        </div>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <div className="t-num" style={{ fontSize: 34, lineHeight: 1.1 }}>{u.totalFmt}</div>
          <div className="row" style={{ gap: 4, alignItems: 'flex-end', height: 40 }} aria-hidden="true">
            {u.bars.map(b => <span key={b.key} style={{ width: 7, height: b.h + '%', borderRadius: 2, background: b.current ? 'var(--accent)' : 'var(--off)' }} />)}
          </div>
        </div>
        {u.deltaText && <div className="t-meta" style={{ fontSize: 14 }}>{u.deltaText}</div>}
      </div>

      <div className="section-head"><div className="t-card">Счётчики</div><div className="t-meta">передать до {u.dueLabel}</div></div>
      <div className="grid2">
        {u.meters.map(m => (
          <div key={m.id} className="card list-row--tap" style={{ padding: 14, gap: 4 }} onClick={() => a.openSheet('reading', { meter: m })}>
            <span style={{ fontSize: 13, color: m.color, fontWeight: 500 }}>{m.name}</span>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{m.valueFmt}</span>
            <span className="t-meta">{m.delta ? `+${m.delta} ${m.unit || ''} · ${m.costFmt}` : 'внесите показания'}</span>
          </div>
        ))}
        <button type="button" className="card list-row--tap" style={{ padding: 14, gap: 6, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', color: 'var(--accent-tx)', font: 'inherit', fontSize: 14, fontWeight: 500, minHeight: 96 }} onClick={() => a.openSheet('meter')}>
          <Icon name="plus" size={20} />Счётчик
        </button>
      </div>

      <div className="card card--list">
        {u.fixed.map(f => (
          <div key={f.id} className="list-row list-row--tap" onClick={() => a.openSheet('utilFixed', { item: f })}>
            <span style={{ flex: 1, fontSize: 16 }}>{f.name}</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{f.amountFmt}</span>
          </div>
        ))}
        <div className="list-row list-row--tap" onClick={() => a.openSheet('utilFixed')}>
          <span className="t-link" style={{ fontSize: 15 }}>+ Постоянный платёж</span>
        </div>
      </div>
      {u.total > 0 && <div className="submit" style={{ background: 'var(--accent)' }} onClick={() => a.openSheet('op', { kind: 'tx', amount: u.total, title: 'Коммунальные', cat: 'home' })}>Оплатить и внести в расходы · {u.totalFmt}</div>}
      <div className="t-meta" style={{ padding: '0 4px' }}>Сумма по счётчикам — разница с прошлыми показаниями × тариф. Тариф задаётся у счётчика.</div>
    </div>
  );
}
