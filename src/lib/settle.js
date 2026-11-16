// Кто кому переводит: общие траты двоих делятся поровну или в выбранной доле.
// Баланс участника = заплатил − его доля общих трат + отправленные расчёты − полученные.
// Положительный баланс — ему должны. Запись «Рассчитались» (settings.settle.log) обнуляет разницу.

export const SPLIT_OPTIONS = (A, B) => [
  { id: 'equal', label: 'Поровну', share: 0.5 },
  { id: 'a60', label: `${A} 60%`, share: 0.6 },
  { id: 'a70', label: `${A} 70%`, share: 0.7 },
  { id: 'b60', label: `${B} 60%`, share: 0.4 },
  { id: 'b70', label: `${B} 70%`, share: 0.3 },
];

// split: { mode, share } — share = доля первого участника (по user_id, а не по порядку в списке)
export function settleUp(members, txs, split, log) {
  if (!Array.isArray(members) || members.length !== 2) return null;
  const [A, B] = [...members].sort((x, y) => String(x.user_id).localeCompare(String(y.user_id)));
  const shareA = split && Number.isFinite(Number(split.share)) ? Math.min(1, Math.max(0, Number(split.share))) : 0.5;
  const paid = id => txs.reduce((s, t) => s + (t.created_by === id ? t.amount || 0 : 0), 0);
  const paidA = paid(A.user_id);
  const paidB = paid(B.user_id);
  const total = paidA + paidB;
  const moved = (from, to) => (log || []).reduce((s, x) => s + (x.from === from && x.to === to ? Number(x.amount) || 0 : 0), 0);
  const balA = Math.round(paidA - total * shareA + moved(A.user_id, B.user_id) - moved(B.user_id, A.user_id));
  const settled = Math.abs(balA) < 1;
  const debtor = balA < 0 ? A : B;
  const creditor = balA < 0 ? B : A;
  return {
    A, B, shareA, paidA, paidB, total, balA,
    settled, amount: Math.abs(balA),
    from: settled ? null : debtor, to: settled ? null : creditor,
  };
}
