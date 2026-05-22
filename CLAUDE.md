# CLAUDE.md — B2B Industrial Venezuela
# Este archivo activa el contexto de proyecto en Claude Code.
# Ubicación: raíz del repositorio (junto a package.json y .mcp.json)

---

## PROYECTO

Sistema de captación y calificación de prospectos B2B industriales venezolanos.
Valor por lead: $5,000–$27,000 USD. Tolerancia a errores lógicos: cero.
Prioridad absoluta: precisión > velocidad en toda operación automatizada.

Stack: Astro + TypeScript + Tailwind + Zod + Sanity CMS + n8n + Airtable + GTM + GA4 + Meta Pixel + Cloudflare Turnstile

---

## MCP SERVERS ACTIVOS

Este proyecto requiere los siguientes MCP servers. Verificar con `/mcp` al iniciar sesión.

```json
// .mcp.json (en raíz del repositorio)
{
  "mcpServers": {
    "n8n-docs": {
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {}
    },
    "astro-docs": {
      "type": "http",
      "url": "https://mcp.docs.astro.build/mcp"
    },
    "airtable": {
      "type": "http",
      "url": "https://mcp.airtable.com/mcp",
      "headers": {
        "Authorization": "Bearer ${AIRTABLE_API_KEY}"
      }
    },
    "gtm": {
      "type": "http",
      "url": "https://gtm-mcp.stape.ai/mcp"
    },
    "ga4": {
      "command": "python3",
      "args": ["-m", "google_analytics_mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GA4_CREDENTIALS_PATH}",
        "GA_PROPERTY_ID": "${GA4_PROPERTY_ID}"
      }
    }
  }
}
```

Si algún MCP no aparece como activo, no continúes la tarea que lo requiere. Reporta el problema.

---

## VARIABLES DE ENTORNO REQUERIDAS

Todas deben estar en `.env` (nunca en el repositorio).

```bash
# Airtable — DOS bases obligatorias
AIRTABLE_API_KEY=pat_XXXXXXXXXXXXXXXX
AIRTABLE_BASE_SANDBOX=appYYYYYYYYYYYYYY       
AIRTABLE_BASE_PRODUCTION=appXXXXXXXXXXXXXX    

# n8n
N8N_API_URL=https://TU-INSTANCIA.app.n8n.cloud/api/v1
N8N_API_KEY=tu_api_key_n8n
N8N_WEBHOOK_URL=https://TU-INSTANCIA.app.n8n.cloud/webhook/XXXXX
N8N_WEBHOOK_SECRET=genera_con_openssl_rand_hex_32

# Cloudflare Turnstile
TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...

# Sanity CMS
SANITY_PROJECT_ID=xxxxxxxxx
SANITY_DATASET=production

# GA4
GA4_CREDENTIALS_PATH=/ruta/absoluta/credentials.json
GA4_PROPERTY_ID=XXXXXXXXX
```

---

## REGLAS DE OPERACIÓN — LEER ANTES DE EJECUTAR CUALQUIER TAREA

### R1 — ENTORNO: SANDBOX primero, siempre

**Durante desarrollo y testing, todas las escrituras automatizadas van a SANDBOX.**

- Variable `AIRTABLE_TARGET_BASE` en n8n = `SANDBOX` por defecto
- Claude Code opera sobre `AIRTABLE_BASE_SANDBOX` salvo instrucción explícita del usuario
- No cambiar a `AIRTABLE_BASE_PRODUCTION` sin: todos los edge cases probados + 48h limpio en sandbox + confirmación explícita del usuario en el chat

Si el usuario pide "crear un prospecto" o "probar el workflow" sin especificar base, usar SANDBOX.

### R2 — WEBHOOK: Nunca desnudo

Todo webhook de n8n en este proyecto tiene autenticación de header `X-Webhook-Secret`.

Si se detecta un webhook sin ese control durante revisión de código, reportarlo como error crítico antes de continuar.

El API route de Astro envía el header en cada request:
```typescript
headers: {
  'Content-Type': 'application/json',
  'X-Webhook-Secret': import.meta.env.N8N_WEBHOOK_SECRET,
}
```

### R3 — IDEMPOTENCIA: UUID único por sesión de formulario

El `idempotency_key` se genera en el componente del formulario al cargar la página:
```typescript
const idempotencyKey = crypto.randomUUID(); // Una vez al montar, no al hacer submit
```
Este mismo UUID es el `event_id` para Meta CAPI. Un solo UUID sirve a los dos sistemas.

n8n busca en Airtable SANDBOX/PRODUCCIÓN por `idempotency_key` antes de crear registro.
Si existe → log "Intento duplicado" → stop. Si no existe → crear registro.

### R4 — FORMULARIO: Orden de validación fijo

El API route `/api/contacto.ts` valida en este orden exacto. No modificar el orden:
1. Verificar Cloudflare Turnstile (server-side call a `siteverify`) → si falla: HTTP 403
2. Parsear con `ContactoSchema.safeParse()` de Zod → si falla: HTTP 422 con fieldErrors
3. Solo si 1 y 2 pasan: enviar payload a n8n webhook con `X-Webhook-Secret`

### R5 — GTM: Main Thread, no Partytown

GTM y Meta Pixel van en el hilo principal. Nunca usar `type="text/partytown"` para estos scripts.
Partytown causa pérdida de hasta 15% de eventos de Meta Pixel por CORS en Web Workers.

El snippet de GTM va en `BaseLayout.astro` con `is:inline`:
```astro
<script is:inline>
  // GTM snippet aquí — Main Thread
</script>
```

### R6 — SHA256: Normalizar antes de hashear

Antes de cualquier `crypto.createHash('sha256')` sobre datos de usuario en n8n:
```javascript
const normalized = value.toString().trim().toLowerCase();
```
Sin esto, `Correo@Empresa.com` y `correo@empresa.com` producen hashes distintos y CAPI no puede deduplicar con Meta.

### R7 — RATE LIMITS AIRTABLE: Escritura secuencial

En n8n, todas las operaciones de escritura en Airtable:
- Concurrencia = 1 (nunca "Split in Batches" con más de 1 hilo paralelo)
- Wait node de 250ms después de cada Create/Update
- Retry con backoff: 1000ms → 2000ms → 4000ms en HTTP 429
- HTTP 429 dispara alerta al equipo + registro en "Cola de Errores"

### R8 — ERRORES: Nunca silenciosos

Todo error en cualquier workflow n8n debe:
1. Guardar el payload raw en tabla "Cola de Errores" de Airtable (SANDBOX o PROD según entorno)
2. Enviar notificación por email al equipo

Un workflow que falla sin dejar rastro es inaceptable.

### R9 — PROMPTS DE COMPONENTES: Especificación exacta

No usar prompts genéricos para componentes de UI. Cada prompt debe especificar:
- Jerarquía visual (numerada, en orden)
- Restricciones explícitas (qué NO hacer)

Formato obligatorio para componentes Hero/Landing:
```
"Create [componente] with this exact visual hierarchy:
 1. [elemento 1]
 2. [elemento 2]
 ...
 NO: [restricciones explícitas]"
```

---

## SISTEMA VISUAL (design-reference aplicado — actualizado 2026-05-22)

Las variables de diseño viven en `src/styles/global.css`. No usar Tailwind utilities — todo va por custom properties.

```css
/* Paleta */
--cream: #faf9f5;   --cream-2: #f1f0ea;  --white: #ffffff;
--ink: #0a2418;     --ink-2: #14201a;    --text: #3b473f;
--muted: #6b7770;   --faint: #9aa39c;
--green: #006633;   --green-wa: #1faa4d;
--border: #e3e1d6;  --border-2: #cfcdbf;
--brown: #703300;   --yellow: #f0e378;
--flag-yellow: #fad348; --flag-blue: #2a61bb; --flag-red: #c51104;
/* Página Nosotros (tema oscuro — excepción intencional del diseño): */
--dark-bg: #0a0f0d; --dark-panel: #141b16; --dark-text: #f0ede6; --lime: #cbff00;

/* Tipografía */
--display: "Plus Jakarta Sans", sans-serif;  /* títulos */
--body:    "Inter", sans-serif;              /* cuerpo */
--num:     "Oswald", sans-serif;             /* cifras */
--mono:    "JetBrains Mono", monospace;      /* etiquetas */

/* Layout */
--wrap: 1440px;  --pad: 56px;
```

**Navbar fija (comportamiento universal — todas las páginas):**
- `position: fixed; top: 4px;` — flota 4px sobre el flag ribbon
- Fondo oscuro `rgba(10,15,13,0.95)` + `backdrop-filter: blur(12px)` y contenido blanco **desde el primer paint** en todas las páginas (sin estado transparente). El JS de `Navbar.astro` gestiona el drawer móvil + la clase `.scrolled`.
- **Sin `variant` prop** — navbar unificado, igual en todas las páginas. Siempre muestra ícono mensaje y "Solicitar cotización".
- **Logo SVG inline:** `import LogoNavbar from "../assets/logo-navbar-2.svg?raw"` → `<span class="brand-logo" set:html={LogoNavbar}>`. CSS: `.brand-logo :global(svg) { height: 68px; width: auto }` (`:global()` requerido porque Astro no scopea HTML inyectado con `set:html`).
- **`brand-navbar-text`** (nombre empresa): oculto por defecto (`opacity: 0; transform: scale(0.98) translateY(-8px)`). Al hacer scroll >60px, JS agrega `.scrolled` al `.site-header` y aparece con transición 0.42s cubic-bezier. Font: Galano Grotesque 20px 700 `letter-spacing: -2px`. `.venezuela` en `rgba(255,255,255,0.5) font-weight: 400`.
- **Teléfono hover:** `#CBFF00` (en `global.css`).
- **Footer:** mismo logo SVG + `brand-navbar-text` siempre visible via `:global(.site-footer .brand-navbar-text) { opacity: 1 !important; transition: none !important }`. Firma "Powered by Ixanity Studios" en `font-size: 9px; color: rgba(255,255,255,0.2)`.
- Override `body[data-theme="dark"]` se mantiene en CSS como red de seguridad pero ya no aporta diferencia visual.

**Flag ribbon:**
- `position: fixed; top: 0; height: 4px; z-index: 101;` — siempre encima de todo
- Bandera venezolana: amarillo `#FAD348` · azul `#2A61BB` · rojo `#C51104`

**Color scheme + overscroll (root-level):**
- `:root { color-scheme: only light; }` — opta-out de forced dark mode (OperaGX, Chrome experimental "Auto Dark Mode") que invertía secciones intencionalmente oscuras.
- `html { background: #0a2418; overscroll-behavior: none; }` — tapa el bounce en verde oscuro
- `body { overscroll-behavior: none; }` — sin rubber-band en iOS/Chrome

**Hero — arquitectura del grid (actualizado 2026-05-21 sesión 2):**
- `.hero`: `display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); grid-template-rows: 1fr auto; background: var(--ink); min-height: 100vh`
- `.hero__main` (`grid-column: 1; grid-row: 1`): `padding: 88px 40px` (NO usa `var(--pad)` en horizontal — valor fijo 40px aprobado). `display: flex; flex-direction: column; justify-content: center; background: var(--cream-2)`.
- `.hero__body`: `display: flex; flex-direction: column; width: 100%` — sin `max-width` ni `margin: auto`. El padding de `.hero__main` controla los márgenes laterales.
- `.hero__stats` (`grid-column: 1; grid-row: 2`): hijo **directo del grid**, no de `.hero__main`. `padding: 57px var(--pad); background: var(--ink)`. Sin full-bleed ni márgenes negativos.
  - Tipografía stats aprobada: `hstat__num` 65px Oswald · `hstat__unit` 21px · `hstat__label` 13px JetBrains Mono.
  - Mobile override `@media (max-width: 980px)`: `padding-top: 22px; padding-bottom: 22px`.
- `.hero__media` (`grid-column: 2; grid-row: 1/3`): abarca las dos filas. `border-radius: 20px 0 0 20px; margin: 16px 0 0 0; background: var(--ink)`.
- El `background: var(--ink)` del `.hero` rellena el área detrás de la esquina redondeada de `.hero__media`, eliminando el borde crema visible.
- En mobile (`@media max-width: 980px`): `.hero { background: var(--cream-2) }` porque `.hero__media` pierde el `border-radius`.

**Hero — tipografía columna izquierda (valores aprobados, no reducir sin instrucción explícita):**
- Eyebrow: `font-size: 12px; letter-spacing: 0.15em; color: var(--muted)`
- Título: `font-size: clamp(42px, 4.5vw, 64px); font-weight: 700; line-height: 1.14; text-wrap: balance`
- Lead: `font-size: 18px; line-height: 1.7; max-width: 580px`
- Botones (override local en `.hero__ctas`): `font-size: 17px; padding: 17px 28px`

**Banda oscura continua hero → sectores (patrón visual):**
- `.hero__stats` y `.sectores__head` comparten `background: var(--ink)` y se fusionan visualmente.
- `.sectores__head`: full-bleed via `margin-left/right: calc(-50vw + 50%)` + `padding-left/right: calc(50vw - 50% + var(--pad))`. Sin `clip-path` — borde inferior recto (clip-path removido 2026-05-22).
- Textos sobre fondo oscuro: número/título en `#fff`, unidades/labels en `rgba(255,255,255,0.55)`, acentos en `var(--yellow)`.

**`sectores__head` — estado aprobado (2026-05-22):**
- `flex-direction: column; align-items: flex-start; gap: 44px` — eyebrow arriba, h2 abajo con separación amplia
- Sin `clip-path` — borde inferior recto
- `box-shadow: inset` multicapa en borde superior (simula peso del hero encima): `0 2px 6px rgba(0,0,0,0.88)` + `0 10px 28px rgba(0,0,0,0.65)` + `0 28px 64px rgba(0,0,0,0.38)`
- `padding: 56px var(--pad)` simétrico (top = bottom)

---

## ARQUITECTURA DE ARCHIVOS

```
/   (Raíz de remy-stute-dev)
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro          ← GTM Main Thread aquí (is:inline); props: theme, active (navVariant eliminado)
│   ├── lib/
│   │   ├── schemas/
│   │   │   └── contacto.ts           ← ContactoSchema (Zod) — fuente de verdad
│   │   └── analytics/
│   │       └── dataLayer.ts          ← DataLayerEvents + trackEvent() — INMUTABLE
│   ├── pages/
│   │   ├── index.astro               ← navVariant="home" → Hero + IndustriasServidas + VentajaCompetitiva + ContactoCTA
│   │   ├── productos.astro           ← ProductosCatalogo (filtro sector+marca, tabla 5 SKU)
│   │   ├── nosotros.astro            ← theme="dark" → NosotrosSection (4 cards expandibles)
│   │   ├── contacto.astro            ← ContactSection; idempotencyKey = crypto.randomUUID() aquí
│   │   ├── casos.astro               ← PageInConstruction (placeholder)
│   │   ├── recursos.astro            ← PageInConstruction (placeholder)
│   │   └── api/
│   │       └── contacto.ts           ← Turnstile → Zod → n8n (en ese orden); prerender=false COMENTADO (build estático Netlify — restaurar en Fase 3 con server adapter)
│   └── components/
│       ├── Navbar.astro              ← props: active (variant eliminado — navbar unificado); logo SVG inline; brand-navbar-text scroll animation
│       ├── FlagRibbon.astro          ← fixed 4px, z-index 101
│       ├── Footer.astro              ← 4 columnas verde oscuro; logo SVG + brand-navbar-text siempre visible; firma Ixanity Studios; sin horario, sin segundo teléfono
│       ├── Hero.astro                ← grid 2col (1.2fr/1fr), stats hijo directo del grid (row:2), slideshow 4 fotos locales webp (carrusel-inicio-01–04), fade 5s, counter 01/04
│       ├── IndustriasServidas.astro  ← sectores__head CONGELADO; 6 tarjetas foto-cover hover animado (overline+acento+flecha); tarjetas son `<a href="/productos?sector=X">` para filtro cross-page; 4 fotos locales webp, 2 Unsplash
│       ├── VentajaCompetitiva.astro  ← banda verde oscuro, 4 cards blancas con hover (lift + línea mustard), iconos SVG en círculo verde, números Oswald, dot+label accent bar inferior
│       ├── ContactoCTA.astro         ← flujo 3 pasos + botón WhatsApp
│       ├── ProductosCatalogo.astro   ← filtro dual sector+marca; lee ?sector= de URL params al cargar para activar chip correspondiente
│       ├── NosotrosSection.astro     ← tema oscuro #0A0F0D, acento lima; hero Candy-1920.webp con box-shadow elevation; sección nos-statement (#0A2418) con copy grande
│       └── ContactSection.astro     ← formulario brief técnico
├── design-reference/
│   └── *.png                         ← capturas de diseño (desktop 1440) — fuente de verdad visual
├── .mcp.json                         ← MCP servers (este archivo)
├── .env                              ← Variables de entorno (no en git)
├── .gitignore                        ← incluye .env y credentials.json
├── CLAUDE.md                         ← Este archivo
├── WHILECHANGES.md                   ← Cambios fuera del roadmap (leer al iniciar sesión)
└── package.json
```

---

## CHECKLISTS DE ACTIVACIÓN (requeridos antes de ir a producción)

### Checklist: Webhook n8n listo para producción
```
□ Webhook rechaza requests sin X-Webhook-Secret (probar con curl, esperar HTTP 401)
□ Submit doble del formulario → solo un registro en Airtable SANDBOX
□ Todos los edge cases de la tabla (Skill 1) probados con datos reales
□ Error path probado: desconectar Airtable temporalmente → verificar que "Cola de Errores" captura el payload
□ Template de WhatsApp pre-aprobado en Meta Business Manager
□ Dry-run completo en SANDBOX: mínimo 10 leads de prueba sin errores
□ Sign-off del equipo → cambiar AIRTABLE_TARGET_BASE a PRODUCTION
```

### Checklist: Sitio Astro listo para producción
```
□ Turnstile rechaza submissions de bots (probar con token inválido, esperar HTTP 403)
□ Zod rechaza: empresa < 3 chars, teléfono fijo, email inválido (esperar HTTP 422)
□ GTM snippet presente en <head> con is:inline, sin Partytown
□ Lighthouse mobile score > 90 (LCP < 2.5s, CLS = 0, INP < 200ms)
□ idempotencyKey se genera al cargar la página, no al hacer submit
□ Formulario enviado → event_id aparece en dataLayer.push ANTES del request a n8n
```

### Checklist: Analytics listo para producción
```
□ GTM Preview → 'generate_lead' dispara con event_id en submit de formulario
□ Meta Pixel Helper (Chrome) → Lead event muestra event_id correcto
□ Meta Events Manager → Test Events → CAPI recibe mismo event_id que Pixel
□ Code node SHA256 en n8n: email y teléfono normalizados con .trim().toLowerCase() antes del hash
□ Consent mode configurado: ad_storage y analytics_storage = 'denied' por defecto
□ Privacy Policy en footer con enlace visible
□ GTM container publicado solo después de verificar los 5 puntos anteriores
```

---

## SECTORES VÁLIDOS (referencia para validación Zod y n8n)

```typescript
const SECTORES_VALIDOS = [
  'Petróleo', 'Gas', 'Manufactura', 'Construcción',
  'Energía', 'Minería', 'Transporte industrial'
] as const;
```

**⚠ CONFLICTO PENDIENTE (resolver con el cliente antes de Fase 3):**
El array de arriba viene del brief original y define los sectores B2B del CRM/n8n.
El diseño aprobado en `design-reference/` muestra 6 sectores distintos en `IndustriasServidas.astro`:
Cerámicas · Construcción · Pinturas · Feed · Industrial · Aminoácidos.
Antes de activar el flujo n8n, el cliente debe confirmar cuál lista es la oficial.

---

## NOTAS DE SEGURIDAD

- `credentials.json` (GA4) en `.gitignore` — nunca en repositorio
- `AIRTABLE_API_KEY` con scope limitado a las dos bases del proyecto solamente
- `N8N_WEBHOOK_SECRET` rotarlo cada 90 días
- Tokens de Airtable con permisos mínimos necesarios (no "All workspaces" en producción)
- Meta CAPI: datos de usuario solo como SHA256 — nunca en texto plano en payloads