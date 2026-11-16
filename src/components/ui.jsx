// Мелкие визуальные примитивы, общие для экранов и виджетов.

export function Ring({ size, r, width, pct, track, color, transition = '.5s', children }) {
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  const dash = (circ * p / 100).toFixed(1) + ' ' + circ.toFixed(1);
  const c = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={width} style={{ stroke: track }} />
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={width} strokeLinecap="round" strokeDasharray={dash}
          style={{ stroke: color, transition: `stroke-dasharray ${transition} ease` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

export function BarChart({ items, height, gap = 8, colGap = 6, radius = 7, labelSize = 11, showTop = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height, flex: 'none' }}>
      {items.map((b, i) => (
        <div key={b.label + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: colGap, height: '100%', justifyContent: 'flex-end' }}>
          {showTop && <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--mu)', whiteSpace: 'nowrap' }}>{b.top}</div>}
          <div style={{ width: '100%', borderRadius: radius, background: b.color, height: b.h + '%' }} />
          <div style={{ fontSize: labelSize, fontWeight: 500, color: b.labelColor }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

// onPick(i) — нажали на столбец (например, открыть траты этого месяца)
export function PairBars({ items, height, onPick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, flex: 'none' }}>
      {items.map((b, i) => (
        <div key={b.label} onClick={onPick ? () => onPick(i) : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', cursor: onPick ? 'pointer' : undefined }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', width: '100%', flex: 1 }}>
            <div style={{ flex: 1, borderRadius: '6px 6px 2px 2px', background: 'var(--green)', height: b.hi + '%', opacity: b.op }} />
            <div style={{ flex: 1, borderRadius: '6px 6px 2px 2px', background: 'var(--accent)', height: b.he + '%', opacity: b.op }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: b.labelColor }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

// Плитка с буквой или иконкой категории (эмодзи рисуем чуть крупнее буквы — так они читаются одинаково)
const EMOJI_RE = /\p{Extended_Pictographic}/u;
export function Letter({ size, radius, bg, color, fontSize, children, style }) {
  const emoji = typeof children === 'string' && EMOJI_RE.test(children);
  return (
    <div style={{ width: size, height: size, borderRadius: radius, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: emoji ? Math.round(fontSize * 1.3) : fontSize, lineHeight: 1, background: bg, color, flex: 'none', ...style }}>
      {children}
    </div>
  );
}

export function Checkbox({ size, radius, icon, strokeWidth = 2.4, done, border }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flex: 'none', border: '2px solid ' + border, background: done ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
      <svg width={icon} height={icon} viewBox="0 0 12 12" fill="none" stroke="var(--bg)" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: done ? 1 : 0 }}>
        <path d="M2 6.5l2.6 2.6L10 3.5" />
      </svg>
    </div>
  );
}

export function ProgressBar({ height, pct, color, track = 'var(--ip)', transition = false }) {
  const w = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="track" style={{ height, background: track }}>
      <div className="track__fill" style={{ background: color, width: w + '%', transition: transition ? 'width .4s ease' : undefined }} />
    </div>
  );
}

export function Donut({ size, inset, bg, gap = 1, children }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none', borderRadius: '50%', background: bg }}>
      <div style={{ position: 'absolute', inset, borderRadius: '50%', background: 'var(--cd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap }}>
        {children}
      </div>
    </div>
  );
}

export function Switch({ on, offBg }) {
  return (
    <div className="switch" style={{ background: on ? 'var(--accent)' : offBg }}>
      <div className="switch__knob" style={{ transform: `translateX(${on ? 20 : 0}px)` }} />
    </div>
  );
}

export function BackHead({ onBack, title }) {
  return (
    <div className="back-head">
      <div className="back-btn" onClick={onBack}>‹</div>
      <div className="t-h2">{title}</div>
    </div>
  );
}

// Полоса долей: из чего складывается доход (обязательные, повседневные, цели, свободно)
export function PlanBar({ parts, height = 10, legend = true }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div style={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', gap: 2, background: 'var(--ip)' }}>
        {parts.map(p => <div key={p.id} style={{ flex: Math.max(p.value, 1), background: p.color }} />)}
      </div>
      {legend && (
        <div className="plan-legend">
          {parts.map(p => (
            <span key={p.id}><i style={{ background: p.color }} />{p.name} {p.share}%</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Линейные иконки (24×24, обводка currentColor) — для категорий и действий. Без эмодзи.
const ICON_PATHS = {
  cart: <><path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 7H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
  cup: <><path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 9h2a2 2 0 0 1 0 4h-2" /><path d="M8 3v2M12 3v2" /></>,
  home: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  bus: <><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 10h14M8 20v-3M16 20v-3" /><path d="M8.5 13.5h.01M15.5 13.5h.01" /></>,
  film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5v14M16 5v14M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5" /></>,
  pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  blocks: <><rect x="4" y="12" width="7" height="7" rx="1.5" /><rect x="13" y="12" width="7" height="7" rx="1.5" /><rect x="8.5" y="4" width="7" height="7" rx="1.5" /></>,
  shirt: <path d="M8 4L4 7l2 3 2-1v11h8V9l2 1 2-3-4-3c-.6 1.3-2 2-4 2s-3.4-.7-4-2z" />,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  gift: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3 9h18M12 9v11" /><path d="M12 9c-1-2.5-4.5-3.5-4.5-1.3C7.5 9 10 9 12 9zM12 9c1-2.5 4.5-3.5 4.5-1.3C16.5 9 14 9 12 9z" /></>,
  car: <><path d="M5 15l1.6-5.2A2 2 0 0 1 8.5 8.4h7a2 2 0 0 1 1.9 1.4L19 15" /><rect x="3" y="15" width="18" height="4" rx="1.5" /><path d="M7 19v1.5M17 19v1.5" /></>,
  plane: <path d="M3 13l18-8-5 15-3.5-6.5z" />,
  paw: <><circle cx="6.5" cy="10" r="1.6" /><circle cx="10" cy="6.5" r="1.6" /><circle cx="14" cy="6.5" r="1.6" /><circle cx="17.5" cy="10" r="1.6" /><path d="M12 12c-3 0-5 3.5-5 5.3 0 1.5 1.2 2.2 2.6 1.8L12 18.5l2.4.6c1.4.4 2.6-.3 2.6-1.8 0-1.8-2-5.3-5-5.3z" /></>,
  book: <><path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z" /><path d="M5 20a2 2 0 0 0 2 1h12" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" /></>,
  dumbbell: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  sparkle: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  fork: <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 3c-2.2 1.8-2.2 7 0 9v9" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.6-6 8-6s6.5 2 8 6" /></>,
  box: <><path d="M3 7.5L12 3l9 4.5-9 4.5z" /><path d="M3 7.5v9L12 21l9-4.5v-9M12 12v9" /></>,
  repeat: <><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  pie: <><path d="M12 3v9h9" /><circle cx="12" cy="12" r="9" /></>,
  inbox: <><path d="M4 13l2.2-7.4A1 1 0 0 1 7.2 5h9.6a1 1 0 0 1 1 .6L20 13v6H4z" /><path d="M4 13h5l1 2h4l1-2h5" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5h.01" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.3-4.3" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chart: <path d="M5 20V12M12 20V5M19 20v-6" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.4 3.2-5.5 6-5.5s5.2 2.1 6 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.6.8 2.6 2.5 3 5.2" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /><path d="M7 6V5a2 2 0 0 1 2-2h8" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".5" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></>,
  download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  swap: <><path d="M7 4L3 8l4 4M3 8h14" /><path d="M17 20l4-4-4-4M21 16H7" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  basket: <><path d="M4 9h16l-1.5 10a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z" /><path d="M9 9l3-5 3 5" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
};
export const hasIcon = name => !!(name && ICON_PATHS[name]);
export function Icon({ name, size = 20, stroke = 1.8 }) {
  const p = ICON_PATHS[name];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>{p}</svg>
  );
}
// Значок категории: обведённый кружок, иконка (или первая буква) цветом категории
export function CatIcon({ icon, letter, color, size = 40 }) {
  return (
    <div className="cat-ico" style={{ width: size, height: size, color }}>
      {hasIcon(icon) ? <Icon name={icon} size={Math.round(size * 0.5)} /> : <span style={{ fontSize: Math.round(size * 0.4), fontWeight: 500, lineHeight: 1 }}>{letter}</span>}
    </div>
  );
}
