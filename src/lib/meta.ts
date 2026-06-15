/**
 * Meta Conversions API (CAPI) — server-side.
 * Fase 5: deduplicación con el Pixel usando el mismo event_id (= idempotencyKey).
 *
 * Reglas aplicadas:
 *  R6 — Normalización antes de hashear: email y nombre con trim+toLowerCase,
 *        teléfono con solo dígitos (E.164 sin +).
 */

import type { ContactoData } from './schemas/contacto';
import { META_PIXEL_ID, META_ACCESS_TOKEN } from 'astro:env/server';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface MetaCAPIOptions {
  ip?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string | null;
}

export async function sendMetaCAPI(
  data: ContactoData,
  eventId: string,
  options: MetaCAPIOptions = {},
): Promise<void> {
  const pixelId = META_PIXEL_ID;
  const accessToken = META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.info('[meta-capi] Credenciales no configuradas — omitiendo');
    return;
  }

  // R6: normalizar antes de hashear.
  // data.telefono ya viene en E.164 (+58XXXXXXXXXX) desde ContactoSchema;
  // quitar el '+' deja los dígitos E.164 que Meta espera (ej: 584121234567).
  const [emailHash, phoneHash, nameHash] = await Promise.all([
    sha256(data.email.trim().toLowerCase()),
    sha256(data.telefono.replace(/\D/g, '')),
    sha256(data.nombre.trim().toLowerCase()),
  ]);

  const capiPayload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: options.eventSourceUrl ?? 'https://remyvenezuela.com/contacto',
        action_source: 'website',
        user_data: {
          em: [emailHash],
          ph: [phoneHash],
          fn: [nameHash],
          ...(options.ip ? { client_ip_address: options.ip } : {}),
          ...(options.userAgent ? { client_user_agent: options.userAgent } : {}),
        },
        custom_data: {
          lead_empresa: data.empresa,
          lead_cargo: data.cargo,
          lead_industria: data.industria,
        },
      },
    ],
  };

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pixelId}/events`;

  const res = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(capiPayload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta CAPI ${res.status}: ${body}`);
  }

  const result = (await res.json()) as { events_received?: number };
  console.info('[meta-capi] Evento enviado', { eventId, events_received: result.events_received });
}
