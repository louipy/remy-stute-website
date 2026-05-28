import { z } from 'zod';

export const SECTORES_VALIDOS = [
  'Petróleo', 'Gas', 'Manufactura', 'Construcción',
  'Energía', 'Minería', 'Transporte industrial',
] as const;

export type Sector = (typeof SECTORES_VALIDOS)[number];

export const ContactoSchema = z.object({
  empresaConstituida: z
    .string({ required_error: 'Campo requerido' })
    .min(1, 'Campo requerido'),

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

  industria: z
    .string({ required_error: 'La industria es obligatoria' })
    .trim()
    .min(1, 'Industria requerida')
    .max(60),

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
    .min(4, 'Teléfono inválido')
    .max(30),

  idempotencyKey: z
    .string({ required_error: 'idempotencyKey requerido' })
    .uuid('idempotencyKey debe ser un UUID válido'),
});

export type ContactoInput = z.input<typeof ContactoSchema>;
export type ContactoData = z.output<typeof ContactoSchema>;
