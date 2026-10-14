# PADEL CLUB

Aplicación web para la gestión integral de un complejo de pádel: sitio público, reservas
online con pago de seña por Mercado Pago y panel administrativo.

> **Estado actual: Etapa 3 — integración real de Mercado Pago (frontend y backend).**
> El **frontend** está implementado y, por defecto, funciona en **modo demostración**
> (`VITE_USE_MOCKS=true`): sitio público, flujo de reserva y panel con datos ficticios en memoria.
> El **backend real** (`apps/api`: Express + TypeScript + Prisma + PostgreSQL) está implementado
> con todo el contrato de [docs/api.md](docs/api.md): reservas con anti doble-reserva, cobro de
> seña con **Mercado Pago real** (preferencia + webhook verificado e idempotente), autenticación
> por sesión, RBAC y panel.
>
> **No se simulan pagos exitosos**: sin credenciales de Mercado Pago el proveedor activo es `fake`
> y todo cobro se rechaza con **503** `PAYMENTS_DISABLED`. Para conectar el frontend al backend
> real, poné `VITE_USE_MOCKS=false`. Detalle en [docs/pagos.md](docs/pagos.md).

## Cómo ejecutar

Requisitos: Node **v20+** (probado con v24) y npm.

```bash
npm install            # instala el monorepo (workspaces)
npm run dev:web        # frontend en http://localhost:5173 (modo demostración)
npm run dev:api        # backend en http://localhost:4000 (requiere base de datos, ver abajo)
```

Scripts (se ejecutan desde la raíz):

```bash
npm run typecheck  # TypeScript estricto (web + api)
npm run lint       # ESLint (falla ante cualquier warning)
npm run build      # build de producción (web + api)
npm run test       # Vitest (web + api; la integración de api requiere DB)
```

Comandos específicos del backend:

```bash
npm run dev:worker                 # worker de vencimiento de reservas
npm run prisma:generate            # genera Prisma Client
npm run prisma:migrate -w @padel/api   # crea/aplica migraciones (dev, requiere DB)
npm run prisma:seed -w @padel/api      # datos demo (dev)
npm run test:integration -w @padel/api # sólo integración (requiere TEST_DATABASE_URL)
```

### Base de datos (backend)

El backend usa PostgreSQL vía Prisma. **No** se incluyen credenciales. Para levantar uno local:

1. Tener PostgreSQL en marcha y crear una base (p. ej. `padel`).
2. Copiar `apps/api/.env.example` → `apps/api/.env` y ajustar `DATABASE_URL`.
3. `npm run prisma:deploy` (aplica migraciones) y opcionalmente `npm run prisma:seed`.

Detalle de despliegue y configuración de Mercado Pago: [docs/despliegue.md](docs/despliegue.md).

Configuración opcional: copiá `apps/web/.env.example` a `apps/web/.env`. Sin archivo `.env`
la aplicación funciona igual (mocks activados). Variables:

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `VITE_USE_MOCKS` | `true` | `false` cambia los servicios a la API real |
| `VITE_API_URL` | `/api/v1` | Base de la API (proxy de Vite → `http://localhost:4000`) |
| `VITE_APP_NAME` | `PADEL CLUB` | Nombre provisional del club |
| `VITE_WHATSAPP` | *(vacío)* | Número de contacto (formato internacional, sin `+`) |

**Credenciales de demostración del panel** (`/admin/login`):

- Administrador: `admin@padelclub.example` / `admin123`
- Recepción: `recepcion@padelclub.example` / `recepcion123`

## Qué funciona hoy

Frontend: en modo demostración usa datos ficticios en memoria. Backend: implementado según
[docs/api.md](docs/api.md).

| Área | Frontend (demo) | Backend |
|------|-----------------|---------|
| Sitio público (inicio, complejo, canchas y precios, contacto, FAQ) | Operativo | Implementado |
| Flujo de reserva (fecha, duración, horario, datos del cliente) | Operativo | `POST /bookings` con anti-solapamiento |
| Medio de pago de la seña (Mercado Pago / transferencia / efectivo) | Operativo | `paymentMethod` en `POST /bookings` |
| Pago de seña online | Aviso honesto | MP real (preferencia + webhook verificado); `fake` rechaza (503) |
| Pago manual (efectivo/transferencia) | Operativo | Pago `MANUAL` `PENDING` al reservar; el staff **confirma/rechaza** en el panel (`/admin/payments/:id/confirm|reject`) |
| Consulta de reserva por código + email | Operativo | Implementado |
| Panel: dashboard, calendario, reservas, horarios/bloqueos, clientes, pagos | Operativo | Implementado (reservas: estado + observaciones; sin reprogramar) |
| Panel: canchas, precios, reportes, usuarios, configuración | Operativo (ADMIN) | Implementado (reportes: cobrado/reservado/ocupación + export CSV) |
| Autenticación | Simulada en memoria | Sesión en DB + cookie `sid` `HttpOnly` |
| RBAC (ADMIN/RECEPTION) | Ocultamiento de UI | Middleware `authorize` por ruta |

La sesión del panel es **en memoria** en modo demo (no se guardan datos sensibles en
`localStorage`). La autorización real la validará el backend.

## Contenido

| Documento | Descripción |
|-----------|-------------|
| [docs/especificacion.md](docs/especificacion.md) | Especificación funcional, roles, reglas de negocio |
| [docs/arquitectura.md](docs/arquitectura.md) | Stack, estructura, decisiones (ADR), flujo Mercado Pago, seguridad |
| [docs/modelo-datos.md](docs/modelo-datos.md) | Entidades, relaciones, estados y transiciones |
| [docs/api.md](docs/api.md) | Endpoints, contratos y matriz de permisos |
| [docs/pruebas.md](docs/pruebas.md) | Estrategia de pruebas y seguridad |
| [docs/pagos.md](docs/pagos.md) | Pagos: Mercado Pago (flujo, webhooks, casos y pruebas) y pagos manuales (efectivo/transferencia) |
| [docs/despliegue.md](docs/despliegue.md) | Puesta en marcha: base de datos, migraciones, Mercado Pago, producción |

## Resumen de la arquitectura propuesta

- **Monorepo** con `apps/web` (React + Vite + TypeScript + Tailwind), `apps/api`
  (Node + Express + TypeScript + Prisma) y `packages/shared` (tipos y esquemas Zod).
- **PostgreSQL** + **Prisma**. Anti doble-reserva con **restricción de exclusión** de PostgreSQL
  (`btree_gist`) y transacciones.
- **Sesiones** en base de datos con cookie `HttpOnly` (`SameSite=Lax`), contraseñas con
  `argon2id`, RBAC en backend.
- **Mercado Pago**: preferencia de pago + webhook verificado; la confirmación ocurre **solo** en
  el servidor tras reconsultar el pago.
- **Zona horaria** `America/Argentina/Buenos_Aires` (UTC-3) explícita y consistente.
- Identidad visual azul/blanco/gris con **tokens centralizados**.

## Stack

Frontend: React, Vite, TypeScript, Tailwind CSS, React Router.
Backend: Node.js, Express, TypeScript, Zod, pino, cookie-parser, helmet, express-rate-limit.
Datos: PostgreSQL, Prisma.
Pagos: REST de Mercado Pago (vía `fetch`, sin SDK).
Pruebas: Vitest, Supertest (Playwright previsto).
Herramientas: Git, variables de entorno, tsup/tsx, Docker Compose (opcional).

Entorno detectado: Node **v24.14.1**, npm **11.11.0**. Docker **no** está instalado en esta
máquina (se documenta como opcional).

## Datos comerciales que faltan definir

Los siguientes datos **no** se inventaron y deben ser aportados por el propietario; quedan como
configuración editable:

1. **Nombre comercial definitivo** y, si existe, logo e identidad de marca.
2. **Cantidad de canchas**, nombres y características (indoor/outdoor, superficie, iluminación).
3. **Horarios reales** de apertura por día y duración de turnos (60/90/120 min).
4. **Precios** por franja, cancha y duración; moneda/formato.
5. **Modo e importe de seña** (porcentaje o monto fijo) y **ventana de vencimiento** de reservas
   pendientes.
6. **Política de cancelación y reintegros** (plazos, penalizaciones).
7. **Datos de contacto**: dirección, teléfono/WhatsApp, email, redes sociales, ubicación/mapa.
8. **Credenciales de Mercado Pago** (test y producción) y URL pública para webhooks.
9. **Preguntas frecuentes** y textos legales (términos, privacidad).
10. **Usuarios iniciales** del panel y sus roles.
11. **Contenido de galería** (imágenes reales).
12. **Dominio** de despliegue.

## Plan de implementación por etapas

| Etapa | Contenido | Entregable |
|-------|-----------|------------|
| **0. Planificación** ✅ | Especificación, arquitectura, modelo de datos, API, pruebas | Documentos en `docs/` |
| **1. Fundaciones** ✅ | Monorepo, tooling, env, tokens de diseño, frontend con backend simulado | `apps/web` compila, lintea y testea |
| **2. Backend** 🟡 | `apps/api`: Express + Prisma, migraciones, dominio, reservas anti-solapamiento, pagos, auth, RBAC, admin | API implementada; migraciones a aplicar en una DB real |
| **3. Integración público↔API** ⏳ | Cambiar `VITE_USE_MOCKS=false` y verificar el sitio contra el backend real | Reserva `PENDING_PAYMENT` persistida |
| **4. Pagos reales** 🟡 | Mercado Pago real (preferencia + webhook verificado e idempotente, reintentos) y job de vencimiento. Requiere credenciales propias del club | Confirmación de reservas por pago |
| **5. Auditoría, reportes y pulido** ⏳ | Audit log, reportes, exportaciones, accesibilidad, E2E Playwright, hardening | Sistema listo para producción |
| **6. Despliegue** ⏳ | CI/CD, HTTPS, backups, monitoreo, credenciales de producción | Puesta en producción |

## Estructura del repositorio

```
apps/web                       # Frontend React + Vite + TS + Tailwind
  src/app/                     # Providers y definición de rutas
  src/components/{ui,layout,site,booking,admin}
  src/context/                 # Toast y Auth
  src/hooks/                   # useAsync, useZodForm, useDebounce
  src/lib/                     # API, env, datetime, format, status, errores
  src/pages/public             # Sitio público y flujo de reserva
  src/pages/admin              # Panel administrativo
  src/services/                # publicApi / adminApi + backend simulado (mock/)
  src/config/site.ts           # Datos de demostración del club
apps/api                       # Backend Express + TS + Prisma
  prisma/                      # schema.prisma, migrations/, seed.ts
  src/config|domain|infra|middleware|payments|services|routes|utils
  src/app.ts | server.ts | worker.ts
  tests/                       # unit + integration (DB-gated)
packages/shared/src            # Tipos, enums y esquemas Zod compartidos
docs/                          # Documentación de diseño
```

## Primeros pasos (próxima etapa)

1. Definir los datos comerciales pendientes (sección anterior) y reemplazar los datos de
   demostración en `apps/web/src/config/site.ts`.
2. Provisionar PostgreSQL y aplicar migraciones (`npm run prisma:deploy`); cargar datos reales.
3. Configurar credenciales de Mercado Pago (ver [docs/despliegue.md](docs/despliegue.md)).
4. Cambiar `VITE_USE_MOCKS=false` y verificar el frontend contra la API real.
5. Correr la suite de integración contra una base de datos de prueba y sumar E2E (Playwright).

## Licencia

A definir por el propietario.
