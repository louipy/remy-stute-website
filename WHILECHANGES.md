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

### ⬜ Tracking de clics de WhatsApp en GTM
- **Categoría:** analytics
- **Agregado:** 2026-05-31
- **Bloqueado por:** nada — se hace 100% desde la interfaz de GTM, sin tocar código
- **Riesgo de romper código:** ninguno
- **Contexto:** Los clics al botón flotante de WhatsApp y a los enlaces wa.me del sitio no están siendo registrados en GA4. Se identificó en sesión 2026-05-31 pero se dejó pendiente para no retrasar el deploy.
- **Pasos (todos en GTM, sin código):**
  1. Variables → Activar variables integradas → activar `Click URL`
  2. Activadores → Nuevo → Clic en solo enlaces → condición: `Click URL contiene wa.me` → nombre: `Activador - WhatsApp Click`
  3. Etiquetas → Nueva → GA4 Evento → nombre del evento: `whatsapp_click` → activador del paso anterior → nombre: `GA4 - WhatsApp Click`
  4. Publicar
- **Archivos afectados:** ninguno (solo GTM web interface)
- **Notas:** Después de activar, GA4 Informes → Participación → Eventos mostrará `whatsapp_click` con el desglose por página de origen.

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

> Contrato real actualizado tras el refactor de accesibilidad (2026-06-14). El formulario es un
> wizard multipaso manejado por JS, no un `<form>` con inputs `name` enviados como FormData.

```
src/components/ContactSection.astro
  ├─ <form id="msfContainer" novalidate>               ← contenedor; submit handler (Enter)
  ├─ pasos: #msf-step1..#msf-step5, #msf-close, #msf-success, #msf-main
  ├─ objeto JS `formData` con las claves que el API espera (= ContactoSchema):
  │     empresaConstituida, empresa, cargo, industria, email, nombre, telefono, idempotencyKey
  ├─ idempotencyKey = crypto.randomUUID() al montar                         ← R3
  ├─ industria: opciones renderizadas desde INDUSTRIAS_VALIDAS (schemas/contacto.ts)
  ├─ radios .sr-only + selección por evento `change` (accesible por teclado)
  ├─ <div class="cf-turnstile" data-sitekey={siteKey}>  ← Turnstile auto-mount, NO renombrar la clase
  │     el token se lee de [name="cf-turnstile-response"] y se envía como turnstile_token
  └─ errores: #msf-global-err (role="alert"); el API responde 422 con fieldErrors

src/pages/api/contacto.ts  ← valida con ContactoSchema; el payload JSON debe traer esas claves
src/lib/airtable.ts        ← objeto `fields` de createProspecto (columnas Airtable)
src/layouts/BaseLayout.astro
  └─ GTM is:inline en <head> (Main Thread, R5) — ya instalado (Fase 5)
```

Si se cambian campos del formulario, actualizar EN CONJUNTO: `ContactSection.astro` (UI + `formData`),
`src/lib/schemas/contacto.ts` (ContactoSchema), `src/pages/api/contacto.ts` y `src/lib/airtable.ts`
(objeto `fields` + columnas en Airtable). `idempotencyKey` nunca se renombra.

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
  - **[Resuelto 2026-06-14]** Conflicto cerrado: la lista oficial son las 5 industrias en `INDUSTRIAS_VALIDAS` (General/Cerámicas/Hidrocarburos/Pinturas/Alimento animal), usada por schema, formulario, catálogo y home. `SECTORES_VALIDOS` eliminado.

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

### ✅ — Cambios quirúrgicos de diseño (sesión 2026-05-21)
- **Categoría:** diseño
- **Agregado:** 2026-05-21 · **Cerrado:** 2026-05-21
- **Contexto:** Tres tareas quirúrgicas sobre el home a partir de nuevas referencias de diseño (`design-reference/Remy _ Stute Hero.html` y `design-reference/Sectores - Remy_Stute.html`).
- **Cambios aplicados:**
  1. **Hero — reescritura completa (`Hero.astro`):** Grid restructurado con `grid-template-rows: 1fr auto`. `.hero__stats` extraído de `.hero__main` como hijo directo del grid (`grid-column: 1; grid-row: 2; background: var(--ink)`). `.hero__main` (`grid-row: 1`) conserva `background: var(--cream-2)`. `.hero__media` abarca ambas filas con `grid-row: 1/3; border-radius: 20px 0 0 20px; margin: 16px 0 0 0`. JS del slideshow y counter intactos. Stats: números 38px / separador `border-left: 1px solid rgba(255,255,255,0.12)`.
  2. **Esquina crema detrás del slideshow (fix):** `.hero { background: var(--ink) }` rellena el área detrás del `border-radius` de `.hero__media`. `.hero__main { background: var(--cream-2) }` preserva el fondo claro en la columna de texto. En mobile (`@media max-width: 980px`), `.hero { background: var(--cream-2) }` porque `border-radius: 0`.
  3. **Transición diagonal hero → sectores:** `clip-path: polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - 32px))` en `.sectores__head` genera una rampa geométrica de 32px desde la banda oscura hacia el grid. `padding-bottom: 60px` para que el clip no corte contenido.
  4. **Grid de tarjetas de sectores (`IndustriasServidas.astro`):** Tarjetas planas reemplazadas por foto-cards con imagen de cobertura total (`position: absolute; inset: 0`), overlay `linear-gradient(to top, rgba(0,30,14,0.85) → transparent)`, `border-radius: 20px`, `min-height: 340px`. Hover: `translateY(-6px)`, `scale(1.06)` en foto, barra acento amarilla se expande al 100%, overline "Sector" y flecha circular aparecen con transición. `sectores__head` CONGELADO — no tocar.
  5. **Botón CTA de sectores:** Nuevo `.sectores-cta` standalone (evita conflictos de especificidad con el global `.btn`). Verde outline → relleno verde en hover, flecha animada +4px.
  6. **Accesibilidad:** `@media (prefers-reduced-motion: reduce)` en `IndustriasServidas.astro` desactiva todas las transiciones de tarjetas.
- **Archivos afectados:** `src/components/Hero.astro`, `src/components/IndustriasServidas.astro`
- **Notas:** Fotos de Unsplash siguen siendo provisionales. `sectores__head` aprobado — no modificar en sesiones futuras.

### ✅ — Rediseño VentajaCompetitiva + calibración Hero (sesión 2026-05-21 / tarde)
- **Categoría:** diseño
- **Agregado:** 2026-05-21 · **Cerrado:** 2026-05-21
- **Contexto:** Dos tareas quirúrgicas sobre el home. Nueva referencia de diseño `design-reference/Ventaja Competitiva.html` (exportada de Claude Design). Además, múltiples rondas de calibración del balance visual en el Hero.
- **Cambios aplicados:**
  1. **VentajaCompetitiva — rediseño completo (`VentajaCompetitiva.astro`):** Cards oscuras semitransparentes reemplazadas por cards blancas (`background: #fff; border-radius: 6px; padding: 32px 28px`). Icono circular verde (`width/height: 64px; border-radius: 50%; background: rgba(0,102,51,0.06); border: 1.5px solid rgba(0,102,51,0.15)`) con SVG inline en cada card. Número `01–04` en Oswald 36px verde. Tag en JetBrains Mono 9.5px uppercase muted. Barra inferior accent (`border-top: 1px solid rgba(0,102,51,0.12)` + dot verde + label mono 10px). Hover: card sube `translateY(-6px)`, sombra profunda, línea mustard crece desde la izquierda (`::before scaleX(0→1)`), icono cambia a fondo verde y stroke blanco. Patrón hexagonal SVG de fondo (opacity 0.07) + radial-gradient verde sutil a la izquierda. `@media (prefers-reduced-motion: reduce)` desactiva todas las transiciones.
  2. **Hero — columna izquierda, layout y tipografía:**
     - `.hero__main padding`: `88px 40px` (horizontal reducido de 56 a 40px para dar anchura al texto).
     - `.hero__body`: `width: 100%` — eliminado `max-width` y `margin: 0 auto` que forzaban saltos de línea prematuros y apilaban los botones.
     - Título: `font-size: clamp(42px, 4.5vw, 64px); font-weight: 700; line-height: 1.14; text-wrap: balance` (sin max-width en el selector del título).
     - Lead: `font-size: 18px; line-height: 1.7; max-width: 580px`.
     - Botones (override local): `font-size: 17px; padding: 17px 28px; width/height SVG: 16px`.
  3. **Hero — barra de estadísticas, calibración:**
     - `padding: 57px var(--pad)` (simétrico para centrar visualmente el contenido).
     - `hstat__num`: `font-size: 65px; font-weight: 700; letter-spacing: -0.5px`.
     - `hstat__unit`: `font-size: 21px; font-weight: 600; margin-top: 4px`.
     - `hstat__label`: `font-size: 13px; letter-spacing: 0.12em; line-height: 1.45`.
- **Archivos afectados:** `src/components/VentajaCompetitiva.astro`, `src/components/Hero.astro`, `CLAUDE.md`
- **Notas:** CLAUDE.md actualizado con todos los valores aprobados (sección "Hero — arquitectura del grid" y nueva subsección "Hero — tipografía columna izquierda"). `sectores__head` y `IndustriasServidas.astro` no tocados.

### ✅ — Cambios quirúrgicos y assets reales (sesión 2026-05-22)
- **Categoría:** diseño · copy · infra
- **Agregado:** 2026-05-22 · **Cerrado:** 2026-05-22
- **Contexto:** Sesión de refinamiento con múltiples mejoras de copy, navegación cross-page, unificación de navbar/footer, reemplazo de imágenes Unsplash por assets webp locales, y primera build + deploy en Netlify (preview estático).
- **Cambios aplicados:**
  1. **Filtro cross-page sectores → productos (`IndustriasServidas.astro` + `ProductosCatalogo.astro`):** Tarjetas de sector cambiadas de `<article>` a `<a href="/productos?sector=X">`. `ProductosCatalogo.astro` lee `?sector=` de URL params al cargar y activa el chip de filtro correspondiente.
  2. **Copy `ContactoCTA.astro`:** "Formulario técnico" → "Formulario"; "Respuesta <4h" → "Respuesta <2h"; eyebrow "cotización técnica" → "cotización"; acento título "en menos de 4h." → "en menos de 2h."; lead actualizado.
  3. **Copy `VentajaCompetitiva.astro`:** Card 01: removido "para los 5 productos Fase 1."; Card 03: "por ingeniero formulador" → "por personal capacitado".
  4. **Navbar unificado (`Navbar.astro`):** Eliminado el prop `variant` por completo — un único navbar para todas las páginas. Siempre ícono mensaje + "Solicitar cotización". Logo SVG inline (`logo-navbar-2.svg?raw`, height 68px). `brand-navbar-text` con animación de scroll: oculto en desktop, aparece con fade+slide al superar 60px de scroll vía clase `.scrolled`. Teléfono hover cambiado a `#CBFF00` en `global.css`. `BaseLayout.astro` actualizado (removido `variant` de `<Navbar>`).
  5. **Footer unificado (`Footer.astro`):** Logo SVG idéntico al navbar + `brand-navbar-text` siempre visible (override `opacity:1; transition:none`). Firma "Powered by Ixanity Studios" (mono 9px, `rgba(255,255,255,0.2)`). Sitemap limpiado: quitados "Casos por industria" y "Recursos técnicos"; "Contacto y cotización" → "Contacto".
  6. **Hero assets locales (`Hero.astro`):** 4 fotos webp locales (`carrusel-inicio-01–04-1920.webp`) reemplazan placeholders. Intervalo 5000ms. Counter "01 / 04".
  7. **Imágenes sector locales (`IndustriasServidas.astro`):** `Sector-ceramicas.webp`, `Sector - pintura.webp`, `SECTOR-FEED.webp`, `SECTOR-CONSTRUCCION.webp` importados como assets locales. Industrial y Aminoácidos siguen con Unsplash (pendiente foto real).
  8. **Nosotros — hero real (`NosotrosSection.astro`):** Placeholder reemplazado por `Candy-1920.webp`. Box-shadow multicapa (elevation reducida). `::after` overlay gradiente `rgba(5,15,8,0.38)` en borde inferior para transición suave a la sección siguiente.
  9. **Nosotros — sección Statement:** Nueva sección `nos-statement` entre hero e historia. Fondo `#0A2418`. Eyebrow "Quiénes somos" (mono lime). Título grande "No somos un distribuidor de catálogo." (display 800, clamp 40–72px). Lead "Somos el proveedor que garantiza que su producción no se detiene." (mono 16px `#C8F04D`).
  10. **API route (`src/pages/api/contacto.ts`):** `export const prerender = false` comentado para permitir build estático en Netlify preview. Restaurar junto con server adapter en Fase 3.
  11. **Primera build y deploy Netlify:** `npm run build` exitoso (build estático). Deploy vía `netlify-cli` como preview. API endpoint de contacto no funcional en este deploy (requiere server adapter — Fase 3).
- **Archivos afectados:** `Navbar.astro`, `Footer.astro`, `Hero.astro`, `IndustriasServidas.astro`, `ProductosCatalogo.astro`, `ContactoCTA.astro`, `VentajaCompetitiva.astro`, `NosotrosSection.astro`, `src/pages/api/contacto.ts`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `CLAUDE.md`
- **Pendiente (Fase 3):** Restaurar `prerender = false` en `api/contacto.ts` + instalar server adapter (`@astrojs/node` o `@astrojs/cloudflare`) para activar el formulario en producción.

### ✅ — Fixes mobile: navbar + menú lateral + touch targets (sesión 2026-06-13)
- **Categoría:** diseño
- **Agregado:** 2026-06-13 · **Cerrado:** 2026-06-13
- **Contexto:** La mayoría del tráfico será móvil. El usuario reportó que en mobile el botón "Solicitar cotización" del navbar chocaba con el logo/nombre "Remy & Stute" al hacer scroll (navbar saturado), y pidió un menú lateral claro con las secciones + touch targets cómodos. Auditoría mobile (Playwright, iPhone 390×844) confirmó que las supuestas "secciones vacías" eran falsos positivos: animaciones `.reveal` (opacity:0 hasta scroll) + el Astro Dev Toolbar tapando contenido en dev — no bugs reales.
- **Cambios aplicados (todos en `src/styles/global.css`, scoped a mobile — desktop intacto y verificado):**
  1. **Navbar declutter (`@media max-width: 860px`):** `.site-header .header-right .btn--primary { display: none }` — el CTA "Solicitar cotización" se oculta del navbar en móvil (ya vive dentro del drawer). Elimina la colisión con el logo/nombre al hacer scroll. En móvil el navbar queda solo: logo + hamburguesa.
  2. **Touch target hamburguesa:** `.burger` ahora 44×44px (era ~34×28).
  3. **Menú lateral (drawer) mejorado:** ancho 300px / `max-width: 84vw`. Enlaces de sección como filas táctiles de `min-height: 48px` con separador inferior. Página activa en verde (`aria-current`). CTA verde separado abajo (`margin-top: 20px`). Botón cerrar `×` ahora 44×44px alineado a la esquina.
  4. **Touch target enlaces footer (`@media max-width: 860px`):** `.footer-links a, .footer-col p a { padding: 8px 0 }` para área táctil más cómoda (sin afectar el logo del footer).
- **Archivos afectados:** `src/styles/global.css`
- **Notas:** Desktop verificado sin cambios (CTA navbar 201×51 visible, nav links flex). Burger 44×44, drawer-close 44×44, drawer-links 48px de alto — confirmado por medición. El botón flotante de WhatsApp se superpone levemente con algún badge en mobile — pendiente menor, no abordado. El usuario indicó que comentará más cambios mobile en próximas sesiones.

### ✅ — Catálogo de productos optimizado en mobile + fix colisión número/nombre (sesión 2026-06-13)
- **Categoría:** diseño
- **Agregado:** 2026-06-13 · **Cerrado:** 2026-06-13
- **Contexto:** En `/productos`, en mobile el nombre del producto se solapaba con la barra oscura del número del catálogo. Causa raíz: `.pc-num` usa `margin: -24px 0 -24px -24px` para sangrar full-bleed en la columna izquierda del desktop; al colapsar el grid a 1 columna en móvil, el `margin-bottom: -24px` jalaba el nombre hacia arriba, dentro de la barra. Además el usuario pidió una forma más optimizada de mostrar el catálogo en móvil.
- **Cambios aplicados (solo bloque `@media max-width: 920px` de `ProductosCatalogo.astro` — desktop intacto y verificado):**
  1. **Rediseño a tarjetas:** `.pc-row` pasa a grid `44px 1fr`. El número `.pc-num` se convierte en badge contenido (44×44, `border-radius: 6px`, `margin: 0`, sin sangrado) junto al nombre → fin de la colisión.
  2. **Meta etiquetada:** `.pc-prod-marca` / `.pc-prod-sector` muestran etiquetas "Marca" / "Industria" vía `::before` (antes eran texto suelto sin contexto al ocultarse la fila de cabecera).
  3. **Acciones táctiles:** botones "Ficha" / "Solicitar muestra" en fila, `flex: 1; min-height: 44px` (medido 149×44).
  4. **Filtros (chips):** `min-height: 40px` para mejor toque.
- **Archivos afectados:** `src/components/ProductosCatalogo.astro`
- **Notas:** Desktop verificado idéntico (tabla con columnas de número full-bleed sin cambios). La vista detalle de ejemplo (`.pc-detail-card`) conserva su colapso a 1 columna ya existente.
