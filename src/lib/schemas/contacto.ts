import { z } from 'zod';

/**
 * Industrias oficiales del negocio. Fuente de verdad única: el formulario
 * (ContactSection.astro), el catálogo (ProductosCatalogo.astro) y el home
 * (IndustriasServidas.astro) deben usar exactamente estos literales.
 */
export const INDUSTRIAS_VALIDAS = [
  'General',
  'Cerámicas',
  'Hidrocarburos',
  'Pinturas',
  'Alimento animal',
] as const;

export type Industria = (typeof INDUSTRIAS_VALIDAS)[number];

/** Respuestas válidas al filtro de calificación del paso 1. */
export const EMPRESA_CONSTITUIDA_VALIDAS = [
  'Sí, somos empresa industrial con RIF activo',
  'No',
] as const;

/**
 * Normaliza un teléfono venezolano a formato E.164 (+58XXXXXXXXXX) o devuelve
 * null si no es un número VE válido. Acepta los formatos habituales:
 *   0412-1234567 · 04121234567 · +584121234567 · 584121234567 · 0212 1234567
 * Válidos: móviles (412/414/416/422/424/426) y fijos (área 02XX, 10 dígitos
 * nacionales empezando por 2).
 */
function normalizarTelefonoVE(value: string): string | null {
  const digits = value.replace(/\D/g, '');

  let nacional = '';
  if (digits.length === 12 && digits.startsWith('58')) nacional = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) nacional = digits.slice(1);
  else if (digits.length === 10) nacional = digits;

  const MOVIL_VE = /^4(12|14|16|22|24|26)\d{7}$/; // móvil
  const FIJO_VE = /^2\d{9}$/;                      // fijo (02XX + 7 dígitos)
  if (!nacional || !(MOVIL_VE.test(nacional) || FIJO_VE.test(nacional))) return null;

  return `+58${nacional}`;
}

export const ContactoSchema = z.object({
  empresaConstituida: z.enum(EMPRESA_CONSTITUIDA_VALIDAS, {
    required_error: 'Campo requerido',
    invalid_type_error: 'Valor no permitido',
  }),

  empresa: z
    .string({ required_error: 'La empresa es obligatoria' })
    .trim()
    .min(3, 'La empresa debe tener al menos 3 caracteres')
    .max(160, 'Nombre de empresa demasiado largo'),

  cargo: z
    .string({ required_error: 'El cargo es obligatorio' })
    .trim()
    .min(2, 'Cargo inválido')
    .max(80),

  industria: z.enum(INDUSTRIAS_VALIDAS, {
    required_error: 'La industria es obligatoria',
    invalid_type_error: 'Industria no permitida',
  }),

  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Correo electrónico inválido')
    .max(160),

  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'Nombre demasiado corto')
    .max(120, 'Nombre demasiado largo'),

  telefono: z
    .string({ required_error: 'El teléfono es obligatorio' })
    .trim()
    .transform((val, ctx) => {
      const normalizado = normalizarTelefonoVE(val);
      if (!normalizado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Teléfono venezolano inválido (ej: 0412-1234567 o 0212-1234567)',
        });
        return z.NEVER;
      }
      return normalizado;
    }),

  idempotencyKey: z
    .string({ required_error: 'idempotencyKey requerido' })
    .uuid('idempotencyKey debe ser un UUID válido'),
});

export type ContactoInput = z.input<typeof ContactoSchema>;
export type ContactoData = z.output<typeof ContactoSchema>;
