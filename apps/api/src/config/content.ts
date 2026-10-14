/**
 * Contenido comercial del club (PLACEHOLDER editable).
 *
 * Estos valores son de ejemplo y deben reemplazarse por los datos reales del complejo.
 * Se separan del resto de la configuración porque son contenido editorial, no parámetros
 * operativos. Los datos editables desde el panel (nombre, seña, tiempo de retención) viven
 * en la tabla `Setting` y se combinan con estos en la respuesta de `GET /club`.
 */

export interface StaticClubContent {
  tagline: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  mapUrl?: string;
  instagram?: string;
  openingSummary: string;
}

export const STATIC_CLUB_CONTENT: StaticClubContent = {
  tagline: 'Tu cancha, tu juego, tu momento.',
  description:
    'Complejo de pádel con canchas de primer nivel, iluminación profesional y reservas online en minutos. Viví la experiencia de jugar en un espacio pensado para vos.',
  address: 'Av. del Deporte 1234',
  city: 'Ciudad',
  phone: '+54 9 11 0000-0000',
  whatsapp: '5491100000000',
  email: 'reservas@padelclub.example',
  mapUrl: 'https://maps.google.com',
  instagram: 'https://instagram.com',
  openingSummary: 'Lunes a viernes de 08:00 a 23:00 · Sábados y domingos de 09:00 a 22:00',
};

export const DEFAULT_FAQS = [
  {
    question: '¿Cómo reservo una cancha?',
    answer:
      'Ingresá a "Reservar", elegí la fecha, la duración y el horario disponible, completá tus datos y pagá la seña online para confirmar.',
    sortOrder: 1,
  },
  {
    question: '¿Qué es la seña y cuánto se paga?',
    answer:
      'La seña es un pago parcial que asegura tu reserva. El porcentaje es configurable y se muestra siempre antes de pagar. El saldo se abona en el complejo.',
    sortOrder: 2,
  },
  {
    question: '¿Puedo cancelar o reprogramar?',
    answer:
      'Sí. Las condiciones dependen de la política de cancelación vigente del complejo. Consultanos por WhatsApp o desde el panel de reservas.',
    sortOrder: 3,
  },
  {
    question: '¿Qué medios de pago aceptan?',
    answer:
      'La seña se paga online con Mercado Pago. El saldo puede abonarse en el complejo según los medios disponibles.',
    sortOrder: 4,
  },
  {
    question: '¿Necesito ser socio?',
    answer:
      'No. Cualquier persona puede reservar. La reserva se confirma una vez acreditada la seña.',
    sortOrder: 5,
  },
];

export const DEFAULT_PROMOTIONS = [
  {
    title: '2x1 los martes',
    description: 'Reservá dos horas seguidas los martes y pagá una. Sujeto a disponibilidad.',
    badge: 'Promo',
    sortOrder: 1,
  },
  {
    title: 'Mañana temprano',
    description: 'Tarifa reducida para turnos antes de las 10:00 de lunes a viernes.',
    badge: 'Ahorro',
    sortOrder: 2,
  },
  {
    title: 'Grupo fijo',
    description: 'Reservá el mismo horario todas las semanas y asegurá tu cancha.',
    badge: 'Mensual',
    sortOrder: 3,
  },
];

/** Horarios de apertura por defecto (weekday 0 = domingo). */
export const DEFAULT_SCHEDULES = [
  { weekday: 1, opensAt: '08:00', closesAt: '23:00', slotMinutes: 60 },
  { weekday: 2, opensAt: '08:00', closesAt: '23:00', slotMinutes: 60 },
  { weekday: 3, opensAt: '08:00', closesAt: '23:00', slotMinutes: 60 },
  { weekday: 4, opensAt: '08:00', closesAt: '23:00', slotMinutes: 60 },
  { weekday: 5, opensAt: '08:00', closesAt: '23:00', slotMinutes: 60 },
  { weekday: 6, opensAt: '09:00', closesAt: '22:00', slotMinutes: 60 },
  { weekday: 0, opensAt: '09:00', closesAt: '22:00', slotMinutes: 60 },
];

/** Tarifas por defecto (centavos ARS), alineadas con la cartelera pública. */
export const DEFAULT_PRICING = [
  { label: 'Mañana', startTime: '08:00', endTime: '12:00', weekday: null, priceCents: 800000 },
  { label: 'Tarde', startTime: '12:00', endTime: '19:00', weekday: null, priceCents: 1000000 },
  { label: 'Noche', startTime: '19:00', endTime: '23:00', weekday: null, priceCents: 1200000 },
];
