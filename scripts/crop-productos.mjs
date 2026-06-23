// Recorta el PRODUCTO (saco) de cada página de ficha técnica.
// Fuente: design-reference/FICHA TECNICA/ (originales sin modificar)
// Destino: src/assets/productos/ (sobreescribe versiones anteriores)
// Uso: node scripts/crop-productos.mjs
import sharp from 'sharp';
import { join } from 'path';
import { renameSync } from 'fs';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Cada entrada: { src: ruta desde raíz, dest: nombre en src/assets/productos/, crop: {left,top,width,height} }
// Todas las fuentes son 1241×1600. Los crops excluyen:
//   - Cabecera: logo R+S + "Remy & Stute, C.A." (top variable)
//   - Pie: dirección/teléfono/web (bottom ≈ y1250)
//   - Columna derecha: datos técnicos (x > ~460)
const products = [
  {
    dest: 'amarillo-cromo-limon-561.jpg',
    src: 'design-reference/FICHA TECNICA/AMARILLO CROMO LIMON 561/WhatsApp Image 2026-06-11 at 4.27.30 PM.jpeg',
    crop: { left: 0, top: 295, width: 435, height: 955 }, // top=295 excluye RIF "J-30298111-5" (y≈283); width=435 excluye letras col. derecha; bottom=1250
  },
  {
    dest: 'naranja-molibdeno-207.jpg',
    src: 'design-reference/FICHA TECNICA/NARANJA MOLIBDENO 207/WhatsApp Image 2026-06-11 at 4.27.31 PM.jpeg',
    crop: { left: 0, top: 295, width: 435, height: 955 }, // misma plantilla que amarillo
  },
  {
    dest: 'pthalocyanina-azul-k6850.jpg',
    src: 'design-reference/FICHA TECNICA/PTHALOCYANINA/WhatsApp Image 2026-06-11 at 4.27.28 PM.jpeg',
    crop: { left: 0, top: 288, width: 435, height: 682 }, // top=288 excluye RIF; bottom=970 corta espacio vacío y pie de página
  },
  {
    dest: 'oxido-de-hierro-transparente-amarillo-sty409.jpg',
    src: 'design-reference/FICHA TECNICA/OXIDO DE HIERRO TRANSPARENTE AMARILLO STY409/WhatsApp Image 1 2026-06-11 at 4.27.30 PM.jpeg',
    crop: { left: 0, top: 330, width: 435, height: 920 }, // SIN CAMBIO — perfecto en iteración anterior
  },
  {
    dest: 'oxido-de-hierro-transparente-rojo-str518.jpg',
    src: 'design-reference/FICHA TECNICA/OXIDO DE HIERRO TRANSPARENTE ROJO STR518/WhatsApp Image 1 2026-06-11 at 4.27.29 PM.jpeg',
    crop: { left: 0, top: 540, width: 430, height: 450 }, // altura reducida 710→450: corta espacio vacío abajo; bottom=990
  },
  {
    dest: 'oxido-de-hierro-verde-s5605.jpg',
    src: 'design-reference/FICHA TECNICA/OXIDO DE HIERRO VERDE S5605/WhatsApp Image 2026-06-11 at 4.27.30 PM.jpeg',
    crop: { left: 0, top: 295, width: 435, height: 955 }, // misma plantilla que amarillo
  },
  {
    dest: 'pr146-permanent-pink-hr100.jpg',
    src: 'design-reference/FICHA TECNICA/PR 146 PERMANENT PINK HR-100/WhatsApp Image 1 2026-06-11 at 4.27.29 PM.jpeg',
    crop: { left: 0, top: 590, width: 425, height: 510 }, // altura 660→510: corta verde vacío; bottom=1100. "REMY & STUTE" visible es el label del SACO, no la cabecera
  },
];

for (const { dest, src, crop } of products) {
  const inputPath  = join(root, src);
  const outputPath = join(root, 'src/assets/productos', dest);
  const tmpPath    = outputPath + '.tmp';

  // Verifica que el recorte no excede los límites antes de procesar
  const meta = await sharp(inputPath).metadata();
  const right  = crop.left + crop.width;
  const bottom = crop.top  + crop.height;
  if (right > meta.width || bottom > meta.height) {
    console.error(`✗ ${dest}: recorte fuera de límites (imagen ${meta.width}×${meta.height}, recorte hasta ${right}×${bottom})`);
    continue;
  }

  const { info } = await sharp(inputPath)
    .extract(crop)
    .jpeg({ quality: 92 })
    .toBuffer({ resolveWithObject: true });

  await sharp(inputPath)
    .extract(crop)
    .jpeg({ quality: 92 })
    .toFile(tmpPath);

  renameSync(tmpPath, outputPath);
  console.log(`✓ ${dest}  ${crop.width}×${crop.height}px  →  ${(info.size / 1024).toFixed(0)} KB`);
}

console.log('\nListo.');
