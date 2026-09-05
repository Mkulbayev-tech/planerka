// Нижняя шторка с формой и простые поля в стиле макета.
import { Letter } from './ui.jsx';

export function Sheet({ title, onClose, children }) {
  const onBackdrop = () => {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { el.blur(); return; }
    onClose();
  };
  return (
    <div className="sheet-backdrop" onClick={onBackdrop}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__grip" />
        <div className="row-between">
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>{title}</div>
          <div className="sheet__close" onClick={onClose}>×</div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, style }) {
  return (
    <label className="field" style={style}>
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <div className="chips chips--wrap">
      {options.map(o => {
        const on = o.id === value;
        return (
          <div key={String(o.id)} className="chip chip--pick" onClick={() => onChange(o.id)}
            style={{ background: on ? (o.bg || 'var(--as)') : 'var(--ip)', borderColor: on ? (o.color || 'var(--accent)') : 'transparent' }}>
            {o.letter && <Letter size={22} radius="50%" bg={o.bg} color={o.color} fontSize={11}>{o.letter}</Letter>}
            <div style={{ fontSize: 13, fontWeight: 700, padding: o.letter ? 0 : '0 4px' }}>{o.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick }) {
  return (
    <div className="submit" style={{ background: disabled ? 'var(--ip)' : 'var(--accent)', color: disabled ? 'var(--mu)' : '#fff', height: 54 }} onClick={() => !disabled && onClick()}>
      {children}
    </div>
  );
}

export function DangerButton({ children, onClick }) {
  return <div className="danger-btn" onClick={onClick}>{children}</div>;
}
