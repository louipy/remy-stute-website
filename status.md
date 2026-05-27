# ROADMAP MVP — Remy & Stute C.A.

Estado actual del proyecto. Actualizar al completar cada fase.

---

## NOTA — Rediseño completo sobre design-reference (2026-05-19)

Se reconstruyó el sitio replicando fielmente los 4 `.html` desktop 1440 de
`design-reference/` (Home, Productos, Nosotros, Contacto). Detalle en
`WHILECHANGES.md` → Hecho. Resumen del impacto en Fases 1 y 2:

- **Fase 1:** IA de páginas — `/soluciones` eliminada; `/productos` y `/nosotros`
  son páginas reales; `/casos` y `/recursos` siguen en construcción. Sistema
  visual nuevo: tema claro crema `#FAF9F5`, tipografías Plus Jakarta Sans / Inter
  / Oswald / JetBrains Mono, verde `#006633`. La página Nosotros es tema oscuro
  (así está en el mockup). Placeholders GTM (R5) intactos en BaseLayout.
- **Fase 2:** contrato del formulario — se quitó `industria`, se agregó `notas`,
  `volumen`/`cargo` pasaron a texto libre. `schema/contacto.ts` y el payload JS
  actualizados; `api/contacto.ts` sin cambios. Orden R4, Turnstile, R2 y R3
  intactos y verificados (400/403/405 OK vía curl).
- Pendiente (cambios quirúrgicos): copy definitivo, datos reales (RIF, dirección,
  cifras de "pedido promedio"), fotos reales (hoy placeholders de rayas).

---

## ✅ FASE 1 — Fundación Astro — COMPLETADA

**Objetivo:** Convertir el index.html en un proyecto Astro real y funcional.

**Puntos de trabajo:**
1. ✅ Inicializar proyecto Astro con TypeScript + Tailwind
2. ✅ Crear astro.config.mjs con los integrations necesarios (Tailwind v4, Sitemap)
3. ✅ Migrar index.html a src/pages/index.astro y descomponerlo en componentes reutilizables en src/components/
4. ✅ Crear BaseLayout.astro con el slot para GTM (placeholder is:inline, Main Thread — R5)
5. ✅ Crear las páginas estáticas vacías: /soluciones, /casos, /recursos, /contacto
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
1. ✅ `src/lib/schemas/contacto.ts` con `ContactoSchema` Zod (SECTORES_VALIDOS, móvil VE 412/414/416/424/426, email normalizado, empresa ≥ 3 chars, idempotency_key UUID)
2. ✅ `src/pages/contacto.astro` reutiliza `ContactSection`; idempotencyKey generado al montar via `crypto.randomUUID()` (R3)
3. ✅ `src/pages/api/contacto.ts` con orden fijo Turnstile → Zod → n8n (R4); `prerender = false`
4. ✅ Cloudflare Turnstile integrado (widget client-side + siteverify server-side; HTTP 403 si falla)
5. ✅ `.env` con `PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`
6. ✅ Respuestas: 200 ok / 400 body inválido / 403 turnstile (missing/failed) / 422 Zod (con fieldErrors) / 502 n8n / 500 error interno
7. ✅ Edge cases probados via curl (empty body, no token, bogus token → 403)

**Entregable cumplido:** `/api/contacto` rechaza bots (Turnstile) y datos inválidos (Zod) antes de tocar n8n. Forward a n8n queda como stub condicional hasta que `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_SECRET` estén en `.env` (Fase 3).

**Notas de implementación:**
- Industrias del form alineadas a `SECTORES_VALIDOS` (CLAUDE.md): se quitaron "Petróleo y Gas" combinado, "Agroalimentario" y "Otro"; se agregaron "Petróleo", "Gas", "Energía", "Transporte industrial"
- Whatsapp: el schema acepta cualquier formato y normaliza a `+58XXXXXXXXXX` (rechaza fijos)
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
6. ✅ `ContactSection.astro` — submit real al API (stub MVP eliminado); campo `industria` → `producto`; agrega `volumen` y `notas`
7. ✅ Variables de entorno configuradas en `.env`
8. ✅ Prueba end-to-end: lead llega a Airtable SANDBOX correctamente
9. ✅ Prueba de idempotencia: doble submit con mismo UUID → 1 solo registro en Airtable

**Schema Airtable SANDBOX — tabla PROSPECTOS (nombres exactos de columnas):**
  Nombre · Empresa · Email · Whatsapp · Cargo · Producto · Volumen · Notas
  idempotency_key · Estado · Fuente · Fecha

**Schema Airtable SANDBOX — tabla Cola de Errores:**
  payload_raw · error_mensaje · error_tipo · resuelto · timestamp (Created time)

**Variables de entorno activas (.env):**
  AIRTABLE_API_KEY · AIRTABLE_BASE_SANDBOX · RESEND_API_KEY · NOTIFY_EMAIL
  (AIRTABLE_BASE_PRODUCTION se configura cuando se duplique la base para producción)

**Nota — formulario provisional:** los campos actuales (Producto, Volumen, Notas, Cargo)
cambiarán en una iteración futura. Al cambiar: actualizar ContactSection.astro +
ContactoSchema en contacto.ts + objeto fields en airtable.ts + columnas en Airtable.
La columna `idempotency_key` NUNCA se renombra.

**Entregable:** 10 leads de prueba en SANDBOX sin duplicados, sin errores silenciosos.

---

## ⬜ FASE 4 — Automatización de Notificaciones

**Objetivo:** El equipo es notificado inmediatamente cuando llega un lead calificado.

**Requiere antes de empezar:**
- Fase 3 completada
- WhatsApp Business API activa + template pre-aprobado en Meta Business Manager

**Puntos de trabajo:**
1. ⬜ Extender el workflow n8n con nodo de calificación básica (¿sectores válidos? ¿volumen mínimo?)
2. ⬜ Integrar WhatsApp Business API para notificación al equipo (template pre-aprobado en Meta Business Manager)
3. ⬜ Integrar email de notificación al equipo vía n8n
4. ⬜ Crear el Error Trigger obligatorio en todos los workflows: fallo → guardar en "Cola de Errores" + email de alerta (R8)
5. ⬜ Probar el path de error: desconectar Airtable temporalmente → verificar que "Cola de Errores" captura el payload
6. ⬜ Probar los 8 edge cases de automation-n8n.md: teléfono fijo, empresa vacía, presupuesto no-numérico, sector inválido, duplicados, Airtable fail, WhatsApp API fail, etc.

**Entregable:** Ningún lead se pierde silenciosamente. El equipo recibe WhatsApp + email en < 2 minutos.

---

## ⬜ FASE 5 — Analytics y Tracking

**Objetivo:** Cada conversión es medible y deduplicada entre Pixel y CAPI.

**Requiere antes de empezar:**
- Fase 2 completada
- Contenedor GTM creado
- Cuenta Meta Business con Pixel y acceso a CAPI

**Puntos de trabajo:**
1. ⬜ Crear contenedor GTM, instalar el snippet en BaseLayout.astro con is:inline (Main Thread, NO Partytown — R5)
2. ⬜ Crear src/lib/analytics/dataLayer.ts con DataLayerEvents y trackEvent() — marcar como INMUTABLE
3. ⬜ Configurar GA4 tag en GTM con evento generate_lead
4. ⬜ Configurar Meta Pixel en GTM con evento Lead
5. ⬜ Pasar el idempotencyKey como event_id en el dataLayer.push antes del submit (el mismo UUID que va a n8n)
6. ⬜ Extender el workflow n8n para enviar el evento Lead a Meta CAPI con los datos SHA256-normalizados (.trim().toLowerCase() — R6)
7. ⬜ Configurar consent mode en GTM: ad_storage y analytics_storage = 'denied' por defecto
8. ⬜ Verificar deduplicación: mismo event_id en Pixel y CAPI → Meta Events Manager muestra 1 evento, no 2
9. ⬜ Crear página de Privacy Policy en /privacidad, enlace visible en footer

**Entregable:** GTM Preview muestra generate_lead con event_id. Meta Events Manager confirma CAPI deduplica correctamente.

---

## ⬜ FASE 6 — SEO y Contenido

**Objetivo:** El sitio atrae tráfico orgánico calificado de Google Venezuela.

**Requiere antes de empezar:**
- Fase 1 completada
- Cuenta Sanity CMS creada

**Puntos de trabajo:**
1. ⬜ Integrar Sanity CMS para gestión de contenido dinámico (casos de éxito, blog, fichas de productos)
2. ⬜ Completar las páginas con contenido real: /soluciones (por sector), /casos (casos de éxito), /recursos (artículos SEO)
3. ⬜ Implementar metadata SEO en cada página: title, description, OG tags, schema.org LocalBusiness
4. ⬜ Configurar @astrojs/sitemap y robots.txt
5. ⬜ Optimizar imágenes con Image de Astro (WebP, lazy loading)
6. ⬜ Keywords target por página según web-astro.md: "servicios [industria] Venezuela", "[sector] B2B Venezuela"
7. ⬜ Configurar dominio en Cloudflare con HTTPS forzado

**Entregable:** Lighthouse mobile > 90 en todas las páginas. Sitemap enviado a Google Search Console.

---

## ⬜ FASE 7 — QA y Lanzamiento

**Objetivo:** Todos los checklists de CLAUDE.md en verde antes de cambiar a PRODUCCIÓN.

**Requiere antes de empezar:**
- Fases 1–6 completadas

**Puntos de trabajo:**
1. ⬜ Ejecutar el Checklist: Webhook n8n listo para producción (7 ítems de CLAUDE.md)
2. ⬜ Ejecutar el Checklist: Sitio Astro listo para producción (6 ítems de CLAUDE.md)
3. ⬜ Ejecutar el Checklist: Analytics listo para producción (6 ítems de CLAUDE.md)
4. ⬜ Lighthouse audit completo: LCP < 2.5s, CLS = 0, INP < 200ms
5. ⬜ Deploy a Vercel (o Cloudflare Pages) con variables de entorno en producción
6. ⬜ Dry-run final en SANDBOX: 10 leads de prueba sin errores en 48 horas
7. ⬜ Confirmación explícita en el chat → cambiar AIRTABLE_TARGET_BASE a PRODUCTION
8. ⬜ Monitoreo post-lanzamiento: 48h observando "Cola de Errores" antes de considerar estable

**Entregable:** MVP en producción recibiendo leads reales en Airtable PRODUCCIÓN.

---

## Resumen de dependencias

| Fase | Nombre              | Dependencias                          | Estado      |
|------|---------------------|---------------------------------------|-------------|
| 1    | Fundación Astro     | Ninguna                               | ✅ Completa |
| 2    | Formulario validado | Fase 1 + Cloudflare Turnstile         | ✅ Completa  |
| 3    | CRM Airtable        | Fase 2 + Airtable                     | ✅ Completa  |
| 4    | Notificaciones      | Fase 3 + WhatsApp Business API        | ⬜ Pendiente |
| 5    | Analytics           | Fase 2 + GTM + Meta CAPI              | ⬜ Pendiente |
| 6    | SEO y Contenido     | Fase 1 + Sanity CMS                   | ⬜ Pendiente |
| 7    | QA y Lanzamiento    | Fases 1–6 completas                   | ⬜ Pendiente |
