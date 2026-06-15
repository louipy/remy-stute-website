/**
 * /api/contacto — endpoint de captura de leads.
 *
 * Orden de validación FIJO (R4 de CLAUDE.md):
 *   1. Cloudflare Turnstile (siteverify server-side)  → 403 si falla
 *   2. Zod (ContactoSchema)                            → 422 si falla
 *   3. Check idempotencia en Airtable (R3)             → 200 duplicate si ya existe
 *   4. Crear prospecto en Airtable SANDBOX
 *   5. Notificar al equipo por email (Resend) — best-effort
 *
 * Fase 3: escritura directa a Airtable sin n8n.
 * Migración a n8n en la fase de automatizaciones:
 *   reemplazar el bloque Airtable+Resend por una llamada al webhook de n8n
 *   con el mismo `parsed.data` que ya está estructurado.
 *
 * Códigos de respuesta:
 *   200 — lead aceptado (o duplicado detectado)
 *   400 — body inválido (no parseable, método incorrecto)
 *   403 — Turnstile rechazó el token
 *   422 — validación Zod falló (incluye fieldErrors)
 *   500 — error interno
 *   502 — error al escribir en Airtable
 */

import type { APIRoute } from 'astro';
import { ContactoSchema } from '@lib/schemas/contacto';
import { checkIdempotency, createProspecto, logError } from '@lib/airtable';
import { notifyNewLead } from '@lib/email';
import { sendMetaCAPI } from '@lib/meta';

export const prerender = false;

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileSiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('[contacto] TURNSTILE_SECRET_KEY no definida en .env');
    return false;
  }

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  if (remoteIp) params.append('remoteip', remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as TurnstileSiteverifyResponse;
    if (!data.success) {
      console.warn('[contacto] Turnstile rechazó token', data['error-codes']);
    }
    return data.success === true;
  } catch (err) {
    console.error('[contacto] Error llamando a Turnstile siteverify', err);
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // 0. Body parseable
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' });
  }

  const isDev = import.meta.env.DEV;
  const turnstileToken = typeof payload.turnstile_token === 'string' ? payload.turnstile_token : '';

  // 1. Turnstile (R4) — en dev se omite para facilitar testing local
  if (!isDev && !turnstileToken) {
    return jsonResponse(403, { ok: false, error: 'turnstile_missing' });
  }

  const remoteIp = (() => {
    try {
      return clientAddress;
    } catch {
      return null;
    }
  })();
  const turnstileOk = isDev || await verifyTurnstile(turnstileToken, remoteIp);
  if (!turnstileOk) {
    return jsonResponse(403, { ok: false, error: 'turnstile_failed' });
  }

  // 2. Zod (R4) — turnstile_token NO entra al schema
  const { turnstile_token: _omit, ...formData } = payload;
  const parsed = ContactoSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return jsonResponse(422, { ok: false, error: 'validation_failed', fieldErrors });
  }

  // Si Airtable no está configurado (sin credenciales), se acepta el lead de todas formas
  // para no bloquear el formulario durante el onboarding.
  const airtableReady =
    !!import.meta.env.AIRTABLE_API_KEY && !!import.meta.env.AIRTABLE_BASE_PRODUCTION;

  if (!airtableReady) {
    console.info(
      '[contacto] Airtable no configurado — lead validado localmente',
      parsed.data.idempotencyKey,
    );
    return jsonResponse(200, { ok: true, stage: 'validated-no-airtable' });
  }

  try {
    // 3. Idempotencia (R3): abortar si ya existe el key
    const isDuplicate = await checkIdempotency(parsed.data.idempotencyKey);
    if (isDuplicate) {
      console.info('[contacto] Intento duplicado detectado', parsed.data.idempotencyKey);
      return jsonResponse(200, { ok: true, duplicate: true });
    }

    // 4. Crear prospecto en Airtable SANDBOX
    await createProspecto(parsed.data);

    // 5. Notificar al equipo — best-effort, no bloquea la respuesta (R8)
    notifyNewLead(parsed.data).catch((err: unknown) => {
      console.error('[contacto] Error enviando notificación email', err);
      logError(parsed.data, String(err), 'Email').catch(() => {});
    });

    // 6. Meta CAPI — best-effort, deduplicado con el Pixel por event_id (Fase 5)
    sendMetaCAPI(parsed.data, parsed.data.idempotencyKey, {
      ip: remoteIp,
      userAgent: request.headers.get('user-agent'),
      eventSourceUrl: request.headers.get('referer'),
    }).catch((err: unknown) => {
      console.error('[contacto] Error enviando evento a Meta CAPI', err);
      logError(parsed.data, String(err), 'MetaCAPI').catch(() => {});
    });

    return jsonResponse(200, { ok: true });
  } catch (err) {
    // R8: nunca silencioso — log en Cola de Errores + 502
    console.error('[contacto] Error escribiendo a Airtable', err);
    await logError(parsed.data, String(err), 'Airtable').catch(() => {});
    return jsonResponse(502, { ok: false, error: 'airtable_unavailable' });
  }
};

export const ALL: APIRoute = () => jsonResponse(405, { ok: false, error: 'method_not_allowed' });
