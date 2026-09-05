import { useBudget } from '../store.jsx';

export default function TabBar() {
  const { s, a } = useBudget();
  const color = sc => (s.screen === sc ? 'var(--accent)' : 'var(--mu)');
  return (
    <div className="tabbar">
      <div className="tab" style={{ color: color('home') }} onClick={() => a.go('home')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
        <div className="tab__label">Главная</div>
      </div>
      <div className="tab" style={{ color: color('stats') }} onClick={() => a.go('stats')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M5 20V12M12 20V4M19 20v-6" />
        </svg>
        <div className="tab__label">Дашборд</div>
      </div>
      <div className="tab-add" onClick={() => a.go('add')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div className="tab" style={{ color: color('plans') }} onClick={() => a.go('plans')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.5l2 2L9.5 5" /><path d="M4 17.5l2 2 3.5-3.5" /><path d="M13 7h7M13 18h7" />
        </svg>
        <div className="tab__label">Планы</div>
      </div>
      <div className="tab" style={{ color: color('settings') }} onClick={() => a.go('settings')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
        </svg>
        <div className="tab__label">Ещё</div>
      </div>
    </div>
  );
}
