import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ConsultationPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || !email.trim()) {
      setError('Ingresá el código de reserva y el email con el que reservaste.');
      return;
    }
    navigate(`/reserva/${encodeURIComponent(code.trim())}?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div>
      <PageHero
        eyebrow="Consulta"
        title="Consultá el estado de tu reserva"
        description="Ingresá el código de reserva y el email con el que la realizaste."
      />
      <section className="section container-page">
        <Card className="mx-auto max-w-lg p-6 sm:p-8">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <Field label="Código de reserva" htmlFor="code" required hint="Ejemplo: PC-100123">
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="PC-000000"
                autoComplete="off"
              />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            {error ? (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" leftIcon={<Search className="h-4 w-4" />}>
              Consultar reserva
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
