// Convierte los JPEGs de fichas técnicas a PDF de una sola página.
// Uso: node scripts/jpg-to-pdf.mjs
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

const fichasDir = new URL('../public/fichas/', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1'); // corrige path en Windows (/C:/... → C:/...)

const jpgFiles = readdirSync(fichasDir).filter(
  (f) => extname(f).toLowerCase() === '.jpg'
);

if (!jpgFiles.length) {
  console.log('No hay archivos .jpg en public/fichas/');
  process.exit(0);
}

for (const file of jpgFiles) {
  const inputPath = join(fichasDir, file);
  const outputFile = basename(file, extname(file)) + '.pdf';
  const outputPath = join(fichasDir, outputFile);

  const jpgBytes = readFileSync(inputPath);
  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(jpgBytes);

  // Tamaño A4 en puntos (1pt = 1/72 in). Ficha ~210×297mm.
  const A4_W = 595.28;
  const A4_H = 841.89;

  const page = pdfDoc.addPage([A4_W, A4_H]);
  page.drawImage(jpgImage, { x: 0, y: 0, width: A4_W, height: A4_H });

  const pdfBytes = await pdfDoc.save();
  writeFileSync(outputPath, pdfBytes);

  const sizeMB = (pdfBytes.byteLength / 1024).toFixed(0);
  console.log(`✓ ${outputFile}  ${sizeMB} KB`);
}

console.log('\nConversión completa.');
