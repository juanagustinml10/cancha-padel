import { useState } from 'react';
import { Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useZodForm } from '@/hooks/useZodForm';
import { contactSchema } from '@padel/shared';
import { publicApi } from '@/services/publicApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { DEMO_CLUB } from '@/config/site';
import { env } from '@/lib/env';

export function ContactPage() {
  const form = useZodForm(contactSchema, { fullName: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const whatsapp = env.whatsapp || DEMO_CLUB.whatsapp;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = form.validate();
    if (!data) return;
    setSending(true);
    try {
      await publicApi.sendContact({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message,
      });
      toast.success('Mensaje enviado', 'Te vamos a responder a la brevedad.');
      form.reset();
    } catch (error) {
      toast.error('No se pudo enviar el mensaje', getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Contacto"
        title="Hablemos"
        description="Consultas sobre reservas, clases, torneos o alquiler de canchas. Te respondemos por WhatsApp o email."
      />

      <section className="section container-page">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <Card className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-content">Enviar consulta</h2>
            <p className="mt-1 text-sm text-muted">
              Completá el formulario y nos pondremos en contacto.
            </p>
            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <Field label="Nombre y apellido" htmlFor="contact-name" required error={form.errors.fullName}>
                <Input
                  id="contact-name"
                  value={form.values.fullName}
                  invalid={Boolean(form.errors.fullName)}
                  onChange={(event) => form.setField('fullName', event.target.value)}
                  placeholder="Tu nombre"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="contact-email" required error={form.errors.email}>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.values.email}
                    invalid={Boolean(form.errors.email)}
                    onChange={(event) => form.setField('email', event.target.value)}
                    placeholder="tu@email.com"
                  />
                </Field>
                <Field label="Teléfono" htmlFor="contact-phone" error={form.errors.phone}>
                  <Input
                    id="contact-phone"
                    value={form.values.phone}
                    invalid={Boolean(form.errors.phone)}
                    onChange={(event) => form.setField('phone', event.target.value)}
                    placeholder="+54 9 11 ..."
                  />
                </Field>
              </div>
              <Field label="Mensaje" htmlFor="contact-message" required error={form.errors.message}>
                <Textarea
                  id="contact-message"
                  rows={5}
                  value={form.values.message}
                  invalid={Boolean(form.errors.message)}
                  onChange={(event) => form.setField('message', event.target.value)}
                  placeholder="Contanos en qué podemos ayudarte"
                />
              </Field>
              <Button type="submit" loading={sending} className="sm:w-fit">
                Enviar mensaje
              </Button>
            </form>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-content">Datos del complejo</h2>
              <ul className="mt-4 flex flex-col gap-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-muted">
                    {DEMO_CLUB.address}, {DEMO_CLUB.city}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <a href={`tel:${DEMO_CLUB.phone}`} className="text-muted hover:text-accent">
                    {DEMO_CLUB.phone}
                  </a>
                </li>
                {DEMO_CLUB.email ? (
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                    <a href={`mailto:${DEMO_CLUB.email}`} className="text-muted hover:text-accent">
                      {DEMO_CLUB.email}
                    </a>
                  </li>
                ) : null}
                <li className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-muted">{DEMO_CLUB.openingSummary}</span>
                </li>
              </ul>
              {whatsapp ? (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-[#041018] transition-colors hover:bg-accent-hover"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Escribir por WhatsApp
                </a>
              ) : null}
            </Card>

            <Card className="overflow-hidden">
              <iframe
                title="Mapa de ubicación"
                className="h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${DEMO_CLUB.address}, ${DEMO_CLUB.city}`,
                )}&output=embed`}
              />
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
