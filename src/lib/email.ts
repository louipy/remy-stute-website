/**
 * Notificación de nuevo lead por email via Resend.
 * Fase 3 — temporal hasta la fase de automatizaciones (n8n).
 *
 * Variables requeridas en .env:
 *  RESEND_API_KEY    — token de Resend (re_...)
 *  NOTIFY_EMAIL      — email del equipo que recibe alertas
 *  RESEND_FROM_EMAIL — (opcional) remitente verificado; usa onboarding@resend.dev si no está definido
 */

import type { ContactoData } from './schemas/contacto';

export async function notifyNewLead(data: ContactoData): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.NOTIFY_EMAIL;

  if (!apiKey || !to) {
    console.info('[email] RESEND_API_KEY o NOTIFY_EMAIL no configurados — notificación omitida');
    return;
  }

  const from = import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #0a2418;">
      <div style="background: #006633; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <p style="color: #f0e378; font-size: 12px; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">Remy &amp; Stute — Nuevo lead</p>
        <h1 style="color: #ffffff; font-size: 22px; margin: 8px 0 0; font-weight: 700;">${data.empresa}</h1>
      </div>
      <div style="background: #faf9f5; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e3e1d6;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px; width: 130px;">Nombre</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.nombre}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Cargo</td><td style="padding: 8px 0; font-size: 14px;">${data.cargo}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${data.email}" style="color: #006633;">${data.email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">WhatsApp</td><td style="padding: 8px 0; font-size: 14px;">${data.telefono}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Industria</td><td style="padding: 8px 0; font-size: 14px;">${data.industria}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7770; font-size: 13px;">Empresa Constituida</td><td style="padding: 8px 0; font-size: 14px;">${data.empresaConstituida}</td></tr>
        </table>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e3e1d6;">
          <p style="font-size: 11px; color: #9aa39c; margin: 0;">ID: ${data.idempotencyKey}</p>
        </div>
      </div>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
