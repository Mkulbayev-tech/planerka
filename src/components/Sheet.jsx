// Нижняя шторка с формой и простые поля в стиле макета.
import { CatIcon } from './ui.jsx';

// closable={false} — обязательная шторка: без крестика, тап мимо только прячет клавиатуру.
export function Sheet({ title, onClose, children, closable = true }) {
  const onBackdrop = () => {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { el.blur(); return; }
    if (closable) onClose();
  };
  return (
    <div className="sheet-backdrop" onClick={onBackdrop}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__grip" />
        <div className="row-between">
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{title}</div>
          {closable && <div className="sheet__close" onClick={onClose}>×</div>}
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
            style={{ background: on ? 'var(--as)' : 'var(--ip)', borderColor: on ? (o.color || 'var(--accent)') : 'transparent' }}>
            {(o.icon || o.letter) && <CatIcon size={24} icon={o.icon} letter={o.letter} color={o.color} />}
            <div style={{ fontSize: 13, fontWeight: 500, padding: o.letter ? 0 : '0 4px' }}>{o.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick }) {
  return (
    <div className="submit" style={{ background: disabled ? 'var(--ip)' : 'var(--accent)', color: disabled ? 'var(--mu)' : 'var(--on-accent)', height: 54 }} onClick={() => !disabled && onClick()}>
      {children}
    </div>
  );
}

export function DangerButton({ children, onClick }) {
  return <div className="danger-btn" onClick={onClick}>{children}</div>;
}
