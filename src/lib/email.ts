/**
 * Notificación de nuevo lead por email via Resend.
 * Fase 3 — temporal hasta la fase de automatizaciones (n8n).
 *
 * Variables requeridas en .env:
 *  RESEND_API_KEY    — token de Resend (re_...)
 *  NOTIFY_EMAIL      — email(s) del equipo que recibe alertas. Admite varios
 *                      separados por coma: "info@remyvenezuela.com,remystuteweb@gmail.com"
 *  RESEND_FROM_EMAIL — remitente verificado. Obligatorio en producción; en dev cae a
 *                      onboarding@resend.dev (solo entrega al dueño de la cuenta Resend).
 */

import type { ContactoData } from './schemas/contacto';
import { RESEND_API_KEY, NOTIFY_EMAIL, RESEND_FROM_EMAIL } from 'astro:env/server';

/**
 * Escapa caracteres con significado en HTML. Los datos del lead son texto libre
 * (Zod valida longitud, no contenido), así que cualquier valor que se interpole
 * en el cuerpo del correo debe pasar por aquí para evitar inyección de HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function notifyNewLead(data: ContactoData): Promise<void> {
  const apiKey = RESEND_API_KEY;

  // NOTIFY_EMAIL admite uno o varios destinatarios separados por coma
  // (p.ej. "info@remyvenezuela.com,remystuteweb@gmail.com"). Resend acepta
  // un array en `to` (hasta 50 destinatarios) y envía un solo correo a todos.
  const to = (NOTIFY_EMAIL ?? '')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);

  if (!apiKey || to.length === 0) {
    console.info('[email] RESEND_API_KEY o NOTIFY_EMAIL no configurados — notificación omitida');
    return;
  }

  // `onboarding@resend.dev` solo entrega al dueño de la cuenta (modo test de Resend):
  // útil en dev, inaceptable en producción. En prod exigir un remitente verificado.
  const from =
    RESEND_FROM_EMAIL || (import.meta.env.DEV ? 'onboarding@resend.dev' : '');
  if (!from) {
    console.error('[email] RESEND_FROM_EMAIL no configurado — notificación omitida en producción');
    return;
  }

  // Todos los valores del lead son texto libre: escapar antes de interpolar en el HTML.
  const empresa = escapeHtml(data.empresa);
  const nombre = escapeHtml(data.nombre);
  const cargo = escapeHtml(data.cargo);
  const email = escapeHtml(data.email);
  const telefono = escapeHtml(data.telefono);
  const industria = escapeHtml(data.industria);
  const empresaConstituida = escapeHtml(data.empresaConstituida);
  const idempotencyKey = escapeHtml(data.idempotencyKey);

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #0a2418;">
      <div style="background: #006633; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <p style="color: #f0e378; font-size: 12px; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">Remy &amp; Stute — Nuevo lead</p>
        <h1 style="color: #ffffff; font-size: 22px; margin: 8px 0 0; font-weight: 700;">${empresa}</h1>
      </div>
      <div style="background: #faf9f5; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e3e1d6;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px; width: 130px;">Nombre</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${nombre}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Cargo</td><td style="padding: 8px 0; font-size: 14px;">${cargo}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #006633;">${email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">WhatsApp</td><td style="padding: 8px 0; font-size: 14px;">${telefono}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Industria</td><td style="padding: 8px 0; font-size: 14px;">${industria}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Empresa Constituida</td><td style="padding: 8px 0; font-size: 14px;">${empresaConstituida}</td></tr>
        </table>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e3e1d6;">
          <p style="font-size: 11px; color: #9aa39c; margin: 0;">ID: ${idempotencyKey}</p>
        </div>
      </div>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // El subject es texto plano (no HTML): se usan los valores sin escapar.
      // La API de Resend recibe JSON, lo que neutraliza la inyección de cabeceras.
      from,
      to,
      subject: `🔔 Nuevo lead: ${data.empresa} — ${data.industria}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
