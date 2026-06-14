// Contrato tipado de los eventos del dataLayer. INMUTABLE — editar solo si cambia el
// schema de eventos en GTM o Meta CAPI (Fase 5).
//
// NOTA IMPORTANTE: el formulario de contacto NO importa trackEvent(): su script es
// `is:inline` y no puede importar módulos. Hace un `window.dataLayer.push({...})` literal
// en ContactSection.astro. Este archivo es la fuente de verdad del shape de ese push —
// si cambias GenerateLeadEvent, actualiza también el push inline (y viceversa).
// trackEvent() queda disponible para cualquier evento que se dispare desde módulos .ts/.astro
// con `<script>` no-inline.

export interface GenerateLeadEvent {
  event: 'generate_lead';
  event_id: string;        // UUID = R3 idempotencyKey = futuro Meta CAPI event_id
  form_id: 'contacto';
  lead_empresa?: string;
  lead_industria?: string;
}

export type DataLayerEvent = GenerateLeadEvent;

declare global {
  interface Window {
    dataLayer: object[];
  }
}

export function trackEvent(payload: DataLayerEvent): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}
