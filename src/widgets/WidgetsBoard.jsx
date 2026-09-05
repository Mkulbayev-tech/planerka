import { useBudget } from '../store.jsx';
import { BarChart, Letter, Checkbox } from '../components/ui.jsx';

// Доска iOS-виджетов: значения берутся из того же состояния, что и приложение.
export default function WidgetsBoard() {
  const { d } = useBudget();
  const g = d.wGoal;
  return (
    <div className="w-board">
      <div className="w-item">
        <div className="w-medium">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Остаток до зарплаты</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{d.balanceFmt}</div>
            </div>
            <div className="w-badge">₸</div>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <div className="w-track" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <div className="w-fill" style={{ background: '#fff', width: Math.min(100, d.spentPct) + '%' }} />
            </div>
            <div className="row-between" style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap' }}>
              <span>Потрачено {d.spentFmt}</span><span>{d.daysLeft} дней · {d.perDayLeftFmt}/день</span>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {d.widgetCats.map(c => (
              <div key={c.id} className="w-cat">
                <Letter size={20} radius="50%" bg={c.bg} color={c.color} fontSize={10}>{c.letter}</Letter>
                <div className="col" style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{c.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{c.spentShort}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-caption">Бюджет</div>
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 22 }}>
        <div className="w-item">
          <div className="w-small w-small--dark">
            <div className="row-between">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9D9AAA' }}>План дня</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#7EE2B0', whiteSpace: 'nowrap' }}>{d.taskRatio}</div>
            </div>
            <div className="col" style={{ gap: 7 }}>
              {d.widgetTasks.length === 0 && <div style={{ fontSize: 11, fontWeight: 700, color: '#7B7889' }}>Задач на сегодня нет</div>}
              {d.widgetTasks.map(t => (
                <div key={t.id} className="row" style={{ gap: 8 }}>
                  <Checkbox size={16} radius={5} icon={9} strokeWidth={2.6} done={t.done} border={t.wBorder} />
                  <div className="ellipsis" style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, textDecoration: t.titleStyle, color: t.wColor }}>{t.name}</div>
                </div>
              ))}
            </div>
            <div className="w-track" style={{ background: '#2A2833', height: 6 }}>
              <div className="w-fill" style={{ background: '#2FA66F', width: d.taskPct + '%' }} />
            </div>
          </div>
          <div className="w-caption">Планы</div>
        </div>

        <div className="w-item">
          <div className="w-small w-small--amber">
            <div className="row-between">
              <div style={{ fontSize: 12, fontWeight: 800 }}>Цель</div>
              <div className="w-badge w-badge--dark">{g ? g.letter : '+'}</div>
            </div>
            <div className="col" style={{ gap: 2, minWidth: 0 }}>
              <div className="ellipsis" style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>{g ? g.name : 'Нет целей'}</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{g ? g.pct : 0}%</div>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <div className="w-track" style={{ background: 'rgba(58,38,0,0.18)' }}>
                <div className="w-fill" style={{ background: '#3A2600', width: (g ? g.pct : 0) + '%' }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{g ? `${g.savedShort} из ${g.targetShort}` : 'Добавьте цель'}</div>
            </div>
          </div>
          <div className="w-caption">Накопления</div>
        </div>
      </div>

      <div className="w-item">
        <div className="w-large">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9D9AAA' }}>Эта неделя</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1 }}>{d.weekTotalFmt}</div>
            </div>
            <div className="w-tag">{d.weekDeltaText}</div>
          </div>
          <BarChart items={d.weekBarsDark} height={56} gap={7} colGap={5} radius={6} labelSize={10} />
          <div className="col" style={{ borderTop: '1px solid #2A2833', paddingTop: 4, flex: 'none' }}>
            {d.widgetTxs.length === 0 && <div style={{ fontSize: 11, fontWeight: 700, color: '#7B7889', padding: '5px 0' }}>Трат пока нет</div>}
            {d.widgetTxs.map(t => (
              <div key={t.id} className="row" style={{ gap: 10, padding: '5px 0' }}>
                <Letter size={26} radius={9} bg={t.bg} color={t.color} fontSize={11}>{t.letter}</Letter>
                <div className="ellipsis" style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{t.title}</div>
                <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>−{t.amountFmt}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-caption">Обзор</div>
      </div>

      <div className="dock">
        <div className="dock__app dock__app--accent">₸</div>
        <div className="dock__app" /><div className="dock__app" /><div className="dock__app" />
      </div>
    </div>
  );
}
