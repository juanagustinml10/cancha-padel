# Home Redesign — Versión Sencilla y Responsiva

## Objetivo
Rediseño de la HomePage enfocado en:
- **Menos scroll** - información esencial en una sola vista
- **Enfoque en reservas** - el usuario puede reservar en 1 clic
- **Primero móvil** - la mayoría de usuarios están en teléfono
- **Compacta** - solo los datos necesarios

## Cambios Clave

### HomePage.tsx — Nueva estructura
- **Header**: Solo título y subtítulo centrado
- **Estadísticas rápidas**: 4 tarjetas en grid responsivo (canchas, horario, precio, ubicación)
- **Reserva principal**: Call-to-action destacado para reservar cancha
- **Canchas destacadas**: Solo 3 cards si hay datos disponibles, debajo de la reserva

### Diseño Responsivo
- `p-4 sm:p-6` - padding que crece en desktop
- `grid-cols-2 sm:grid-cols-4` - estadísticas van de 2 en móvil a 4 en desktop
- `max-w-2xl mx-auto` - el formulario de reserva centrado y limitado de ancho
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` - las canchas se adaptan

## Estado Verificado
- ✅ `npm run typecheck:web` — Pasa
- ✅ `npm run build:web` — Compila exitoso
- ✅ `npm run lint:web` — 0 advertencias

## Diferencia con la versión anterior
| Aspecto | Versión Anterior | Nueva Versión |
|---------|-----------------|---------------|
| Scroll | Largo, muchas secciones | Mínimo, contenido esencial |
| Enfoque | Información general | Reservar turnos |
| Mobile | Decente, pero largo | **Primero móvil, optimizado** |
| Components | Muchas secciones | 4 cards + header + reserva |
| CTA | Más abajo | **Visible al instante** |

## Próximos Pasos Sugeridos
1. Probar en dispositivo móvil (`npm run dev:web` y abrir en phone)
2. Ajustar el texto y colores si es necesario
3. Integrar con el flujo de reserva real
4. Verificar en desktop también se ve bien