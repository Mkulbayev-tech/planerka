import { useBudget } from '../store.jsx';
import { useLongPress } from '../hooks.js';
import { Ring, BarChart, Letter, Checkbox, ProgressBar } from '../components/ui.jsx';

export default function Plans() {
  const { d, a } = useBudget();
  return (
    <div className="screen">
      <div className="row-between">
        <div className="col" style={{ gap: 2 }}>
          <div className="t-eyebrow">{d.todayLabel}</div>
          <div className="t-title">Планы на день</div>
        </div>
        <div className="round-add" onClick={() => a.openSheet('task')}>+</div>
      </div>

      <div className="hero hero--green" style={{ flexDirection: 'row', alignItems: 'center', gap: 18, boxShadow: '0 18px 40px rgba(31,143,94,0.26)' }}>
        <Ring size={84} r={35} width={10} pct={d.taskPct} track="rgba(255,255,255,0.22)" color="#fff" transition=".4s">
          <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{d.taskPct}%</span>
        </Ring>
        <div className="col" style={{ flex: 1, gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{d.doneCount} из {d.taskTotal} задач</div>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap' }}>Затраты по плану · {d.plannedCostFmt}</div>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap' }}>Осталось потратить · {d.leftOnPlanFmt}</div>
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <div className="t-card">Выполнение за неделю</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', whiteSpace: 'nowrap' }}>{d.weekPlanPct}%</div>
        </div>
        <BarChart items={d.weekPlan.map(x => ({ ...x, top: x.ratio }))} height={86} showTop />
      </div>

      <div className="grid3">
        <div className="tile"><div className="tile__label">Сегодня</div><div className="tile__value">{d.doneCount}</div><div className="tile__sub">{d.todayRatio}</div></div>
        <div className="tile"><div className="tile__label">Неделя</div><div className="tile__value">{d.weekDone}</div><div className="tile__sub">{d.weekDoneRatio}</div></div>
        <div className="tile"><div className="tile__label">Месяц</div><div className="tile__value">{d.monthDone}</div><div className="tile__sub">{d.monthRatio}</div></div>
      </div>

      <div className="card">
        <div className="t-card">Статистика по типам</div>
        {d.tagStats.length === 0 && <div className="empty">Появится после первых задач</div>}
        {d.tagStats.map(t => (
          <div key={t.name} className="row" style={{ gap: 12 }}>
            <Letter size={34} radius={11} bg={t.bg} color={t.color} fontSize={14}>{t.letter}</Letter>
            <div className="col" style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <div className="row-between" style={{ fontSize: 13, fontWeight: 700 }}>
                <span>{t.name}</span><span className="muted" style={{ whiteSpace: 'nowrap' }}>{t.ratio}</span>
              </div>
              <ProgressBar height={6} pct={t.pct} color={t.color} />
            </div>
            <div style={{ width: 38, textAlign: 'right', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{t.pct}%</div>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="tile tile--wide"><div className="tile__label">Серия без пропусков</div><div className="tile__value">{d.streak} дней</div></div>
        <div className="tile tile--wide"><div className="tile__label">В день в среднем</div><div className="tile__value">{d.avgPerDay} задач</div></div>
        <div className="tile tile--wide"><div className="tile__label">Лучший день недели</div><div className="tile__value">{d.bestDayLabel}{d.bestDayRatio ? ' · ' + d.bestDayRatio : ''}</div></div>
        <div className="tile tile--wide"><div className="tile__label">Не выполнено за месяц</div><div className="tile__value" style={{ color: 'var(--red)' }}>{d.skipped} задач</div></div>
      </div>

      <div className="section-head">
        <div className="t-card">Задачи на сегодня</div>
        <div className="t-sub">Тап — отметить, удержать — изменить</div>
      </div>
      <div className="card card--list">
        {d.tasks.length === 0 && <div className="empty">Задач на сегодня нет. Нажмите +, чтобы добавить.</div>}
        {d.tasks.map(t => <TaskRow key={t.id} t={t} />)}
      </div>

      <div className="cta" onClick={() => a.go('goals')}>
        <div className="col" style={{ gap: 2 }}>
          <div className="cta__title">Долгосрочные планы</div>
          <div className="t-meta">Цели накоплений · {d.savedTotalFmt}</div>
        </div>
        <div className="cta__chev">›</div>
      </div>
    </div>
  );
}

function TaskRow({ t }) {
  const { a } = useBudget();
  const press = useLongPress(() => a.openSheet('task', { task: t }), () => a.toggleTask(t.id));
  return (
    <div className="list-row list-row--tap pressable" {...press}>
      <Checkbox size={24} radius={8} icon={13} done={t.done} border={t.boxBorder} />
      <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <div className="ellipsis" style={{ fontSize: 15, fontWeight: 700, textDecoration: t.titleStyle, color: t.titleColor }}>{t.name}</div>
        <div className="row" style={{ gap: 6 }}>
          <div className="tag" style={{ background: t.bg, color: t.color }}>{t.tag}</div>
          <div className="t-meta" style={{ whiteSpace: 'nowrap' }}>{t.time}</div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', color: t.costColor }}>{t.costFmt}</div>
    </div>
  );
}
