# WHILECHANGES — Cambios paralelos al roadmap

Este archivo lleva el registro de **cambios pendientes que NO pertenecen a ninguna de las 7 fases del MVP** definidas en `status.md`. Sirve para no perder de vista trabajo de diseño, deuda técnica, ajustes de copy, mejoras de SEO ad-hoc, etc.

> **Para Claude:** revisar este archivo al iniciar cada sesión, junto con `status.md` y `CLAUDE.md`. Si el usuario pide algo que no es parte de una fase del roadmap, lo más probable es que pertenezca aquí. Al completar una entrada, moverla a la sección "Hecho" con la fecha de cierre — no borrarla.

---

## Estructura de cada entrada

```
### [estado] — Título corto
- **Categoría:** diseño | deuda técnica | copy | SEO | infra | otro
- **Agregado:** YYYY-MM-DD
- **Bloqueado por:** (qué se necesita antes de poder empezar)
- **Riesgo de romper código:** bajo | medio | alto — (qué archivos/contratos tocar con cuidado)
- **Contexto:** por qué surge este cambio
- **Pasos:**
  1. ...
- **Archivos afectados:** lista
- **Notas:**
```

Estados: `⬜ pendiente` | `🟡 en curso` | `✅ hecho`

---

## Pendientes

### ⬜ Rediseño visual — aplicar manual de imagen de la empresa
- **Categoría:** diseño
- **Agregado:** 2026-05-14
- **Bloqueado por:**
  - Manual de imagen de Remy & Stute (paleta, tipografías, jerarquía) — debe colocarse en `public/brand/manual.pdf` o pasarse por chat
  - Logos vectorizados en SVG (ver "Activos requeridos" abajo)
- **Riesgo de romper código:** bajo (si se respetan los contratos del formulario, ver abajo)
- **Contexto:** El sitio actual usa colores y tipografías de prototipo (variables Tailwind v4 en `src/styles/global.css`). El cliente tiene un manual de imagen formal que debe aplicarse antes de salir a producción.

#### Activos requeridos (del usuario)
- `logo.svg` — color principal, para navbar
- `logo-white.svg` — versión blanca, para fondo oscuro (footer)
- `logo-mono.svg` — negro plano, fallback
- `favicon.svg`
- (opcional) `logo-isotipo.svg` — solo símbolo sin texto, para mobile compacto
- Manual con: paleta hex, tipografías (nombre + pesos), jerarquía visual

Ubicación destino: `public/brand/`

#### Cambios SEGUROS (CSS / visual puro)
- `src/styles/global.css` — variables `@theme` Tailwind v4, paleta, tipografías
- Cualquier `<style>` dentro de componentes Astro
- Imágenes en `public/`
- Fuentes (cambiar el `<link>` de Google Fonts en `BaseLayout.astro` por las del manual)
- Spacing, sombras, bordes, animaciones, layout grids/flex
- Copy y textos (siempre que respete claims legales)

#### Cambios CON CUIDADO (no romper Fase 2)
Los siguientes contratos del formulario no pueden cambiar sin actualizar también el JS y la API:

```
src/components/ContactSection.astro
  ├─ <form id="contactoForm">                           ← JS hook
  ├─ id="formSuccess", id="contactoSubmit", id="idempotencyKey"
  ├─ <input name="nombre|empresa|email|whatsapp|cargo|producto|volumen|notas">
  │                                                    ← API espera estos nombres exactos
  │                                                    ← (rediseño 2026-05-19: se quitó 'industria', se agregó 'notas')
  ├─ <input name="idempotency_key">                    ← R3
  ├─ <div class="cf-turnstile" data-sitekey={siteKey}> ← Turnstile auto-mount, NO renombrar la clase
  └─ data-error="<campo>"                              ← donde se pintan errores Zod

src/layouts/BaseLayout.astro
  ├─ <!-- GTM_HEAD_PLACEHOLDER -->                     ← Fase 5
  └─ <!-- GTM_BODY_PLACEHOLDER -->                     ← Fase 5
```

Si el rediseño exige cambiar nombres de campo (ej: separar nombre y apellido en dos inputs), avisar para actualizar también `src/lib/schemas/contacto.ts` y `src/pages/api/contacto.ts`.

#### Pasos sugeridos cuando lleguen los activos
1. Colocar logos en `public/brand/` y manual en `public/brand/manual.pdf`
2. Actualizar `@theme` en `src/styles/global.css` con la paleta del manual
3. Actualizar el `<link>` de Google Fonts en `BaseLayout.astro` con las tipografías del manual
4. Reemplazar texto del navbar/footer por `<img src="/brand/logo.svg">` (con dimensiones explícitas para evitar CLS)
5. Agregar `<link rel="icon" href="/brand/favicon.svg">` en `BaseLayout.astro`
6. Pasar componente por componente verificando paridad visual con el manual
7. Lighthouse mobile post-cambio para confirmar que no se degradó performance

---

## Hecho

### ✅ — Rediseño de arquitectura (design-reference)
- **Categoría:** diseño
- **Agregado:** 2026-05-18 · **Cerrado:** 2026-05-19
- **Contexto:** El usuario aportó la carpeta `design-reference/` con 5 `.html` exportados de claudedesign (HOME, PRODUCTOS, NOSOTROS, CONTACTO, COMPONENTES). Se reconstruyó el sitio sobre esa arquitectura. Colores/tipografía/copy NO son los oficiales — se conserva la paleta actual; los cambios de color, copy y tipografía se harán de forma quirúrgica después.
- **Cambios aplicados:**
  1. IA de páginas: `/soluciones` eliminada; `/productos` y `/nosotros` ahora son páginas reales (antes Nosotros era sección del home). `/casos` y `/recursos` siguen como `PageInConstruction`.
  2. Home: Hero (nuevo copy + 4 stats) → Industrias servidas (6 sectores) → CTA de contacto. Ya no incluye grilla de productos ni sección Nosotros.
  3. **Contrato de Fase 2 modificado** (decisión del usuario): se eliminó el campo `industria`, se agregó `notas` (textarea opcional), `volumen` y `cargo` pasaron a texto libre. Actualizados `src/lib/schemas/contacto.ts` y el payload JS de `ContactSection.astro`. `api/contacto.ts` no requirió cambios (usa el schema genérico).
  4. Componentes nuevos: `IndustriasServidas.astro`, `ContactoCTA.astro`, `ProductosCatalogo.astro` (con filtro por sector).
  5. Componentes eliminados: `ProductsGrid.astro`, `IndustriasBlocks.astro`, `TrustBar.astro` (no aparecen en el diseño).
- **Pendiente (cambios quirúrgicos posteriores):** colores oficiales, tipografía del manual de marca, copy definitivo, datos reales (RIF, dirección, cifras de "pedido promedio" de los sectores son marcador), modal de ficha técnica y banner de cookies (Fase 5).
- **Notas:** `astro check` sin errores; las 6 rutas responden 200. `SECTORES_VALIDOS` (CLAUDE.md) ya no valida el formulario pero el catálogo usa 6 sectores distintos (Cerámicas, Construcción, Pinturas, Feed, Industrial, Aminoácidos) — conflicto de datos a resolver con el cliente.

### ✅ — Cambios quirúrgicos post-réplica (sesión 2026-05-19)
- **Categoría:** diseño
- **Agregado:** 2026-05-19 · **Cerrado:** 2026-05-19
- **Contexto:** Ajustes sobre la réplica base para alinear el sitio en vivo con el diseño final y corregir detalles de UX. Entrada actualizada en sucesivos turnos del mismo día.
- **Cambios aplicados:**
  1. **Navbar fija universal:** `position: fixed; top: 4px`. Fondo oscuro `rgba(10,15,13,0.95) + blur(12px)` y contenido blanco **desde el primer paint** en todas las páginas (sin estado transparente, sin listener de scroll). El JS de `Navbar.astro` solo gestiona el drawer móvil. Ícono WhatsApp en home, teléfono en las demás. CTA: "Solicitar cotización" (home) / "Solicitar diagnóstico técnico" (resto).
  2. **Flag ribbon:** `position: fixed; top: 0; height: 4px; z-index: 101` via global.css — nunca queda debajo del contenido.
  3. **Color scheme + overscroll (root):** `:root { color-scheme: only light }` bloquea el forced dark mode (OperaGX, Chrome experimental "Auto Dark Mode") que invertía secciones oscuras. `html { background: #0a2418; overscroll-behavior: none }` + `body { overscroll-behavior: none }` eliminan el bounce blanco en iOS y Chrome.
  4. **Hero layout — balance vertical:** `.hero { min-height: 100vh }`. `.hero__main` es `display: flex; flex-direction: column; justify-content: flex-start; gap: 56px` **sin** `border-right`. Tanto `.hero__top` como `.hero__stats` llevan `margin-top: auto`: el espacio libre se reparte en dos mitades — arriba del bloque texto+CTAs y entre los CTAs y el recuadro stats. Resultado: stats anclado al bottom alineado con el bottom del slideshow, y texto+CTAs centrado vertical en la zona superior.
  5. **Hero slideshow:** 3 fotos Unsplash verificadas HTTP 200. Fade opacity 0.6s cada 3s. Contador `01 / 03` reposicionado a `top: 88px; left: 16px` para no quedar tapado por el navbar (ahora siempre visible). Eliminado el badge "[ FOTO REAL · ALMACÉN CARACAS ]" — span y CSS removidos.
  6. **Banda oscura continua hero → sectores** (patrón visual nuevo):
     - `.hero__stats`: `background: var(--ink)`, full-bleed dentro del `.hero__main` (`margin-left/right: calc(-1 * var(--pad))`, `margin-bottom: -56px`), padding `36px var(--pad)`. Números blancos, unidades blancas, labels `rgba(255,255,255,0.55)`. `<4H` en `var(--yellow)` — incluido el span hijo "H" vía `.hstat__num[data-brown="true"] span`.
     - `.sectores`: `padding: 0 0 96px` (sin top) para que la cabecera arranque al ras del hero.
     - `.sectores__head`: `background: var(--ink)`, full-bleed dentro del `.wrap` (`margin-left/right: calc(-50vw + 50%)`, `padding-left/right: calc(50vw - 50% + var(--pad))`), padding vertical `56px ... 48px`. Eyebrow + raya en `var(--yellow)` vía selectores específicos (`.sectores__head .eyebrow` y `.line`), H2 en blanco, span `.g` ("ya está en planta.") en `var(--yellow)`.
     - Visualmente las dos zonas se leen como un único bloque oscuro continuo sin separación.
  7. **VentajaCompetitiva:** Título "30 años siendo [yellow]la mejor opción.[/yellow]". Cards: `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.18)`.
  8. **ContactoCTA:** Copy "Le contactaremos en menos de 4h." Botón WhatsApp con SVG nativo (sin Lucide). Paso 1 = "Formulario técnico", Paso 2 = "Respuesta <4h", Paso 3 = "Cotización".
  9. **Footer limpiado:** eliminados div `footer-flag`, línea de horario L–V, segundo teléfono wa.me, texto "SITIO B2B". Solo queda: logo+desc · oficina · contacto · mapa del sitio.
- **Notas:** Fotos de Unsplash siguen siendo provisionales — reemplazar con fotos reales del almacén/planta del cliente antes de producción.

### ✅ — Réplica fiel del diseño desktop (design-reference)
- **Categoría:** diseño
- **Cerrado:** 2026-05-19
- **Contexto:** El usuario reemplazó los `.html` de `design-reference/` por las versiones **desktop 1440** definitivas (Home, Productos, Nosotros, Contacto) y pidió replicarlas al pie de la letra — no como inspiración. La primera reconstrucción había usado una paleta de prototipo; esta la sustituye por completo.
- **Método:** se parsearon los volcados de DOM de claudedesign (`design-reference/_extract.cjs`, usa parse5) para extraer colores, tipografías y layout exactos de cada elemento.
- **Sistema visual aplicado:**
  - Tema claro: fondo crema `#FAF9F5`, secciones blancas, texto `#0A2418`/`#3B473F`, verde de marca `#006633`, bordes `#E3E1D6`/`#CFCDBF`.
  - Banda verde oscuro `#0A2418` (Home sección 04 y footer). Acentos: amarillo `#F0E378`, marrón `#703300`.
  - Página **Nosotros**: tema oscuro `#0A0F0D` con acento lima `#CBFF00` (así está en el mockup — es una excepción intencional del diseño).
  - Tipografías: Plus Jakarta Sans (títulos), Inter (cuerpo), Oswald (cifras), JetBrains Mono (etiquetas).
- **Estructura por página:** Home = Hero + Industrias servidas (6 sectores) + Ventaja competitiva + CTA con flujo de 3 pasos. Productos = cabecera + filtros sector/marca + tabla de 5 SKU + vista detalle. Nosotros = hero oscuro + 4 cards expandibles + CTA. Contacto = cabecera + aside (oficina/mapa) + formulario brief técnico.
- **Componentes:** `Navbar` (header con nav Inicio/Productos/Nosotros/Contacto + subrayado de página activa — corrige el bug de no poder volver al Home), `Footer` (4 columnas verde oscuro), `Hero`, `IndustriasServidas`, `VentajaCompetitiva`, `ContactoCTA`, `ProductosCatalogo`, `NosotrosSection`, `ContactSection`, `FlagRibbon`. `BaseLayout` admite `theme` y `active`.
- **Pendiente (cambios quirúrgicos):** copy oficial, datos reales (RIF, dirección, cifras), fotografías reales (hoy placeholders de rayas diagonales como en el mockup), banner de cookies y modal de ficha (Fase 5).
