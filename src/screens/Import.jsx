import { useRef, useState } from 'react';
import { useBudget } from '../store.jsx';
import { BackHead, Icon } from '../components/ui.jsx';
import { fmt, traty } from '../data.js';
import { shortDate } from '../lib/dates.js';
import { parseKaspiLines, parseCsv, buildImport } from '../lib/statement.js';
import { receiptRows, parseReceipt, receiptToRows } from '../lib/receipt.js';
import { canScanReceipt, recognizeImage } from '../native.js';

// Фото → JPEG не больше 2200 px по длинной стороне (браузер сам поворачивает снимок как надо)
async function toJpegBase64(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}

// Импорт (макет, шаг 5c): выписка Kaspi (PDF, CSV) или фото чека → разбор → «Проверьте категорию» → добавить
export default function Import() {
  const { s, d, a } = useBudget();
  const fileInput = useRef(null);
  const photoInput = useRef(null);
  const [mode, setMode] = useState('statement');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null);
  const [skipped, setSkipped] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const ctx = () => { const all = s.data || { txs: [], incomes: [] }; return { txs: all.txs, incomes: all.incomes, cats: d.cats, allCats: d.cats, ns: s.household ? s.household.id : '', todayIso: d.todayIso }; };

  const onFile = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name); setError(''); setBusy('Читаю ' + file.name + '…'); setRows(null); setShowAll(false);
    try {
      let items;
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        const { pdfLines } = await import('../lib/pdf.js');
        items = parseKaspiLines(await pdfLines(file));
      } else {
        const text = await file.text();
        items = parseCsv(text);
        if (!items.length) items = parseKaspiLines(text.split(/\r?\n/));
      }
      if (!items.length) throw new Error('empty');
      const res = buildImport(items, ctx());
      setRows(res.rows); setSkipped(res.skipped);
    } catch (err) {
      console.error(err);
      setError(err && err.message === 'empty'
        ? 'Не нашёл операций в файле. Нужна выписка Kaspi Gold в PDF или таблица CSV с колонками «Дата» и «Сумма».'
        : 'Не удалось прочитать файл. Попробуйте ещё раз или выгрузите выписку заново.');
    }
    setBusy('');
  };

  const onPhoto = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFileName('Чек'); setError(''); setBusy('Распознаю чек…'); setRows(null); setShowAll(true);
    try {
      const lines = receiptRows(await recognizeImage(await toJpegBase64(file)));
      const rc = parseReceipt(lines);
      if (!rc.total) throw new Error('empty');
      const c = ctx();
      const have = new Set(c.txs.map(t => t.id));
      const list = receiptToRows(rc, c);
      setSkipped(list.filter(r => have.has(r.id)).length);
      setRows(list.filter(r => !have.has(r.id)));
      setFileName(`${rc.store || 'Чек'} · ${rc.reliable ? `${rc.items.length} поз.` : 'итог без позиций'}`);
    } catch (err) {
      console.error(err);
      setError(err && err.message === 'empty'
        ? 'Не нашёл на фото итоговую сумму. Снимите чек целиком, ровно и при хорошем свете.'
        : 'Не удалось распознать чек. Попробуйте ещё раз.');
    }
    setBusy('');
  };

  const setRow = (id, patch) => setRows(list => list.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const list = rows || [];
  // «проверить» — категория не подобрана, перевод или снятие, поступление, похоже на уже внесённое
  const needsCheck = r => r.kind === 'income' || r.likely || r.cat === 'other' || /перевод|снятие/i.test(r.op || '');
  const toCheck = list.filter(r => !r.reviewed && needsCheck(r));
  const picked = list.filter(r => r.checked);
  const sumTx = picked.filter(r => r.kind === 'tx').reduce((x, r) => x + r.amount, 0);
  const total = list.length + skipped;
  const parsedN = list.length - toCheck.length;
  const catById = Object.fromEntries(d.cats.map(c => [c.id, c]));
  // подсказки категорий: самые частые у семьи
  const popular = [...d.catStats].filter(c => catById[c.id]).slice(0, 3).map(c => c.id);
  const go = async () => { setSaving(true); const ok = await a.importRows(picked); setSaving(false); if (ok) a.go('spend'); };

  const Choice = ({ on, children, onClick, warn }) => (
    <button type="button" className="filter-chip" style={{ height: 32, fontSize: 13, ...(warn && on ? { borderColor: 'var(--accent)', color: 'var(--accent-tx)', background: 'var(--as)' } : {}) }} aria-pressed={on && !warn ? 'true' : 'false'} onClick={onClick}>{children}</button>
  );
  const CheckRow = ({ r }) => (
    <div className="col" style={{ gap: 8, padding: '12px 0', borderBottom: '1px solid var(--ln)' }}>
      <div className="row-between" style={{ gap: 10 }}>
        <div className="col" style={{ gap: 1, minWidth: 0 }}>
          <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{r.op && /перевод|снятие/i.test(r.op) ? `${r.op} · ${r.title}` : r.title}</span>
          <span className="t-meta">{shortDate(r.date)}{r.likely ? ' · похоже, уже внесено вручную' : ''}</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', color: r.kind === 'income' ? 'var(--green)' : 'var(--tx)' }}>{r.kind === 'income' ? '+' : '−'}{fmt(r.amount)}</span>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {r.kind === 'income'
          ? <Choice on={r.checked} onClick={() => setRow(r.id, { checked: true, reviewed: true })}>Это доход</Choice>
          : [...new Set([r.cat !== 'other' ? r.cat : null, ...popular].filter(Boolean))].slice(0, 3).map(id => (
            <Choice key={id} on={r.checked && r.cat === id} onClick={() => setRow(r.id, { cat: id, checked: true, reviewed: true })}>{catById[id].name}</Choice>
          ))}
        {r.kind === 'tx' && <Choice on={r.checked && r.cat === 'other'} onClick={() => setRow(r.id, { cat: 'other', checked: true, reviewed: true })}>Другое</Choice>}
        <Choice on={!r.checked && r.reviewed} onClick={() => setRow(r.id, { checked: false, reviewed: true })}>Не учитывать</Choice>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <BackHead onBack={() => a.go('settings')} title="Импорт" />
      <input ref={fileInput} type="file" accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain" style={{ display: 'none' }} onChange={onFile} />
      <input ref={photoInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />

      <div className="grid2">
        <button type="button" className="card list-row--tap" style={{ padding: 14, gap: 6, alignItems: 'flex-start', font: 'inherit', color: 'var(--tx)', textAlign: 'left', borderColor: mode === 'statement' ? 'var(--accent)' : undefined }}
          onClick={() => { setMode('statement'); fileInput.current && fileInput.current.click(); }}>
          <span style={{ color: 'var(--accent-tx)' }}><Icon name="file" size={20} /></span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Выписка Kaspi</span>
          <span className="t-meta">PDF из приложения или CSV</span>
        </button>
        <button type="button" className="card list-row--tap" style={{ padding: 14, gap: 6, alignItems: 'flex-start', font: 'inherit', color: 'var(--tx)', textAlign: 'left', borderColor: mode === 'photo' ? 'var(--accent)' : undefined, opacity: canScanReceipt ? 1 : 0.55 }}
          onClick={() => { setMode('photo'); if (canScanReceipt) photoInput.current && photoInput.current.click(); else setError('Распознавание чеков работает в приложении на iPhone. Здесь можно загрузить выписку.'); }}>
          <span style={{ color: 'var(--accent-tx)' }}><Icon name="camera" size={20} /></span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Фото чека</span>
          <span className="t-meta">разберёт по позициям</span>
        </button>
      </div>

      {busy && <div className="card"><div className="empty">{busy}</div></div>}
      {error && <div className="t-meta" style={{ color: 'var(--red)', padding: '0 4px' }}>{error}</div>}

      {!rows && !busy && (
        <div className="card" style={{ gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Как выгрузить из Kaspi</div>
          <div className="t-meta">1. Kaspi.kz → Kaspi Gold → «Выписка»</div>
          <div className="t-meta">2. Выберите период → «Отправить» → «Сохранить в Файлы»</div>
          <div className="t-meta">3. Нажмите «Выписка Kaspi» и выберите этот PDF</div>
          <div className="t-meta">Категории подберутся по названию магазина. Уже внесённое повторно не добавится.</div>
        </div>
      )}

      {rows && (
        <>
          <div className="card" style={{ gap: 10 }}>
            <div className="row-between" style={{ gap: 10 }}>
              <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{fileName}</span>
              <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>готово</span>
            </div>
            <div className="bar-split" style={{ height: 6 }} aria-hidden="true">
              {parsedN > 0 && <div style={{ flex: parsedN, background: 'var(--green)' }} />}
              {toCheck.length > 0 && <div style={{ flex: toCheck.length, background: 'var(--accent)' }} />}
              {skipped > 0 && <div style={{ flex: skipped, background: 'var(--off)' }} />}
            </div>
            <div className="plan-legend">
              <span><b style={{ color: 'var(--green)', fontWeight: 600 }}>{parsedN}</b>&nbsp;разобрано</span>
              <span><b style={{ color: 'var(--accent-tx)', fontWeight: 600 }}>{toCheck.length}</b>&nbsp;проверить</span>
              <span><b style={{ fontWeight: 600 }}>{skipped}</b>&nbsp;уже есть</span>
            </div>
          </div>

          {total === skipped && <div className="card"><div className="empty">Все операции из файла уже есть в бюджете</div></div>}

          {toCheck.length > 0 && (
            <>
              <div className="section-head"><div className="t-card">Проверьте категорию</div><div className="t-meta">{toCheck.length}</div></div>
              <div className="card" style={{ gap: 0, padding: '2px 18px' }}>{toCheck.map(r => <CheckRow key={r.id} r={r} />)}</div>
            </>
          )}

          {list.length > 0 && (
            <div className="t-link" style={{ textAlign: 'center' }} onClick={() => setShowAll(v => !v)}>{showAll ? 'Скрыть список' : `Показать все операции · ${list.length}`}</div>
          )}
          {showAll && (
            <div className="card card--list">
              {list.map(r => (
                <div key={r.id} className="imp-row" style={{ borderBottom: '1px solid var(--ln)' }} onClick={() => setRow(r.id, { checked: !r.checked, reviewed: true })}>
                  <div className="imp-check" data-on={r.checked ? 'true' : 'false'}>✓</div>
                  <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                    <div className="ellipsis" style={{ fontSize: 14, fontWeight: 600, opacity: r.checked ? 1 : 0.55 }}>{r.title}</div>
                    <div className="t-meta ellipsis">{shortDate(r.date)} · {r.kind === 'income' ? 'поступление' : (catById[r.cat] || { name: 'Другое' }).name}{r.note ? ' · ' + r.note : ''}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: r.kind === 'income' ? 'var(--green)' : 'var(--tx)' }}>{r.kind === 'income' ? '+' : '−'}{fmt(r.amount)}</div>
                </div>
              ))}
            </div>
          )}

          {list.length > 0 && (
            <div className="submit" style={{ background: picked.length && !saving ? 'var(--accent)' : 'var(--ip)', color: picked.length && !saving ? 'var(--on-accent)' : 'var(--mu)' }} onClick={() => picked.length && !saving && go()}>
              {saving ? 'Добавляю…' : picked.length ? `Добавить ${picked.length === 1 ? 'операцию' : picked.length + ' ' + (picked.length % 10 >= 2 && picked.length % 10 <= 4 && (picked.length % 100 < 10 || picked.length % 100 >= 20) ? 'операции' : 'операций')}${sumTx ? ' · ' + fmt(sumTx) : ''}` : 'Отметьте операции'}
            </div>
          )}
          {picked.length > 0 && <div className="t-meta" style={{ textAlign: 'center' }}>{traty(picked.filter(r => r.kind === 'tx').length)}{picked.some(r => r.kind === 'income') ? ` и ${picked.filter(r => r.kind === 'income').length} поступл.` : ''}</div>}
        </>
      )}
    </div>
  );
}
