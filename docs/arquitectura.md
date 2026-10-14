# Arquitectura del sistema — PADEL CLUB

> **Implementado (Etapas 1–2).** Frontend en `apps/web`, backend en `apps/api`. Ver §10 para las
> decisiones efectivamente implementadas y sus desvíos respecto de esta propuesta.

## 1. Vista general

Aplicación web en tres capas desacopladas, organizada como **monorepo**:

```
+-------------------+        HTTPS/JSON        +-------------------+       SQL      +--------------+
|  Frontend (SPA)   |  <-------------------->  |   API (REST)       | <------------> |  PostgreSQL  |
|  React + Vite+TS  |     cookies HttpOnly     |  Node+Express+TS   |    Prisma      |              |
+-------------------+                          +-------------------+                +--------------+
        |                                              |
        | redirect checkout                            | HTTPS (server-side)
        v                                              v
+-------------------+                          +-------------------+
|  Mercado Pago     |  -- webhook (signed) --> |  API Mercado Pago |
|  Checkout         |                          |  (verificación)   |
+-------------------+                          +-------------------+
```

## 2. Stack y justificación

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Frontend | React + Vite + TypeScript | SPA rápida, tipado, ecosistema maduro |
| Estilos | Tailwind CSS + CSS variables | Utilidades ágiles + tokens centralizados de la paleta |
| Ruteo | React Router | Estándar SPA, rutas protegidas |
| Estado servidor | TanStack Query (recomendado) | Cache/refetch de disponibilidad y reservas |
| Backend | Node.js + Express + TypeScript | Simple, extendido, tipado |
| ORM | Prisma | Migraciones, tipado, seguridad en consultas |
| DB | PostgreSQL | Transacciones, constraints, exclusión de rangos, JSONB |
| Validación | Zod | Esquema único compartido front/back |
| Auth | Sesiones en DB + cookie HttpOnly | Revocable, simple, resistente a XSS en tokens |
| Pagos | REST de Mercado Pago vía `fetch` (sin SDK) | Menos dependencias y superficie de ataque; control total de firma |
| Logs | pino | Logs estructurados de bajo coste |

Node disponible en el entorno: **v24.14.1**; npm **11.11.0**. Docker no está instalado:
`docker-compose.yml` se incluirá como opción, pero el desarrollo local debe poder correr con un
PostgreSQL nativo o remoto.

## 3. Estructura del repositorio (propuesta)

```
padel-club/
├── apps/
│   ├── web/                      # Frontend (React + Vite + TS + Tailwind)
│   │   └── src/
│   │       ├── app/              # router, providers
│   │       ├── pages/            # públicas + /admin
│   │       ├── features/         # reservas, canchas, admin...
│   │       ├── components/       # UI reutilizable
│   │       ├── lib/              # api client, utils
│   │       └── styles/tokens.css # paleta oficial
│   └── api/                      # Backend (Express + TS)
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/       # init + no_overlap
│       │   └── seed.ts           # datos demo (dev)
│       ├── src/
│       │   ├── config/           # env, constantes, contenido
│       │   ├── domain/           # reglas puras (precio, disponibilidad, estados, tiempo)
│       │   ├── infra/            # prisma, logger
│       │   ├── middleware/       # auth, rbac, csrf, validate, rate-limit, errors, security
│       │   ├── payments/         # provider, fake, mercadopago
│       │   ├── services/         # auth, bookings, payments, webhook, admin...
│       │   ├── routes/           # public, auth, admin, webhooks (v1)
│       │   ├── utils/            # async-handler, id, password, serialize
│       │   ├── app.ts / server.ts / worker.ts
│       └── tests/                # unit + integration (DB-gated)
├── packages/
│   └── shared/                   # tipos + esquemas Zod compartidos + enums
├── docs/
├── package.json                  # workspaces
└── .env.example
```

Gestor: **npm workspaces**. Alternativa válida si se prefiere: pnpm + Turborepo (documentado,
no obligatorio).

## 4. Decisiones de arquitectura (ADR resumidos)

### ADR-01 — Frontend único con área `/admin`
Una sola SPA con rutas públicas y un área `/admin` cargada por *lazy import*. El backend aplica
autorización real; el frontend solo mejora UX. Se evita duplicar el sistema de diseño. Alternativa
futura: separar `admin` en su propia app si crecen los requerimientos.

### ADR-02 — Autenticación por sesión en base de datos + cookie HttpOnly
- Cookie: `HttpOnly`, `Secure` (en producción), `SameSite=Lax`, nombre `sid`, `Path=/`.
- El `sid` es un identificador aleatorio; la sesión (usuario, expiración, IP/UA) se guarda en DB.
- Rotación del identificador al iniciar sesión. Logout elimina la sesión en DB.
- **Justificación**: revocación inmediata, no hay tokens en JS (mitiga XSS), simple y suficiente
  para un panel administrativo.
- **CSRF**: dado `SameSite=Lax`, se suma defensa en profundidad con verificación de `Origin` y un
  token CSRF (double-submit) en peticiones mutables.

### ADR-03 — Contraseñas con `argon2id`
Parámetros recomendados: `memoryCost=19456 KiB`, `timeCost=2`, `parallelism=1` (ajustables).
Nunca se almacena ni loguea la contraseña.

### ADR-04 — Anti doble-reserva con garantía en base de datos
La comprobación en aplicación (`SELECT` + `INSERT`) no basta ante concurrencia. Se combinan:
1. **Transacción** con nivel `SERIALIZABLE` (o `REPEATABLE READ` + reintento) para crear reservas.
2. **Restricción de exclusión** de PostgreSQL con `btree_gist` sobre
   `(court_id, tstzrange(starts_at, ends_at))` aplicada solo a reservas en estado activo.
   Esto hace **imposible** el solapamiento a nivel motor.
3. Normalización de bloques a la misma estructura de intervalos para que el constraint los cubra.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT','CONFIRMED'));
```

### ADR-05 — Zona horaria
- Almacenamiento: `timestamptz` (UTC).
- Configuración del club: `TZ=America/Argentina/Buenos_Aires` (UTC-3, sin DST).
- La generación de turnos y la interpretación de "fecha + hora" se hacen **siempre** en la zona
  del club. Se usa una librería de fechas con soporte de zona (`luxon` o `date-fns-tz`) para
  evitar cálculos manuales propensos a error.
- El frontend muestra las fechas en la zona del club; el backend es la fuente de verdad.

### ADR-06 — Snapshot inmutable de precios
Al crear la reserva se guardan `price_total`, `deposit_amount`, `currency` y un objeto
`pricing_snapshot` (JSONB) con la regla aplicada. Cambios posteriores de tarifas no afectan
reservas existentes.

### ADR-07 — Mercado Pago: preferencia + webhook verificado (sin confiar en el cliente)
Flujo descrito en la sección 5. El backend usa `access_token` (secreto, solo servidor). Se
verifica firma del webhook (`x-signature`, `x-request-id`) y se vuelve a consultar el pago a la
API de MP antes de confirmar. Idempotente por `payment_id`/evento.

### ADR-08 — Arquitectura del backend por capas
`routes → controllers → services (dominio) → repositories (Prisma)`. El dominio (precio,
disponibilidad, transiciones de estado) es **puro y testeable** sin DB.

### ADR-09 — Errores y validación uniformes
- Validación con Zod en el borde (`middleware validate`).
- Errores tipados con códigos; respuesta JSON consistente `{ error: { code, message, details? } }`.
- Nunca se filtran stack traces ni detalles internos al cliente.

### ADR-10 — Auditoría de acciones
Toda operación administrativa sensible escribe en `audit_logs` (actor, acción, entidad, diff,
IP, timestamp). Se implementa en la capa de servicios o vía middleware específico.

## 5. Flujo de Mercado Pago (detallado)

```
Cliente            Frontend              Backend                    Mercado Pago
  |                   |                     |                            |
  |-- completar datos->|                    |                            |
  |                   |-- POST /bookings -->|                            |
  |                   |                     |-- valida + recalcula precio|
  |                   |                     |-- crea Booking PENDING_PAYMENT
  |                   |                     |-- crea Preference -------- X (access_token)
  |                   |<-- booking code ----|                            |
  |                   |     + init_point    |                            |
  |<-- redirect a checkout MP -------------------------------->           |
  |--------------------------------- paga seña ------------------------->|
  |                   |                     |<-- webhook (signed) -------|
  |                   |                     |-- verifica firma           |
  |                   |                     |-- GET /v1/payments/:id ---->|
  |                   |                     |<-- payment (status, amount,|
  |                   |                          external_reference)     |
  |                   |                     |-- idempotente:             |
  |                   |                          pago APPROVED -> Booking CONFIRMED
  |                   |                     |-- 200 OK                   |
  |<-- redirect back_url /reserva/:code -----|                            |
  |                   |-- GET /bookings/:code-->|                          |
  |                   |<-- estado (solo lectura) |                         |
```

Puntos clave:
- `external_reference` = id/código de reserva.
- `back_urls`: success/failure/pending → `/reserva/:code`.
- `notification_url`: `/api/v1/webhooks/mercadopago`.
- La página de retorno **no confirma**: consulta el estado real al backend.
- Reintentos de MP: el webhook es idempotente (se guarda y deduplica por `payment_id`/event id).
- Si la reserva venció antes de confirmarse, al recibir pago aprobado se marca para **reintegro o
  reasignación** según política (documentar decisión comercial; por defecto: conflicto →
  revisión manual en el panel).

## 6. Seguridad (resumen; detalle en `pruebas.md`)

- `helmet`, CORS con allowlist y `credentials: true`.
- Rate limiting en `login`, creación de reservas y webhooks.
- Cookies `HttpOnly`/`Secure`/`SameSite`; CSRF en mutaciones.
- RBAC en middleware backend; verificación de propiedad/rol por recurso.
- Secretos solo en variables de entorno; nunca en el bundle del frontend.
- Firma de webhooks verificada; validación de monto y referencia.
- Consultas parametrizadas vía Prisma (sin SQL concatenado).
- Registro de accesos y errores de autenticación.

## 7. Configuración y entornos

`.env.example` (nombres tentativos):

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASS@HOST:5432/padel?schema=public
SESSION_SECRET=change-me
TZ=America/Argentina/Buenos_Aires
CLUB_NAME=PADEL CLUB
CORS_ORIGIN=http://localhost:5173
MP_ACCESS_TOKEN=TEST-xxxx
MP_PUBLIC_KEY=TEST-xxxx
MP_NOTIFICATION_URL=https://tu-dominio/api/v1/webhooks/mercadopago
MP_WEBHOOK_SECRET=xxxx
BOOKING_HOLD_MINUTES=20
DEPOSIT_MODE=percent            # percent | fixed_amount
DEPOSIT_PERCENT=30
DEPOSIT_FIXED_AMOUNT=5000
CURRENCY=ARS
```

Frontend (`apps/web/.env`): solo variables públicas (`VITE_API_URL`, `VITE_APP_NAME`). Nunca
tokens privados.

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Doble reserva concurrente | Alto | Constraint de exclusión + transacción + tests de concurrencia |
| Webhook no verificado / reenviado | Alto | Firma + reconsulta del pago + idempotencia |
| Desfase de zona horaria | Medio | timestamptz + TZ explícita + librería tz |
| Exposición de secretos | Alto | Solo backend usa secretos; `.env` fuera de git |
| Cambios de precio sobre reservas viejas | Medio | Snapshot inmutable |
| Uso indebido de rol Recepción | Medio | RBAC server-side + audit log |
| Ausencia de Docker en el entorno | Bajo | Soporte de PostgreSQL local/remoto; Docker como opción |
| Rate limiting insuficiente | Medio | Límites por IP/ruta y en login |

## 9. Despliegue (propuesto, a definir)

- Backend: servicio Node con PostgreSQL administrado. Migraciones `prisma migrate deploy`.
- Frontend: build estático servido por CDN/host (Vite build).
- HTTPS obligatorio (cookies `Secure`).
- Variables de entorno gestionadas por el proveedor.
- Tarea programada/scheduler para vencimiento de reservas pendientes (cron interno o job).

Ver `modelo-datos.md`, `api.md` y `pruebas.md`.

## 10. Implementación (Etapas 1–3)

### 10.1 Backend: build y ejecución

- **Módulo**: CommonJS. **Dev**: `tsx watch` (resuelve el alias `@/*` del `tsconfig`).
- **Build**: `tsup` → `dist/server.js`, `dist/worker.js` (bundlea `@padel/shared`, deja Prisma y
  `@node-rs/argon2` como externos). **Start**: `node dist/server.js`.
- **Typecheck**: `tsc --noEmit`. **Lint**: ESLint (`--max-warnings 0`).

### 10.2 Anti doble-reserva (ADR-04, implementado)

Además del constraint de exclusión, la creación de reservas ejecuta dentro de
`prisma.$transaction`:

1. `pg_advisory_xact_lock(4242, hashtext(courtId))` — serializa solo las reservas de esa cancha.
2. `findFirst` de solapamiento contra reservas activas y `CourtBlock`.
3. `INSERT`.

Los errores de exclusión (`23P01` / `Booking_no_overlap`) se traducen a **409** `SLOT_TAKEN`.

### 10.3 CSRF (ADR-02, implementado)

Double-submit cookie: cookie `csrf` legible por JS + cabecera `x-csrf-token` en métodos mutating.
`GET /api/v1/csrf` permite inicializar el token. El cliente web (`apps/web/src/lib/api.ts`)
recupera la cookie y, si falta, la solicita antes de la primera petición mutating.

### 10.4 Contraseñas

`@node-rs/argon2` (argon2id) en lugar del paquete `argon2` (binarios nativos más simples de
instalar en Windows/CI). Parámetros por defecto de la librería (ajustables).

### 10.5 Mercado Pago (integración real)

Ver [pagos.md](pagos.md). Resumen:

- Sin SDK: REST API oficial vía `fetch` (crear **y recuperar** preferencias, consultar pagos,
  reintegros). El checkout es **idempotente** (reutiliza la preferencia pendiente).
- Firma `x-signature`/`x-request-id` verificada con HMAC-SHA256 (`MP_WEBHOOK_SECRET`); el
  manifiesto omite los parámetros ausentes (criterio oficial).
- Decisión de dominio **pura** (`domain/payment-processing.ts`): confirma sólo pagos aprobados
  con moneda/importe válidos; guarda monótona de estados (sin retrocesos); pagos tardíos,
  importe/moneda distinta → `requiresReview` (visibles en `/admin/payments?needsReview=true`).
- `PaymentWebhookEvent` registra cada notificación (auditoría + dedup) con reintentos (worker).
- Errores transitorios del proveedor se reintentan con backoff; permanentes no.
- Proveedor `fake` por defecto: **rechaza** cualquier cobro (503 `PAYMENTS_DISABLED`); no simula
  pagos aprobados.

### 10.6 Zona horaria

Implementado con `date-fns-tz` y `TZ=America/Argentina/Buenos_Aires`. La generación de turnos y la
interpretación de "fecha + hora" ocurren siempre en la zona del club; el backend es la fuente de
verdad.
