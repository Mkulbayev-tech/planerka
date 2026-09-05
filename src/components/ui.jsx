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
          {showTop && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', whiteSpace: 'nowrap' }}>{b.top}</div>}
          <div style={{ width: '100%', borderRadius: radius, background: b.color, height: b.h + '%' }} />
          <div style={{ fontSize: labelSize, fontWeight: 700, color: b.labelColor }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

export function PairBars({ items, height }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, flex: 'none' }}>
      {items.map(b => (
        <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', width: '100%', flex: 1 }}>
            <div style={{ flex: 1, borderRadius: '6px 6px 2px 2px', background: 'var(--green)', height: b.hi + '%', opacity: b.op }} />
            <div style={{ flex: 1, borderRadius: '6px 6px 2px 2px', background: 'var(--accent)', height: b.he + '%', opacity: b.op }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: b.labelColor }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Letter({ size, radius, bg, color, fontSize, children, style }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize, background: bg, color, flex: 'none', ...style }}>
      {children}
    </div>
  );
}

export function Checkbox({ size, radius, icon, strokeWidth = 2.4, done, border }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flex: 'none', border: '2px solid ' + border, background: done ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
      <svg width={icon} height={icon} viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: done ? 1 : 0 }}>
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
