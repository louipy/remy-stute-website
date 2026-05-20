/**
 * ContactoSchema — fuente de verdad para validación del formulario de contacto.
 *
 * Reglas (CLAUDE.md):
 *  - R3: idempotency_key es UUID generado al montar el formulario.
 *  - R4: este schema corre DESPUÉS de Turnstile en /api/contacto.
 *  - R6: el normalizado para SHA256 (Meta CAPI) ocurre en n8n, no aquí.
 *
 * NOTA REDISEÑO (design-reference, decisión del usuario 2026-05-18):
 *  El formulario del brief técnico ya NO captura "industria" — el campo se
 *  eliminó siguiendo la nueva arquitectura. Se agregó "notas" (texto libre) y
 *  "volumen" pasó de select a texto libre.
 *  SECTORES_VALIDOS se conserva como referencia para n8n / dashboards y para
 *  el filtro del catálogo de productos, pero ya no valida ningún campo del form.
 */

import { z } from 'zod';

export const SECTORES_VALIDOS = [
  'Petróleo',
  'Gas',
  'Manufactura',
  'Construcción',
  'Energía',
  'Minería',
  'Transporte industrial',
] as const;

export type Sector = (typeof SECTORES_VALIDOS)[number];

const VE_MOBILE_PREFIXES = ['412', '414', '416', '424', '426'] as const;

const whatsappSchema = z
  .string({ required_error: 'El WhatsApp es obligatorio' })
  .min(1, 'El WhatsApp es obligatorio')
  .transform((value) => value.replace(/\D/g, ''))
  .superRefine((digits, ctx) => {
    let prefix: string | null = null;
    if (digits.length === 11 && digits.startsWith('0')) {
      prefix = digits.slice(1, 4);
    } else if (digits.length === 12 && digits.startsWith('58')) {
      prefix = digits.slice(2, 5);
    }

    if (!prefix || !VE_MOBILE_PREFIXES.includes(prefix as (typeof VE_MOBILE_PREFIXES)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe ser un móvil venezolano (0412/0414/0416/0424/0426)',
      });
    }
  })
  .transform((digits) => (digits.startsWith('58') ? `+${digits}` : `+58${digits.slice(1)}`));

export const ContactoSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'Nombre demasiado corto')
    .max(120, 'Nombre demasiado largo'),

  empresa: z
    .string({ required_error: 'La empresa es obligatoria' })
    .trim()
    .min(3, 'La empresa debe tener al menos 3 caracteres')
    .max(160, 'Nombre de empresa demasiado largo'),

  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Correo electrónico inválido')
    .max(160),

  whatsapp: whatsappSchema,

  cargo: z
    .string({ required_error: 'El cargo es obligatorio' })
    .trim()
    .min(2, 'Cargo inválido')
    .max(80),

  producto: z
    .string({ required_error: 'El producto es obligatorio' })
    .trim()
    .min(2, 'Producto inválido')
    .max(160),

  volumen: z
    .union([z.string().trim().max(120), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),

  notas: z
    .union([z.string().trim().max(1000, 'Las notas son demasiado largas'), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),

  idempotency_key: z
    .string({ required_error: 'idempotency_key requerido' })
    .uuid('idempotency_key debe ser un UUID válido'),
});

export type ContactoInput = z.input<typeof ContactoSchema>;
export type ContactoData = z.output<typeof ContactoSchema>;
