/**
 * HubSpot CRM — integración server-side (best-effort).
 *
 * La web escribe el lead a Airtable (fuente de verdad, con idempotencia R3 y Cola de
 * Errores R8) y además lo empuja aquí para que el equipo lo trabaje en el pipeline de
 * HubSpot. Mismo patrón que `meta.ts`: no-op si falta el token; lanza excepción en error
 * para que el `.catch` del API route lo registre en la Cola de Errores (R8). Nunca bloquea
 * la respuesta al cliente (se dispara con `ctx.waitUntil` desde el route).
 *
 * Contacto: upsert por email (POST; si 409 → PATCH por email). Si la cuenta no tiene las
 * propiedades custom `industria` / `empresa_constituida`, se reintenta sin ellas.
 * Deal: opt-in — solo si `HUBSPOT_PIPELINE_ID` está seteado (si no, solo contacto).
 */

import type { ContactoData } from './schemas/contacto';
import {
  HUBSPOT_ACCESS_TOKEN,
  HUBSPOT_PIPELINE_ID,
  HUBSPOT_DEALSTAGE_ID,
} from 'astro:env/server';

const HUBSPOT_API = 'https://api.hubapi.com/crm/v3/objects';
// Primera etapa del pipeline de ventas estándar de HubSpot (presente en toda cuenta nueva).
const DEFAULT_DEALSTAGE = 'appointmentscheduled';
// Association type id HUBSPOT_DEFINED para deal → contact.
const DEAL_TO_CONTACT_TYPE_ID = 3;

interface HubSpotObject {
  id: string;
}

function hubspotFetch(
  url: string,
  method: string,
  body: unknown,
  token: string,
): Promise<Response> {
  return fetch(url, {
    method,
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Escribe (POST/PATCH) las propiedades; si HubSpot responde 400 por una propiedad custom
 * inexistente, reintenta una vez sin `industria` / `empresa_constituida`.
 */
async function writeWithPropFallback(
  url: string,
  method: string,
  properties: Record<string, string>,
  token: string,
): Promise<Response> {
  const res = await hubspotFetch(url, method, { properties }, token);
  if (res.status === 400) {
    const text = await res.text();
    if (/does not exist|PROPERTY_DOESNT_EXIST/i.test(text)) {
      const { industria: _i, empresa_constituida: _e, ...standard } = properties;
      console.warn(
        '[hubspot] Propiedades custom ausentes; reintentando sin industria/empresa_constituida',
      );
      return hubspotFetch(url, method, { properties: standard }, token);
    }
    // Otro 400: reconstruir la respuesta para que el caller lea el cuerpo.
    return new Response(text, { status: 400 });
  }
  return res;
}

async function upsertContact(
  properties: Record<string, string>,
  token: string,
): Promise<string> {
  let res = await writeWithPropFallback(`${HUBSPOT_API}/contacts`, 'POST', properties, token);

  // 409: el email ya existe → actualizar por email (upsert).
  if (res.status === 409) {
    const url = `${HUBSPOT_API}/contacts/${encodeURIComponent(properties.email)}?idProperty=email`;
    res = await writeWithPropFallback(url, 'PATCH', properties, token);
  }

  if (!res.ok) {
    throw new Error(`HubSpot contacts ${res.status}: ${await res.text()}`);
  }

  const obj = (await res.json()) as HubSpotObject;
  return obj.id;
}

async function createDeal(
  data: ContactoData,
  contactId: string,
  pipeline: string,
  token: string,
): Promise<void> {
  const body = {
    properties: {
      dealname: `${data.empresa} — ${data.industria}`,
      pipeline,
      dealstage: HUBSPOT_DEALSTAGE_ID || DEFAULT_DEALSTAGE,
    },
    associations: [
      {
        to: { id: contactId },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: DEAL_TO_CONTACT_TYPE_ID,
          },
        ],
      },
    ],
  };

  const res = await hubspotFetch(`${HUBSPOT_API}/deals`, 'POST', body, token);
  if (!res.ok) {
    throw new Error(`HubSpot deals ${res.status}: ${await res.text()}`);
  }
  const obj = (await res.json()) as HubSpotObject;
  console.info('[hubspot] Deal creado', { contactId, dealId: obj.id });
}

export async function sendToHubSpot(data: ContactoData): Promise<void> {
  const token = HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.info('[hubspot] Token no configurado — omitiendo');
    return;
  }

  // Mapeo lead → propiedades de contacto de HubSpot.
  // `industria` y `empresa_constituida` son propiedades custom (opcionales, ver fallback).
  const properties: Record<string, string> = {
    email: data.email,
    firstname: data.nombre,
    phone: data.telefono,
    company: data.empresa,
    jobtitle: data.cargo,
    industria: data.industria,
    empresa_constituida: data.empresaConstituida,
  };

  const contactId = await upsertContact(properties, token);
  console.info('[hubspot] Contacto sincronizado', { contactId, email: data.email });

  // Deal opt-in: solo si hay pipeline configurado. Best-effort interno — un fallo de deal
  // no debe reportarse como fallo del contacto (que ya se creó correctamente).
  if (HUBSPOT_PIPELINE_ID) {
    try {
      await createDeal(data, contactId, HUBSPOT_PIPELINE_ID, token);
    } catch (err) {
      console.error('[hubspot] Contacto sincronizado pero falló el deal', err);
    }
  }
}
