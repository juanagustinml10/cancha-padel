import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { loginSchema } from '@padel/shared';
import { Logo } from '@/components/layout/Logo';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useZodForm } from '@/hooks/useZodForm';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { env } from '@/lib/env';

export function AdminLoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useZodForm(loginSchema, { email: '', password: '' });
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = form.validate();
    if (!data) return;
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('Bienvenido', 'Sesión iniciada correctamente.');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('No se pudo iniciar sesión', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    form.setValues({ email, password });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div>
            <h1 className="text-xl font-bold text-content">Panel administrativo</h1>
            <p className="mt-1 text-sm text-muted">Ingresá con tus credenciales de staff.</p>
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <Field label="Email" htmlFor="login-email" required error={form.errors.email}>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={form.values.email}
                invalid={Boolean(form.errors.email)}
                onChange={(event) => form.setField('email', event.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            <Field label="Contraseña" htmlFor="login-password" required error={form.errors.password}>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={form.values.password}
                invalid={Boolean(form.errors.password)}
                onChange={(event) => form.setField('password', event.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" loading={submitting} fullWidth leftIcon={<Lock className="h-4 w-4" />}>
              Ingresar
            </Button>
          </form>

          {env.useMocks ? (
            <div className="mt-6 rounded-xl border border-brand/30 bg-brand-soft p-4 text-xs text-content">
              <p className="inline-flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                Credenciales de demostración
              </p>
              <p className="mt-1.5 text-muted">Usá cualquiera de estos accesos ficticios:</p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@padelclub.example', 'admin123')}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary"
                >
                  <span className="font-medium text-ink">Administrador</span>
                  <span className="font-mono text-[11px] text-muted">admin@padelclub.example / admin123</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('recepcion@padelclub.example', 'recepcion123')}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary"
                >
                  <span className="font-medium text-ink">Recepción</span>
                  <span className="font-mono text-[11px] text-muted">recepcion@padelclub.example / recepcion123</span>
                </button>
              </div>
            </div>
          ) : null}
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          La autenticación real se valida en el backend mediante cookies seguras.
        </p>
      </div>
    </div>
  );
}
