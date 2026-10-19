// node tests/helpers/make_studio_pdfs.cjs <outDir> <pdf-lib.min.js path> — synthetic fixtures (no student data).
const fs = require('node:fs'), path = require('node:path');
const { PDFDocument, StandardFonts, rgb, degrees } = require(path.resolve(process.argv[3]));
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const mixed = await PDFDocument.create(), font = await mixed.embedFont(StandardFonts.Helvetica);
  const spec = [[595, 842, 0, null], [792, 612, 0, null], [600, 800, 90, null], [600, 800, 270, [20, 30, 560, 740]], [612, 792, 180, null]];
  spec.forEach(([w, h, rot, crop], i) => {
    const p = mixed.addPage([w, h]); p.drawText('Mixed fixture page ' + (i + 1) + ' Alpha Beta', { x: 50, y: h - 80, size: 22, font });
    p.drawRectangle({ x: 50, y: 60, width: 120, height: 40, color: rgb(0.2, 0.4, 0.9) });
    if (crop) p.setCropBox(crop[0], crop[1], crop[2], crop[3]);
    if (rot) p.setRotation(degrees(rot));
  });
  fs.writeFileSync(path.join(out, 'mixed.pdf'), await mixed.save());
  const big = await PDFDocument.create(), f2 = await big.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 120; i++) { const p = big.addPage([595, 842]); p.drawText('Large fixture page ' + (i + 1), { x: 50, y: 780, size: 20, font: f2 }); for (let k = 0; k < 20; k++) p.drawText('Line ' + k + ' lorem ipsum dolor sit amet', { x: 50, y: 740 - k * 30, size: 11, font: f2 }); }
  fs.writeFileSync(path.join(out, 'large.pdf'), await big.save());
  console.log('fixtures ok');
})();
