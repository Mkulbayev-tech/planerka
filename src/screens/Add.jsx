import { useBudget } from '../store.jsx';
import { KEYS } from '../data.js';
import { Letter } from '../components/ui.jsx';

export default function Add() {
  const { s, d, a } = useBudget();
  return (
    <div className="screen screen--add">
      <div className="row-between">
        <div className="t-link" style={{ fontSize: 15 }} onClick={() => a.go('home')}>Отмена</div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Новая трата</div>
        <div style={{ width: 52 }} />
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        <div className="pill" style={{ background: d.cardPillBg, color: d.cardPillFg }} onClick={() => a.setMethod('card')}>Карта</div>
        <div className="pill" style={{ background: d.cashPillBg, color: d.cashPillFg }} onClick={() => a.setMethod('cash')}>Наличные</div>
      </div>

      <div className="col" style={{ textAlign: 'center', padding: '14px 0 4px', gap: 6 }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: d.amountColor }}>{d.amountDisplay}</div>
        <div className="t-eyebrow">{d.pickedCatName} · {d.methodName}</div>
      </div>

      <div className="chips" style={{ padding: '2px 20px', flex: 'none' }}>
        {d.cats.map(c => (
          <div key={c.id} className="chip chip--pick" style={{ background: c.pickBg, borderColor: c.pickBorder }} onClick={() => a.pickCat(c.id)}>
            <Letter size={26} radius="50%" bg={c.bg} color={c.color} fontSize={12}>{c.letter}</Letter>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
          </div>
        ))}
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
      <div className="submit" style={{ background: d.submitBg }} onClick={a.submitTx}>Добавить трату</div>
    </div>
  );
}
