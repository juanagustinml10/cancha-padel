import { Link } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/services/adminApi';
import { formatDateTime } from '@/lib/format';
import type { SecurityCameraStatus } from '@padel/shared';

const CAMERA_STATUS: Record<SecurityCameraStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ONLINE: { label: 'En línea', variant: 'success' },
  OFFLINE: { label: 'Sin conexión', variant: 'danger' },
  UNKNOWN: { label: 'Sin verificar', variant: 'neutral' },
};

const REQUIREMENTS = [
  {
    icon: Camera,
    title: 'Fuente de video',
    description: 'Cámaras IP o canales del NVR accesibles por RTSP u ONVIF desde la red del club.',
  },
  {
    icon: ServerCog,
    title: 'Puerta de enlace',
    description: 'Un servicio HLS o WebRTC que convierta la señal: los navegadores no reproducen RTSP directo.',
  },
  {
    icon: KeyRound,
    title: 'Credenciales protegidas',
    description: 'Usuarios y claves de cámara solo en el servidor. Nunca en variables VITE_* ni en el navegador.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso restringido',
    description: 'Cada solicitud de video debe validar sesión y rol ADMIN en el backend antes de entregar la señal.',
  },
];

export function AdminCamerasPage() {
  const overview = useAsync(() => adminApi.getCameras(), []);
  const data = overview.data;
  const cameras = data?.cameras ?? [];
  const notConfigured = !data || data.status === 'NOT_CONFIGURED';

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Seguridad"
        title="Cámaras de seguridad"
        description="Monitoreo del complejo. Esta sección solo está disponible para administradores y no expone credenciales ni direcciones privadas."
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              loading={overview.loading}
              onClick={() => void overview.retry()}
            >
              Actualizar estado
            </Button>
            <Link to="/admin" className="hidden sm:inline-flex">
              <Button variant="ghost">Volver al resumen</Button>
            </Link>
          </>
        }
      />

      {overview.error ? (
        <ErrorState message={overview.error} onRetry={overview.retry} />
      ) : overview.loading ? (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <Card
            className={
              notConfigured
                ? 'border-warning/30 bg-warning-soft/20 p-4'
                : 'border-success/25 bg-success-soft/15 p-4'
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-surface ${
                    notConfigured ? 'border-warning/30 text-warning' : 'border-success/30 text-success'
                  }`}
                >
                  {notConfigured ? (
                    <CircleDashed className="h-5 w-5" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  )}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-content">
                      {notConfigured ? 'Integración no configurada' : 'Integración configurada'}
                    </p>
                    <Badge variant={notConfigured ? 'warning' : 'success'}>
                      {notConfigured ? 'Pendiente' : 'Activa'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {notConfigured
                      ? 'No hay una fuente de video conectada. No se muestran imágenes ni transmisiones simuladas.'
                      : 'El servicio de video respondió correctamente.'}
                  </p>
                  {data ? (
                    <p className="mt-1 text-xs text-muted">
                      Última verificación: {formatDateTime(data.checkedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              <Badge variant="navy" className="w-fit">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
                Solo administradores
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-content">Vista en vivo</h2>
                  <p className="text-xs text-muted">
                    {cameras.length > 0 ? `${cameras.length} canales disponibles` : 'Sin canales de video'}
                  </p>
                </div>
                <Badge variant="neutral">{cameras.length} / canales</Badge>
              </div>

              <div className="relative m-4 aspect-video overflow-hidden rounded-xl border border-line bg-night">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(46,107,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(46,107,255,0.10) 1px, transparent 1px)',
                    backgroundSize: '42px 42px',
                  }}
                  aria-hidden
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line-strong bg-surface/80 text-muted">
                    <VideoOff className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-content">
                      {notConfigured ? 'Sin señal configurada' : 'Seleccioná un canal'}
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-muted">
                      {notConfigured
                        ? 'La reproducción se habilitará cuando exista una fuente RTSP y un servicio HLS o WebRTC configurados en el servidor.'
                        : 'Las transmisiones se muestran únicamente a administradores autenticados.'}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-line bg-night/80 px-3 py-2 text-[11px] text-muted backdrop-blur-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <LockKeyhole className="h-3 w-3" aria-hidden />
                    Acceso autenticado
                  </span>
                  <span>Sin grabación ni audio</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-semibold text-content">Qué falta para conectar</h2>
              <p className="mt-0.5 text-xs text-muted">
                Requisitos mínimos antes de habilitar la vista en vivo.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {REQUIREMENTS.map((requirement) => {
                  const Icon = requirement.icon;
                  return (
                    <li key={requirement.title} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-accent">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-content">{requirement.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">{requirement.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-content">Canales</h2>
                <p className="text-xs text-muted">
                  Las cámaras se administran desde el servidor; esta versión no guarda grabaciones.
                </p>
              </div>
              <Badge variant="neutral">Solo lectura</Badge>
            </div>

            {cameras.length === 0 ? (
              <EmptyState
                icon={<Camera className="h-6 w-6" aria-hidden />}
                title="Sin canales configurados"
                description="Cuando exista una integración de video, los canales aparecerán acá con su estado de conexión."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cameras.map((camera) => {
                  const status = CAMERA_STATUS[camera.status];
                  return (
                    <Card key={camera.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-accent">
                            <Camera className="h-4 w-4" aria-hidden />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-content">{camera.name}</p>
                            <p className="text-xs text-muted">{camera.location}</p>
                          </div>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-muted">Protocolo</dt>
                          <dd className="mt-0.5 font-medium text-ink">{camera.protocol}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Cancha</dt>
                          <dd className="mt-0.5 font-medium text-ink">{camera.courtName ?? '—'}</dd>
                        </div>
                      </dl>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-content">Seguridad de esta sección</p>
                <p className="mt-1 text-muted">
                  El backend exige sesión activa y rol ADMIN en cada consulta. No se envían URLs de
                  cámara, usuarios ni claves al navegador, y no se incluyen audio, grabación ni
                  histórico porque no forman parte de este alcance.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
