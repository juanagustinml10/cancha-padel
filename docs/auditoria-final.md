# Auditoría Final Pre-Producción — PADEL CLUB

> Fecha de la auditoría: 14/10/2026
> Alcance: monorepo completo (`apps/web`, `apps/api`, `packages/shared`, base de datos, autenticación, reservas, pagos con Mercado Pago y despliegue).
> Tipo: auditoría con validación contra una base PostgreSQL real de prueba. Se corrigieron **2 defectos** hallados al poner en marcha la base (ver §5.0); el resto de hallazgos quedan pendientes salvo que se indique lo contrario. No se tocaron datos de producción.

---

## 1. Estado general

El proyecto está **funcionalmente completo para un MVP** y es de **buena calidad técnica** (tipado estricto, validación con Zod, dominio puro testeable, controles de seguridad reales). Tras validarlo contra una **base PostgreSQL real de prueba**, la lógica de reservas y webhooks quedó **verificada** y se corrigieron 2 defectos de puesta en marcha. Aun así, **NO está listo para producción tal cual** por estos motivos bloqueantes:

1. **Pagos reales sin validar**: la integración con Mercado Pago existe y está bien construida, pero **nunca se ejecutó contra credenciales reales ni sandbox**. Riesgo alto.
2. **Base de producción sin preparar**: migraciones y seed se validaron en una base de prueba, pero **la base definitiva y su `.env` todavía no existen**.
3. **La migración inicial tenía BOM UTF-8** (rompía `prisma migrate deploy` en base nueva) — **corregido** (§5.0).
4. **Frontend en modo demo por defecto** (`VITE_USE_MOCKS=true`): la UI consume un backend simulado, no la API real, hasta configurar el `.env`.
5. **Contenido y credenciales placeholder** (nombre del club, dirección, teléfono, seed).
6. **Documentación desalineada** con la realidad del build.

**Clasificación global: PARCIALMENTE LISTO — requiere configuración y validación antes de publicar.**

Leyenda de estados:
- ✅ **Verificado**: comprobado con ejecución o lectura directa de código/artefactos.
- 🟡 **Parcial**: existe y funciona, pero le falta configuración o validación.
- ⚙️ **Pendiente de configuración**: implementado, requiere credenciales/variables/datos para funcionar.
- ❌ **No implementado**: no existe.
- 🔴 **Falla**: probado y no funciona.

---

## 2. Alcance y metodología

- **Lectura de código** de backend (rutas, servicios, dominio, middleware, pagos, Prisma), frontend (páginas, componentes, servicios, contexto de auth, tokens), y `packages/shared`.
- **Ejecución real** de scripts del repositorio (typecheck, lint, build, tests) en Windows, Node v24.14.1, npm 11.11.0.
- **Escaneo de seguridad**: búsqueda de secretos en el árbol de trabajo y `npm audit`.
- **Revisión de infraestructura local**: servicio PostgreSQL 18 (`postgresql-x64-18`) detectado **activo** en `localhost:5432` con `scram-sha-256`; sin `docker`; sin `psql` en PATH.
- **NO se ejecutaron** cargos reales, migraciones destructivas ni borrado de datos.

Entorno del repositorio:
- **No existe repositorio Git** (`.git` ausente): no hay secretos commiteados que purgar, pero **no hay control de versiones**.
- No hay archivos `.env` (solo `.env.example`). El `.gitignore` excluye `.env` y conserva `!.env.example`.

---

## 3. Funcionalidades verificadas

| # | Funcionalidad | Estado | Evidencia |
|---|---|---|---|
| 3.1 | Tipado estricto TypeScript (web + api) | ✅ | `npm run typecheck` PASS |
| 3.2 | Lint sin warnings (web + api) | ✅ | `npm run lint` PASS (0 warnings) |
| 3.3 | Build de producción del frontend | ✅ | `npm run build` → `dist/` (JS ~504 kB, CSS ~31 kB) |
| 3.4 | Build de producción del backend | ✅ | `npm run build:api` → `dist/server.js` (115 KB), `dist/worker.js` (34 KB) |
| 3.5 | Pruebas unitarias frontend | ✅ | 24 tests PASS |
| 3.6 | Pruebas unitarias backend | ✅ | PASS (dominio puro: pricing, availability, time, estados) |
| 3.7 | Autenticación por sesión opaca en DB | ✅ | Cookie `sid` HttpOnly; sesión persistida en `Session`; `apps/api/src/middleware/authenticate.ts` |
| 3.8 | Hash de contraseñas | ✅ | argon2id (`apps/api/src/utils/password.ts`) |
| 3.9 | Autorización por rol (ADMIN/RECEPTION) | ✅ | `apps/api/src/middleware/authorize.ts` |
| 3.10 | Validación centralizada de entorno (falla temprano) | ✅ | `apps/api/src/config/env.ts` (Zod + `superRefine`) |
| 3.11 | Validación de entrada con Zod | ✅ | `packages/shared/src/schemas.ts`, `apps/api/src/middleware/validate.ts` |
| 3.12 | Manejo uniforme de errores y códigos estables | ✅ | `apps/api/src/middleware/error-handler.ts`, `src/domain/errors.ts` |
| 3.13 | Anti-solapamiento de reservas en DB | ✅ (código) | Índice EXCLUDE con `btree_gist` en `prisma/migrations/20260101000100_no_overlap/migration.sql` |
| 3.14 | Concurrencia serializada por cancha | ✅ (código) | `pg_advisory_xact_lock(4242, hashtext(courtId))` en `bookings.service.ts:60-62` |
| 3.15 | Cálculo de precios y seña en backend (no confía en el cliente) | ✅ | `apps/api/src/domain/pricing.ts`; recalculado en `bookings.service.ts:189` |
| 3.16 | Máquina de estados de reserva y pago | ✅ | `domain/booking-status.ts`, `domain/payment-processing.ts`, `domain/payment-status.ts` |
| 3.17 | Idempotencia de checkout | ✅ | `payments.service.ts:93-120` (reutiliza preferencia pendiente) |
| 3.18 | Webhook MP: registro, dedup, firma, consulta real, decisión | ✅ (código) | `webhook.service.ts` (procesa 1-4 del flujo documentado) |
| 3.19 | Reintentos exponenciales de webhook fallido | ✅ (código) | `webhook.service.ts:338-367`, `worker.ts` |
| 3.20 | Worker de mantenimiento (expiración, purge, reintentos) | ✅ (código) | `apps/api/src/worker.ts` |
| 3.21 | Pago manual (efectivo/transferencia) trazable + confirmación automática | ✅ (código) | `payments.service.ts:167-220` |
| 3.22 | Rate limiting (general, login, reservas, contacto, checkout) | ✅ (código) | `apps/api/src/middleware/rate-limit.ts` |
| 3.23 | CSRF double-submit (webhook exento por firma) | ✅ (código) | `apps/api/src/middleware/csrf.ts` |
| 3.24 | CORS con lista blanca y credenciales | ✅ (código) | `apps/api/src/middleware/security.ts` |
| 3.25 | Cabeceras de seguridad (helmet), `x-powered-by` off | ✅ (código) | `app.ts:21-26` |
| 3.26 | Paleta oficial de colores | 🟡 | `tokens.css` y `tailwind.config.ts` mayormente alineados; ver §5 |
| 3.27 | Sin secretos en el árbol de trabajo | ✅ | Solo placeholders en `tests/setup.ts` y `tests/unit/payments-provider.test.ts` |
| 3.28 | Migraciones aplicables en base nueva (`prisma migrate deploy`) | ✅ (corregido) | Requirió quitar BOM UTF-8 de 2 archivos (§5.0); después las 3 migraciones aplicaron OK |
| 3.29 | Pruebas de integración/concurrencia/webhook | ✅ | 8 tests ejecutados contra PostgreSQL 18 real: **61/61 PASS** (§6) |
| 3.30 | Anti-doble-reserva bajo concurrencia (verificado en runtime) | ✅ | 8 intentos simultáneos → 1 reserva creada y 7 rechazadas con `SLOT_TAKEN` |
| 3.31 | Seed ejecutable | ✅ | `prisma:seed` ejecutado sin errores sobre base de prueba |

---

## 4. Funcionalidades incompletas, sin uso o no implementadas

| # | Hallazgo | Estado | Detalle |
|---|---|---|---|
| 4.1 | Endpoint `GET /club` (`publicApi.getClubInfo`) | ⚙️/❌ frontend | El método existe (`apps/web/src/services/publicApi.ts:25`) pero **nunca se llama**. Las páginas usan `DEMO_CLUB` local en lugar de la API. |
| 4.2 | Logs de auditoría en el panel | ❌ UI | `adminApi.listAuditLogs` existe (`adminApi.ts:278`) y el backend los persiste, pero **no hay pantalla que los muestre**. |
| 4.3 | Mapa de contacto | ❌ | `DEMO_CLUB.mapUrl` (`apps/web/src/config/site.ts:20`) está definido pero **no se usa**; el mapa es un placeholder. |
| 4.4 | Suite E2E (Playwright) | ❌ | No existe carpeta `e2e/` ni `playwright.config.*`. Sin pruebas de navegador real. |
| 4.5 | Pruebas de integración/concurrencia/webhook | ✅ | 8 tests **ejecutados y aprobados** contra base de prueba (requieren `TEST_DATABASE_URL`); ver §6. |
| 4.6 | Integración real con Mercado Pago | ⚙️ | Código completo, **sin credenciales** ni prueba en sandbox (ver §8). |

---

## 5. Hallazgos y errores detectados

### 5.0 Errores corregidos durante la puesta en marcha (severidad: media-alta)
- **BOM UTF-8 en migraciones (bloqueante de despliegue).** Los archivos `apps/api/prisma/migrations/20260101000000_init/migration.sql` y `20260101000200_manual_payments/migration.sql` comenzaban con BOM (`EF BB BF`). PostgreSQL rechaza el BOM al inicio del script (`SQLSTATE 42601`: «error de sintaxis en o cerca de ''»), por lo que **`prisma migrate deploy` fallaba en cualquier base nueva** (un despliegue limpio era imposible). Se eliminó el BOM preservando el contenido. ⚠️ *Caveat:* si una base ya existente tuviera estas migraciones registradas con el checksum anterior, Prisma podría marcar diferencia de checksum; en base nueva aplica sin problemas.
- **Tests de integración no deterministas (paralelismo).** `apps/api/vitest.config.ts` ejecutaba los archivos en paralelo; como los tests de integración comparten una única `TEST_DATABASE_URL` y llaman a `resetDatabase`, se pisaban entre sí (el test de concurrencia llegó a 0 reservas porque otro archivo borraba sus datos). Se agregó `fileParallelism: false`. Con eso `npm run test:api` pasa **61/61** de forma reproducible.

### 5.1 Documentación inconsistente con el código (severidad: media)
- `README.md` y `docs/despliegue.md` afirman que `npm run build` construye **web + api**. En realidad el script raíz es `"build": "npm run build:web"` (`package.json:15`): **solo construye el web**. El API se construye con `npm run build:api`. Un despliegue que solo corra `npm run build` **no generará `apps/api/dist`**.
- `docs/arquitectura.md` usa el nombre de variable antiguo `DEPOSIT_FIXED_AMOUNT=5000`; el nombre real es `DEPOSIT_FIXED_AMOUNT_CENTS` (centavos).

### 5.2 Colores fuera de la paleta oficial (severidad: baja, cosmética)
La paleta oficial se respeta en lo esencial, pero hay colores no oficiales introducidos (principalmente en `tokens.css` y utilidades arbitrarias):

| Archivo | Línea | Color | Color oficial más cercano |
|---|---|---|---|
| `apps/web/src/styles/tokens.css` | 11 | `#1e5c99` (`primary-hover`) | No oficial |
| `apps/web/src/styles/tokens.css` | 13 | `#3b7ec4` (`accent-hover`) | No oficial |
| `apps/web/src/styles/tokens.css` | 16 | `#d1d5db` (`border-strong`) | `#E5E7EB` (border) |
| `apps/web/src/components/ui/Badge.tsx` | 7 | `#f1f5f9` | `#EAF3FB` |
| `apps/web/src/components/ui/Button.tsx` | 17 | `#dcebfa` | `#EAF3FB` |
| `apps/web/src/pages/public/ReservationStatusPage.tsx` | 94 | `#f6f8fb` | `#EAF3FB` |
| `apps/web/src/components/booking/BookingStepper.tsx` | 20 | `#eef2f7` | `#EAF3FB` |
| `apps/web/src/components/admin/CalendarView.tsx` | 194 | `#f6f8fb` | `#EAF3FB` |
| `apps/web/src/pages/public/HomePage.tsx` | 205 | `#eef2f7` | `#EAF3FB` |
| `apps/web/src/components/layout/AdminLayout.tsx` | 39 | `#f6f8fb` | `#EAF3FB` |
| `apps/web/src/components/ui/Skeleton.tsx` | 6 | `#eef2f7` | `#EAF3FB` |
| `apps/web/src/components/booking/TimeSlotPicker.tsx` | 36 | `#f6f8fb` | `#EAF3FB` |
| `apps/web/src/pages/admin/AdminDashboardPage.tsx` | 141 | `#eef2f7` | `#EAF3FB` |
| `apps/web/src/pages/admin/AdminLoginPage.tsx` | 51 | `#f6f8fb` | `#EAF3FB` |

✅ No se reintrodujo verde en ninguna parte. Las variantes `hover` no están en la paleta provista (la oficial no define tonos hover), por lo que son extensiones aceptables pero no "oficiales".

### 5.3 Accesibilidad (severidad: media)
- `apps/web/src/components/ui/Modal.tsx:48,57` usa el `id="modal-title"` **hardcodeado**. Cuando hay varios modales (p. ej. `AdminBookingsPage` monta 4 modales + confirmación), se generan **IDs duplicados**, rompiendo `aria-labelledby`.
- El `Modal` **no implementa focus trap ni restauración de foco** al cerrar.
- `DataTable` (`components/admin/DataTable.tsx:63-67`): las filas con `onRowClick` no tienen soporte de teclado (`tabIndex`/`role`/`onKeyDown`), por lo que no son navegables/activables por teclado.
- En `AdminSchedulePage.tsx:161-184` los `<Input type="time">`/`number` **no tienen `<label>` ni `aria-label`**; se apoyan solo en los encabezados `<th scope="col">` de la tabla.

### 5.4 Privacidad de consulta de reserva (severidad: baja)
`getBookingByCode` (`bookings.service.ts:393-405`) permite consultar la reserva **solo con el código** (el email es opcional). El código `PC-XXXXXX` usa 32 caracteres y 6 posiciones (≈ 10^9 combinaciones), lo que lo hace prácticamente no enumerable, pero quien posea el código ve los datos del cliente (nombre, email, teléfono). Es aceptable como "secreto compartido", pero conviene documentarlo.

### 5.5 Dependencias con vulnerabilidades (severidad: media-alta)
`npm audit` reportó **15 avisos (7 moderados, 6 altos, 2 críticos)**:
- **La mayoría en tooling de desarrollo** (vitest, vite, esbuild, tinypool, tailwindcss/braces/micromatch) → no llegan a producción, pero conviene actualizar.
- **`react-router-dom` (moderado) es dependencia de runtime**: open-redirect vía backslash. El fix requiere salto de **versión mayor (v7)**. El aviso de SSR/hidratación **no aplica** (app client-only con `createBrowserRouter`).

---

## 6. Resultados reales de las pruebas

Ejecutado el 14/10/2026 desde la raíz del repositorio:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS (web + api) |
| `npm run lint` | ✅ PASS (0 warnings, web + api) |
| `npm run build` (web) | ✅ PASS → `apps/web/dist/` (JS ~504 kB / gzip ~146 kB, CSS ~31 kB) |
| `npm run build:api` | ✅ PASS → `apps/api/dist/server.js` + `worker.js` |
| `npm run test` (web) | ✅ 24 tests PASS |
| **`npm run test:api` (con `TEST_DATABASE_URL`)** | ✅ **61/61 tests PASS** (10 archivos), incluida la integración/concurrencia/webhook |

**Pruebas de integración ejecutadas contra PostgreSQL 18.3 real** (base `padel_audit_test`):
- `bookings.concurrency.test.ts` (2) ✅ — **8 intentos simultáneos al mismo turno → exactamente 1 reserva creada y 7 rechazadas con `SLOT_TAKEN`**; también permite el mismo horario en canchas distintas.
- `payments.webhook.test.ts` (6) ✅ — firma, deduplicación/idempotencia, decisión de estados y no-cobro indebido.
- `http.test.ts` (4) ✅ — validación de entrada y errores HTTP.

**Detalle de la puesta en marcha (realizada durante la auditoría):**
1. PostgreSQL 18.3 **ya estaba instalado y activo** en `localhost:5432` (no hizo falta reinstalar).
2. Se **reseteó la contraseña** del usuario `postgres` (se entrega aparte al propietario; no se escribe en el repositorio).
3. Se creó la base dedicada `padel_audit_test` (las bases preexistentes `habit_tracker` y `safeobserve_db` **no se tocaron**).
4. `prisma migrate deploy` (tras corregir el BOM) aplicó las **3 migraciones**; `prisma:seed` corrió sin errores.
5. `npm run test:api` con `TEST_DATABASE_URL` → **61/61 PASS**.

> **Sin `TEST_DATABASE_URL`**, los tests de integración siguen omitiéndose limpiamente (por diseño, `describeIntegration`), y la suite unitaria pasa igual.

---

## 7. Riesgos de seguridad

### Controles implementados correctamente ✅
- **Sesiones opacas** en BD, no JWT en cliente; cookie `sid` **HttpOnly**.
- **CSRF** double-submit en todos los métodos mutating; webhook MP exento y autenticado por firma.
- **CORS** con lista blanca + `credentials`.
- **Rate limiting** específico por endpoint (login 10/15 min, checkout 30/10 min, contacto 10/h).
- **Contraseñas** con **argon2id** y comparación segura.
- **Mensajes de login genéricos** (no filtra existencia de usuario).
- **Webhook**: nunca confía en el body, **consulta el pago real** al proveedor y **verifica firma** (`x-signature`).
- **Anti doble-cobro**: no crea checkout si ya hay pago aprobado (`payments.service.ts:76-81`).
- **Validación de entorno** exige HTTPS en producción y credenciales MP cuando el proveedor es `mercadopago`.
- **Sin secretos** en el repositorio.
- `helmet`, `x-powered-by` deshabilitado, `trust proxy` configurado, `express.json({ limit: '1mb' })`.

### Riesgos / pendientes 🔴🟡
1. **`SESSION_SECRET` y credenciales de seed placeholder**: el `.env.example` trae `CambiarEstaClave123`. Si se despliega sin cambiarlas, hay acceso administrativo trivial. **Crítico.**
2. **`react-router-dom` con vulnerabilidad moderada** sin parchear (salto mayor pendiente). **Medio.**
3. **Ausencia de control de versiones (Git)**: no hay trazabilidad ni forma de revertir. **Medio-alto para operación.**
4. **`trust proxy` = 1**: correcto detrás de un proxy inverso; si se expone directo, los límites de rate-limit por IP podrían verse afectados. **Bajo.**
5. **Consulta de reserva por código sin segundo factor**: ver §5.4. **Bajo.**
6. **`mpNotificationUrl` deriva de `API_BASE_URL`**: si no se configura `MP_NOTIFICATION_URL` y `API_BASE_URL` no es la URL pública real, MP no podrá notificar. **Medio** (configuración).

---

## 8. Estado de Mercado Pago

| Aspecto | Estado |
|---|---|
| Adaptador con interfaz desacoplada (`fake` / `mercadopago`) | ✅ Implementado |
| Creación de preferencia (Checkout Pro) | ✅ Código listo |
| Recuperación idempotente de preferencia (`getPreference`) | ✅ Código listo |
| Consulta de pago real (`getPayment`) | ✅ Código listo |
| Reintegro (`refund`) | ✅ Código listo |
| Verificación de firma de webhook | ✅ Código listo |
| Registro/dedup/reintento de webhooks | ✅ Código + worker |
| Back URLs (success/failure/pending) | ✅ Código listo |
| **Credenciales reales (Access Token / Public Key / Webhook Secret)** | ❌ **Sin configurar** |
| **Prueba end-to-end en sandbox** | ❌ **No realizada** |
| Comportamiento sin credenciales | ✅ **Seguro**: devuelve **503 `PAYMENTS_DISABLED`**, nunca simula un pago exitoso |

**Conclusión:** la integración está **bien diseñada y es segura por defecto**, pero **no se puede declarar operativa** hasta cargar credenciales y validar el flujo completo en sandbox (crear reserva → checkout → webhook aprobado → reserva CONFIRMADA → reintegro). **Debe probarse con tarjetas de prueba de MP antes de publicar.**

---

## 9. Estado de la base de datos

| Aspecto | Estado |
|---|---|
| Esquema Prisma (`schema.prisma`) | ✅ Definido (Court, Customer, Booking, Payment, Session, User, AuditLog, Settings, Schedules, Blocks, PricingRule, WebhookEvent, etc.) |
| Migración anti-solapamiento (`btree_gist` EXCLUDE) | ✅ Definida y **aplicada** en base de prueba |
| Migración de pagos manuales | ✅ Definida y **aplicada** |
| `prisma migrate deploy` en base nueva | ✅ **Aplicó las 3 migraciones** (tras quitar BOM UTF-8; §5.0) |
| Seed con datos de ejemplo | ✅ **Ejecutado** sin errores en base de prueba |
| Restricción anti-solapamiento (verificación runtime) | ✅ Verificada: la concurrencia produjo exactamente 1 reserva |
| **Base de datos de producción** | ❌ **No creada** (solo se usó `padel_audit_test`) |

**Nota:** PostgreSQL 18.3 local (`C:\Program Files\PostgreSQL\18`) con autenticación `scram-sha-256`. La contraseña del usuario `postgres` fue **reseteada** durante la auditoría (se entrega al propietario). Las bases preexistentes quedaron intactas. **La base de producción debe crearse aparte.**

---

## 10. Variables de entorno pendientes de configuración

Backend (`apps/api/.env`, basado en `.env.example`):
- `DATABASE_URL` (**obligatoria**) — conexión a PostgreSQL real.
- `SESSION_SECRET` (**obligatoria**, ≥ 8 chars, **valor fuerte y único**).
- `NODE_ENV=production`, `PORT`, `TZ`.
- `APP_BASE_URL` y `API_BASE_URL` (**HTTPS en producción**).
- `CORS_ORIGIN` (dominio(s) reales del sitio).
- `PAYMENTS_PROVIDER=mercadopago` + `MP_ACCESS_TOKEN` + `MP_WEBHOOK_SECRET` (obligatorios si se cobra online) + `MP_PUBLIC_KEY`, `MP_NOTIFICATION_URL`, `MP_SUCCESS_URL`, `MP_FAILURE_URL`, `MP_PENDING_URL`.
- Negocio: `CLUB_NAME`, `BOOKING_HOLD_MINUTES`, `DEPOSIT_MODE`, `DEPOSIT_PERCENT`, `DEPOSIT_FIXED_AMOUNT_CENTS`, `CURRENCY`.
- Seed: `SEED_ADMIN_EMAIL/PASSWORD`, `SEED_RECEPTION_EMAIL/PASSWORD` (**cambiar claves**).
- Opcional para pruebas: `TEST_DATABASE_URL`.

Frontend (`apps/web/.env`):
- `VITE_USE_MOCKS` → **`false`** para usar la API real (por defecto viene en `true`).
- `VITE_API_URL` / proxy de Vite hacia el API.

---

## 11. Requisitos para publicar y pasos manuales del propietario

**Bloqueantes técnicos (a resolver antes de publicar):**
1. **Inicializar Git** y subir a un repositorio (con `.env` ignorado).
2. Crear la **base de producción** PostgreSQL y ejecutar `npm run prisma:deploy` + seed (con datos reales).
3. Completar **`.env` de producción** (todos los puntos de §10), con **`SESSION_SECRET` fuerte** y **contraseñas de seed cambiadas**.
4. **Configurar `VITE_USE_MOCKS=false`** y apuntar el frontend al API real; reconstruir con `npm run build:web`.
5. **Cargar credenciales reales de Mercado Pago** y **validar el flujo completo en sandbox** (incluido el webhook con firma) antes de pasar a producción.
6. Ejecutar el **API** (`node dist/server.js`) y el **worker** (`node dist/worker.js`) como procesos/servicios, detrás de **HTTPS** y proxy inverso.
7. ✅ **Ejecutar las 8 pruebas de integración** contra una base de prueba — **HECHO** (61/61 PASS, §6). Queda repetirlo contra el servidor/base definitivos en staging.

**Pasos manuales del propietario (contenido y operación):**
- Reemplazar **contenido placeholder** del club: nombre, dirección, ciudad, teléfono, WhatsApp, email, Instagram, mapa (`apps/api/src/config/content.ts` y datos seed del panel público).
- Revisar **promociones y FAQs** de ejemplo.
- Configurar **horarios, tarifas y política de seña** reales desde el panel.
- Definir la **política de cancelación**.
- Crear los **usuarios del staff** (ADMIN/RECEPTION) con contraseñas fuertes y borrar los de ejemplo.
- Preparar **textos legales** (términos, privacidad) si el sitio los requiere.

**Recomendados (no bloqueantes):**
- Corregir `package.json#build` para incluir `build:api` (o actualizar la documentación).
- Actualizar `docs/arquitectura.md` (`DEPOSIT_FIXED_AMOUNT_CENTS`).
- Alinear colores fuera de paleta (§5.2).
- Corregir a11y del `Modal` (id único, focus trap) y de `DataTable` (teclado).
- Actualizar dependencias del tooling y planificar el salto de `react-router-dom` a v7.
- Agregar pruebas **E2E** (Playwright) del flujo de reserva completo.

---

## 12. Recomendación final

> **AÚN NO PUBLICAR.** El proyecto es un MVP sólido y su arquitectura es correcta. La lógica de reservas y webhooks quedó **verificada en runtime** (61/61 tests, incluido el anti-doble-reserva) y se corrigieron 2 defectos de puesta en marcha. Pero **todavía no cumple las condiciones para producción** por: pagos reales sin validar, base de datos de producción sin crear, frontend por defecto en modo demo, credenciales/contenido placeholder y ausencia de control de versiones.

**Ruta sugerida para publicar:**
1. Crear la **base de producción** y aplicar migraciones + seed real (las migraciones ya quedaron aptas para base nueva, §5.0).
2. **Validar el cobro real en sandbox de Mercado Pago** (paso crítico e imprescindible).
3. Completar el `.env` de producción, poner `VITE_USE_MOCKS=false` y reconstruir el frontend.
4. Corregir los hallazgos de **seguridad media/alta** (§7.1–§7.3) e inicializar Git.
5. Recién entonces, desplegar en un **entorno de staging** por unos días, verificando reservas, webhooks y reintegros reales de bajo monto.

**Avance logrado en esta auditoría:** base de datos local validada, pruebas de integración/concurrencia/webhook aprobadas y migraciones reparadas. Restan, sobre todo, los pasos 2 y 3 para poder operar con bajo riesgo.

---

### Anexo — Resumen de estados por área

| Área | Estado |
|---|---|
| Tipado / Lint / Build | ✅ Verificado |
| Lógica de negocio (dominio) | ✅ Verificada (unit tests) |
| Seguridad (código) | 🟡 Buena, con pendientes (§7) |
| Autenticación / Autorización | ✅ Verificado (código) |
| Reservas / Disponibilidad | ✅ Verificado (integración + concurrencia) |
| Base de datos | ✅ Migraciones/seed/pruebas OK en base de prueba · ⚙️ falta base de producción |
| Mercado Pago | ⚙️ Código OK, sin credenciales ni sandbox |
| Frontend | 🟡 Funcional, en modo demo por defecto |
| Accesibilidad | 🟡 Con hallazgos (§5.3) |
| Paleta de diseño | 🟡 Pequeñas desviaciones (§5.2) |
| Documentación | 🟡 Desalineada (§5.1) |
| Testing E2E | ❌ No implementado |
| Despliegue / Configuración | ⚙️ Pendiente |

### Tareas pendientes (checklist)

- [ ] Inicializar Git y versionar el proyecto.
- [x] Corregir BOM UTF-8 de migraciones (bloqueaba `migrate deploy`, §5.0).
- [x] Serializar tests de integración (`fileParallelism: false`, §5.0).
- [x] Validar migraciones + seed en base de prueba.
- [x] Ejecutar las 8 pruebas de integración/concurrencia/webhook contra base de prueba (61/61).
- [ ] Preparar base de datos de producción y aplicar migraciones + seed.
- [ ] Completar `.env` de producción (secretos fuertes).
- [ ] Cambiar `VITE_USE_MOCKS=false` y reconstruir el frontend.
- [ ] Cargar credenciales reales de Mercado Pago y validar sandbox (flujo completo + webhook).
- [ ] Corregir `package.json#build` (o documentación) para el build del API.
- [ ] Alinear colores fuera de paleta.
- [ ] Corregir a11y (Modal id/foco, DataTable teclado, labels faltantes).
- [ ] Actualizar dependencias; planificar `react-router-dom` v7.
- [ ] Reemplazar todo el contenido placeholder del club.
- [ ] Crear usuarios de staff reales y eliminar los de ejemplo.
- [ ] Agregar pruebas E2E del flujo de reserva.
- [ ] Desplegar en staging y observar antes de producción.
