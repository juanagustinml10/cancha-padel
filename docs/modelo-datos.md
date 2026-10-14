# Modelo de datos — PADEL CLUB

> **Implementado (Etapa 2).** Esquema real en `apps/api/prisma/schema.prisma`.
> Motor: PostgreSQL. ORM: Prisma. Ver §7 para equivalencias y desvíos respecto de esta propuesta.

## 1. Diagrama entidad-relación (conceptual)

```
User (staff/admin) 1---* AuditLog
User 1---* Session

Customer 1---* Booking

Court 1---* CourtSchedule        (franjas de apertura)
Court 1---* PricingRule          (tarifas)
Court 1---* CourtBlock           (mantenimiento/eventos)
Court 1---* Booking
Court *---* GalleryImage         (opcional: imágenes por cancha)

Booking 1---* Payment
Booking *---1 PricingRule        (regla aplicada; snapshot inmutable)
Booking *---1 Customer

Setting (clave/valor)            (configuración del club: seña, vencimiento, etc.)
```

## 2. Entidades y campos

Convenciones: `id` = `uuid` (o `cuid`), timestamps `createdAt`/`updatedAt`, fechas en
`timestamptz`. Dinero en **enteros de centavos** (`BigInt`/`Int`) con moneda ISO (`ARS`).

### 2.1 User (personal)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| email | text unique | login |
| passwordHash | text | argon2id |
| fullName | text | |
| role | enum `Role` | ADMIN, RECEPTION |
| isActive | boolean | baja lógica |
| lastLoginAt | timestamptz? | |
| createdAt / updatedAt | timestamptz | |

### 2.2 Session

| Campo | Tipo | Notas |
|-------|------|-------|
| id | text PK | identificador aleatorio (sid) |
| userId | uuid FK → User | |
| expiresAt | timestamptz | |
| ip | text? | |
| userAgent | text? | |
| createdAt | timestamptz | |

### 2.3 Customer

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| fullName | text | |
| email | text | identificador de consulta |
| phone | text | |
| notes | text? | |
| createdAt / updatedAt | timestamptz | |
| `@@unique([email, phone])` | | evita duplicados obvios; ajustar según negocio |

> Por defecto el cliente no tiene login. La consulta de reserva valida **código + email**.

### 2.4 Court

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| name | text | p. ej. "Cancha 1" |
| type | enum `CourtType` | INDOOR, OUTDOOR |
| surface | text? | |
| hasLighting | boolean | |
| status | enum `CourtStatus` | ACTIVE, INACTIVE, MAINTENANCE |
| sortOrder | int | orden en UI |
| description | text? | |
| createdAt / updatedAt | timestamptz | |

### 2.5 CourtSchedule (horarios de apertura)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| courtId | uuid FK → Court? | null = aplica a todas (global) |
| weekday | int | 0=domingo .. 6=sábado |
| opensAt | time | en zona del club |
| closesAt | time | |
| slotMinutes | int | granularidad de turnos |
| isActive | boolean | |

> Excepciones puntuales (feriados, eventos) pueden modelarse como `CourtBlock` o una tabla
> `ScheduleException` (evolución).

### 2.6 PricingRule (tarifas)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| courtId | uuid FK → Court? | null = todas |
| weekday | int? | null = todos los días |
| startTime | time | inicio de franja |
| endTime | time | fin de franja |
| durationMinutes | int | duración del turno |
| priceCents | int | precio total del turno |
| currency | text | `ARS` |
| validFrom | timestamptz | vigencia |
| validTo | timestamptz? | |
| isActive | boolean | |
| priority | int | desempate si varias reglas aplican |

La selección de tarifa usa reglas vigentes, por cancha, franja y duración, con desempate por
`priority` (la más específica gana).

### 2.7 CourtBlock (bloqueos)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| courtId | uuid FK → Court | null = todas |
| startsAt | timestamptz | |
| endsAt | timestamptz | |
| reason | text | mantenimiento / evento / interno |
| createdById | uuid FK → User | |
| createdAt | timestamptz | |

> Los bloqueos participan de la misma lógica de no-solapamiento que las reservas activas.

### 2.8 Booking (reserva)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| code | text unique | código público (p. ej. `PC-XXXXXX`) |
| courtId | uuid FK → Court | |
| customerId | uuid FK → Customer | |
| pricingRuleId | uuid FK → PricingRule? | regla aplicada |
| startsAt | timestamptz | |
| endsAt | timestamptz | |
| durationMinutes | int | |
| status | enum `BookingStatus` | ver §3 |
| source | enum `BookingSource` | ONLINE, ADMIN |
| priceTotalCents | int | snapshot |
| depositAmountCents | int | snapshot |
| currency | text | snapshot |
| pricingSnapshot | jsonb | copia inmutable de la regla aplicada |
| notes | text? | |
| expiresAt | timestamptz? | solo `PENDING_PAYMENT` |
| confirmedAt | timestamptz? | |
| cancelledAt | timestamptz? | |
| cancelledBy | uuid FK → User? | |
| cancellationReason | text? | |
| createdById | uuid FK → User? | null si es online |
| createdAt / updatedAt | timestamptz | |

Restricción clave (ver `arquitectura.md` ADR-04):

```sql
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('PENDING_PAYMENT','CONFIRMED'))
```

Índices: `(court_id, starts_at)`, `(status, expires_at)`, `(customer_id)`, `(code)`.

### 2.9 Payment

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| bookingId | uuid FK → Booking | |
| provider | enum `PaymentProvider` | `MERCADOPAGO` (ver §7.2) |
| providerPaymentId | text unique? | id del pago en MP (idempotencia) |
| providerPreferenceId | text? | id de la preferencia |
| method | text? | tarjeta, etc. |
| amountCents | int | |
| currency | text | |
| status | enum `PaymentStatus` | ver §4 |
| statusDetail | text? | |
| rawPayload | jsonb? | respuesta de MP (auditable) |
| paidAt | timestamptz? | |
| refundedAt | timestamptz? | |
| requiresReview | boolean | pago que requiere intervención manual (default `false`) |
| reviewReason | text? | motivo legible (importe/moneda/pago tardío) |
| reviewedAt | timestamptz? | |
| createdAt / updatedAt | timestamptz | |

`providerPaymentId` es **unique** para garantizar idempotencia del webhook.

### 2.10 GalleryImage

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| url | text | |
| alt | text? | accesibilidad |
| courtId | uuid FK → Court? | opcional |
| sortOrder | int | |

### 2.11 Setting (configuración del club)

Clave/valor tipado (JSONB) para: `club_name`, `deposit_mode`, `deposit_percent`,
`deposit_fixed_amount`, `booking_hold_minutes`, `cancellation_policy`, `contact_*`, etc.
Permite cambiar reglas sin recompilar.

| Campo | Tipo |
|-------|------|
| key | text PK |
| value | jsonb |
| updatedAt | timestamptz |

### 2.12 AuditLog

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| actorId | uuid FK → User? | |
| action | text | p. ej. `booking.cancel` |
| entity | text | `Booking`, `Court`, ... |
| entityId | text? | |
| diff | jsonb? | antes/después |
| ip | text? | |
| userAgent | text? | |
| createdAt | timestamptz | |

## 3. Estados y transiciones — Booking

```
                 +-------------------+
   crear online  |  PENDING_PAYMENT  |
  -------------->|  (expires_at)     |
                 +-------------------+
                    |            |
        pago OK     |            |  vence / cancela
        (webhook)   v            v
                 +-----------+  +---------+
                 | CONFIRMED |  | EXPIRED |
                 +-----------+  +---------+
                  |   |   |
     pasa el turno|   |   | cancelación
                  v   |   v
             +-----------+  +-----------+
             | COMPLETED |  | CANCELLED |
             +-----------+  +-----------+
                  |
        no asistió|
                  v
             +---------+
             | NO_SHOW |
             +---------+
```

| Desde | Hacia | Disparador |
|-------|-------|-----------|
| (nuevo) | PENDING_PAYMENT | Cliente crea reserva online |
| PENDING_PAYMENT | CONFIRMED | Pago de seña verificado en MP |
| PENDING_PAYMENT | EXPIRED | Se supera `expires_at` (job) |
| PENDING_PAYMENT | CANCELLED | Cliente/personal cancela |
| CONFIRMED | COMPLETED | Finaliza el turno |
| CONFIRMED | CANCELLED | Cancelación autorizada |
| CONFIRMED | NO_SHOW | Personal marca ausencia |
| CANCELLED/EXPIRED | — | Estado final |
| COMPLETED/NO_SHOW | — | Estado final |

Reservas manuales (`source=ADMIN`) nacen directamente `CONFIRMED` (o `PENDING_PAYMENT` si se
registra seña pendiente, configurable).

Solo los estados **PENDING_PAYMENT** y **CONFIRMED** cuentan para el no-solapamiento.

## 4. Estados y transiciones — Payment

| Estado | Significado |
|--------|-------------|
| PENDING | Preferencia creada, sin pago acreditado |
| IN_PROCESS | MP procesando |
| APPROVED | Pago acreditado |
| REJECTED | Rechazado |
| CANCELLED | Cancelado |
| REFUNDED | Reintegrado |

```
PENDING -> IN_PROCESS -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
APPROVED -> REFUNDED   (acción admin)
```

Transición de la reserva asociada: `APPROVED` de un pago de seña → Booking `CONFIRMED`
(idempotente).

## 5. Invariantes

1. No hay reservas activas solapadas en la misma cancha (constraint DB).
2. `endsAt > startsAt` y `durationMinutes` coherente con el intervalo.
3. `depositAmountCents <= priceTotalCents`.
4. Toda reserva tiene `pricingSnapshot` y montos copiados al momento de crear.
5. `providerPaymentId` es único (idempotencia).
6. `EXPIRED`/`CANCELLED` no bloquean disponibilidad.

## 6. Datos pendientes de definición

Cantidad y nombres de canchas, tipo indoor/outdoor, horarios reales, duración de turnos,
tarifas por franja, moneda y formato, modo e importe de seña, ventana de vencimiento, política
de cancelación/reintegro. Todos configurables (ver `README.md`).

## 7. Implementación (Etapas 2–3)

Esquema: `apps/api/prisma/schema.prisma`. Migraciones en `apps/api/prisma/migrations/`.

### 7.1 Equivalencias de nombres (prompt ↔ implementación)

| Entidad del enunciado | Modelo Prisma | Notas |
|-----------------------|---------------|-------|
| `Reservation` | `Booking` | Nombre alineado con `docs/` y el frontend |
| `OperatingHours` | `CourtSchedule` | Franjas por día/cancha; horas como texto `"HH:mm"` |
| `CourtClosure` | `CourtBlock` | Bloqueos por mantenimiento/evento |

### 7.2 Desvíos respecto de la propuesta

- **Horas de apertura/tarifa** (`opensAt`, `closesAt`, `startTime`, `endTime`) se almacenan como
  `String` en formato `"HH:mm"` (zona del club) en lugar de `time`. Se interpretan con
  `date-fns-tz` al generar disponibilidad. Simplifica comparaciones y evita ambigüedades de driver.
- **`id`**: `uuid` vía `@default(uuid())` (no `cuid`). Todos los `DateTime` son `@db.Timestamptz(3)`.
- **`PaymentProvider`** (enum de la columna `Payment.provider`) sólo contiene `MERCADOPAGO`. El
  proveedor se elige por entorno (`PAYMENTS_PROVIDER=fake | mercadopago`); el modo `fake` **rechaza
  todo cobro** (503) y **no genera filas de pago**, por eso no integra el enum.
- **`PricingRule`** incorpora `weekday` (0=domingo), `durationMinutes` y `priority`; la selección
  prioriza la regla más específica y de mayor `priority`.

### 7.3 Modelos adicionales

- `PaymentWebhookEvent`: registro de cada notificación de webhook (auditoría). Clave de
  deduplicación `dedupKey` **unique** (id de evento de MP o clave derivada), `payload` JSONB,
  `signature`/`requestId` para reverificar la firma en reintentos, estado
  (`RECEIVED`/`PROCESSED`/`DUPLICATE`/`FAILED`) y control de reintentos (`attempts`, `retryable`,
  `nextAttemptAt`). El worker reintenta los `FAILED` reintentables con backoff.
- `Promotion`: promociones mostradas en el sitio público.
- `Faq`: preguntas frecuentes editables desde el panel.
- `Setting`: configuración del club como JSONB `key/value` (seña, vencimiento, datos de contacto).

### 7.4 Constraints de integridad

Definidos en `20260101000100_no_overlap/migration.sql` (además de los `CHECK` del `schema.prisma`):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "courtId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING_PAYMENT','CONFIRMED'));
```

Más `CHECK` de orden temporal (`Booking_time_order`, `CourtBlock_time_order`) y de rangos de
montos (`Booking_deposit_range`, `Booking_paid_non_negative`). Los bloqueos (`CourtBlock`) se
validan por aplicación al mismo tiempo que las reservas activas.

### 7.5 Migraciones

1. `20260101000000_init` — generada offline con
   `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
   (no requiere conexión). Incluye los campos de revisión de pagos y de reintento de webhooks
   de la Etapa 3. Como el proyecto aún no está desplegado, la migración inicial se regeneró en
   lugar de agregar migraciones incrementales.
2. `20260101000100_no_overlap` — escrita a mano: `btree_gist` + constraint de exclusión + `CHECK`.

Aplicación en un entorno con base de datos: `npm run prisma:deploy -w @padel/api`.
