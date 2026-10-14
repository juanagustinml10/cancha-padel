# Especificación funcional — PADEL CLUB

> Estado del documento: **borrador de planificación (Etapa 0)**.
> Este documento describe el comportamiento esperado del sistema. No implica que las
> funcionalidades estén implementadas.

## 1. Alcance

Plataforma web para la gestión integral de un complejo de pádel:

- **Sitio público**: información del complejo, canchas, precios, galería, reservas online y
  consulta de estado de reserva.
- **Sistema de reservas online** con pago de seña mediante Mercado Pago.
- **Panel administrativo privado** para propietario y personal.

Fuera de alcance inicial (documentado como evolución futura): torneos y ligas, clases con
profesores, membresías/facturación periódica, app móvil nativa, integración contable.

El nombre **PADEL CLUB** es provisional y debe centralizarse como variable de configuración
(`VITE_APP_NAME` / `CLUB_NAME`) para reemplazo sin cambios de código.

## 2. Actores y roles

| Rol | Descripción | Alcance |
|-----|-------------|---------|
| Visitante | Usuario no autenticado del sitio público | Ver información, consultar disponibilidad, iniciar reserva |
| Cliente | Persona que reserva (no necesariamente con cuenta) | Reservar, pagar seña, consultar estado de su reserva |
| Recepción | Personal operativo | Gestionar reservas y clientes del día a día |
| Administrador | Propietario / encargado | Acceso completo, configuración, reportes, usuarios |

Decisión: el cliente **no requiere crear cuenta** en la primera etapa. La consulta de su reserva
se realiza mediante **código de reserva + email**. Se documenta la posibilidad de cuentas de
cliente en `modelo-datos.md` como evolución.

## 3. Sitio público

### 3.1 Secciones

- **Inicio**: hero, llamada a la acción "Reservar", resumen de servicios.
- **El complejo**: descripción, comodidades, ubicación.
- **Canchas**: listado de canchas con características (tipo indoor/outdoor, superficie,
  iluminación).
- **Galería**: imágenes del complejo (contenido gestionable).
- **Horarios y precios**: franjas horarias y tarifas vigentes.
- **Reservas online**: flujo completo de reserva (sección 4).
- **Consultar reserva**: ingreso de código + email para ver estado.
- **Preguntas frecuentes**: acordeón.
- **Contacto**: datos de contacto, ubicación/mapa y acceso directo a WhatsApp.

### 3.2 Identidad visual

Paleta oficial (tokens centralizados en `frontend/src/styles/tokens.css` o equivalente):

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-white` | `#FFFFFF` | Fondo predominante |
| `--color-navy` | `#163B65` | Identidad, encabezados |
| `--color-primary` | `#246DB3` | Botones, enlaces, acciones |
| `--color-accent` | `#4A90D9` | Acciones importantes / destacados |
| `--color-blue-50` | `#EAF3FB` | Fondos secundarios, tarjetas |
| `--color-border` | `#E5E7EB` | Bordes |
| `--color-text-secondary` | `#64748B` | Textos secundarios |
| `--color-text` | `#374151` | Textos principales |

Reglas: estética minimalista, moderna, elegante y deportiva. El blanco predomina; sin verde como
color principal, sin neones, sin degradados excesivos. Los tokens se exponen además a Tailwind
CSS (`tailwind.config.ts`) para uso consistente.

## 4. Flujo de reserva online

1. El cliente elige **fecha**, **cancha** (o "cualquiera disponible") y **duración**
   (configurable, p. ej. 60/90/120 min).
2. El sistema consulta disponibilidad **contra el backend** (`GET /availability`).
3. El cliente selecciona un horario disponible.
4. El cliente ingresa sus datos (nombre, email, teléfono, notas opcionales).
5. El backend **recalcula el precio** (nunca confía en el cliente) según la regla de precios
   vigente y el porcentaje/monto de seña configurado.
6. Se crea la reserva en estado `PENDING_PAYMENT` con un **código único** y un **vencimiento**
   (`expires_at`) configurable.
7. El backend crea una **preferencia de pago** en Mercado Pago y devuelve el `init_point`.
8. El cliente paga la seña en el checkout de Mercado Pago.
9. Mercado Pago notifica al backend vía **webhook**; el backend **verifica el pago** contra la API
   de Mercado Pago y confirma la reserva de forma **idempotente**.
10. El cliente vuelve a la página de éxito, que **solo muestra el estado** consultado al backend
    (la vuelta a la página de éxito no confirma nada por sí sola).

El detalle técnico del flujo de pagos está en `arquitectura.md` (sección Mercado Pago).

## 5. Gestión de reservas

- **Reserva online**: creada por el cliente (sección 4).
- **Reserva manual (recepción)**: creada desde el panel; bloquea disponibilidad igual que una
  reserva online y puede quedar confirmada sin pago online (pago en mostrador registrado
  aparte).
- **Bloqueos**: por mantenimiento, eventos o uso interno. Impiden disponibilidad en el rango.
- **Cancelación**: por cliente (según política configurable) o por personal. Libera el horario.
- **No show (ausencia)**: el personal marca la reserva; queda registrada para reportes.
- **Vencimiento**: las reservas `PENDING_PAYMENT` que superan `expires_at` pasan
  automáticamente a `EXPIRED` y liberan el horario.

## 6. Administración

- **Inicio de sesión** con credenciales; sesión segura por cookie.
- **Panel de indicadores**: reservas del día, ocupación, ingresos de seña/pagos, pendientes.
- **Calendario** diario, semanal y mensual con vista por cancha.
- **Canchas**: alta, baja, modificación, estado (activa/inactiva/mantenimiento).
- **Horarios**: apertura/cierre por día de la semana y excepciones.
- **Precios**: tarifas por cancha, franja y duración; historial de vigencia.
- **Bloqueos**: creación y gestión de rangos no reservables.
- **Reservas**: alta manual, cambio de estado, cancelación, reprogramación.
- **Clientes**: ficha básica, historial de reservas.
- **Pagos**: listado, conciliación, reintegros.
- **Reportes**: reservas e ingresos por período; exportación.
- **Historial de acciones (audit log)**: registro de operaciones administrativas sensibles.

## 7. Reglas de negocio (obligatorias)

1. Una cancha **no puede tener dos reservas activas superpuestas** (se superponen si sus
   intervalos `[inicio, fin)` se solapan).
2. Las reservas manuales **bloquean disponibilidad** igual que las online.
3. La disponibilidad se **comprueba siempre en el backend**.
4. El sistema **previene duplicados concurrentes** (dos intentos simultáneos): garantía a nivel
   de base de datos (ver `modelo-datos.md`, restricción de exclusión).
5. Reservas `PENDING_PAYMENT` tienen **vencimiento configurable**.
6. El **importe de la seña** es configurable (porcentaje o monto fijo).
7. Precios y condiciones aplicadas se guardan como **copia inmutable** en la reserva
   (snapshot), para que cambios futuros de tarifas no alteren reservas existentes.
8. Una reserva **no se confirma** por volver a una página de éxito.
9. Los pagos se **verifican en el servidor** contra Mercado Pago.
10. Las operaciones administrativas importantes quedan **registradas** (auditoría).
11. La **zona horaria** se define explícitamente para Argentina
    (`America/Argentina/Buenos_Aires`, UTC-3, sin horario de verano) y se aplica de forma
    consistente en almacenamiento y cálculo.
12. Ninguna **credencial privada** se expone en el frontend.
13. Los **permisos se validan en el backend**, no solo ocultando botones en la UI.

## 8. Requisitos no funcionales

- **Seguridad**: hash de contraseñas con `argon2id`, cookies `HttpOnly`/`Secure`/`SameSite`, CSRF,
  rate limiting, validación Zod, verificación de firma de webhooks.
- **Mantenibilidad**: TypeScript estricto, monorepo, capa de dominio separada, esquemas Zod
  compartidos, tokens de diseño centralizados.
- **Testabilidad**: Vitest (unitario/integración), Supertest (API), Playwright (E2E).
- **Observabilidad**: logs estructurados (pino), registro de errores, audit log.
- **Accesibilidad**: contraste acorde a la paleta, navegación por teclado, labels ARIA.
- **Rendimiento**: respuesta de disponibilidad < 300 ms en condiciones normales; índices en
  consultas de solapamiento.

## 9. Configuración editable (no hardcodeada)

- Nombre comercial y datos de contacto.
- Cantidad y características de canchas.
- Horarios de apertura por día.
- Precios por franja/duración.
- Porcentaje/monto de seña y vencimiento de reservas pendientes.
- Política de cancelación.
- Credenciales de Mercado Pago (por entorno, vía variables de entorno).

## 10. Criterios de aceptación (extracto)

- No es posible crear una reserva que se solape con otra activa, ni siquiera con concurrencia.
- El precio mostrado coincide siempre con el recalculado en el servidor.
- Una reserva se confirma solo tras verificación server-side del pago en Mercado Pago.
- El webhook es idempotente ante notificaciones repetidas.
- Un usuario con rol Recepción no puede acceder a funciones exclusivas de Administrador aunque
  conozca la URL o manipule las peticiones.
- Las reservas vencidas liberan el horario automáticamente.

Ver documentos relacionados: `arquitectura.md`, `modelo-datos.md`, `api.md`, `pruebas.md`.
