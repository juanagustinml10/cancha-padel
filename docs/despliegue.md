# Despliegue y puesta en marcha — PADEL CLUB

> Guía operativa para llevar el sistema (frontend + backend) a un entorno real.
> Complementa [arquitectura.md](arquitectura.md), [modelo-datos.md](modelo-datos.md) y
> [api.md](api.md).

## 1. Requisitos

- Node.js **v20+** (probado con v24).
- PostgreSQL **14+** (probado con 18). Se requiere la extensión `btree_gist` (viene con
  `postgresql-contrib`; se habilita automáticamente en la migración `no_overlap`).
- npm (workspaces) y, opcionalmente, Docker para levantar PostgreSQL local.

## 2. Instalación

```bash
npm install          # instala todos los workspaces
npm run prisma:generate
```

## 3. Variables de entorno

### 3.1 Backend (`apps/api/.env`)

Copiar `apps/api/.env.example` a `apps/api/.env` y completar. **Nunca** versionar `.env`.

| Variable | Obligatoria | Descripción |
|----------|:-----------:|-------------|
| `NODE_ENV` | ✅ | `development` / `test` / `production` |
| `PORT` | ✅ | Puerto HTTP del API (p. ej. `4000`) |
| `TZ` | ✅ | `America/Argentina/Buenos_Aires` |
| `DATABASE_URL` | ✅ | Cadena de conexión PostgreSQL (Prisma) |
| `TEST_DATABASE_URL` | — | DB para pruebas de integración (si vacía, se omiten) |
| `SESSION_SECRET` | ✅ | Secreto largo y aleatorio |
| `CORS_ORIGIN` | ✅ | Origen(es) del frontend, separados por coma |
| `SESSION_TTL_HOURS` | — | Duración de sesión (por defecto 12) |
| `CLUB_NAME` | — | Nombre del club |
| `BOOKING_HOLD_MINUTES` | — | Ventana de vencimiento de reservas pendientes |
| `DEPOSIT_MODE` | — | `percent` o `fixed_amount` |
| `DEPOSIT_PERCENT` | — | Porcentaje de seña |
| `DEPOSIT_FIXED_AMOUNT_CENTS` | — | Seña fija en centavos |
| `CURRENCY` | — | `ARS` |
| `APP_BASE_URL` | — | Base pública del frontend (URLs de retorno). HTTPS en producción |
| `API_BASE_URL` | — | Base pública del API (URL de notificación). HTTPS en producción |
| `PAYMENTS_PROVIDER` | — | `fake` (default) o `mercadopago` |
| `MP_ACCESS_TOKEN` | MP | Token privado (solo servidor). Obligatorio con `mercadopago` |
| `MP_PUBLIC_KEY` | MP | Clave pública |
| `MP_WEBHOOK_SECRET` | MP | Secreto de firma del webhook. Obligatorio con `mercadopago` |
| `MP_NOTIFICATION_URL` | MP | URL pública del webhook (si vacía: `${API_BASE_URL}/api/v1/webhooks/mercadopago`) |
| `MP_SUCCESS_URL` / `MP_FAILURE_URL` / `MP_PENDING_URL` | MP | URLs de retorno (si vacías: `${APP_BASE_URL}/reserva/<código>`) |
| `SEED_*` | dev | Credenciales del seed (solo desarrollo) |

### 3.2 Frontend (`apps/web/.env`)

Solo variables públicas (`VITE_*`). Nunca incluir secretos.

| Variable | Descripción |
|----------|-------------|
| `VITE_USE_MOCKS` | `false` para usar la API real |
| `VITE_API_URL` | Base de la API (`/api/v1` detrás de proxy, o URL absoluta) |
| `VITE_APP_NAME` | Nombre visible |
| `VITE_WHATSAPP` | Contacto (formato internacional, sin `+`) |

## 4. Base de datos y migraciones

1. Crear base de datos y usuario (ejemplo):

   ```sql
   CREATE DATABASE padel;
   CREATE USER padel WITH ENCRYPTED PASSWORD 'una-clave-fuerte';
   GRANT ALL PRIVILEGES ON DATABASE padel TO padel;
   ```

2. Aplicar migraciones en un entorno **existente** (producción/CI):

   ```bash
   npm run prisma:deploy      # prisma migrate deploy
   ```

3. Desarrollo (crea migraciones nuevas si se edita el esquema):

   ```bash
   npm run prisma:migrate     # prisma migrate dev
   ```

4. Datos de ejemplo (solo desarrollo):

   ```bash
   npm run prisma:seed        # NO ejecutar en producción
   ```

Las migraciones (`apps/api/prisma/migrations`) incluyen:

- `20260101000000_init` — esquema completo.
- `20260101000100_no_overlap` — `btree_gist` + constraint de exclusión anti doble-reserva +
  `CHECK` de integridad.

> La migración `no_overlap` crea `EXTENSION btree_gist` y requiere permisos suficientes
> (superusuario o rol con `CREATE EXTENSION`). En proveedores gestionados suele alcanzar con
> habilitar la extensión desde el panel.

## 5. Mercado Pago

Ver la guía dedicada **[pagos.md](pagos.md)** (credenciales, webhooks, casos especiales y
pruebas). Requiere credenciales propias del club: sin `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`
reales el cobro no puede operar en producción.

> Con `PAYMENTS_PROVIDER=fake` (o sin `MP_ACCESS_TOKEN`) el checkout responde **503**
> `PAYMENTS_DISABLED`. **No** se simulan pagos aprobados.

## 6. Ejecución

### 6.1 Desarrollo

```bash
npm run dev:api      # API en http://localhost:4000
npm run dev:web      # Frontend en http://localhost:5173 (proxy /api -> 4000)
npm run dev:worker   # Worker de vencimiento de reservas
```

### 6.2 Producción

```bash
npm run build        # build de web (estático) y api (dist/)
npm run start -w @padel/api        # node dist/server.js
npm run start:worker -w @padel/api # node dist/worker.js
```

- Servir `apps/web/dist` como sitio estático (CDN/Nginx/host).
- Ejecutar el API como servicio Node detrás de un proxy con **HTTPS** (cookies `Secure`).
- Programar el **worker** (`dist/worker.js`) como proceso/servicio independiente para vencer
  reservas `PENDING_PAYMENT` y liberar horarios.

## 7. Checklist previo a producción

- [ ] `NODE_ENV=production`, HTTPS y cookies `Secure`.
- [ ] `SESSION_SECRET` fuerte, único y rotado.
- [ ] `CORS_ORIGIN` restringido al dominio real.
- [ ] `DATABASE_URL` de producción y migraciones aplicadas (`prisma:deploy`).
- [ ] Backups automáticos de la base de datos + prueba de restauración.
- [ ] Credenciales de **producción** de Mercado Pago (no de test).
- [ ] `MP_WEBHOOK_SECRET` y `MP_NOTIFICATION_URL` públicos y correctos.
- [ ] Worker de vencimiento activo.
- [ ] Logs sin datos sensibles; monitoreo/alertas configurados.
- [ ] Dependencias auditadas (`npm audit`).

## 8. Notas

- La aplicación es **machine-independent**: no contiene rutas absolutas locales.
- El alias `@/*` se resuelve en dev con `tsx` y en build con `tsup`.
- Los tests de integración/concurrencia sólo corren con `TEST_DATABASE_URL`.
