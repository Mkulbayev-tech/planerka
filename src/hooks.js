import { useEffect, useRef, useState } from 'react';

export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = e => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// Текущее время, обновляется раз в интервал — чтобы даты и «дней до зарплаты» менялись без перезагрузки.
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

// Долгое нажатие: onLong по удержанию, onClick по обычному тапу (после долгого нажатия клик подавляется).
export function useLongPress(onLong, onClick, ms = 450) {
  const timer = useRef(null);
  const fired = useRef(false);
  const start = () => { fired.current = false; clearTimeout(timer.current); timer.current = setTimeout(() => { fired.current = true; onLong(); }, ms); };
  const cancel = () => clearTimeout(timer.current);
  const click = () => { if (fired.current) { fired.current = false; return; } if (onClick) onClick(); };
  return { onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel, onClick: click, onContextMenu: e => e.preventDefault() };
}
