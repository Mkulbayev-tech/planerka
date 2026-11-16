import { useBudget } from '../store.jsx';

// Вкладка подсвечена и на своих вложенных экранах (доходы, лимиты).
const TABS = {
  home: ['home', 'stats'],
  plans: ['plans', 'goals', 'budget', 'bills'],
  spend: ['spend', 'cats'],
  settings: ['settings', 'analytics', 'family', 'income', 'menu', 'shopping', 'debts', 'credits', 'utilities', 'calendar', 'review'],
};

export default function TabBar() {
  const { s, a } = useBudget();
  const color = tab => (TABS[tab].includes(s.screen) ? 'var(--accent-tx)' : 'var(--mu)');
  return (
    <div className="tabbar">
      <div className="tab" style={{ color: color('home') }} onClick={() => a.go('home')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M5 20V12M12 20V4M19 20v-6" />
        </svg>
        <div className="tab__label">Главная</div>
      </div>
      <div className="tab" style={{ color: color('plans') }} onClick={() => a.go('plans')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.5l2 2L9.5 5" /><path d="M4 17.5l2 2 3.5-3.5" /><path d="M13 7h7M13 18h7" />
        </svg>
        <div className="tab__label">Планы</div>
      </div>
      <div className="tab-add" onClick={() => a.go('add')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div className="tab" style={{ color: color('spend') }} onClick={() => a.go('spend')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5.5" width="18" height="13.5" rx="3" /><path d="M3 10h18M7 15h4" />
        </svg>
        <div className="tab__label">Расходы</div>
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
