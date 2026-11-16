import { useBudget } from '../store.jsx';
import { useLongPress } from '../hooks.js';
import { BackHead, ProgressBar, Icon } from '../components/ui.jsx';
import { shoppingFromMenu } from '../lib/family.js';
import { iso, addDays, parseIso } from '../lib/dates.js';
import { uid } from '../data.js';
import { shareText } from '../native.js';

// Меню на неделю (макет, шаг 5a): ужины по дням, кто готовит, чего не хватает → «Собрать список покупок»
export function Menu() {
  const { s, d, a } = useBudget();
  const m = d.menu;
  const shiftWeek = n => a.setView({ menuWeek: iso(addDays(parseIso(m.weekIso), 7 * n)) });
  const collect = () => {
    const week = ((s.household && s.household.settings && s.household.settings.menu) || {})[m.weekIso] || {};
    const by = s.user ? s.user.id : null;
    a.setKey('shop', cur => {
      const shop = cur && typeof cur === 'object' ? cur : {};
      const items = Array.isArray(shop.items) ? shop.items : [];
      const add = shoppingFromMenu(week, items).map(x => ({ id: uid(), ...x, done: false, by }));
      return { ...shop, items: [...items, ...add] };
    });
    a.go('shopping');
  };
  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Меню" />
      <div className="row-between" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="strip-nav" aria-label="Прошлая неделя" onClick={() => shiftWeek(-1)}>‹</button>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{m.label}</div>
          <button type="button" className="strip-nav" aria-label="Следующая неделя" onClick={() => shiftWeek(1)}>›</button>
        </div>
        <button type="button" className="t-meta" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => a.openSheet('menuPrefs')}>ужины · на {m.people} чел.</button>
      </div>

      <div className="card card--list">
        {m.days.map(x => (
          <div key={x.idx} className="list-row list-row--tap" onClick={() => a.openSheet('dish', { week: m.weekIso, idx: x.idx })}>
            <div style={{ width: 34, flex: 'none', fontSize: 13, fontWeight: 700, color: x.isToday ? 'var(--accent-tx)' : 'var(--mu)' }}>{x.wd}</div>
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600, color: x.dish ? 'var(--tx)' : 'var(--mu)' }}>{x.dish || 'Не выбрано'}</div>
              {x.dish ? <div className="t-meta ellipsis">{x.sub}</div> : <div className="t-link" style={{ fontSize: 13 }}>+ Добавить блюдо</div>}
            </div>
            {x.dish && (x.needCount
              ? <div className="t-meta" style={{ fontSize: 14 }}>{x.needCount}</div>
              : <span style={{ color: 'var(--green)', display: 'flex' }}><Icon name="check" size={18} /></span>)}
          </div>
        ))}
      </div>

      {m.needCount > 0 && (
        <div className="card" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', background: 'var(--as)', padding: 16 }}>
          <span className="dot9" style={{ background: 'var(--accent)', marginTop: 6 }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            Продукты на неделю ≈ {m.needSumFmt}{m.foodLeftText ? ' · ' + m.foodLeftText : ''}
          </div>
        </div>
      )}
      <div className="submit" style={{ background: m.needCount ? 'var(--accent)' : 'var(--ip)', color: m.needCount ? 'var(--on-accent)' : 'var(--mu)' }} onClick={() => (m.needCount ? collect() : a.go('shopping'))}>
        {m.needCount ? `Собрать список покупок · ${m.needCount}` : 'Открыть список покупок'}
      </div>
    </div>
  );
}

// Список покупок (макет, шаг 5a): по группам, отметки видны обоим сразу, «Поделиться», внести купленное в расходы
export function Shopping() {
  const { s, d, a } = useBudget();
  const sh = d.shopping;
  const by = s.user ? s.user.id : null;
  const toggle = id => a.setKey('shop', cur => {
    const shop = cur && typeof cur === 'object' ? cur : {};
    return { ...shop, items: (shop.items || []).map(x => (x.id === id ? { ...x, done: !x.done } : x)), last: { by, at: Date.now() } };
  });
  const share = () => {
    const lines = sh.groups.flatMap(g => [g.name + ':', ...g.items.filter(x => !x.done).map(x => `— ${x.name}${x.qty ? ' · ' + x.qty : ''}`)]);
    shareText('Список покупок\n' + lines.join('\n')).then(ok => { if (ok === 'copied') a.toast('Список скопирован'); });
  };
  const clearDone = () => a.setKey('shop', cur => ({ ...(cur || {}), items: ((cur && cur.items) || []).filter(x => !x.done) }));
  return (
    <div className="screen">
      <div className="row-between">
        <BackHead onBack={() => a.go('menu')} title="Покупки" />
        {sh.total > 0 && <div className="t-link" onClick={share}>Поделиться</div>}
      </div>

      {sh.presence && (
        <div className="row" style={{ gap: 10, padding: '12px 14px', borderRadius: 16, background: 'var(--gr-bg)', border: '1px solid var(--bd)', fontSize: 14, fontWeight: 500 }}>
          <span className="dot9" style={{ background: 'var(--green)' }} />{sh.presence}
        </div>
      )}

      {sh.total > 0 && (
        <div className="col" style={{ gap: 8 }}>
          <div className="row-between" style={{ alignItems: 'baseline' }}>
            <div className="t-num" style={{ fontSize: 22 }}>{sh.done} из {sh.total}</div>
            <div className="t-meta">≈ {sh.sumFmt}</div>
          </div>
          <ProgressBar height={4} pct={sh.pct} color="var(--green)" track="var(--ln)" transition />
        </div>
      )}
      {sh.total === 0 && <div className="card"><div className="empty">Список пуст. Добавьте продукты или соберите их из меню на неделю.</div></div>}

      {sh.groups.map(g => (
        <div key={g.name} className="col" style={{ gap: 8 }}>
          <div className="t-meta" style={{ fontWeight: 600, letterSpacing: 0.6, padding: '0 4px', textTransform: 'uppercase', fontSize: 12 }}>{g.name}</div>
          <div className="card card--list">
            {g.items.map(x => <ShopRow key={x.id} x={x} onToggle={() => toggle(x.id)} onEdit={() => a.openSheet('shopItem', { item: x })} />)}
          </div>
        </div>
      ))}

      <button type="button" className="soft-btn" style={{ background: 'none', border: '1px solid var(--bd)', color: 'var(--mu)', justifyContent: 'flex-start', padding: '0 18px', gap: 10, width: '100%', font: 'inherit', fontSize: 15 }} onClick={() => a.openSheet('shopItem')}>
        <span style={{ color: 'var(--accent-tx)', fontSize: 20 }}>+</span> Добавить продукт
      </button>
      {sh.done > 0 && (
        <div className="row" style={{ gap: 10 }}>
          {sh.doneSum > 0 && <div className="soft-btn" style={{ flex: 1.4 }} onClick={() => a.openSheet('op', { kind: 'tx', amount: sh.doneSum, title: 'Продукты', cat: 'food' })}>Внести в расходы ≈ {sh.doneSumFmt}</div>}
          <div className="soft-btn" style={{ flex: 1, background: 'var(--ip)', color: 'var(--mu)' }} onClick={clearDone}>Убрать купленное</div>
        </div>
      )}
    </div>
  );
}

// Тап — отметить купленным, удержание — изменить
function ShopRow({ x, onToggle, onEdit }) {
  const press = useLongPress(onEdit, onToggle);
  return (
    <div className="list-row list-row--tap pressable" {...press}>
      <span className="shop-check" data-on={x.done ? 'true' : 'false'}>{x.done && <Icon name="check" size={14} stroke={2.6} />}</span>
      <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <div className="ellipsis" style={{ fontSize: 16, fontWeight: 600, textDecoration: x.done ? 'line-through' : 'none', color: x.done ? 'var(--mu)' : 'var(--tx)' }}>{x.name}{x.qty ? ' · ' + x.qty : ''}</div>
        {!x.done && x.sub && <div className="t-meta ellipsis">{x.sub}</div>}
      </div>
      {x.priceFmt && <div className="t-meta" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{x.priceFmt}</div>}
    </div>
  );
}
