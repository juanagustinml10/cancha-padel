import type { ClubInfo, Faq, GalleryImage, Promotion } from '@padel/shared';

/**
 * Contenido de demostración del club.
 * Estos valores son PLACEHOLDER: deben reemplazarse por los datos comerciales reales
 * (ver README, "Datos comerciales que faltan definir"). Se usa como respaldo cuando la
 * API todavía no está conectada y como semilla del backend simulado.
 */

export const DEMO_CLUB: ClubInfo = {
  name: 'PADEL CLUB',
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
  depositMode: 'percent',
  depositPercent: 30,
  depositFixedAmountCents: 500000,
  bookingHoldMinutes: 20,
  currency: 'ARS',
  timezone: 'America/Argentina/Buenos_Aires',
};

export const DEMO_SERVICES = [
  {
    id: 'svc-courts',
    title: 'Canchas premium',
    description: 'Superficie profesional, cerramiento completo y luces LED para jugar de noche.',
  },
  {
    id: 'svc-booking',
    title: 'Reserva online',
    description: 'Elegí día, horario y cancha en pocos pasos. Confirmación con seña segura.',
  },
  {
    id: 'svc-amenities',
    title: 'Comodidades',
    description: 'Vestuarios, estacionamiento, cantina y alquiler de palas y pelotas.',
  },
  {
    id: 'svc-classes',
    title: 'Clases y torneos',
    description: 'Escuelita, entrenamientos y torneos internos durante todo el año.',
  },
] as const;

export const DEMO_FEATURES = [
  'Canchas indoor y outdoor',
  'Iluminación LED profesional',
  'Vestuarios y duchas',
  'Cantina y zona de descanso',
  'Estacionamiento propio',
  'Alquiler de equipamiento',
  'Wi-Fi libre',
  'Accesibilidad',
] as const;

export const DEMO_GALLERY: GalleryImage[] = [
  { id: 'g1', url: '', alt: 'Cancha de pádel con iluminación nocturna', sortOrder: 1 },
  { id: 'g2', url: '', alt: 'Detalle de la red y superficie de juego', sortOrder: 2 },
  { id: 'g3', url: '', alt: 'Zona de descanso y cantina', sortOrder: 3 },
  { id: 'g4', url: '', alt: 'Vestuarios del complejo', sortOrder: 4 },
  { id: 'g5', url: '', alt: 'Vista general de las canchas', sortOrder: 5 },
  { id: 'g6', url: '', alt: 'Jugadores en pleno partido', sortOrder: 6 },
];

export const DEMO_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    title: '2x1 los martes',
    description: 'Reservá dos horas seguidas los martes y pagá una. Sujeto a disponibilidad.',
    badge: 'Promo',
    isActive: true,
  },
  {
    id: 'promo-2',
    title: 'Mañana temprano',
    description: 'Tarifa reducida para turnos antes de las 10:00 de lunes a viernes.',
    badge: 'Ahorro',
    isActive: true,
  },
  {
    id: 'promo-3',
    title: 'Grupo fijo',
    description: 'Reservá el mismo horario todas las semanas y asegurá tu cancha.',
    badge: 'Mensual',
    isActive: true,
  },
];

export const DEMO_FAQS: Faq[] = [
  {
    id: 'faq-1',
    question: '¿Cómo reservo una cancha?',
    answer:
      'Ingresá a "Reservar", elegí la fecha, la duración y el horario disponible, completá tus datos y pagá la seña online para confirmar.',
  },
  {
    id: 'faq-2',
    question: '¿Qué es la seña y cuánto se paga?',
    answer:
      'La seña es un pago parcial que asegura tu reserva. El porcentaje es configurable y se muestra siempre antes de pagar. El saldo se abona en el complejo.',
  },
  {
    id: 'faq-3',
    question: '¿Puedo cancelar o reprogramar?',
    answer:
      'Sí. Las condiciones dependen de la política de cancelación vigente del complejo. Consultanos por WhatsApp o desde el panel de reservas.',
  },
  {
    id: 'faq-4',
    question: '¿Qué medios de pago aceptan?',
    answer:
      'Podés señar con Mercado Pago (la reserva se confirma automáticamente al acreditarse) o con transferencia bancaria y efectivo, que confirma el club de forma manual. Al elegir transferencia te mostramos los datos bancarios para transferir la seña y hacer el seguimiento con tu código de reserva.',
  },
  {
    id: 'faq-5',
    question: '¿Necesito ser socio?',
    answer:
      'No. Cualquier persona puede reservar. La reserva se confirma una vez acreditada la seña.',
  },
];
