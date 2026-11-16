// Формы: задача, цель, доход, детали траты, зарплата, лимит и своя категория, начало периода, пароль, автораспределение.
import { useMemo, useRef, useState } from 'react';
import { useBudget } from '../store.jsx';
import { CAT_PALETTE, CAT_SUGGEST, CAT_ICON_CHOICES, guessIcon, TAGS, TAG_COLORS, fmt, traty } from '../data.js';
import { pinProblem } from '../auth-profiles.js';
import { iso, shortDate } from '../lib/dates.js';
import { Sheet, Field, Chips, PrimaryButton, DangerButton } from './Sheet.jsx';
import { CatIcon, Icon, PlanBar, Switch } from './ui.jsx';
import { planBudget, basisText, SAVE_LEVELS, guessCat } from '../lib/autoplan.js';
import { BILL_SUGGEST } from '../lib/bills.js';
import { parseKaspiLines, parseCsv, buildImport } from '../lib/statement.js';

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
    case 'salary': return <SalarySheet who={sh.who} value={sh.value} onClose={close} />;
    case 'op': return <OpSheet kind={sh.kind} onClose={close} />;
    case 'catFilter': return <CatFilterSheet onClose={close} />;
    case 'limit': return <AmountSheet title={'Лимит: ' + sh.cat.name} label="Лимит на период, ₸" value={sh.cat.limit} onSave={v => { a.setLimit(sh.cat.id, v); close(); }} onClose={close} />;
    case 'cat': return <CategorySheet cat={sh.cat} pick={sh.pick} onClose={close} />;
    case 'pin': return <PinSheet onClose={close} />;
    case 'autoplan': return <AutoPlanSheet onClose={close} />;
    case 'bill': return <BillSheet bill={sh.bill} onClose={close} />;
    case 'import': return <ImportSheet onClose={close} />;
    case 'sweep': return <SweepSheet onClose={close} />;
    case 'settle': return <SettleSheet onClose={close} />;
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
        <Chips options={[{ id: null, label: 'Без категории' }, ...d.cats.map(c => ({ id: c.id, label: c.name, color: c.color, bg: c.bg, letter: c.letter }))]} value={cat} onChange={setCat} />
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
  const { a, d } = useBudget();
  const [who, setWho] = useState(income ? income.who || null : d.me);
  const [title, setTitle] = useState(income ? income.title : '');
  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [date, setDate] = useState(income ? income.date : iso(new Date()));
  const [method, setMethod] = useState(income ? income.method || 'card' : 'card');
  const ok = title.trim().length > 0 && num(amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const save = () => { if (!ok) return; a.saveIncome({ title: title.trim(), amount: num(amount), date, method, ...(d.members.length > 1 ? { who } : {}) }, income && income.id); onClose(); };
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
      {d.members.length > 1 && (
        <Field label="Кто получил">
          <Chips options={[...d.members.map(m => ({ id: m.id, label: m.id === d.me ? 'Я' : m.name })), { id: null, label: 'Общий' }]} value={who} onChange={setWho} />
        </Field>
      )}
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
        <CatIcon size={48} icon={tx.icon} letter={tx.letter} color={tx.color} />
        <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <div className="ellipsis" style={{ fontSize: 17, fontWeight: 600 }}>{tx.title}</div>
          <div className="t-meta">{tx.catName} · {tx.methodName} · {tx.dateLabel}{tx.author ? ' · ' + tx.author : ''}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}>−{fmt(tx.amount)}</div>
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
              <span style={{ fontWeight: 600 }}>+{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// Своя категория трат: название (с подсказками «Кредит», «Рассрочка»…), цвет и необязательный лимит.
// pick — открыта с экрана новой траты: после сохранения сразу выбрать её.
function CategorySheet({ cat, pick, onClose }) {
  const { a, d } = useBudget();
  const usedColors = new Set(d.cats.filter(c => c.custom).map(c => c.color));
  const [name, setName] = useState(cat ? cat.name : '');
  const [color, setColor] = useState(cat ? [cat.color, cat.bg] : (CAT_PALETTE.find(([c]) => !usedColors.has(c)) || CAT_PALETTE[0]));
  const [limit, setLimit] = useState(cat && cat.limit ? String(cat.limit) : '');
  const [icon, setIcon] = useState(cat ? cat.icon || null : null);
  const iconV = icon || guessIcon(name);
  const key = name.trim().toLowerCase();
  const taken = !!key && d.cats.some(c => c.id !== (cat && cat.id) && c.name.trim().toLowerCase() === key);
  const ok = key.length > 0 && !taken;
  const suggest = cat ? [] : CAT_SUGGEST.filter(x => !d.cats.some(c => c.name.trim().toLowerCase() === x.toLowerCase()));
  const save = () => {
    if (!ok) return;
    const id = a.saveCategory({ name: name.trim(), color: color[0], bg: color[1], limit: num(limit), icon: icon || null }, cat && cat.id);
    if (pick) a.pickCat(id);
    // открыли из «Новой операции» — вернуться в неё, новая категория уже в сетке
    if (pick === 'op') { a.openSheet('op', { kind: 'tx' }); return; }
    onClose();
  };
  return (
    <Sheet title={cat ? 'Категория' : 'Новая категория'} onClose={onClose}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
        <CatIcon size={48} icon={iconV} letter={(name.trim()[0] || '+').toUpperCase()} color={color[0]} />
        <Field label="Название" style={{ flex: 1 }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Например, кредит" autoFocus={!cat} maxLength={24} enterKeyHint="done" onKeyDown={e => e.key === 'Enter' && save()} />
        </Field>
      </div>
      {taken && <div className="t-meta" style={{ color: 'var(--red)' }}>Такая категория уже есть</div>}
      {suggest.length > 0 && <Chips options={suggest.map(x => ({ id: x, label: x }))} value={name.trim()} onChange={setName} />}
      <Field label={icon ? 'Иконка' : 'Иконка · подобрана по названию'}>
        <div className="icon-pick">
          {CAT_ICON_CHOICES.map(x => (
            <button type="button" key={x} className="icon-pick__item" data-on={x === iconV ? 'true' : 'false'} onClick={() => setIcon(x === icon ? null : x)} aria-label={x}><Icon name={x} size={20} /></button>
          ))}
        </div>
      </Field>
      <Field label="Цвет">
        <div className="swatches">
          {CAT_PALETTE.map(([c, bg]) => (
            <div key={c} className="swatch" data-on={c === color[0] ? 'true' : 'false'} style={{ background: c }} onClick={() => setColor([c, bg])} />
          ))}
        </div>
      </Field>
      <Field label="Лимит на период, ₸"><input className="input" type="number" inputMode="numeric" min="0" step="5000" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Без лимита" /></Field>
      <PrimaryButton disabled={!ok} onClick={save}>{cat ? 'Сохранить' : 'Добавить категорию'}</PrimaryButton>
      {cat && <DangerButton onClick={() => { a.deleteCategory(cat.id); onClose(); }}>Удалить категорию</DangerButton>}
    </Sheet>
  );
}

// Смена пароля. force — обязательная: пока пароль совпадает с номером профиля, войти в бюджет может кто угодно.
export function PinSheet({ force = false, onClose }) {
  const { s, a } = useBudget();
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const problem = pin ? pinProblem(pin) : '';
  const mismatch = !!pin2 && pin2.trim() !== pin.trim();
  const ok = !!pin && !problem && !mismatch && !!pin2 && !s.busy;
  const save = () => { if (ok) a.changePin(pin.trim()); };
  return (
    <Sheet title={force ? 'Придумайте пароль' : 'Сменить пароль'} onClose={onClose || (() => {})} closable={!force}>
      {force && <div className="t-meta">Сейчас пароль совпадает с номером профиля, и войти в ваш бюджет может кто угодно. Придумайте свой — его нужно будет вводить при входе.</div>}
      <Field label="Новый пароль"><input className="input" type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Минимум 6 цифр" autoFocus /></Field>
      <Field label="Ещё раз"><input className="input" type="password" inputMode="numeric" autoComplete="new-password" value={pin2} onChange={e => setPin2(e.target.value)} enterKeyHint="done" onKeyDown={e => e.key === 'Enter' && save()} /></Field>
      {(problem || mismatch) && <div className="t-meta" style={{ color: 'var(--red)' }}>{problem || 'Пароли не совпадают'}</div>}
      <PrimaryButton disabled={!ok} onClick={save}>{s.busy ? 'Сохраняем…' : 'Сохранить пароль'}</PrimaryButton>
      {force && <div className="t-meta">На другом телефоне с этим профилем входите с новым паролем.</div>}
    </Sheet>
  );
}

// Автораспределение: приложение раскладывает доход периода по категориям —
// сначала цели и обязательные платежи, остальное по привычным тратам. Можно применить
// один раз или включить, чтобы лимиты пересчитывались сами в начале каждого периода.
function AutoPlanSheet({ onClose }) {
  const { a, d } = useBudget();
  const [save, setSave] = useState(d.autoSave);
  const [on, setOn] = useState(d.autoOn);
  const p = useMemo(() => planBudget(d.planInput, save), [d.planInput, save]);
  const apply = () => { a.applyPlan(p.limits, { on, save, period: d.periodStartIso }); onClose(); };
  const offBg = d.dark ? '#3A3746' : '#D9D6E3';

  if (!(p.income > 0)) {
    return (
      <Sheet title="Автораспределение" onClose={onClose}>
        <div className="t-meta">Чтобы разложить деньги по категориям, нужен доход: укажите зарплату или добавьте доход за этот период.</div>
        <PrimaryButton onClick={() => a.openSheet('salary', { value: d.salary })}>Указать зарплату</PrimaryButton>
      </Sheet>
    );
  }

  return (
    <Sheet title="Автораспределение" onClose={onClose}>
      <div className="t-meta">{basisText(p)}</div>

      <div className="plan-sum">
        <div className="plan-sum__row"><span className="muted">Доход за период</span><b>{p.incomeFmt}</b></div>
        {p.goalsRes > 0 && <div className="plan-sum__row"><span className="muted">В цели</span><b>−{p.goalsResFmt}</b></div>}
        <div className="plan-sum__row"><span className="muted">Лимиты на траты</span><b>−{p.totalFmt}</b></div>
        <div className="plan-sum__row plan-sum__row--total">
          <span>{p.short ? 'Не хватает' : 'Останется свободно'}</span>
          <b style={{ color: p.short ? 'var(--red)' : 'var(--green)' }}>{p.freeFmt}</b>
        </div>
      </div>
      <PlanBar parts={p.parts} />
      {p.short && <div className="t-meta" style={{ color: 'var(--red)' }}>Обязательные платежи, уже потраченное и взносы в цели больше дохода. Уменьшите взносы в цели или добавьте доход.</div>}
      {!p.short && p.scaled && <div className="t-meta">Повседневные лимиты урезаны пропорционально, чтобы уложиться в доход и оставить запас 5%.</div>}

      <Field label="Урезать повседневные траты">
        <Chips options={SAVE_LEVELS} value={save} onChange={setSave} />
      </Field>

      <div className="col">
        {p.rows.map(r => (
          <div key={r.id} className="plan-row">
            <CatIcon size={36} icon={r.icon} letter={r.letter} color={r.color} />
            <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <div className="row" style={{ gap: 6, minWidth: 0 }}>
                <span className="ellipsis" style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                {r.fixed && <span className="plan-tag">обязательный</span>}
              </div>
              {r.meta && <div className="t-meta ellipsis">{r.meta}</div>}
            </div>
            <div className="col" style={{ gap: 1, alignItems: 'flex-end' }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.limitFmt}</div>
              {r.changed && <div className="plan-row__prev">{r.prevFmt}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="plan-switch" onClick={() => setOn(v => !v)}>
        <div className="col" style={{ gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Распределять автоматически</div>
          <div className="t-meta">Каждый период {d.monthStartDay}-го числа лимиты пересчитаются по свежим тратам</div>
        </div>
        <Switch on={on} offBg={offBg} />
      </div>

      <PrimaryButton onClick={apply}>Применить лимиты</PrimaryButton>
    </Sheet>
  );
}

const OTHER_OPTION = { id: 'other', label: 'Другое' };
const catOptions = cats => [...cats.map(c => ({ id: c.id, label: c.name, color: c.color, icon: c.icon, letter: c.letter })), OTHER_OPTION];

// Регулярный платёж: в свой день месяца сам становится тратой, в 10:00 приходит напоминание
function BillSheet({ bill, onClose }) {
  const { s, a, d } = useBudget();
  const [title, setTitle] = useState(bill ? bill.title : '');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [day, setDay] = useState(bill ? String(bill.day) : String(new Date().getDate()));
  const [cat, setCat] = useState(bill ? bill.cat || 'other' : null);
  const [payer, setPayer] = useState(bill ? bill.payer || null : d.me);
  const [method, setMethod] = useState(bill ? bill.method || 'card' : 'card');
  // Категорию подбираем по названию, пока её не выбрали руками
  const guessed = useMemo(() => (title.trim() ? guessCat(title, (s.data && s.data.txs) || [], d.cats) : null), [title, s.data, d.cats]);
  const catV = cat || guessed || 'other';
  const dayN = num(day);
  const ok = title.trim().length > 0 && num(amount) > 0 && dayN >= 1 && dayN <= 31;
  const save = () => { if (!ok) return; a.saveBill({ title: title.trim(), amount: num(amount), day: dayN, cat: catV, payer, method }, bill && bill.id); onClose(); };
  const payers = d.members.length > 1 ? d.members.map(m => ({ id: m.id, label: m.id === d.me ? 'Я' : m.name })) : null;
  return (
    <Sheet title={bill ? 'Регулярный платёж' : 'Новый платёж'} onClose={onClose}>
      <Field label="Название"><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, кредит Kaspi" autoFocus={!bill} maxLength={40} /></Field>
      {!bill && <Chips options={BILL_SUGGEST.map(x => ({ id: x, label: x }))} value={title.trim()} onChange={setTitle} />}
      <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
        <Field label="Сумма, ₸" style={{ flex: 1.3 }}><input className="input" type="number" inputMode="numeric" min="0" step="1000" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Число месяца" style={{ flex: 1 }}><input className="input" type="number" inputMode="numeric" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} /></Field>
      </div>
      <Field label={!cat && guessed ? 'Категория · подобрана по названию' : 'Категория'}>
        <Chips options={catOptions(d.cats)} value={catV} onChange={setCat} />
      </Field>
      {payers && <Field label="Кто платит"><Chips options={payers} value={payer} onChange={setPayer} /></Field>}
      <Field label="Чем">
        <Chips options={[{ id: 'card', label: 'Карта' }, { id: 'cash', label: 'Наличные' }]} value={method} onChange={setMethod} />
      </Field>
      <div className="t-meta">
        {dayN >= 1 && dayN <= 31 ? `Каждый месяц ${dayN}-го числа трата внесётся сама` : 'Укажите число от 1 до 31'}
        {dayN > 28 && dayN <= 31 ? ' (в коротком месяце — в последний день)' : ''}. В этот день в 10:00 придёт напоминание.
        {!bill && ' Прошлые даты не вносятся — начнём с ближайшей.'}
      </div>
      <PrimaryButton disabled={!ok} onClick={save}>{bill ? 'Сохранить' : 'Добавить платёж'}</PrimaryButton>
      {bill && <DangerButton onClick={() => { a.deleteBill(bill.id); onClose(); }}>Удалить платёж</DangerButton>}
    </Sheet>
  );
}

// Импорт выписки Kaspi (PDF) или CSV: разбор, подбор категорий, отметка уже внесённых, выбор строк
function ImportSheet({ onClose }) {
  const { s, a, d } = useBudget();
  const input = useRef(null);
  const [stage, setStage] = useState('pick'); // pick | loading | review
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [saving, setSaving] = useState(false);

  const onFile = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setError('');
    setStage('loading');
    try {
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      let items;
      if (isPdf) {
        const { pdfLines } = await import('../lib/pdf.js');
        items = parseKaspiLines(await pdfLines(file));
      } else {
        const text = await file.text();
        items = parseCsv(text);
        if (!items.length) items = parseKaspiLines(text.split(/\r?\n/));
      }
      if (!items.length) throw new Error('empty');
      const all = s.data || { txs: [], incomes: [] };
      const res = buildImport(items, { txs: all.txs, incomes: all.incomes, cats: d.cats, allCats: d.cats, ns: s.household ? s.household.id : '' });
      setRows(res.rows);
      setSkipped(res.skipped);
      setStage('review');
    } catch (err) {
      console.error(err);
      setError(err && err.message === 'empty'
        ? 'Не нашёл операций в файле. Нужна выписка Kaspi Gold в PDF или таблица CSV с колонками «Дата» и «Сумма».'
        : 'Не удалось прочитать файл. Попробуйте ещё раз или выгрузите выписку заново.');
      setStage('pick');
    }
  };
  const toggle = id => setRows(list => list.map(r => (r.id === id ? { ...r, checked: !r.checked } : r)));
  const setCat = (id, cat) => { setRows(list => list.map(r => (r.id === id ? { ...r, cat, checked: true } : r))); setOpenId(null); };
  const txRows = rows.filter(r => r.kind === 'tx');
  const incRows = rows.filter(r => r.kind === 'income');
  const pickedTx = txRows.filter(r => r.checked);
  const pickedInc = incRows.filter(r => r.checked);
  const sumOf = list => list.reduce((x, r) => x + r.amount, 0);
  const catById = Object.fromEntries(d.cats.map(c => [c.id, c]));
  const catView = id => catById[id] || { name: 'Другое', icon: 'box', letter: 'Д', color: 'var(--mu)' };
  const go = async () => {
    setSaving(true);
    const ok = await a.importRows([...pickedTx, ...pickedInc]);
    setSaving(false);
    if (ok) onClose();
  };

  const picker = (
    <input ref={input} type="file" accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain" style={{ display: 'none' }} onChange={onFile} />
  );

  if (stage !== 'review') {
    return (
      <Sheet title="Импорт выписки" onClose={onClose}>
        {picker}
        <div className="t-meta">Траты из банка попадут в бюджет сами — с категориями, подобранными по названию магазина. Уже внесённые повторно не добавятся.</div>
        <div className="plan-sum">
          <div style={{ fontSize: 14, fontWeight: 600 }}>Как выгрузить из Kaspi</div>
          <div className="t-meta">1. Kaspi.kz → Kaspi Gold → «Выписка»</div>
          <div className="t-meta">2. Выберите период → «Отправить» → «Сохранить в Файлы»</div>
          <div className="t-meta">3. Здесь нажмите «Выбрать файл» и найдите PDF</div>
        </div>
        <div className="t-meta">Подходит и CSV: экспорт из этого приложения или таблица другого банка с колонками «Дата» и «Сумма» (траты со знаком минус).</div>
        {error && <div className="t-meta" style={{ color: 'var(--red)' }}>{error}</div>}
        <PrimaryButton disabled={stage === 'loading'} onClick={() => input.current && input.current.click()}>
          {stage === 'loading' ? 'Читаю ' + fileName + '…' : 'Выбрать файл'}
        </PrimaryButton>
      </Sheet>
    );
  }

  const row = r => {
    const c = r.kind === 'tx' ? catView(r.cat) : null;
    return (
      <div key={r.id} className="col" style={{ borderBottom: '1px solid var(--ln)' }}>
        <div className="imp-row">
          <div className="imp-check" data-on={r.checked ? 'true' : 'false'} onClick={() => toggle(r.id)}>✓</div>
          <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }} onClick={() => toggle(r.id)}>
            <div className="ellipsis" style={{ fontSize: 14, fontWeight: 500, opacity: r.checked ? 1 : 0.55 }}>{r.title}</div>
            <div className="t-meta ellipsis">{shortDate(r.date)}{r.op ? ' · ' + r.op : ''}{r.likely ? ' · похоже, уже есть' : ''}</div>
          </div>
          <div className="col" style={{ gap: 4, alignItems: 'flex-end' }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: r.kind === 'income' ? 'var(--green)' : 'var(--tx)' }}>{r.kind === 'income' ? '+' : '−'}{fmt(r.amount)}</div>
            {c && <div className="imp-cat" style={{ background: 'var(--ip)', color: c.color }} onClick={() => setOpenId(openId === r.id ? null : r.id)}>{c.name} ▾</div>}
          </div>
        </div>
        {openId === r.id && <div style={{ paddingBottom: 10 }}><Chips options={catOptions(d.cats)} value={r.cat} onChange={v => setCat(r.id, v)} /></div>}
      </div>
    );
  };

  return (
    <Sheet title="Импорт выписки" onClose={onClose}>
      {picker}
      <div className="t-meta">
        {fileName} · найдено {rows.length + skipped}{skipped ? `, уже в бюджете ${skipped}` : ''}.
        {' '}Переводы, снятия и поступления не отмечены — отметьте, если это траты или доход семьи.
      </div>
      {rows.length === 0 && <div className="empty">Все операции из файла уже есть в бюджете</div>}
      {txRows.length > 0 && (
        <div className="col">
          <div className="row-between" style={{ paddingBottom: 4 }}>
            <div className="field__label">Траты · {txRows.length}</div>
            <div className="t-link" onClick={() => setRows(list => list.map(r => (r.kind === 'tx' && !r.likely ? { ...r, checked: true } : r)))}>Отметить все</div>
          </div>
          {txRows.map(row)}
        </div>
      )}
      {incRows.length > 0 && (
        <div className="col">
          <div className="field__label" style={{ paddingTop: 6 }}>Поступления · {incRows.length}</div>
          {incRows.map(row)}
        </div>
      )}
      <PrimaryButton disabled={saving || (!pickedTx.length && !pickedInc.length)} onClick={go}>
        {saving ? 'Добавляю…' : pickedTx.length || pickedInc.length
          ? `Добавить ${pickedTx.length ? `${traty(pickedTx.length)} на ${fmt(sumOf(pickedTx))}` : ''}${pickedTx.length && pickedInc.length ? ' и ' : ''}${pickedInc.length ? `${pickedInc.length} поступл.` : ''}`
          : 'Отметьте операции'}
      </PrimaryButton>
      <div className="t-link" style={{ textAlign: 'center' }} onClick={() => input.current && input.current.click()}>Выбрать другой файл</div>
    </Sheet>
  );
}

// Остаток месяца в цель: в начале периода прошлый остаток (доход − траты − уже отложенное) уходит в цель
function SweepSheet({ onClose }) {
  const { a, d } = useBudget();
  const sw = d.sweep;
  const open = d.goals.filter(g => g.pct < 100);
  const [goalId, setGoalId] = useState(sw.goalId || (open[0] && open[0].id) || null);
  const [on, setOn] = useState(sw.on);
  const offBg = d.dark ? '#3A3746' : '#D9D6E3';
  const save = () => {
    // Включили посреди периода — прошлый остаток только по кнопке «сейчас», автоматически со следующего периода
    a.setSweep({ on, goalId, ...(on && !sw.on ? { skip: d.periodStartIso } : {}) });
    onClose();
  };
  if (!open.length) {
    return (
      <Sheet title="Остаток в цель" onClose={onClose}>
        <div className="t-meta">Сначала добавьте цель накоплений — туда будет уходить то, что осталось от месяца.</div>
        <PrimaryButton onClick={() => a.openSheet('goal')}>Добавить цель</PrimaryButton>
      </Sheet>
    );
  }
  return (
    <Sheet title="Остаток в цель" onClose={onClose}>
      <div className="t-meta">В начале каждого периода ({d.monthStartDay}-го числа) то, что осталось от прошлого — доход минус траты и уже отложенное, — само уйдёт в выбранную цель.</div>
      <Field label="Куда откладывать">
        <Chips options={open.map(g => ({ id: g.id, label: g.name, color: g.color, bg: g.bg, letter: g.letter }))} value={goalId} onChange={setGoalId} />
      </Field>
      <div className="plan-switch" onClick={() => setOn(v => !v)}>
        <div className="col" style={{ gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Откладывать автоматически</div>
          <div className="t-meta">{sw.last ? `Последний раз: ${shortDate(sw.last.date)} · ${sw.lastFmt}` : 'Каждый период'}</div>
        </div>
        <Switch on={on} offBg={offBg} />
      </div>
      <PrimaryButton disabled={!goalId} onClick={save}>Сохранить</PrimaryButton>
      {sw.canNow && goalId && (
        <div className="soft-btn" onClick={() => { a.sweepNow(goalId, sw.prevLeft, d.periodStartIso); a.setSweep({ goalId }); onClose(); }}>
          Отложить остаток за {sw.prevMonth} сейчас · {sw.prevLeftFmt}
        </div>
      )}
      {!sw.canNow && sw.swept && <div className="t-meta">Остаток за {sw.prevMonth} уже отложен.</div>}
      {!sw.canNow && !sw.swept && <div className="t-meta">За {sw.prevMonth} свободного остатка нет.</div>}
    </Sheet>
  );
}

// Кто кому переводит: общие траты двоих поровну или в выбранной доле; «Перевод сделан» записывает расчёт
function SettleSheet({ onClose }) {
  const { a, d } = useBudget();
  const t = d.settle;
  if (!d.settleAvailable) return null;
  if (!t) {
    return (
      <Sheet title="Расчёт между вами" onClose={onClose}>
        <div className="t-meta">Приложение посчитает, кто сколько заплатил за общие траты, и подскажет, кому сколько перевести, чтобы делить поровну или в вашей доле.</div>
        <div className="t-meta">Считаются траты с дня включения: раньше один из вас мог вносить траты за всю семью, и старая история дала бы неверный долг.</div>
        <PrimaryButton onClick={() => { a.setSettle(true); }}>Включить с сегодняшнего дня</PrimaryButton>
      </Sheet>
    );
  }
  return (
    <Sheet title="Расчёт между вами" onClose={onClose}>
      <div className="t-meta">Считаем траты с {t.sinceLabel}.</div>
      <div className="plan-sum">
        <div className="plan-sum__row"><span className="muted">Общие траты</span><b>{t.totalFmt}</b></div>
        <div className="plan-sum__row"><span className="muted">{t.aName}: оплачено</span><b>{t.paidAFmt}</b></div>
        <div className="plan-sum__row"><span className="muted">{t.bName}: оплачено</span><b>{t.paidBFmt}</b></div>
        <div className="plan-sum__row plan-sum__row--total">
          {t.settled ? <span>Всё ровно</span> : <span>{t.fromName} → {t.toName}</span>}
          {!t.settled && <b style={{ color: 'var(--accent-tx)' }}>{t.amountFmt}</b>}
        </div>
      </div>
      <Field label="Как делим траты">
        <Chips options={t.options} value={t.splitId} onChange={id => a.setSplit(t.options.find(o => o.id === id).share)} />
      </Field>
      <div className="t-meta">«Перевод сделан» записывает перевод и выравнивает счёт.</div>
      {!t.settled && <PrimaryButton onClick={() => { a.recordSettle(t.fromId, t.toId, t.amount); onClose(); }}>Перевод сделан · {t.amountFmt}</PrimaryButton>}
      {t.log.length > 0 && (
        <div className="col" style={{ gap: 8 }}>
          <div className="field__label">Переводы</div>
          {t.log.map((x, i) => (
            <div key={i} className="row-between" style={{ fontSize: 13, fontWeight: 600 }}>
              <span className="muted">{x.text}</span><span style={{ fontWeight: 600 }}>{x.amountFmt}</span>
            </div>
          ))}
        </div>
      )}
      <div className="t-link" style={{ textAlign: 'center', color: 'var(--mu)' }} onClick={() => { a.setSettle(false); onClose(); }}>Выключить расчёт</div>
    </Sheet>
  );
}

// Зарплата: сумма и чья (у каждого своя; «Общая» — прежняя одна на семью). Приходит в начале каждого периода.
function SalarySheet({ who: whoInit, value, onClose }) {
  const { a, d } = useBudget();
  const multi = d.members.length > 1;
  const [who, setWho] = useState(multi ? (whoInit === undefined ? d.me : whoInit) : null);
  const current = who ? (d.salaries[who] || '') : (d.legacySalary || '');
  const [v, setV] = useState(value !== undefined && value !== '' ? String(value) : String(current || ''));
  const pick = id => { setWho(id); setV(String((id ? d.salaries[id] : d.legacySalary) || '')); };
  return (
    <Sheet title="Зарплата" onClose={onClose}>
      {multi && (
        <Field label="Чья">
          <Chips options={[...d.members.map(m => ({ id: m.id, label: m.id === d.me ? 'Моя' : m.name })), { id: null, label: 'Общая' }]} value={who} onChange={pick} />
        </Field>
      )}
      <Field label="Сумма в месяц, ₸"><input className="input" type="number" inputMode="numeric" min="0" step="1000" value={v} onChange={e => setV(e.target.value)} autoFocus placeholder="0" /></Field>
      <div className="t-meta">Приходит {d.monthStartDay}-го числа — в начале вашего месяца. 0 — убрать.</div>
      <PrimaryButton onClick={() => { a.setSalaryFor(who, num(v)); onClose(); }}>Сохранить</PrimaryButton>
    </Sheet>
  );
}

// Новая операция (макет шаг 2a): расход или доход, сумма, категория плиткой, кто, чем, дата, повтор каждый месяц
function OpSheet({ kind: kindInit, onClose }) {
  const { s, a, d } = useBudget();
  const [kind, setKind] = useState(kindInit === 'income' ? 'income' : 'tx');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState(null);
  const [who, setWho] = useState(d.me);
  const [method, setMethod] = useState('card');
  const [date, setDate] = useState(d.todayIso);
  const [repeat, setRepeat] = useState(false);
  // Категорию подбираем по названию («Magnum» → Продукты), пока её не выбрали руками
  const guessed = useMemo(() => (title.trim() ? guessCat(title, (s.data && s.data.txs) || [], d.cats) : null), [title, s.data, d.cats]);
  const catV = cat || guessed || (d.cats[0] && d.cats[0].id);
  const n = num(amount);
  const multi = d.members.length > 1;
  const save = () => {
    if (!n) return;
    if (a.addOp({ kind, amount: n, title, cat: catV, who, method, date, repeat })) onClose();
  };
  const fmtInput = v => { const digits = String(v).replace(/\D/g, '').slice(0, 9); return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''; };
  return (
    <Sheet title="Новая операция" onClose={onClose}>
      <div className="kind-seg" role="group" aria-label="Тип операции">
        <button type="button" data-kind="tx" aria-pressed={kind === 'tx' ? 'true' : 'false'} onClick={() => setKind('tx')}>Расход</button>
        <button type="button" data-kind="income" aria-pressed={kind === 'income' ? 'true' : 'false'} onClick={() => setKind('income')}>Доход</button>
      </div>
      <label className="col" style={{ alignItems: 'center' }}>
        <span className="sr-only">Сумма</span>
        <input className="op-amount" inputMode="numeric" autoFocus value={fmtInput(amount) ? fmtInput(amount) + ' ₸' : ''} placeholder="0 ₸"
          onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))} enterKeyHint="done" />
      </label>
      <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'tx' ? 'Где или что — например, Magnum' : 'Откуда — например, аванс'} enterKeyHint="done" />

      {kind === 'tx' && (
        <Field label={!cat && guessed ? 'Категория · подобрана по названию' : 'Категория'}>
          <div className="op-grid">
            {d.cats.map(c => (
              <button key={c.id} type="button" className="op-cat" aria-pressed={catV === c.id ? 'true' : 'false'} onClick={() => setCat(c.id)}>
                <span style={{ color: c.color, display: 'flex' }}><Icon name={c.icon || 'box'} size={20} /></span>
                <span>{c.name}</span>
              </button>
            ))}
            <button type="button" className="op-cat" onClick={() => a.openSheet('cat', { pick: 'op' })}>
              <span style={{ color: 'var(--mu)', fontSize: 18, lineHeight: '20px' }}>+</span><span>Своя</span>
            </button>
          </div>
        </Field>
      )}

      <div className="op-list">
        {multi && (
          <div className="op-list__row">
            <span className="muted">Кто</span>
            <div className="row" style={{ gap: 6 }}>
              {d.members.map(m => (
                <button key={m.id} type="button" className="filter-chip" style={{ height: 32 }} aria-pressed={who === m.id ? 'true' : 'false'} onClick={() => setWho(m.id)}>{m.name}</button>
              ))}
            </div>
          </div>
        )}
        <div className="op-list__row">
          <span className="muted">{kind === 'tx' ? 'Чем платили' : 'Куда пришло'}</span>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="filter-chip" style={{ height: 32 }} aria-pressed={method === 'card' ? 'true' : 'false'} onClick={() => setMethod('card')}>Карта</button>
            <button type="button" className="filter-chip" style={{ height: 32 }} aria-pressed={method === 'cash' ? 'true' : 'false'} onClick={() => setMethod('cash')}>Наличные</button>
          </div>
        </div>
        <label className="op-list__row">
          <span className="muted">Дата</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value || d.todayIso)} aria-label="Дата" />
        </label>
        {kind === 'tx' && (
          <div className="op-list__row" style={{ cursor: 'pointer' }} onClick={() => setRepeat(r => !r)}>
            <span className="muted">Повторять каждый месяц</span>
            <Switch on={repeat} offBg="var(--off)" />
          </div>
        )}
      </div>
      {repeat && kind === 'tx' && <div className="t-meta">Станет регулярным платежом: каждый месяц {Number(date.slice(8, 10))}-го числа трата внесётся сама.</div>}

      <PrimaryButton disabled={!n} onClick={save}>{kind === 'tx' ? 'Добавить расход' : 'Добавить доход'}</PrimaryButton>
    </Sheet>
  );
}

// Фильтр «Расходов» по категории: категории месяца с суммами
function CatFilterSheet({ onClose }) {
  const { a, d } = useBudget();
  return (
    <Sheet title="Категории" onClose={onClose}>
      <div className="col">
        {d.spendCats.length === 0 && <div className="empty">В этом месяце трат нет</div>}
        {d.spendCats.map(c => (
          <div key={c.id} className="list-row list-row--tap" onClick={() => { a.setSpendCat(c.id); onClose(); }}>
            <CatIcon size={38} icon={c.icon} letter={c.letter} color={c.color} />
            <div className="ellipsis" style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.spentFmt}</div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
