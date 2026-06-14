# ROADMAP MVP — Remy & Stute C.A.

Estado actual del proyecto. Actualizar al completar cada fase.

---

## NOTA — Rediseño completo sobre design-reference (2026-05-19)

Se reconstruyó el sitio replicando fielmente los 4 `.html` desktop 1440 de
`design-reference/` (Home, Productos, Nosotros, Contacto). Detalle en
`WHILECHANGES.md` → Hecho. Resumen del impacto en Fases 1 y 2:

- **Fase 1:** IA de páginas — `/soluciones` eliminada; `/productos` y `/nosotros`
  son páginas reales; `/casos` y `/recursos` eliminadas (decisión 2026-06-02). Sistema
  visual nuevo: tema claro crema `#FAF9F5`, tipografías Plus Jakarta Sans / Inter
  / Oswald / JetBrains Mono, verde `#006633`. La página Nosotros es tema oscuro
  (así está en el mockup). Placeholders GTM (R5) intactos en BaseLayout.
- **Fase 2:** contrato del formulario — se quitó `industria`, se agregó `notas`,
  `volumen`/`cargo` pasaron a texto libre. `schema/contacto.ts` y el payload JS
  actualizados; `api/contacto.ts` sin cambios. Orden R4, Turnstile, R2 y R3
  intactos y verificados (400/403/405 OK vía curl).
- Pendiente (cambios quirúrgicos): copy definitivo, cifras reales de "pedido promedio". Fotos aprobadas por cliente. RIF y dirección confirmados.

---

## ✅ FASE 1 — Fundación Astro — COMPLETADA

**Objetivo:** Convertir el index.html en un proyecto Astro real y funcional.

**Puntos de trabajo:**
1. ✅ Inicializar proyecto Astro con TypeScript + Tailwind
2. ✅ Crear astro.config.mjs con los integrations necesarios (Tailwind v4, Sitemap)
3. ✅ Migrar index.html a src/pages/index.astro y descomponerlo en componentes reutilizables en src/components/
4. ✅ Crear BaseLayout.astro con el slot para GTM (placeholder is:inline, Main Thread — R5)
5. ✅ Crear las páginas estáticas vacías: /soluciones, /contacto (/casos y /recursos eliminadas)
6. ✅ Validar que el sitio corra localmente en astro dev con paridad visual exacta al HTML actual
7. ✅ Actualizar .gitignore con dist/, .astro/, credentials.json

**Entregable cumplido:** `npm run dev` levanta el sitio idéntico al pre-MVP en http://localhost:4321/

**Notas de implementación:**
- index.html original archivado en `_legacy/index.html` (no borrado)
- Tailwind v4 instalado con `@tailwindcss/vite` y `@theme` con tokens de marca; CSS migrado conserva variables nativas para no romper visual
- Lucide icons via CDN (migrar a npm en Fase 6 para Lighthouse)
- GTM: placeholders `<!-- GTM_HEAD_PLACEHOLDER -->` y `<!-- GTM_BODY_PLACEHOLDER -->` en BaseLayout.astro listos para Fase 5
- Submit del formulario simulado en ContactSection.astro — punto de entrada marcado para Fase 2
- Form fields con atributo `name` correctos para FormData en Fase 2
- Carpetas `lib/schemas/` y `lib/analytics/` y `pages/api/` creadas vacías, esperando Fases 2 y 5

---

## ✅ FASE 2 — Formulario con Validación Real — COMPLETADA

**Objetivo:** El formulario de contacto conecta a un backend seguro y valida datos correctamente.

**Puntos de trabajo:**
1. ✅ `src/lib/schemas/contacto.ts` con `ContactoSchema` Zod (`INDUSTRIAS_VALIDAS` + `empresaConstituida` como `z.enum`, teléfono normalizado a E.164 — móvil/fijo VE, email normalizado, empresa ≥ 3 chars, idempotency_key UUID). [Actualizado 2026-06-14: antes usaba el array muerto `SECTORES_VALIDOS`.]
2. ✅ `src/pages/contacto.astro` reutiliza `ContactSection`; idempotencyKey generado al montar via `crypto.randomUUID()` (R3)
3. ✅ `src/pages/api/contacto.ts` con orden fijo Turnstile → Zod → n8n (R4); `prerender = false`
4. ✅ Cloudflare Turnstile integrado (widget client-side + siteverify server-side; HTTP 403 si falla)
5. ✅ `.env` con `PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`
6. ✅ Respuestas: 200 ok / 400 body inválido / 403 turnstile (missing/failed) / 422 Zod (con fieldErrors) / 502 n8n / 500 error interno
7. ✅ Edge cases probados via curl (empty body, no token, bogus token → 403)

**Entregable cumplido:** `/api/contacto` rechaza bots (Turnstile) y datos inválidos (Zod) antes de tocar n8n. Forward a n8n queda como stub condicional hasta que `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_SECRET` estén en `.env` (Fase 3).

**Notas de implementación:**
- Industrias del form alineadas a `SECTORES_VALIDOS` (CLAUDE.md): se quitaron "Petróleo y Gas" combinado, "Agroalimentario" y "Otro"; se agregaron "Petróleo", "Gas", "Energía", "Transporte industrial"
  - **[Superado 2026-06-14]** La lista oficial pasó a ser las 5 industrias reales del formulario en `INDUSTRIAS_VALIDAS` (General/Cerámicas/Hidrocarburos/Pinturas/Alimento animal). `SECTORES_VALIDOS` fue eliminado.
- Whatsapp: el schema (`ContactoSchema.telefono`) normaliza a E.164 `+58XXXXXXXXXX` vía transform de Zod. Acepta móviles VE (412/414/416/422/424/426) y fijos VE (02XX); rechaza prefijos/longitudes inválidos
- Email: normalizado con `.trim().toLowerCase()` antes de Zod (preparado para R6 / SHA256 en n8n)
- API route forward a n8n incluye `X-Webhook-Secret` (R2) y se activa solo cuando ambos env vars están definidos
- `volumen` es opcional (no rompe si no se selecciona)
- Logging por consola en errores; persistencia en "Cola de Errores" Airtable es Fase 4 (R8)
- ⚠️ `astro build` requiere instalar un adapter SSR (`@astrojs/node`, `@astrojs/vercel`, etc.) — decisión queda para Fase 7. `astro dev` funciona sin adapter.

---

## ✅ FASE 3 — CRM Airtable — COMPLETADA (2026-05-26)

**Objetivo:** Cada lead válido llega a Airtable SANDBOX con todos sus campos.

**Decisión de arquitectura:** el API route de Astro escribe directamente a Airtable sin n8n.
La fase de automatizaciones (n8n + WhatsApp) viene después. Migración futura: cambiar una línea
en el API route para enviar a n8n en lugar de Airtable directo — el payload ya está estructurado.

**Puntos de trabajo:**
1. ✅ `@astrojs/netlify@6` instalado — adapter SSR compatible con Astro 5.18
2. ✅ `astro.config.mjs` — adapter netlify; páginas estáticas + `/api/contacto` SSR
3. ✅ `src/lib/airtable.ts` — cliente REST nativo: checkIdempotency, createProspecto, logError (R3+R7+R8)
4. ✅ `src/lib/email.ts` — notificación HTML al equipo vía Resend (fetch nativo, sin SDK)
5. ✅ `src/pages/api/contacto.ts` — `prerender = false` activo; flujo: Turnstile → Zod → dedup → Airtable → Resend
6. ✅ `ContactSection.astro` — submit real al API (stub MVP eliminado); formulario multipaso con campos: empresaConstituida, empresa, cargo, industria, email, nombre, telefono
7. ✅ Variables de entorno configuradas en `.env`
8. ✅ Prueba end-to-end: lead llega a Airtable SANDBOX correctamente
9. ✅ Prueba de idempotencia: doble submit con mismo UUID → 1 solo registro en Airtable

**Schema Airtable SANDBOX — tabla PROSPECTOS (columnas que ESCRIBE `createProspecto` en airtable.ts):**
  Nombre · Empresa · Email · Whatsapp · Cargo · Industria · Empresa_Constituida
  idempotency_key · Estado · Fuente
  (la base debe tener estas columnas con estos nombres exactos; `Fecha` puede existir como
  "Created time" automático. Las columnas Producto/Volumen/Notas del brief original ya no se usan.)

**Schema Airtable SANDBOX — tabla Cola de Errores:**
  payload_raw · error_mensaje · error_tipo · resuelto · timestamp (Created time)

**Variables de entorno activas (.env):**
  AIRTABLE_API_KEY · AIRTABLE_BASE_SANDBOX · RESEND_API_KEY · NOTIFY_EMAIL
  (AIRTABLE_BASE_PRODUCTION se configura cuando se duplique la base para producción)

**Nota — contrato del formulario:** si se cambian los campos, actualizar EN CONJUNTO:
ContactSection.astro (UI) + ContactoSchema en contacto.ts (validación) + objeto `fields` en
airtable.ts (escritura) + columnas en la base Airtable. La columna `idempotency_key` NUNCA se
renombra. La lista de industrias vive en `INDUSTRIAS_VALIDAS` (contacto.ts) — fuente de verdad única.

**Entregable:** 10 leads de prueba en SANDBOX sin duplicados, sin errores silenciosos.

---

## ⬜ FASE 4 — Notificación WhatsApp (Meta Cloud API directa)

**Objetivo:** El equipo recibe un mensaje de WhatsApp inmediatamente cuando llega un lead válido.

**Decisión de arquitectura (2026-05-30):** n8n queda fuera de esta fase del desarrollo.
n8n forma parte de las **automatizaciones empresariales** que se ofrecerán a Remy & Stute como
servicio independiente una vez que el sitio esté 100% estable en producción. No se integrará
en la página porque: (a) tiene costo mensual de suscripción separado, y (b) su complejidad
es innecesaria para el flujo actual, donde email vía Resend ya cubre las notificaciones básicas.

La notificación WhatsApp se implementará con una llamada directa a la **Meta WhatsApp Business
Cloud API** (Graph API) desde `src/lib/whatsapp.ts`, igual que Resend — sin intermediarios.

**Requiere antes de empezar:**
- Fase 3 completada ✅
- WhatsApp Business App creada en Meta Developers Portal (el cliente ya tiene cuenta Meta)
- Phone Number ID del número de negocio
- System User con token permanente (no token temporal de 24h)
- Template de mensaje pre-aprobado por Meta (proceso: 24–72h)

**Puntos de trabajo:**
1. ⬜ Crear `src/lib/whatsapp.ts` — función `notifyWhatsApp(lead)` con fetch directo a Graph API v21
2. ⬜ Agregar `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` a `.env`
3. ⬜ Llamar `notifyWhatsApp()` desde `api/contacto.ts` después de Airtable (best-effort, como Resend)
4. ⬜ Probar con template aprobado: lead real → WhatsApp llega al equipo en < 2 min
5. ⬜ Probar path de error: token inválido → logError() captura el fallo, no bloquea el 200 al cliente

**Variables de entorno necesarias:**
```bash
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx      # System User token permanente (nunca el temporal de 24h)
WHATSAPP_PHONE_NUMBER_ID=123456789    # ID del número en Meta Business
WHATSAPP_TEMPLATE_NAME=nuevo_lead     # nombre exacto del template aprobado
WHATSAPP_RECIPIENT_PHONE=+58412...    # teléfono del equipo que recibe la notificación
```

**Entregable:** Lead válido → email (Resend) + WhatsApp (Meta Cloud API) al equipo en < 2 minutos.

---

## 🟡 FASE 5 — Analytics y Tracking (EN CURSO — 2026-05-31)

**Objetivo:** Cada conversión es medible y deduplicada entre Pixel y CAPI.

**Progreso sesión 2026-05-31:**
- GTM `GTM-M9WVFZ9M` instalado en `BaseLayout.astro` (Main Thread, `is:inline` — R5)
- `src/lib/analytics/dataLayer.ts` creado con `GenerateLeadEvent` + `trackEvent()` — INMUTABLE
- `ContactSection.astro` → `dataLayer.push({ event: 'generate_lead', event_id, form_id, lead_empresa, lead_industria })` antes del fetch (R checklist)
- En GTM: Variables DLV (event_id, form_id) + Activador generate_lead + Tag GA4 Configuración (G-VLNBY9FHV8, All Pages) + Tag GA4 Evento generate_lead → publicado
- Meta Pixel: tag Custom HTML creado en GTM pero **PAUSADO** — no activo, pendiente Pixel ID real
- Verificado con GTM Preview + GA4 Tiempo Real: datos fluyendo correctamente
- Tracking de clics WhatsApp: pendiente (ver WHILECHANGES.md)

**Puntos de trabajo:**
1. ✅ Instalar snippet GTM en BaseLayout.astro con is:inline (Main Thread, NO Partytown — R5)
2. ✅ Crear src/lib/analytics/dataLayer.ts con DataLayerEvents y trackEvent() — INMUTABLE
3. ✅ Tag GA4 Configuración en GTM + evento generate_lead con event_id
4. 🟡 Meta Pixel en GTM — tag creado y pausado; activar cuando haya campañas de Meta Ads activas
5. ✅ idempotencyKey como event_id en dataLayer.push antes del submit
6. ⬜ Meta CAPI — pendiente activación del Pixel; sin n8n (ver decisión Fase 4)
7. ⬜ Consent mode en GTM: ad_storage y analytics_storage = 'denied' por defecto
8. ⬜ Verificar deduplicación Pixel + CAPI (depende de activar Meta Pixel)
9. ✅ Página /privacidad con enlace en footer

**Entregable:** GTM Preview muestra generate_lead con event_id ✅. Meta Events Manager deduplica correctamente ⬜ (pendiente activar Pixel).

---

## 🟡 FASE 6 — SEO y Contenido (EN CURSO — 2026-06-02)

**Objetivo:** El sitio atrae tráfico orgánico calificado de Google Venezuela. Cada página tiene metadata SEO precisa, schema.org que activa rich results, imágenes optimizadas para Core Web Vitals y estructura rastreable e indexable por Google para búsquedas B2B industriales venezolanas.

**Progreso sesión 2026-06-02:**
- `public/robots.txt` y `public/favicon.svg` creados
- `imageService: "compile"` activado en adapter Cloudflare — imágenes procesadas en build time
- Metadata SEO completa en las 5 páginas (title, description, canonical auto, ogImage con fallback, og:locale es_VE, Twitter Card)
- Schema.org `@graph` global en `BaseLayout.astro`: `LocalBusiness`+`WholesaleStore` (`#business`) + `WebSite` (`#website`) con `SearchAction`
- Schemas por página vía `slot="head"`: `CollectionPage` + `AboutPage` + `ContactPage` + `BreadcrumbList` en las 3 páginas interiores
- `<Image />` de `astro:assets` en Hero (4 slides) y NosotrosSection — `srcset` automático, sin CLS
- Lucide Icons: `defer is:inline` — deja de bloquear LCP
- Google Fonts: `display=swap` + `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`
- `/privacidad` creada (9 secciones legales completas), enlace visible en footer
- `/casos`, `/recursos` y `PageInConstruction.astro` eliminados definitivamente del proyecto

**Puntos de trabajo:**
1. ✅ `public/robots.txt` — `Allow: /` + referencia al sitemap generado por Astro
2. ✅ `public/favicon.svg` — ícono temporal (verde `#006633` + "R") hasta SVG oficial del cliente
3. ✅ `imageService: "compile"` en `astro.config.mjs` — compatible con Cloudflare Workers
4. ✅ Metadata SEO completa en `BaseLayout.astro` con props `title`, `description`, `canonical`, `ogImage`, `noindex`
5. ✅ Schema.org `@graph` global: `LocalBusiness`+`WholesaleStore` + `WebSite` con `SearchAction` — RIF `J-30298111-5`, `foundingDate: 1995`, dirección Caracas/DC/VE, `knowsAbout` 8 sectores
6. ✅ Schemas por página: `CollectionPage` en `/productos`, `AboutPage` en `/nosotros`, `ContactPage` en `/contacto`, `BreadcrumbList` en las 3
7. ✅ `<Image />` con `widths={[768, 1280, 1920]}` en Hero (4 slides, primer `eager`, resto `lazy`) y NosotrosSection (`eager`)
8. ✅ Lucide Icons CDN con `defer is:inline` — LCP no bloqueado
9. ✅ Google Fonts con `display=swap` + `preconnect` activos
10. ✅ `/privacidad` creada (Responsable · Datos · Finalidad · Base jurídica · Proveedores · Cookies · Conservación · Derechos · Cambios)
11. ⬜ Google Rich Results Test — pendiente de deploy en dominio real
12. ⬜ Google Search Console — pendiente de deploy y verificación de dominio
13. ⬜ Lighthouse mobile > 90 — pendiente de audit post-deploy (Fase 7)
14. ⬜ Keywords objetivo por página — pendiente definición con el cliente
15. ⬜ `public/og-default.jpg` (1200×630px) — pendiente asset de diseño del cliente
16. ⬜ Google Business Profile — requiere que el cliente cree/reclame el perfil
17. ⬜ `sameAs` en schema — pendiente URLs LinkedIn y perfiles sociales del cliente
18. ⬜ `FAQPage` schema — requiere definir preguntas con el cliente
19. ⬜ `Product` schema en `/productos` — requiere SKUs y especificaciones reales
20. ⬜ Bing Webmaster Tools — pendiente submit post-deploy

**Notas de implementación:**
- RIF `J-30298111-5` confirmado y consistente en Footer, schema.org y `/privacidad`
- Ubicación: `Caracas, Distrito Capital` — cliente no desea mayor precisión
- Fotos actuales (incluidas 2 de Unsplash en sectores Industrial y Aminoácidos) aprobadas por el cliente hasta tener fotos reales
- `IndustriasServidas.astro` sin migrar a `<Image />` — contenedores con `min-height` explícita eliminan riesgo de CLS; fotos Unsplash provisionales aprobadas
- Sanity CMS diferido — no bloquea lanzamiento; decisión arquitectónica abierta
- `astro check` → 0 errores, 0 warnings, 0 hints en 23 archivos

**Entregable:** Metadata SEO, schema.org `@graph`, imágenes con `srcset` y `/privacidad` activos en todas las páginas. Pendiente: Rich Results Test + GSC + Lighthouse post-deploy (Fase 7).

---

## ⬜ FASE 7 — QA y Lanzamiento

**Objetivo:** Todos los checklists de CLAUDE.md en verde antes de cambiar a PRODUCCIÓN.

**Decisión de infraestructura (2026-05-31):**
El cliente tiene hosting y dominio activo en **Bluehost** (hosting compartido — no soporta Node.js SSR).
El sitio tiene un servidor SSR activo (`/api/contacto`), por lo que no puede ir directo a Bluehost.
**Estrategia elegida:** Cloudflare Pages como hosting SSR + cambio de DNS en Bluehost para apuntar al dominio al sitio en Cloudflare. El cliente conserva su dominio. Adapter migrado de `@astrojs/netlify` → `@astrojs/cloudflare` (v12, compatible con Astro 5). Build verificado ✅.

**Requiere antes de empezar:**
- Fases 1–5 completadas
- Cuenta de Cloudflare creada (gratuita)
- Acceso al panel de Bluehost para cambiar DNS

**Puntos de trabajo:**
1. ⬜ Ejecutar Checklist: Sitio Astro listo para producción (6 ítems de CLAUDE.md)
2. ⬜ Ejecutar Checklist: Analytics listo para producción (ítems aplicables — n8n excluido, CAPI pendiente)
3. ⬜ Lighthouse audit completo: LCP < 2.5s, CLS = 0, INP < 200ms
4. ⬜ Crear proyecto en Cloudflare Pages + conectar repositorio git
5. ⬜ Configurar variables de entorno de producción en el panel de Cloudflare Pages
6. ⬜ Añadir dominio del cliente a Cloudflare → cambiar nameservers en Bluehost → apuntar dominio a Cloudflare Pages
7. ⬜ Dry-run final: duplicar base Airtable SANDBOX → crear AIRTABLE_BASE_PRODUCTION + 10 leads de prueba sin errores
8. ⬜ Confirmación explícita en el chat → cambiar base target a PRODUCTION en airtable.ts
9. ⬜ Monitoreo post-lanzamiento: 48h observando "Cola de Errores" antes de declarar estable

**Entregable:** MVP en producción en el dominio del cliente, recibiendo leads reales en Airtable PRODUCCIÓN.

---

## Resumen de dependencias

| Fase | Nombre              | Dependencias                          | Estado      |
|------|---------------------|---------------------------------------|-------------|
| 1    | Fundación Astro     | Ninguna                               | ✅ Completa |
| 2    | Formulario validado | Fase 1 + Cloudflare Turnstile         | ✅ Completa  |
| 3    | CRM Airtable        | Fase 2 + Airtable                     | ✅ Completa  |
| 4    | WhatsApp (Meta API) | Fase 3 + Meta WhatsApp Cloud API      | ⬜ Pendiente |
| 5    | Analytics           | Fase 2 + GTM + GA4 + Meta Pixel       | 🟡 En curso  |
| 6    | SEO y Contenido     | Fase 1 + Sanity CMS                   | 🟡 En curso  |
| 7    | QA y Lanzamiento    | Fases 1–5 + dominio                   | ⬜ Pendiente |
