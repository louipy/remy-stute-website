// Reconstruye todos los PDFs multi-página de fichas técnicas desde los JPEGs originales.
// Garantiza: portada (IDENTIFICACIÓN DEL PRODUCTO) siempre como página 1.
// Uso: node scripts/rebuild-fichas-pdf.mjs
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root    = fileURLToPath(new URL('..', import.meta.url));
const fichas  = join(root, 'public/fichas');
const ref     = join(root, 'design-reference/FICHA TECNICA');

const A4_W = 595.28;
const A4_H = 841.89;

async function buildPdf(pages, out) {
  const pdf = await PDFDocument.create();
  for (const src of pages) {
    const buf = await sharp(src).jpeg({ quality: 92 }).toBuffer();
    const img = await pdf.embedJpg(buf);
    const pg  = pdf.addPage([A4_W, A4_H]);
    pg.drawImage(img, { x: 0, y: 0, width: A4_W, height: A4_H });
  }
  const bytes = await pdf.save();
  writeFileSync(out + '.tmp', bytes);
  renameSync(out + '.tmp', out);
  return bytes.byteLength;
}

// ── Mapeo completo: portada SIEMPRE primero ───────────────────────────────────
// Nota sobre espacios en nombres WhatsApp:
//   sin número : "WhatsApp Image 2026-..."
//   con  "1"   : "WhatsApp Image 1 2026-..."  (o "  1 " / "1  " según el envío)
//   con  "2"   : "WhatsApp Image 2 2026-..."

const products = [

  // ── PORTADA = archivo sin número ─────────────────────────────────────────────
  {
    out: 'bentonita-activada-ficha-tecnica.pdf',
    pages: [
      join(ref, 'BENTONITA ACTIVADA', 'WhatsApp Image 2026-06-11 at 4.27.24 PM.jpeg'),      // portada
      join(ref, 'BENTONITA ACTIVADA', 'WhatsApp Image  1 2026-06-11 at 4.27.24 PM.jpeg'),   // dorso (doble espacio)
    ],
  },
  {
    out: 'grafito-silvershine-285-ficha-tecnica.pdf',
    pages: [
      join(ref, 'GRAFITO SILVERSHINE - 285', 'WhatsApp Image 2026-06-11 at 4.27.24 PM.jpeg'),
      join(ref, 'GRAFITO SILVERSHINE - 285', 'WhatsApp Image 1 2026-06-11 at 4.27.24 PM.jpeg'),
    ],
  },
  {
    out: 'almidon-drillamyl-wp-ficha-tecnica.pdf',
    pages: [
      join(ref, 'ALMIDON DRILLAMYL WP', 'WhatsApp Image 2026-06-11 at 4.27.25 PM.jpeg'),
      join(ref, 'ALMIDON DRILLAMYL WP', 'WhatsApp Image 1  2026-06-11 at 4.27.25 PM.jpeg'), // doble espacio después del 1
    ],
  },
  {
    out: 'oxido-de-cromo-verde-gm7602-ficha-tecnica.pdf',
    pages: [
      join(ref, 'ÓXIDO DE CROMO VERDE GM7602', 'WhatsApp Image 2026-06-11 at 4.27.26 PM.jpeg'),
      join(ref, 'ÓXIDO DE CROMO VERDE GM7602', 'WhatsApp Image 1 2026-06-11 at 4.27.26 PM.jpeg'),
    ],
  },
  {
    out: 'oxido-de-hierro-marron-s686-ficha-tecnica.pdf',
    pages: [
      join(ref, 'ÓXIDO DE HIERRO MARRON S686', 'WhatsApp Image 2026-06-11 at 4.27.27 PM.jpeg'),
      join(ref, 'ÓXIDO DE HIERRO MARRON S686', 'WhatsApp Image 1 2026-06-11 at 4.27.27 PM.jpeg'),
    ],
  },
  {
    out: 'oxidos-de-hierro-series-s-ficha-tecnica.pdf',
    pages: [
      join(ref, 'ÓXIDOS DE HIERRO SERIES S', 'WhatsApp Image 2026-06-11 at 4.27.27 PM.jpeg'),
      join(ref, 'ÓXIDOS DE HIERRO SERIES S', 'WhatsApp Image 1 2026-06-11 at 4.27.27 PM.jpeg'),
    ],
  },
  {
    out: 'oxido-de-hierro-azul-s463-ficha-tecnica.pdf',
    pages: [
      join(ref, 'ÓXIDO DE HIERRO AZUL S463', 'WhatsApp Image 2026-06-11 at 4.27.28 PM.jpeg'),
      join(ref, 'ÓXIDO DE HIERRO AZUL S463', 'WhatsApp Image 1 2026-06-11 at 4.27.28 PM.jpeg'),
    ],
  },
  {
    out: 'naranja-molibdeno-207-ficha-tecnica.pdf',        // 1p → 2p
    pages: [
      join(ref, 'NARANJA MOLIBDENO 207', 'WhatsApp Image 2026-06-11 at 4.27.31 PM.jpeg'),
      join(ref, 'NARANJA MOLIBDENO 207', 'WhatsApp Image 1 2026-06-11 at 4.27.31 PM.jpeg'),
    ],
  },
  {
    out: 'oxido-de-hierro-verde-s5605-ficha-tecnica.pdf',  // 1p → 2p
    pages: [
      join(ref, 'OXIDO DE HIERRO VERDE S5605', 'WhatsApp Image 2026-06-11 at 4.27.30 PM.jpeg'),
      join(ref, 'OXIDO DE HIERRO VERDE S5605', 'WhatsApp Image 1 2026-06-11 at 4.27.30 PM.jpeg'),
    ],
  },

  // ── AZUL ULTRAMAR: orden invertido — el archivo "1" es la portada ─────────
  {
    out: 'azul-ultramar-ficha-tecnica.pdf',
    pages: [
      join(ref, 'AZUL ULTRAMAR', 'WhatsApp Image 1 2026-06-11 at 4.27.26 PM.jpeg'),   // PORTADA
      join(ref, 'AZUL ULTRAMAR', 'WhatsApp Image 2026-06-11 at 4.27.26 PM.jpeg'),      // dorso
    ],
  },

  // ── PORTADA = archivo "1" (orden invertido en estos 3 productos) ──────────
  {
    out: 'oxido-de-hierro-transparente-amarillo-sty409-ficha-tecnica.pdf',  // 1p → 2p
    pages: [
      join(ref, 'OXIDO DE HIERRO TRANSPARENTE AMARILLO STY409', 'WhatsApp Image 1 2026-06-11 at 4.27.30 PM.jpeg'), // PORTADA
      join(ref, 'OXIDO DE HIERRO TRANSPARENTE AMARILLO STY409', 'WhatsApp Image 2026-06-11 at 4.27.29 PM.jpeg'),   // dorso
    ],
  },
  {
    out: 'oxido-de-hierro-transparente-rojo-str518-ficha-tecnica.pdf',      // 1p → 2p
    pages: [
      join(ref, 'OXIDO DE HIERRO TRANSPARENTE ROJO STR518', 'WhatsApp Image 1 2026-06-11 at 4.27.29 PM.jpeg'), // PORTADA
      join(ref, 'OXIDO DE HIERRO TRANSPARENTE ROJO STR518', 'WhatsApp Image 2026-06-11 at 4.27.29 PM.jpeg'),   // dorso
    ],
  },
  {
    out: 'pr146-permanent-pink-hr100-ficha-tecnica.pdf',                    // 1p → 2p
    pages: [
      join(ref, 'PR 146 PERMANENT PINK HR-100', 'WhatsApp Image 1 2026-06-11 at 4.27.29 PM.jpeg'), // PORTADA
      join(ref, 'PR 146 PERMANENT PINK HR-100', 'WhatsApp Image 2026-06-11 at 4.27.28 PM.jpeg'),   // dorso
    ],
  },

  // ── HPMC: 3 páginas (actualmente tenía solo 2) ────────────────────────────
  {
    out: 'kimicell-hpmc-kmp150000c-ficha-tecnica.pdf',
    pages: [
      join(ref, 'KÍMICELL ÉTERES DE CELULOSA HPMC KMP150000C', 'WhatsApp Image 2026-06-11 at 4.27.25 PM.jpeg'),    // portada
      join(ref, 'KÍMICELL ÉTERES DE CELULOSA HPMC KMP150000C', 'WhatsApp Image  1 2026-06-11 at 4.27.25 PM.jpeg'), // p2 (doble espacio)
      join(ref, 'KÍMICELL ÉTERES DE CELULOSA HPMC KMP150000C', 'WhatsApp Image 2 2026-06-11 at 4.27.25 PM.jpeg'),  // p3
    ],
  },
];

for (const { out, pages } of products) {
  const outputPath = join(fichas, out);
  try {
    const bytes = await buildPdf(pages, outputPath);
    console.log(`✓ ${out}  ${pages.length}p  →  ${Math.round(bytes / 1024)} KB`);
  } catch (err) {
    console.error(`✗ ${out}:`, err.message);
  }
}

console.log('\nListo. Actualiza los tamaños en ProductosCatalogo.astro con los valores de arriba.');
