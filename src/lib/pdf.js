// Текст PDF построчно (для выписки Kaspi). pdf.js грузится только при импорте — в основной бандл не попадает.
// legacy-сборка — чтобы работало и на телефонах со старой iOS.
export async function pdfLines(file) {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, isEvalSupported: false });
  const doc = await task.promise;
  const lines = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // Куски текста с одной высотой (y) — одна строка таблицы; внутри строки — слева направо
      const rows = [];
      content.items.forEach(it => {
        if (!it.str || !it.str.trim()) return;
        const x = it.transform[4];
        const y = it.transform[5];
        let row = rows.find(r => Math.abs(r.y - y) < 3);
        if (!row) { row = { y, items: [] }; rows.push(row); }
        row.items.push({ x, s: it.str });
      });
      rows.sort((a, b) => b.y - a.y).forEach(r => lines.push(r.items.sort((a, b) => a.x - b.x).map(i => i.s).join(' ')));
    }
  } finally {
    task.destroy();
  }
  return lines;
}
