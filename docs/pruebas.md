# Estrategia de pruebas y seguridad — PADEL CLUB

> **Parcialmente implementado (Etapa 2).** Ver §8 para el estado actual de la suite y cómo
> ejecutarla. Las suites de integración están escritas pero requieren base de datos (`TEST_DATABASE_URL`).

## 1. Pirámide de pruebas

```
        E2E (Playwright)
      -------------------
   Integración (Supertest + DB)
 -------------------------------
      Unitarias (Vitest)
```

| Nivel | Herramienta | Alcance |
|-------|-------------|---------|
| Unitaria | Vitest | Lógica pura: precios, disponibilidad, transiciones, validaciones Zod |
| Integración | Vitest + Supertest + PostgreSQL de prueba | Endpoints, DB real, concurrencia, webhooks |
| E2E | Playwright | Flujos completos de usuario y admin en navegador |

## 2. Pruebas unitarias (dominio puro)

- **Cálculo de precio**: selección de regla por cancha/franja/duración/prioridad; snapshot
  inmutable; redondeo en centavos.
- **Cálculo de seña**: modo porcentaje y monto fijo; límites (nunca mayor al total).
- **Disponibilidad**: generación de slots desde horarios; exclusión de reservas activas y
  bloqueos; intervalos `[inicio, fin)`.
- **Transiciones de estado**: matriz permitida/prohibida para `Booking` y `Payment`.
- **Vencimiento**: `expiresAt` calculado correctamente en zona del club.
- **Zona horaria**: entrada `fecha + hora` en `America/Argentina/Buenos_Aires` → UTC correcto;
  casos de borde (medianoche, cambio de día).
- **Validaciones Zod**: campos requeridos, email, teléfono, duraciones permitidas.

## 3. Pruebas de integración (API + DB)

Base de datos PostgreSQL efímera (contenedor o instancia de CI); migraciones Prisma aplicadas
antes de la suite; limpieza entre tests.

Casos críticos:

1. **Anti doble-reserva secuencial**: dos `POST /bookings` al mismo horario → segundo 409.
2. **Anti doble-reserva concurrente**: N peticiones simultáneas al mismo slot → exactamente una
   crea reserva; el resto 409 (valida el constraint de exclusión).
3. **Reserva manual bloquea online** y viceversa.
4. **Bloqueo de mantenimiento** impide reservar en el rango.
5. **Vencimiento**: job marca `EXPIRED` y libera el slot; luego se puede reservar.
6. **Checkout**: crea preferencia (MP mockeado) y devuelve `init_point`.
7. **Webhook**:
   - firma válida + pago aprobado → Booking `CONFIRMED`, Payment `APPROVED`.
   - firma inválida → 401/403, sin cambios.
   - webhook repetido (mismo `payment_id`) → no duplica, sigue `CONFIRMED` (idempotencia).
   - monto distinto al esperado → no confirma, alerta.
8. **Página de retorno no confirma**: `GET /bookings/:code` sin webhook sigue `PENDING_PAYMENT`.
9. **RBAC**: Recepción recibe 403 en endpoints de Admin (canchas, precios, usuarios,
   configuración, reintegros) aunque los invoque directamente.
10. **Autenticación**: login correcto/incorrecto, expiración y rotación de sesión, logout.
11. **Consulta pública**: código + email correctos → estado; email incorrecto → 404/403.
12. **Rate limiting**: exceso de intentos de login y de creación de reservas → 429.
13. **Audit log**: acciones administrativas generan registro con actor y diff.

### 3.1 Mercado Pago en tests
Se define una **interfaz `PaymentProvider`** con implementación real (`MercadoPagoProvider`) y
una **fake/mock** para tests. Así las suites no dependen de la red ni de credenciales. Se
incluye además una suite opcional contra el **sandbox de MP** marcada como no bloquear CI.

## 4. Pruebas E2E (Playwright)

Escenarios:

- **Reserva online feliz**: elegir fecha/cancha/duración → horario → datos → checkout
  (MP sandbox o página simulada) → reserva confirmada visible por código.
- **Consulta de reserva**: código + email → estado correcto; datos erróneos → mensaje de error.
- **Admin login y panel**: inicio de sesión, calendario, creación de reserva manual.
- **Restricción de rol**: usuario Recepción no ve/usa acciones de Admin y el backend las rechaza.
- **Reserva manual bloquea disponibilidad** reflejada en el sitio público.
- **Cancelación** libera el horario y se refleja en disponibilidad.
- **Vencimiento** (con tiempo controlado) libera el horario.

Configuración: base URL, usuario/contraseña de prueba, datos sembrados (seed) reproducibles.

## 5. Cobertura y calidad

- Objetivo de cobertura del dominio: **≥ 85%** en módulos críticos (precio, disponibilidad,
  pagos, auth).
- `tsc --noEmit` sin errores; ESLint sin warnings bloqueantes.
- Tests como parte obligatoria de CI (no merge sin verde).
- Datos de prueba deterministas (semilla fija).

## 6. Seguridad — controles por categoría

### 6.1 Autenticación y sesión
- Hash `argon2id`; nunca loguear contraseñas.
- Cookie `sid`: `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/`.
- Rotación del `sid` al iniciar sesión; expiración absoluta e inactividad.
- Bloqueo/limitación tras intentos fallidos; registro de intentos.

### 6.2 Autorización
- Middleware `authenticate` + `authorize(roles)` por ruta.
- Comprobar propiedad/rol por recurso, no solo presencia de sesión.
- El frontend nunca es la única barrera.

### 6.3 CSRF y CORS
- CORS con allowlist estricta y `credentials: true`.
- Verificación de `Origin`/`Referer` en mutaciones.
- Token CSRF (double-submit) para peticiones que cambian estado.

### 6.4 Validación e inyección
- Zod en el borde; nunca confiar en el cliente (precios, IDs, duraciones).
- Prisma con consultas parametrizadas (sin concatenar SQL).
- Sanitización de entradas de texto libre.

### 6.5 Pagos
- `MP_ACCESS_TOKEN` solo en el servidor.
- Verificación de firma del webhook + reconsulta del pago a la API de MP.
- Validación de monto, moneda y `external_reference`.
- Idempotencia por `providerPaymentId`; tolerancia a reintentos.
- La vuelta del navegador nunca confirma.

### 6.6 Robustez y observabilidad
- `helmet`, límites de tamaño de body, `express-rate-limit`.
- Manejo centralizado de errores sin filtrar stack traces.
- Logs estructurados (pino) + audit log de acciones administrativas.
- Backups de DB y plan de restauración (a definir en despliegue).

### 6.7 Secretos y configuración
- `.env` fuera de git; `.env.example` con placeholders.
- Diferentes credenciales por entorno (test/prod).
- Nada privado en variables `VITE_*` (quedan en el bundle).

## 7. Checklist de seguridad previo a producción

- [ ] HTTPS obligatorio y cookies `Secure`.
- [ ] Credenciales de producción de MP configuradas (no de test).
- [ ] `SESSION_SECRET` fuerte y rotado.
- [ ] CORS restringido al dominio real.
- [ ] Webhooks con URL pública y firma verificada.
- [ ] Rate limiting activo en login, reservas y webhooks.
- [ ] Backups automáticos y prueba de restauración.
- [ ] Revisión de permisos por rol end-to-end.
- [ ] Dependencias auditadas (`npm audit` / Dependabot).
- [ ] Logs sin datos sensibles.

## 8. Estado de implementación (Etapas 2-3)

Comandos (raíz del monorepo):

```
npm run test:api            # vitest run (unit + integración DB-gated)
npm run test:integration -w @padel/api   # sólo integración (requiere TEST_DATABASE_URL)
npm run typecheck:api
npm run lint:api
```

### 8.1 Unitarias implementadas (`apps/api/tests/unit`)

| Archivo | Cubre |
|---------|-------|
| `time.test.ts` | Conversión fecha+hora (zona club) ↔ UTC, `dateKey`, `weekday`, vencimientos |
| `pricing.test.ts` | Selección de regla (especificidad/prioridad), fallback, seña (porcentaje/fijo) |
| `availability.test.ts` | Generación de slots, reservas/bloqueos, franjas pasadas, sin horario |
| `booking-status.test.ts` | Transiciones válidas/inválidas de `Booking` |
| `payment-status.test.ts` | Mapeo de estados del proveedor, `APPROVED` y guardas de transición |
| `payment-processing.test.ts` | Decisión del webhook: aprobado/pendiente/rechazado, importe/moneda, pago tardío, duplicado, fuera de orden |
| `payments-provider.test.ts` | `fake` rechaza cobros (503) y nunca aprueba; firma MP válida/alterada, omisión de parámetros |
| `http.test.ts` | `/health`, CSRF 403 `CSRF_INVALID`, validación 400, 404 uniforme (Supertest) |

### 8.2 Integración (escritas, DB-gated)

- `apps/api/tests/integration/bookings.concurrency.test.ts` — 8 reservas concurrentes al mismo slug:
  exactamente una se crea (409 `SLOT_TAKEN` para el resto) y el mismo horario en canchas distintas
  se permite.
- `apps/api/tests/integration/payments.webhook.test.ts` — con **proveedor doble** inyectado:
  confirma la reserva ante pago aprobado, deduplica eventos, marca revisión ante pago tardío,
  rechaza firma inválida, agenda reintento transitorio y reprocesa el evento desde el worker.

Ambas se ejecutan **sólo** con `TEST_DATABASE_URL` definido; de lo contrario se omiten.

### 8.3 Pendientes

- E2E (Playwright).
- Suite opcional contra sandbox de MP (requiere credenciales reales del club).
