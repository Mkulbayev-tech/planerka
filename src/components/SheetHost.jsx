// Формы: задача, цель, доход, детали траты, зарплата, лимит категории, начало периода.
import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { CATS, TAGS, TAG_COLORS, fmt } from '../data.js';
import { iso, shortDate } from '../lib/dates.js';
import { Sheet, Field, Chips, PrimaryButton, DangerButton } from './Sheet.jsx';
import { Letter } from './ui.jsx';

const num = v => Math.max(0, Math.round(Number(String(v).replace(/\s/g, '')) || 0));

export default function SheetHost() {
  const { s, a, d } = useBudget();
  const sh = s.sheet;
  if (!sh) return null;
  const close = a.closeSheet;
  switch (sh.kind) {
    case 'task': return <TaskSheet task={sh.task} date={sh.date} ownerDefault={sh.owner} onClose={close} />;
    case 'goal': return <GoalSheet goal={sh.goal} onClose={close} />;
    case 'topup': return <TopUpSheet goal={sh.goal} onClose={close} />;
    case 'income': return <IncomeSheet income={sh.income} onClose={close} />;
    case 'tx': return <TxSheet tx={sh.tx} onClose={close} />;
    case 'salary': return <AmountSheet title="Зарплата в месяц" label="Сумма, ₸" value={sh.value} hint="Зачисляется в начале каждого периода" onSave={v => { a.setSalary(v); close(); }} onClose={close} />;
    case 'limit': return <AmountSheet title={'Лимит: ' + sh.cat.name} label="Лимит на период, ₸" value={sh.cat.limit} onSave={v => { a.setLimit(sh.cat.id, v); close(); }} onClose={close} />;
    case 'monthStart': return <AmountSheet title="Начало периода" label="Число месяца (1–28)" value={sh.value || d.monthStartDay} hint="Обычно день зарплаты" max={28} onSave={v => { a.setMonthStart(v); close(); }} onClose={close} />;
    default: return null;
  }
}

function TaskSheet({ task, date, ownerDefault, onClose }) {
  const { a, d } = useBudget();
  const [name, setName] = useState(task ? task.name : '');
  const [dateV, setDateV] = useState(task ? task.date : (date || d.todayIso));
  const [time, setTime] = useState(task ? task.time || '' : '');
  const [owner, setOwner] = useState(task ? (task.owner || null) : (ownerDefault !== undefined ? ownerDefault : d.me));
  const [tag, setTag] = useState(task ? task.tag : TAGS[0]);
  const [cat, setCat] = useState(task ? task.cat || null : null);
  const [cost, setCost] = useState(task && task.cost ? String(task.cost) : '');
  const [repeat, setRepeat] = useState('none');
  const ok = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dateV);
  const save = () => { if (!ok) return; a.saveTask({ name: name.trim(), date: dateV, time, owner, tag, cat, cost: num(cost), repeat }, task && task.id); onClose(); };
  const ownerOptions = d.members.length > 1
    ? [...d.members.map(m => ({ id: m.id, label: m.id === d.me ? 'Мне' : m.name })), { id: null, label: 'Общая' }]
    : null;
  return (
    <Sheet title={task ? 'Задача' : 'Новая задача'} onClose={onClose}>
      <Field label="Название"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Например, оплатить интернет" autoFocus={!task} enterKeyHint="done" onKeyDown={e => e.key === 'Enter' && save()} /></Field>
      <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
        <Field label="Дата" style={{ flex: 1.2 }}><input className="input" type="date" value={dateV} onChange={e => setDateV(e.target.value)} /></Field>
        <Field label="Время" style={{ flex: 1 }}><input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} /></Field>
      </div>
      {ownerOptions && (
        <Field label="Кому">
          <Chips options={ownerOptions} value={owner} onChange={setOwner} />
        </Field>
      )}
      {!task && (
        <Field label="Повторять">
          <Chips options={[{ id: 'none', label: 'Один раз' }, { id: 'daily', label: 'Каждый день · 30 дней' }, { id: 'weekly', label: 'Каждую неделю · 8 недель' }]} value={repeat} onChange={setRepeat} />
        </Field>
      )}
      <Field label="Тип">
        <Chips options={TAGS.map(t => ({ id: t, label: t, color: TAG_COLORS[t][0], bg: TAG_COLORS[t][1] }))} value={tag} onChange={setTag} />
      </Field>
      <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
        <Field label="Затраты, ₸" style={{ flex: 1 }}><input className="input" type="number" inputMode="numeric" min="0" step="500" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" /></Field>
      </div>
      <Field label="Категория трат">
        <Chips options={[{ id: null, label: 'Без категории' }, ...CATS.map(c => ({ id: c.id, label: c.name, color: c.color, bg: c.bg, letter: c.name[0] }))]} value={cat} onChange={setCat} />
      </Field>
      <PrimaryButton disabled={!ok} onClick={save}>{task ? 'Сохранить' : repeat === 'none' ? 'Добавить задачу' : 'Добавить задачи'}</PrimaryButton>
      {task && <DangerButton onClick={() => { a.deleteTask(task.id); onClose(); }}>Удалить задачу</DangerButton>}
    </Sheet>
  );
}

function GoalSheet({ goal, onClose }) {
  const { a } = useBudget();
  const [name, setName] = useState(goal ? goal.name : '');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [per, setPer] = useState(goal && goal.per ? String(goal.per) : '');
  const [saved, setSaved] = useState(goal ? String(goal.saved) : '');
  const ok = name.trim().length > 0 && num(target) > 0;
  const save = () => {
    if (!ok) return;
    const fields = { name: name.trim(), target: num(target), per: num(per), saved: Math.min(num(target), num(saved)) };
    a.saveGoal(fields, goal && goal.id);
    onClose();
  };
  return (
    <Sheet title={goal ? 'Цель' : 'Новая цель'} onClose={onClose}>
      <Field label="Название"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Например, отпуск" autoFocus={!goal} enterKeyHint="next" /></Field>
      <Field label="Нужно накопить, ₸"><input className="input" type="number" inputMode="numeric" min="0" step="10000" value={target} onChange={e => setTarget(e.target.value)} placeholder="1 000 000" /></Field>
      <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
        <Field label="Откладывать в месяц, ₸" style={{ flex: 1 }}><input className="input" type="number" inputMode="numeric" min="0" step="5000" value={per} onChange={e => setPer(e.target.value)} placeholder="0" /></Field>
        <Field label="Уже накоплено, ₸" style={{ flex: 1 }}><input className="input" type="number" inputMode="numeric" min="0" step="5000" value={saved} onChange={e => setSaved(e.target.value)} placeholder="0" /></Field>
      </div>
      <PrimaryButton disabled={!ok} onClick={save}>{goal ? 'Сохранить' : 'Добавить цель'}</PrimaryButton>
      {goal && <DangerButton onClick={() => { a.deleteGoal(goal.id); onClose(); }}>Удалить цель</DangerButton>}
    </Sheet>
  );
}

function IncomeSheet({ income, onClose }) {
  const { a } = useBudget();
  const [title, setTitle] = useState(income ? income.title : '');
  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [date, setDate] = useState(income ? income.date : iso(new Date()));
  const [method, setMethod] = useState(income ? income.method || 'card' : 'card');
  const ok = title.trim().length > 0 && num(amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const save = () => { if (!ok) return; a.saveIncome({ title: title.trim(), amount: num(amount), date, method }, income && income.id); onClose(); };
  return (
    <Sheet title={income ? 'Доход' : 'Новый доход'} onClose={onClose}>
      <Field label="Откуда"><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, подработка" autoFocus={!income} enterKeyHint="next" /></Field>
      <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
        <Field label="Сумма, ₸" style={{ flex: 1 }}><input className="input" type="number" inputMode="numeric" min="0" step="1000" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Дата" style={{ flex: 1 }}><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      </div>
      <Field label="Куда пришло">
        <Chips options={[{ id: 'card', label: 'Карта' }, { id: 'cash', label: 'Наличные' }]} value={method} onChange={setMethod} />
      </Field>
      <PrimaryButton disabled={!ok} onClick={save}>{income ? 'Сохранить' : 'Добавить доход'}</PrimaryButton>
      {income && <DangerButton onClick={() => { a.deleteIncome(income.id); onClose(); }}>Удалить доход</DangerButton>}
    </Sheet>
  );
}

function TxSheet({ tx, onClose }) {
  const { a } = useBudget();
  return (
    <Sheet title="Трата" onClose={onClose}>
      <div className="row" style={{ gap: 12 }}>
        <Letter size={48} radius={16} bg={tx.bg} color={tx.color} fontSize={18}>{tx.letter}</Letter>
        <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <div className="ellipsis" style={{ fontSize: 17, fontWeight: 800 }}>{tx.title}</div>
          <div className="t-meta">{tx.catName} · {tx.methodName} · {tx.dateLabel}{tx.author ? ' · ' + tx.author : ''}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' }}>−{fmt(tx.amount)}</div>
      </div>
      <DangerButton onClick={() => { a.deleteTx(tx.id); onClose(); }}>Удалить трату</DangerButton>
    </Sheet>
  );
}

function AmountSheet({ title, label, value, hint, max, onSave, onClose }) {
  const [v, setV] = useState(value ? String(value) : '');
  const n = num(v);
  const ok = n > 0 && (!max || n <= max);
  return (
    <Sheet title={title} onClose={onClose}>
      <Field label={label}><input className="input" type="number" inputMode="numeric" min="0" max={max} value={v} onChange={e => setV(e.target.value)} autoFocus /></Field>
      {hint && <div className="t-meta">{hint}</div>}
      <PrimaryButton disabled={!ok} onClick={() => onSave(n)}>Сохранить</PrimaryButton>
    </Sheet>
  );
}

function TopUpSheet({ goal, onClose }) {
  const { a, d } = useBudget();
  const [v, setV] = useState('10000');
  const n = num(v);
  const left = Math.max(0, goal.target - goal.saved);
  const ok = n > 0 && left > 0;
  const history = [...(goal.topups || [])].slice(-6).reverse();
  return (
    <Sheet title={'Пополнить: ' + goal.name} onClose={onClose}>
      <div className="t-meta">Накоплено {fmt(goal.saved)} из {fmt(goal.target)}{left > 0 ? ' · осталось ' + fmt(left) : ' · цель достигнута'}</div>
      <Field label="Сумма пополнения, ₸"><input className="input" type="number" inputMode="numeric" min="0" step="1000" value={v} onChange={e => setV(e.target.value)} autoFocus enterKeyHint="done" onKeyDown={e => e.key === 'Enter' && ok && (a.topUpGoal(goal.id, n), onClose())} /></Field>
      <Chips options={[5000, 10000, 20000, 50000].map(x => ({ id: String(x), label: '+' + fmt(x) }))} value={v} onChange={setV} />
      <PrimaryButton disabled={!ok} onClick={() => { a.topUpGoal(goal.id, n); onClose(); }}>Пополнить</PrimaryButton>
      {history.length > 0 && (
        <div className="col" style={{ gap: 8 }}>
          <div className="field__label">Последние пополнения</div>
          {history.map((t, i) => (
            <div key={i} className="row-between" style={{ fontSize: 13, fontWeight: 600 }}>
              <span className="muted">{shortDate(t.date)}{t.by && d.membersById[t.by] ? ' · ' + d.membersById[t.by] : ''}</span>
              <span style={{ fontWeight: 800 }}>+{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
