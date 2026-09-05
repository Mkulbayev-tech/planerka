// Вход по почте и подключение к семейному бюджету (создать или присоединиться по коду).
import { useState } from 'react';
import { useBudget } from '../store.jsx';

export default function Access() {
  const { s, a } = useBudget();
  const [email, setEmail] = useState(s.pendingEmail || '');
  const [code, setCode] = useState('');
  const [myName, setMyName] = useState('');
  const [hhName, setHhName] = useState('');
  const [invite, setInvite] = useState('');
  const loading = s.auth === 'loading' || (s.auth === 'in' && s.household === undefined && !s.loadError);
  const btn = disabled => ({ background: disabled ? 'var(--ip)' : 'var(--accent)', color: disabled ? 'var(--mu)' : '#fff', height: 54 });

  return (
    <div className="screen screen--add">
      <div className="hero hero--purple" style={{ gap: 8, marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8, letterSpacing: 1.2 }}>СЕМЕЙНЫЙ БЮДЖЕТ</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }}>Один бюджет на двоих</div>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>Траты, планы и цели видны обоим сразу.</div>
      </div>

      {loading && <div className="empty">Загрузка…</div>}

      {!loading && s.auth === 'in' && s.household === undefined && s.loadError && (
        <div className="card">
          <div className="empty">Нет связи с сервером</div>
          <div className="submit" style={btn(false)} onClick={a.retryLoad}>Повторить</div>
        </div>
      )}

      {!loading && s.auth === 'out' && s.authStep === 'email' && (
        <div className="card">
          <div className="t-card">Вход по почте</div>
          <div className="t-meta">Пришлём письмо с кодом и ссылкой для входа. Пароль не нужен.</div>
          <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && a.sendCode(email)} />
          <div className="submit" style={btn(s.busy)} onClick={() => !s.busy && a.sendCode(email)}>Получить код</div>
        </div>
      )}

      {!loading && s.auth === 'out' && s.authStep === 'code' && (
        <div className="card">
          <div className="t-card">Проверьте почту</div>
          <div className="t-meta">Мы написали на {s.pendingEmail}. Введите код из письма или просто перейдите по ссылке в нём.</div>
          <input className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="Код из письма" value={code}
            onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && a.verifyCode(code)} />
          <div className="submit" style={btn(s.busy)} onClick={() => !s.busy && a.verifyCode(code)}>Войти</div>
          <div className="t-link" style={{ textAlign: 'center' }} onClick={a.backToEmail}>Другая почта</div>
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
          <div className="t-link" style={{ textAlign: 'center' }} onClick={a.signOut}>Выйти{s.user && s.user.email ? ' (' + s.user.email + ')' : ''}</div>
        </>
      )}
    </div>
  );
}
