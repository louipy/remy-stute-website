/**
 * /api/contacto — endpoint de captura de leads.
 *
 * Orden de validación FIJO (R4 de CLAUDE.md):
 *   1. Cloudflare Turnstile (siteverify server-side)  → 403 si falla
 *   2. Zod (ContactoSchema)                            → 422 si falla
 *   3. Forward a n8n con X-Webhook-Secret (R2)         → 502 si falla
 *
 * Códigos de respuesta:
 *   200 — lead aceptado
 *   400 — body inválido (no parseable, método incorrecto)
 *   403 — Turnstile rechazó el token
 *   422 — validación Zod falló (incluye fieldErrors)
 *   500 — error interno
 *   502 — n8n no respondió OK
 */

import type { APIRoute } from 'astro';
import { ContactoSchema } from '@lib/schemas/contacto';

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

  const turnstileToken = typeof payload.turnstile_token === 'string' ? payload.turnstile_token : '';
  if (!turnstileToken) {
    return jsonResponse(403, { ok: false, error: 'turnstile_missing' });
  }

  // 1. Turnstile (R4)
  const remoteIp = (() => {
    try {
      return clientAddress;
    } catch {
      return null;
    }
  })();
  const turnstileOk = await verifyTurnstile(turnstileToken, remoteIp);
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

  // 3. Forward a n8n (R2) — el wiring real se completa en Fase 3
  const webhookUrl = import.meta.env.N8N_WEBHOOK_URL;
  const webhookSecret = import.meta.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    console.info(
      '[contacto] Lead validado (Fase 2). N8N_WEBHOOK_URL/SECRET aún no configurados — wiring en Fase 3.',
      { idempotency_key: parsed.data.idempotency_key },
    );
    return jsonResponse(200, { ok: true, stage: 'phase-2-validated' });
  }

  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!n8nRes.ok) {
      // TODO Fase 4: persistir en "Cola de Errores" de Airtable + notificar (R8)
      console.error('[contacto] n8n respondió no-OK', n8nRes.status, await n8nRes.text());
      return jsonResponse(502, { ok: false, error: 'n8n_unavailable' });
    }

    return jsonResponse(200, { ok: true });
  } catch (err) {
    // TODO Fase 4: persistir en "Cola de Errores" de Airtable + notificar (R8)
    console.error('[contacto] Error enviando a n8n', err);
    return jsonResponse(502, { ok: false, error: 'n8n_unreachable' });
  }
};

export const ALL: APIRoute = () => jsonResponse(405, { ok: false, error: 'method_not_allowed' });
