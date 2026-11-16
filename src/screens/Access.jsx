// Вход: выбрать, кто вы (Айнур или Мэлс), и ввести пароль. Ниже — подключение к семье, если её ещё нет.
import { useState } from 'react';
import { useBudget } from '../store.jsx';
import { PROFILES } from '../auth-profiles.js';
import { Letter } from '../components/ui.jsx';

export default function Access() {
  const { s, a } = useBudget();
  const [login, setLogin] = useState('');
  const [pin, setPin] = useState('');
  const [myName, setMyName] = useState('');
  const [hhName, setHhName] = useState('');
  const [invite, setInvite] = useState('');
  const loading = s.auth === 'loading' || (s.auth === 'in' && s.household === undefined && !s.loadError);
  const btn = disabled => ({ background: disabled ? 'var(--ip)' : 'var(--accent)', color: disabled ? 'var(--mu)' : 'var(--on-accent)', height: 54 });
  const submit = () => { if (!s.busy && login) a.signIn(login, pin); };

  return (
    <div className="screen screen--add">
      <div className="col" style={{ gap: 8, marginTop: 8, padding: '8px 0 6px' }}>
        <div className="t-eyebrow">Бюджет семьи</div>
        <div className="t-num" style={{ fontSize: 28, lineHeight: 1.15, color: 'var(--accent-tx)' }}>Один бюджет на двоих</div>
        <div style={{ fontSize: 15, color: 'var(--mu)' }}>Траты, планы и цели видны обоим сразу.</div>
      </div>

      {loading && <div className="empty">Загрузка…</div>}

      {!loading && s.auth === 'in' && s.household === undefined && s.loadError && (
        <div className="card">
          <div className="empty">Нет связи с сервером</div>
          <div className="submit" style={btn(false)} onClick={a.retryLoad}>Повторить</div>
        </div>
      )}

      {!loading && s.auth === 'out' && (
        <div className="card">
          <div className="t-card">Кто вы?</div>
          <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
            {PROFILES.map(p => {
              const on = login === p.login;
              return (
                <div key={p.login} className="profile-pick" data-on={on ? 'true' : 'false'} onClick={() => setLogin(p.login)}>
                  <Letter size={46} radius="50%" bg={on ? 'var(--accent)' : 'var(--ip)'} color={on ? 'var(--on-accent)' : 'var(--accent-tx)'} fontSize={19}>{p.letter}</Letter>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                  <div className="t-meta">№ {p.login}</div>
                </div>
              );
            })}
          </div>
          <input className="input" type="password" inputMode="numeric" autoComplete="current-password" placeholder="Пароль" value={pin}
            onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
          <div className="submit" style={btn(s.busy || !login)} onClick={submit}>Войти</div>
        </div>
      )}

      {!loading && s.auth === 'in' && s.household === null && (
        <>
          <div className="card">
            <div className="t-card">Как вас зовут?</div>
            <input className="input" placeholder="Имя" value={myName} onChange={e => setMyName(e.target.value)} />
          </div>
          <div className="card">
            <div className="t-card">Создать семейный бюджет</div>
            <input className="input" placeholder="Название, например «Наша семья»" value={hhName} onChange={e => setHhName(e.target.value)} />
            <div className="submit" style={btn(s.busy)} onClick={() => !s.busy && a.createHousehold(hhName, myName)}>Создать</div>
          </div>
          <div className="card">
            <div className="t-card">Присоединиться по коду</div>
            <div className="t-meta">Код приглашения партнёр найдёт в разделе «Ещё».</div>
            <input className="input" placeholder="Код, например A7K2QX" value={invite} onChange={e => setInvite(e.target.value.toUpperCase())} style={{ letterSpacing: 2 }} />
            <div className="soft-btn" onClick={() => !s.busy && a.joinHousehold(invite, myName)}>Присоединиться</div>
          </div>
          <div className="t-link" style={{ textAlign: 'center' }} onClick={a.signOut}>Выйти</div>
        </>
      )}
    </div>
  );
}
