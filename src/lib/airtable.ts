/**
 * Cliente Airtable — escritura directa sin SDK.
 * Fase 3: reemplaza el stub de n8n.
 * Cuando llegue la fase de automatizaciones, el API route
 * vuelve a enviar a n8n y este archivo deja de usarse.
 *
 * Reglas aplicadas:
 *  R3 — Idempotencia: checkIdempotency busca por idempotency_key antes de crear.
 *  R7 — Rate limits: 250ms wait tras cada escritura, retry 1s→2s→4s en HTTP 429.
 *  R8 — Errores nunca silenciosos: logError escribe en "Cola de Errores".
 */

import type { ContactoData } from './schemas/contacto';

const AIRTABLE_API = 'https://api.airtable.com/v0';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function airtableFetch(
  url: string,
  options: RequestInit,
  apiKey: string,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  // R7: retry con backoff en 429
  if (res.status === 429 && attempt < 3) {
    const delays = [1000, 2000, 4000];
    await sleep(delays[attempt]);
    return airtableFetch(url, options, apiKey, attempt + 1);
  }

  return res;
}

function getCredentials(): { apiKey: string; baseId: string } {
  const apiKey = import.meta.env.AIRTABLE_API_KEY;
  const baseId = import.meta.env.AIRTABLE_BASE_SANDBOX;
  if (!apiKey || !baseId) {
    throw new Error('Airtable no configurado — AIRTABLE_API_KEY o AIRTABLE_BASE_SANDBOX faltantes');
  }
  return { apiKey, baseId };
}

/** R3 — Devuelve true si ya existe un registro con este idempotency_key. */
export async function checkIdempotency(key: string): Promise<boolean> {
  const { apiKey, baseId } = getCredentials();
  const params = new URLSearchParams();
  params.set('filterByFormula', `{idempotency_key}="${key}"`);
  params.set('maxRecords', '1');
  params.append('fields[]', 'idempotency_key');

  const res = await airtableFetch(
    `${AIRTABLE_API}/${baseId}/PROSPECTOS?${params}`,
    { method: 'GET' },
    apiKey,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable search error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { records: unknown[] };
  return data.records.length > 0;
}

/** Crea un prospecto en PROSPECTOS. R7: 250ms wait tras la escritura. */
export async function createProspecto(data: ContactoData): Promise<void> {
  const { apiKey, baseId } = getCredentials();

  const res = await airtableFetch(
    `${AIRTABLE_API}/${baseId}/PROSPECTOS`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [
          {
            fields: {
              Nombre: data.nombre,
              Empresa: data.empresa,
              Email: data.email,
              Whatsapp: data.telefono,
              Cargo: data.cargo,
              Industria: data.industria,
              Empresa_Constituida: data.empresaConstituida,
              idempotency_key: data.idempotencyKey,
              Estado: 'Nuevo',
              Fuente: 'Formulario web',
            },
          },
        ],
      }),
    },
    apiKey,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable create error ${res.status}: ${body}`);
  }

  await sleep(250); // R7
}

/**
 * R8 — Escribe en "Cola de Errores". Best-effort: nunca lanza excepción
 * para no enmascarar el error original.
 */
export async function logError(
  payload: unknown,
  errorMensaje: string,
  errorTipo: 'Airtable' | 'Email' | 'Interno',
): Promise<void> {
  try {
    const { apiKey, baseId } = getCredentials();
    await fetch(`${AIRTABLE_API}/${baseId}/Cola%20de%20Errores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              payload_raw: JSON.stringify(payload),
              error_mensaje: errorMensaje.slice(0, 255),
              error_tipo: errorTipo,
              resuelto: false,
            },
          },
        ],
      }),
    });
    await sleep(250); // R7
  } catch {
    // Silencioso intencionalmente: el log de error no debe enmascarar el error original.
  }
}
