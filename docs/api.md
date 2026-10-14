# API — PADEL CLUB

> **Implementado (Etapa 2).** Backend en `apps/api` (Express + TypeScript + Prisma + PostgreSQL).
> Este documento es el contrato vigente; ver `apps/api/src/routes/*` para la implementación.

Base: `/api/v1`. Formato JSON. Autenticación por cookie de sesión (`sid`), `HttpOnly`.
Errores uniformes: `{ "error": { "code": "STRING", "message": "…", "details"?: … } }`.

Códigos HTTP: 200/201 OK · 400 validación · 401 no autenticado · 403 sin permiso · 404 no
encontrado · 409 conflicto (solapamiento/estado) · 422 regla de negocio · 429 rate limit · 500.

## 0. CSRF

Todas las peticiones **mutating** (`POST`/`PUT`/`PATCH`/`DELETE`) requieren la cabecera
`x-csrf-token` con el mismo valor que la cookie `csrf` (double-submit, cookie legible por JS).

- Cualquier respuesta establece la cookie `csrf` si no existía.
- `GET /api/v1/csrf` fuerza la emisión y devuelve `{ "token": "…" }` (útil para inicializar antes
  de la primera petición mutating).
- Sin token válido → **403** `CSRF_INVALID`.
- El webhook `/webhooks/mercadopago` está exento (se autentica por firma del proveedor).

## 1. Público (sin autenticación)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/csrf` | Emite/devuelve el token CSRF |
| GET | `/club` | Información y configuración pública del club |
| GET | `/courts` | Canchas activas con características |
| GET | `/courts/:id` | Detalle de cancha |
| GET | `/pricing?courtId&date` | Tarifas vigentes aplicables |
| GET | `/availability?date=&courtId=&duration=` | Horarios disponibles (calculado en backend) |
| POST | `/bookings` | Crear reserva → estado `PENDING_PAYMENT` |
| GET | `/bookings/:code?email=` | Consulta de estado (código + email) |
| POST | `/bookings/:code/checkout` | Crear preferencia MP y devolver `init_point` |
| GET | `/faqs` | Preguntas frecuentes |
| POST | `/contact` | Enviar mensaje de contacto (rate limited) |
| POST | `/webhooks/mercadopago` | Webhook de Mercado Pago (firma verificada) |

### 1.1 `POST /bookings` — creación

Request:
```json
{
  "courtId": "uuid",
  "startsAt": "2026-03-10T18:00:00-03:00",
  "durationMinutes": 90,
  "paymentMethod": "MERCADOPAGO",
  "customer": { "fullName": "…", "email": "…", "phone": "…" },
  "notes": "opcional"
}
```
`paymentMethod` ∈ `MERCADOPAGO | CASH | TRANSFER` (por defecto `MERCADOPAGO`). El backend: valida
solapamiento, recalcula precio y seña, crea `Customer` (upsert), crea `Booking` con `expiresAt`.
Responde 201 con `code`, `startsAt`, `endsAt`, `priceTotalCents`, `depositAmountCents`,
`expiresAt`. Si el horario ya no está libre → **409**.

Con `CASH` o `TRANSFER` la reserva queda `PENDING_PAYMENT` y se crea un pago `MANUAL` `PENDING`
que **solo el staff confirma** (ver §3.8). No se cobra online.

### 1.2 `POST /bookings/:code/checkout`
Crea la preferencia de pago en MP y devuelve `{ initPoint, sandboxInitPoint }`. Requiere
`email` del titular como verificación. **Idempotente**: mientras exista un intento pendiente
con preferencia vigente, se reutiliza (se recupera un `init_point` nuevo vía la API) en lugar
de crear otra preferencia.

> Si Mercado Pago no está configurado (`MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` ausentes), el
> proveedor activo es `fake` y el endpoint responde **503** `PAYMENTS_DISABLED`. **Nunca** se
> simula un pago aprobado.

Las URLs de retorno se construyen como `${APP_BASE_URL}/reserva/<código>` salvo que se definan
`MP_SUCCESS_URL` / `MP_FAILURE_URL` / `MP_PENDING_URL`.

### 1.3 `GET /bookings/:code`
Devuelve estado actual (`status`, montos, horario). **Es la única fuente de verdad del estado**;
la página de retorno de MP no confirma nada.

### 1.4 `POST /webhooks/mercadopago`
- Verifica la firma `x-signature` (HMAC-SHA256) usando el manifiesto oficial y `MP_WEBHOOK_SECRET`.
- Registra el evento crudo (auditoría) y deduplica por `eventId` cuando existe.
- Consulta el pago real en la API de MP (nunca confía en el cuerpo del webhook).
- Valida moneda, importe y `external_reference` contra la reserva.
- Aplica la lógica de dominio: confirma la reserva sólo si el pago está aprobado y es válido.
- Ante importe/moneda distinta o **pago tardío** (reserva vencida/cancelada) marca el pago
  como `requiresReview` y **no** confirma ni reasigna la cancha.
- Es idempotente y tolera notificaciones **fuera de orden** (un pago aprobado no retrocede).
- Errores transitorios del proveedor se agendan para reintento (worker), con backoff.
- Responde 200 aun si es repetido (para evitar reintentos infinitos de MP); 401 si la firma es inválida.

## 2. Autenticación (staff)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/auth/login` | público | Inicia sesión (rate limited) |
| POST | `/auth/logout` | autenticado | Cierra sesión |
| GET | `/auth/me` | autenticado | Usuario y rol actuales |

## 3. Administración

Todos bajo `/admin/*`, requieren sesión y rol autorizado. **Recepción** tiene acceso operativo
limitado; **Admin** acceso total. La autorización se aplica en el backend por ruta.

### 3.1 Panel

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/admin/dashboard` | ADMIN, RECEPTION | Indicadores del período |

### 3.2 Canchas

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/courts` | ADMIN, RECEPTION |
| POST | `/admin/courts` | ADMIN |
| PATCH | `/admin/courts/:id` | ADMIN |
| DELETE | `/admin/courts/:id` | ADMIN |

### 3.3 Horarios

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/schedules` | ADMIN, RECEPTION |
| PUT | `/admin/schedules` | ADMIN |

### 3.4 Precios

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/pricing` | ADMIN, RECEPTION |
| POST | `/admin/pricing` | ADMIN |
| PATCH | `/admin/pricing/:id` | ADMIN |
| DELETE | `/admin/pricing/:id` | ADMIN |

### 3.5 Bloqueos

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/blocks` | ADMIN, RECEPTION |
| POST | `/admin/blocks` | ADMIN, RECEPTION |
| DELETE | `/admin/blocks/:id` | ADMIN, RECEPTION |

### 3.6 Reservas

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/admin/bookings?from&to&courtId&status&paymentMethod` | ADMIN, RECEPTION | Listado/calendario |
| POST | `/admin/bookings` | ADMIN, RECEPTION | Reserva manual |
| PATCH | `/admin/bookings/:id` | ADMIN, RECEPTION | Cambiar estado y/u observaciones |
| POST | `/admin/bookings/:id/cancel` | ADMIN, RECEPTION | Cancelar (motivo obligatorio) |
| POST | `/admin/bookings/:id/no-show` | ADMIN, RECEPTION | Marcar ausencia |

`PATCH /admin/bookings/:id` acepta `{ status?, notes? }`. Permite cambiar el estado y editar las
**observaciones internas** (`notes`, hasta 1000 caracteres). No permite reprogramar (cambiar
cancha u horario) para no romper la garantía anti-solapamiento; para eso se cancela y se crea
una nueva reserva. Cada cambio queda auditado (`booking.update` / `booking.notes`).

### 3.7 Clientes

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/customers` | ADMIN, RECEPTION |
| GET | `/admin/customers/:id` | ADMIN, RECEPTION |
| PATCH | `/admin/customers/:id` | ADMIN, RECEPTION |

### 3.8 Pagos

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/admin/payments` | ADMIN, RECEPTION | Listado/conciliación. Filtros: `status`, `provider=MANUAL\|MERCADOPAGO`, `needsReview=true` |
| POST | `/admin/payments/manual` | ADMIN, RECEPTION | Registrar pago manual (efectivo/transferencia) |
| POST | `/admin/payments/:id/confirm` | ADMIN, RECEPTION | Confirmar pago manual pendiente (`PENDING` → `APPROVED`) |
| POST | `/admin/payments/:id/reject` | ADMIN, RECEPTION | Rechazar pago manual pendiente (motivo opcional) |
| POST | `/admin/payments/:id/refund` | ADMIN | Reintegro |

`GET /admin/bookings` filtra por medio de pago con `paymentMethod` ∈ `MERCADOPAGO | CASH | TRANSFER`.

Los pagos con `requiresReview` (importe/moneda distinta o pago tardío) se listan con su
`reviewReason` y se filtran con `?needsReview=true` para su resolución manual.

Cada pago del listado se enriquece con datos de la reserva (`bookingCode`, `customerName`,
`bookingStatus`, `bookingPriceTotalCents`, `bookingDepositAmountCents`,
`bookingPaidAmountCents`) y `reference` (identificador del proveedor o detalle del pago manual).

`POST /admin/payments/manual` registra un cobro fuera de Mercado Pago:
```json
{ "bookingId": "uuid", "amountCents": 600000, "method": "CASH", "reference": "opcional", "note": "opcional" }
```
`method` ∈ `CASH | TRANSFER | OTHER`. El pago se crea como proveedor `MANUAL`, estado
`APPROVED`. Si la reserva estaba `PENDING_PAYMENT` y el total pagado alcanza la seña, la reserva
pasa a `CONFIRMED`. Solo se admite sobre reservas `PENDING_PAYMENT` o `CONFIRMED` (si no →
**409** `BOOKING_NOT_PAYABLE`). Queda auditado como `payment.manual`.

Cuando el cliente reserva con `CASH` o `TRANSFER`, el backend ya crea un pago `MANUAL` `PENDING`
(no cobrado). El staff lo resuelve con `POST /admin/payments/:id/confirm` (pasa a `APPROVED` y
actualiza la reserva) o `POST /admin/payments/:id/reject` (pasa a `REJECTED`, con `{ "reason"?:
"..." }`; la reserva sigue pendiente). Ambos quedan auditados (`payment.confirm` / `payment.reject`)
y solo aplican a pagos `MANUAL` en `PENDING`.

`POST /admin/payments/:id/refund` sobre un pago `MANUAL` solo asienta el estado (`REFUNDED`),
sin llamada al proveedor; para pagos de Mercado Pago ejecuta el reintegro real.

### 3.9 Configuración y usuarios

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/settings` | ADMIN |
| PUT | `/admin/settings` | ADMIN |
| GET | `/admin/audit-logs` | ADMIN |
| GET | `/admin/users` | ADMIN |
| POST | `/admin/users` | ADMIN |
| PATCH | `/admin/users/:id` | ADMIN |

### 3.10 Reportes

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/admin/reports/bookings?from&to` | ADMIN |
| GET | `/admin/reports/revenue?from&to` | ADMIN |

`GET /admin/reports/bookings` devuelve reservas **reportadas para cobro**:
`collectedCents` (pagos `APPROVED` con `paidAt` en el rango), `reservedCents` (señas de reservas
`CONFIRMED`/`COMPLETED`), `completedBookings`, desglose por cancha (`byCourt`: `collectedCents`,
`reservedCents`, `occupiedMinutes`, `totalMinutes`, `occupancyRate`) y por medio de pago
(`byPaymentMethod`). La **ocupación** usa como denominador un horario fijo de 15 h por cancha y
día (`DAILY_OPEN_MINUTES`), consistente con el dashboard; las reservas canceladas no ocupan.

`GET /admin/reports/revenue?from&to` conserva el detalle por día/proveedor de lo efectivamente
cobrado (pagos `APPROVED`).

## 4. Matriz de permisos (resumen)

| Recurso / acción | Visitante | Recepción | Admin |
|------------------|:---------:|:---------:|:-----:|
| Ver sitio público | ✅ | ✅ | ✅ |
| Consultar disponibilidad | ✅ | ✅ | ✅ |
| Crear reserva online | ✅ | ✅ | ✅ |
| Ver reservas (panel) | ❌ | ✅ | ✅ |
| Crear reserva manual | ❌ | ✅ | ✅ |
| Cancelar reserva | ❌ | ✅ | ✅ |
| Marcar no-show | ❌ | ✅ | ✅ |
| Gestionar clientes | ❌ | ✅ | ✅ |
| Ver pagos | ❌ | ✅ | ✅ |
| Gestionar canchas | ❌ | ❌ | ✅ |
| Horarios y precios | ❌ (solo lectura pública) | lectura | ✅ |
| Bloqueos | ❌ | ✅ | ✅ |
| Reintegros | ❌ | ❌ | ✅ |
| Configuración del club | ❌ | ❌ | ✅ |
| Usuarios del sistema | ❌ | ❌ | ✅ |
| Auditoría | ❌ | ❌ | ✅ |
| Reportes | ❌ | ❌ | ✅ |

> La matriz se aplica con middleware de autorización en el backend. El frontend oculta acciones
> no permitidas como mejora de UX, nunca como control de seguridad.

## 5. Convenciones

- Fechas en ISO 8601 con offset; el backend interpreta en `America/Argentina/Buenos_Aires`.
- Paginación: `?page&pageSize` con respuesta `{ data, meta: { page, pageSize, total } }`.
- Filtros de fecha en calendario usan zona del club.
- Versionado por prefijo de ruta (`/v1`).
- `Idempotency-Key` opcional en `POST /bookings` y checkout (evolución).
