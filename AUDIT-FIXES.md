# AUDIT-FIXES — Revisión de "vibe coding" y vulnerabilidades

Lista de trabajo derivada de dos auditorías del proyecto (revisión 1 + revisión 2 exhaustiva).
Objetivo: que el código se lea como escrito por un desarrollador, sin deuda volátil ni
contradicciones doc↔código. Tachar cada ítem al cerrarlo. No borrar — mover a "Cerrados".

Severidad: 🔴 alta · 🟠 media · 🟡 baja
Estado: ⬜ pendiente · 🟡 en curso · ✅ hecho

---

## A — Seguridad / integridad de datos

### ✅ 🔴 A1 — `console.log` con PII en producción
Cerrado 2026-06-14: eliminado el `console.log` de `ContactSection.astro`. Ver "Cerrados".

### ✅ 🟠 A2 — Inyección de HTML en el email de notificación
Cerrado 2026-06-14: helper `escapeHtml` + escape de todos los valores del lead en `email.ts`.
Ver "Cerrados".

### ✅ 🟠 A3 — El servidor confía en el cliente para campos de enum
Cerrado 2026-06-14: `empresaConstituida` e `industria` ahora son `z.enum`. `cargo` se mantiene
libre a propósito (el form tiene opción "Otro" con texto libre). Ver "Cerrados".

### ✅ 🟠 A4 — Teléfono nunca se normaliza a E.164
Cerrado 2026-06-14: `ContactoSchema.telefono` normaliza a `+58XXXXXXXXXX` (transform), acepta
formatos comunes y rechaza fijos/inválidos. `meta.ts` y Airtable heredan el valor normalizado.
Ver "Cerrados".

### ✅ 🟠 A5 — Sin timeout en fetches externos
Cerrado 2026-06-14: `AbortSignal.timeout(10s)` en Turnstile (`contacto.ts`), `airtableFetch`
(cubre check/create/logError), Resend (`email.ts`) y Meta CAPI (`meta.ts`). Ver "Cerrados".

### ✅ 🟡 A6 — `logError` no usa el cliente con retry (de #4)
Cerrado 2026-06-14: `logError` ahora pasa por `airtableFetch` (hereda retry 429), sigue
best-effort. Ver "Cerrados".

### ✅ 🟡 A7 — `from` por defecto = `onboarding@resend.dev`
Cerrado 2026-06-14: el fallback a `onboarding@resend.dev` solo aplica en `import.meta.env.DEV`.
En producción, si falta `RESEND_FROM_EMAIL` se loguea y se omite el envío (no se manda desde la
dirección de sandbox). Ver "Cerrados".

### ✅ 🟡 A8 — Idempotencia TOCTOU + "concurrencia=1" no se cumple (NUEVO)
Cerrado 2026-06-14: documentado como límite conocido y aceptado para el MVP en la regla R3 de
CLAUDE.md (ventana TOCTOU entre check y create; "concurrencia=1" = un lead por invocación, no un
lock global; ruta de upgrade a dedupe atómico —KV/BD— si se necesita garantía estricta). Ver "Cerrados".

> Nota de hardening (no es bug): `checkIdempotency` arma `filterByFormula` por interpolación,
> pero el `key` ya viene validado como UUID por Zod, así que no hay inyección hoy. Mantener ese
> orden; si algún día se filtra por un campo libre, escapar.

---

## B — Accesibilidad / resiliencia del formulario

### ✅ 🟠 B1 — El formulario no es un `<form>` real
Cerrado 2026-06-14: el contenedor es ahora `<form id="msfContainer" novalidate>`. Los radios pasan
de `hidden` a `.sr-only` (enfocables); la selección se maneja por evento `change` (ratón + teclado)
y el estado visual por `:has(input:checked)` + `:focus-within`. Grupos con `role="radiogroup"` +
`aria-labelledby`. Enter envía: un handler `submit` avanza de paso o ejecuta el envío final según
el paso. Error global con `role="alert"`. Ver "Cerrados".
> Verificado con smoke test Playwright (13/13). El funcionamiento sin JS sigue sin cubrirse: el
> flujo multipaso depende de JS por diseño — aceptado para el MVP.

### ✅ 🟡 B2 — Token de Turnstile consumido sin reset tras error
Cerrado 2026-06-14: `resetTurnstile()` se llama en toda rama de error del envío (helper
`submitError`). Ver "Cerrados".

---

## C — Coherencia documentación ↔ código

### ✅ 🔴 C1 — `status.md` Fase 3 documenta columnas Airtable equivocadas (de #3)
Cerrado 2026-06-14: el schema de PROSPECTOS en `status.md` ahora lista las columnas que escribe
`createProspecto` (…Cargo · Industria · Empresa_Constituida · idempotency_key · Estado · Fuente) y
aclara que Producto/Volumen/Notas ya no se usan. Ver "Cerrados".

### ✅ 🔴 C2 — `status.md` miente sobre la validación de teléfono (de #2)
Cerrado 2026-06-14: el texto describe la normalización real a E.164 (móviles 412/414/416/422/424/426
+ fijos 02XX). Ver "Cerrados".

### ✅ 🟠 C3 — CLAUDE.md describe campos de formulario que no existen (de #5)
Cerrado 2026-06-14: actualizada la descripción de `ContactSection.astro` en CLAUDE.md (campos
reales + `<form>` accesible) y reescrito el bloque de contrato obsoleto en WHILECHANGES.md (de
`<form id="contactoForm">` + inputs `name` a la realidad: wizard JS con objeto `formData`). Ver "Cerrados".

### ✅ 🟠 C4 — `SECTORES_VALIDOS` es código muerto que contradice el form
Cerrado 2026-06-14: eliminado `SECTORES_VALIDOS`/`Sector`. La lista oficial son las 5 industrias
del formulario, ahora en `INDUSTRIAS_VALIDAS` (fuente de verdad única, usada por el `z.enum` y
renderizada por el form). Pendiente solo el reflejo en docs (CLAUDE.md) → grupo 4.

### ✅ 🟡 C5 — Descuadre de mayúsculas "Alimento animal" vs "Alimento Animal"
Cerrado 2026-06-14: el form ahora renderiza las opciones desde `INDUSTRIAS_VALIDAS`, así que el
casing no puede volver a divergir del home/catálogo. Literal canónico: `Alimento animal`.

### ✅ 🟡 C6 — `dataLayer.ts` "INMUTABLE / fuente de verdad" no se importa en ningún lado (NUEVO)
Cerrado 2026-06-14: documentada la relación. `dataLayer.ts` explica que el form usa un push inline
(script `is:inline` no puede importar módulos) y que este archivo es el shape que ese push debe
respetar; comentario recíproco junto al push en `ContactSection.astro`. Ver "Cerrados".

### ✅ 🟡 C7 — `META_PIXEL_ID` / `META_ACCESS_TOKEN` sin documentar (NUEVO)
Cerrado 2026-06-14: agregadas a la sección de variables de entorno de CLAUDE.md (bloque Meta CAPI,
Fase 5, best-effort). Ver "Cerrados".

---

## D — Activos / infra (menor)

### ✅ 🟡 D1 — `og-default.jpg` y logo de schema no existen (NUEVO)
Cerrado 2026-06-14: generado `public/og-default.jpg` (1200×630, identidad de marca). Corregido
también el fallback de `ogImageURL` en `BaseLayout.astro` (faltaba la barra → usaba `new URL`).
El `logo` del schema sigue apuntando a `favicon.svg` (ícono temporal, ya documentado como pendiente
del cliente). Ver "Cerrados".

### ✅ 🟡 D2 — Sin headers de seguridad (NUEVO)
Cerrado 2026-06-14: añadido `public/_headers` con nosniff, Referrer-Policy, X-Frame-Options,
Permissions-Policy y HSTS. CSP incluida como plantilla comentada (activar en Report-Only primero,
para no romper Turnstile/GTM). Ver "Cerrados".

---

## Cerrados

### ✅ A8 — 2026-06-14 · Idempotencia TOCTOU (documentado/aceptado)
Documentado en R3 de CLAUDE.md como límite conocido del MVP: ventana TOCTOU entre
`checkIdempotency` y `createProspecto`; aclaración de que "concurrencia=1" (R7) es un lead por
invocación y no un lock global; ruta de upgrade a dedupe atómico (Cloudflare KV con put condicional
o BD relacional) si alguna vez se requiere garantía estricta.

### ✅ Grupo 5 — 2026-06-14 · Infra
- **D1 🟡** — `public/og-default.jpg` (1200×630) generado con la identidad de marca (fondo ink,
  flag ribbon, eyebrow lima, "Remy & Stute C.A.", subtítulo, dominio). Placeholder de calidad hasta
  el asset oficial del cliente. Fallback de `ogImageURL` en `BaseLayout.astro` corregido con `new URL`.
- **D2 🟡** — `public/_headers`: `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `X-Frame-Options: DENY`, `Permissions-Policy` (camera/mic/geo off), `Strict-Transport-Security`.
  CSP como plantilla comentada con instrucciones (Report-Only → ajustar → enforce) para no romper
  Turnstile/GTM/GA4/Meta (los scripts inline sin nonce obligan a 'unsafe-inline' en script-src).
- Verificación: `npm run build` → OK; `dist/_headers` y `dist/og-default.jpg` presentes;
  `npm run type-check` → 0/0/0.

### ✅ Grupo 4 — 2026-06-14 · Coherencia documentación ↔ código
- **C1 🔴** — `status.md` Fase 3: el schema de PROSPECTOS lista las columnas reales que escribe
  `createProspecto` (Industria + Empresa_Constituida); nota de que Producto/Volumen/Notas quedaron
  obsoletas; punto 6 y "nota de contrato" reescritos.
- **C2 🔴** — `status.md`: la línea del teléfono describe la normalización E.164 real (móviles
  412/414/416/422/424/426 + fijos 02XX). Checklist de CLAUDE.md ajustado ("teléfono fijo" ya no se
  rechaza; ahora rechaza no-VE + enums fuera de catálogo).
- **C3 🟠** — CLAUDE.md: descripción de `ContactSection.astro` con campos reales + `<form>`.
  WHILECHANGES.md: bloque de contrato reescrito (wizard JS con `formData`, no `<form id="contactoForm">`).
- **C6 🟡** — `dataLayer.ts` y `ContactSection.astro`: documentada la relación push-inline ↔ contrato
  tipado (deben mantenerse en sync; el script `is:inline` no puede importar el módulo).
- **C7 🟡** — CLAUDE.md: `META_PIXEL_ID` / `META_ACCESS_TOKEN` añadidas a variables de entorno.
- Extra: alineadas referencias residuales (`INDUSTRIAS_VALIDAS` en CLAUDE.md sección industrias y
  arquitectura; notas históricas en status.md/WHILECHANGES marcadas como Superado/Resuelto en vez
  de borrarlas).
- Verificación: `npm run type-check` → 0/0/0.

### ✅ Grupo 1 — 2026-06-14
- **A1 🔴** — Eliminado `console.log(JSON.stringify(formData))` de `ContactSection.astro` (fuga de
  PII en consola del navegador en cada submit).
- **A2 🟠** — `src/lib/email.ts`: añadido `escapeHtml()` y escapados `empresa, nombre, cargo,
  email, telefono, industria, empresaConstituida, idempotencyKey` en el cuerpo HTML. El `subject`
  queda en texto plano a propósito (la API de Resend recibe JSON → sin inyección de cabeceras).
- **A6 🟡** — `src/lib/airtable.ts`: `logError()` ahora escribe vía `airtableFetch` para heredar
  el retry con backoff en 429; sigue best-effort (traga la excepción final).
- Verificación: `npm run type-check` → 0 errores, 0 warnings, 0 hints (24 archivos).

### ✅ Grupo 2 — 2026-06-14 · Lista oficial de industrias = las 5 del formulario
- **A3 🟠** — `src/lib/schemas/contacto.ts`: `empresaConstituida` → `z.enum(EMPRESA_CONSTITUIDA_VALIDAS)`,
  `industria` → `z.enum(INDUSTRIAS_VALIDAS)`. El servidor ya no acepta valores fuera de catálogo en
  estos campos. `cargo` se deja libre (opción "Otro" del form).
- **A4 🟠** — `telefono` normaliza a E.164 `+58XXXXXXXXXX` vía transform de Zod
  (`normalizarTelefonoVE`): acepta `0412-…`, `04121234567`, `+58…`, `58…`, con/sin separadores.
  Válidos: móviles `412/414/416/422/424/426` y fijos (área `02XX`). Rechaza prefijos inválidos y
  longitudes incorrectas con mensaje claro. `meta.ts` (CAPI) y la columna Whatsapp de Airtable
  heredan el valor normalizado. Probado con >10 formatos.
  (Ajuste 2026-06-14 por decisión del usuario: se habilitaron fijos y el prefijo móvil 422.)
- **C4 🟠** — Eliminado el código muerto `SECTORES_VALIDOS` + tipo `Sector`. Nueva fuente de verdad
  `INDUSTRIAS_VALIDAS` (5 industrias) e `EMPRESA_CONSTITUIDA_VALIDAS` en el schema.
- **C5 🟡** — El paso 4 del form ahora hace `INDUSTRIAS_VALIDAS.map(...)` en vez de `<label>`
  hardcodeados → el casing "Alimento animal" no puede divergir del home/catálogo.
- Verificación: `npm run type-check` → 0 errores, 0 warnings, 0 hints (24 archivos).
- Nota de seguimiento: queda **C2** (status.md afirma normalización de teléfono — ahora sí es
  cierta, falta redactar) y el reflejo de la lista oficial en CLAUDE.md → ambos en el grupo 4.

### ✅ Grupo 3 — 2026-06-14 · Robustez y accesibilidad
- **A5 🟠** — `AbortSignal.timeout(10_000)` en todos los fetch externos: Turnstile
  (`api/contacto.ts`), `airtableFetch` (cubre checkIdempotency/createProspecto/logError),
  Resend (`email.ts`) y Meta CAPI (`meta.ts`). Un proveedor colgado ya no cuelga la request.
- **A7 🟡** — `email.ts`: el fallback `onboarding@resend.dev` queda restringido a `DEV`; en
  producción, sin `RESEND_FROM_EMAIL`, se loguea y se omite el envío (no se manda desde sandbox).
- **B1 🟠** — `ContactSection.astro`: contenedor → `<form novalidate>`; radios `hidden` → `.sr-only`
  enfocables; selección por `change` (teclado+ratón); estilo por `:has(input:checked)` y
  `:focus-within`; `role="radiogroup"`+`aria-labelledby`; Enter envía vía handler `submit`
  (avanza paso o ejecuta envío según `currentStep`); error global con `role="alert"`.
- **B2 🟡** — `resetTurnstile()` en todas las ramas de error del envío (helper `submitError`).
  También: `res.json()` del error ahora es tolerante a body no-JSON.
- Verificación: `npm run type-check` → 0/0/0; `npm run build` → OK. Sin referencias obsoletas a
  `.selected`/`hidden` en radios.
- **Smoke test Playwright (2026-06-14): 13/13 PASS** — flujo completo con ratón → pantalla de éxito,
  selección por teclado (Space) en paso 1, Enter avanza en paso 2 (texto) y envía en paso 5,
  ruta "No" → pantalla de cierre, fijo `0212` aceptado, 0 errores de JS en consola.
- Ajuste durante el test: el Enter en pasos de texto intermedios (empresa, cargo "Otro") se maneja
  con un handler `keydown` explícito (`enterAvanza`), porque la submisión implícita del `<form>`
  requiere un botón submit habilitado y `btn-s5` está deshabilitado hasta el paso 5.
