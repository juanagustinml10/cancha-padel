# Pagos — Mercado Pago y pagos manuales · PADEL CLUB

> Integración **real** de Mercado Pago (Checkout Pro / Preferences API, REST oficial sin SDK) para
> el cobro online de la seña, más los **pagos manuales** (efectivo y transferencia bancaria) que
> confirma el staff. Complementa [api.md](api.md), [arquitectura.md](arquitectura.md),
> [modelo-datos.md](modelo-datos.md) y [despliegue.md](despliegue.md).

## 1. Flujo completo

1. El club calcula el precio y la seña (backend es la **única fuente de verdad**).
2. El cliente crea la reserva → `POST /bookings` → `Booking` en `PENDING_PAYMENT` con `expiresAt`.
3. El cliente pide el checkout → `POST /bookings/:code/checkout` → el backend crea una
   **preferencia** en Mercado Pago y devuelve `initPoint` / `sandboxInitPoint`.
4. El cliente paga en el sitio de Mercado Pago.
5. Mercado Pago envía el **webhook** a `POST /api/v1/webhooks/mercadopago`.
6. El backend: registra el evento, **verifica la firma**, **reconsulta el pago** en la API,
   valida moneda/importe/referencia y aplica la decisión de dominio.
7. El cliente consulta `GET /bookings/:code` para ver el estado real. **La página de retorno
   NO confirma nada**: es sólo informativa.

## 2. Variables de entorno

| Variable | Obligatoria con `mercadopago` | Descripción |
|----------|:-----------------------------:|-------------|
| `PAYMENTS_PROVIDER` | — | `fake` (default) o `mercadopago` |
| `MP_ACCESS_TOKEN` | ✅ | Token privado de la aplicación (sólo servidor) |
| `MP_PUBLIC_KEY` | — | Clave pública (si se usa Checkout Bricks) |
| `MP_WEBHOOK_SECRET` | ✅ | Secreto de firma de webhooks |
| `MP_NOTIFICATION_URL` | — | URL del webhook (vacía → `${API_BASE_URL}/api/v1/webhooks/mercadopago`) |
| `APP_BASE_URL` | ✅ (prod) | Base del frontend para URLs de retorno |
| `API_BASE_URL` | ✅ (prod) | Base del API para la URL de notificación |
| `MP_SUCCESS_URL` / `MP_FAILURE_URL` / `MP_PENDING_URL` | — | Overrides de retorno (vacías → `${APP_BASE_URL}/reserva/<código>`) |

Al arrancar, el API **valida** que existan `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` cuando
`PAYMENTS_PROVIDER=mercadopago`, y que `APP_BASE_URL`/`API_BASE_URL` sean HTTPS en producción.

> También se aceptan los nombres `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`,
> `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_NOTIFICATION_URL` y `MERCADOPAGO_SUCCESS_URL` /
> `MERCADOPAGO_FAILURE_URL` / `MERCADOPAGO_PENDING_URL`; se normalizan a `MP_*` al arrancar.

## 3. Configuración en el panel de Mercado Pago

> Estos pasos los realiza el **dueño de la cuenta** (requieren credenciales propias).

1. Crear una **aplicación** en *Tus integraciones*.
2. Copiar **Access Token** y **Public Key** (usar las de **test** en staging).
3. En *Webhooks*, configurar la URL de notificación:
   `https://<tu-dominio>/api/v1/webhooks/mercadopago` y suscribir el evento **pagos**.
4. Copiar la **clave secreta** del webhook → `MP_WEBHOOK_SECRET`.
5. Definir `APP_BASE_URL`, `API_BASE_URL` y `PAYMENTS_PROVIDER=mercadopago`.
6. Probar en modo test con las tarjetas de prueba oficiales.

Sin las credenciales reales del club, la integración **no opera** en producción: con `fake` el
checkout responde **503** `PAYMENTS_DISABLED` y **nunca** se simula un pago aprobado.

## 4. Verificación de la firma del webhook

Cabecera `x-signature: ts=<ts>,v1=<hmac>` y `x-request-id`. El manifiesto es:

```
id:<data.id>;request-id:<x-request-id>;ts:<ts>;
```

Los valores **ausentes se omiten** del manifiesto antes de calcular el HMAC-SHA256 con
`MP_WEBHOOK_SECRET` (indicación de la documentación oficial). La comparación es de tiempo
constante. Una firma inválida responde **401** y no se procesa nada.

## 5. Idempotencia y notificaciones fuera de orden

- Cada notificación se registra en `PaymentWebhookEvent`; se **deduplica** por `eventId` cuando
  Mercado Pago lo envía (reintentos idénticos). Sin `eventId`, la idempotencia real se sostiene
  en la **guarda monótona de estados**: un pago `APPROVED`/`REFUNDED` no retrocede.
- El estado repetido o un retroceso se **ignoran** (`IGNORE`), sin tocar la reserva.
- La actualización de pago + reserva se hace en una **transacción**.
- El checkout es **idempotente**: reutiliza la preferencia pendiente en lugar de duplicarla.

## 6. Casos especiales y política

| Caso | Comportamiento |
|------|----------------|
| **Aprobado válido** (reserva `PENDING_PAYMENT`) | Confirma la reserva; registra importe pagado |
| **Pendiente / en proceso / rechazado** | Registra el pago; la reserva sigue `PENDING_PAYMENT` (permite reintentar) |
| **Importe menor a la seña** | `requiresReview` (no confirma); se ve en el panel |
| **Moneda distinta** | `requiresReview` (no confirma) |
| **Pago tardío** (reserva `EXPIRED`/`CANCELLED`) | `requiresReview`; **nunca** se reasigna la cancha ni se confirma automáticamente |
| **Duplicado / fuera de orden** | Se ignora sin efectos |
| **Error transitorio del proveedor** | El evento queda `FAILED` reintentable; el **worker** reintenta con backoff y límite de intentos |
| **Sobrepago** | Se acepta y se registra |

Los pagos `requiresReview` se listan en `GET /admin/payments?needsReview=true`, con su
`reviewReason`, para resolución manual (reintegrar o conciliar). **No** se toca la cancha ocupada
automáticamente.

## 6.1 Pagos manuales (efectivo y transferencia)

Medios disponibles al reservar: **Mercado Pago** (online, automático), **transferencia bancaria**
y **efectivo** (manuales). La reserva guarda el medio elegido en `Booking.paymentMethod`
(`MERCADOPAGO` / `TRANSFER` / `CASH`).

Reglas:

- Los medios manuales **nunca se marcan pagados solos**. Al finalizar
  `POST /bookings` con `CASH` o `TRANSFER`, la reserva queda `PENDING_PAYMENT` y se crea un
  `Payment` `MANUAL` en estado `PENDING` (sin `paidAt`), salvo que la política de seña aplique.
- La confirmación es **exclusivamente del staff** (staff/admin), y además el medio puede ser
  cobrado en el club sin que el cliente declare nada online.
- Para transferencia, el cliente ve los **datos bancarios** cargados en configuración
  (`bankTransferAlias`, `bankTransferCbu`, `bankTransferAccountHolder`); si están vacíos el sitio
  avisa que todavía no están configurados. No se inventan datos.

Endpoints (staff): `GET/POST /admin/payments`, y para los `MANUAL` **PENDING**:

| Acción | Endpoint | Efecto |
|--------|----------|--------|
| Registrar cobro manual | `POST /admin/payments/manual` | Crea `Payment` `MANUAL` **`APPROVED`** (cobro ya percibido) |
| Confirmar pago declarado | `POST /admin/payments/:id/confirm` | `PENDING` → `APPROVED`; actualiza la reserva |
| Rechazar pago declarado | `POST /admin/payments/:id/reject` | `PENDING` → `REJECTED` con `reason` opcional; la reserva sigue pendiente |

Filtros: reservas por medio y estado (`GET /admin/bookings?paymentMethod=&status=`), y pagos por
proveedor y estado (`GET /admin/payments?provider=MANUAL|MERCADOPAGO&status=`).

> El adjunto de comprobante de transferencia **no** está implementado (no hay almacenamiento de
> archivos). El seguimiento se hace con el `transferReference` (texto) y el código de reserva.

## 7. Reintentos

El worker (`dist/worker.js`) reintenta los webhooks `FAILED` reintentables cada 60 s, con
backoff exponencial (`WEBHOOK_RETRY_BASE_MS`) hasta `WEBHOOK_MAX_ATTEMPTS`. Los fallos permanentes
(firma inválida, datos inválidos) **no** se reintentan.

## 8. Pruebas

- **Unitarias** (sin DB, sin cobros): `tests/unit/payment-processing.test.ts` (aprobado/pendiente/
  rechazado, importe/moneda, pago tardío, fuera de orden) y `tests/unit/payments-provider.test.ts`
  (firma válida/manipulada, omisión de parámetros, proveedor fake).
- **Integración** (requieren `TEST_DATABASE_URL`): `tests/integration/payments.webhook.test.ts`
  con un **proveedor doble** inyectado: confirma reserva, deduplica, pago tardío, firma inválida,
  reintento transitorio y reintento del worker.

```bash
npm run test:api          # unitarios (integran se omiten sin TEST_DATABASE_URL)
```

## 9. Pendiente / requiere credenciales del club

- Cargar credenciales reales de Mercado Pago (test y producción) en `apps/api/.env`.
- Verificar la URL pública del webhook y suscribir el evento de pagos.
- Probar el flujo completo en modo test con tarjetas de prueba.
- Validar cobros reales de punta a punta antes de habilitarlos al público.
