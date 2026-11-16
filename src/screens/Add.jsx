import { useBudget } from '../store.jsx';
import { KEYS } from '../data.js';
import { useLongPress } from '../hooks.js';
import { Letter, CatIcon } from '../components/ui.jsx';

export default function Add() {
  const { s, d, a } = useBudget();
  return (
    <div className="screen screen--add">
      <div className="row-between">
        <div className="t-link" style={{ fontSize: 15 }} onClick={() => a.go(s.prev || 'home')}>Отмена</div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Новая трата</div>
        <div style={{ width: 52 }} />
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <div className="pill" style={{ background: d.cardPillBg, color: d.cardPillFg }} onClick={() => a.setMethod('card')}>Карта</div>
        <div className="pill" style={{ background: d.cashPillBg, color: d.cashPillFg }} onClick={() => a.setMethod('cash')}>Наличные</div>
      </div>

      <div className="col" style={{ textAlign: 'center', padding: '14px 0 4px', gap: 6 }}>
        <div className="t-num" style={{ fontSize: 44, lineHeight: 1.05, color: d.amountColor }}>{d.amountDisplay}</div>
        <div className="t-eyebrow">{d.pickedCatName}{d.catAuto ? ' · подобрано' : ''} · {d.methodName}</div>
      </div>

      <div className="chips" style={{ padding: '2px 20px', flex: 'none' }}>
        {d.cats.map(c => <CatChip key={c.id} c={c} />)}
        <div className="chip chip--pick chip--new" onClick={() => a.openSheet('cat', { pick: true })}>
          <Letter size={28} radius="50%" bg="var(--as)" color="var(--accent-tx)" fontSize={16}>+</Letter>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Своя</div>
        </div>
      </div>

      <input
        className="note-input"
        value={s.note}
        onChange={e => a.setNote(e.target.value)}
        placeholder="Комментарий, например «Magnum»"
      />

      <div style={{ flex: 1 }} />

      <div className="keypad">
        {KEYS.map(k => (
          <div key={k} className="key" onClick={() => a.pressKey(k)}>{k}</div>
        ))}
      </div>
      <div className="submit" style={{ background: d.submitBg, color: d.submitFg }} onClick={a.submitTx}>Добавить трату</div>
    </div>
  );
}

// Тап — выбрать категорию; удержание на своей категории — изменить или удалить её.
function CatChip({ c }) {
  const { a } = useBudget();
  const press = useLongPress(() => { if (c.custom) a.openSheet('cat', { cat: c }); }, () => a.pickCat(c.id));
  return (
    <div className="chip chip--pick pressable" style={{ background: c.pickBg, borderColor: c.pickBorder }} {...press}>
      <CatIcon size={28} icon={c.icon} letter={c.letter} color={c.color} />
      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
    </div>
  );
}
