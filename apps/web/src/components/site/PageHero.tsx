import type { ReactNode } from 'react';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Encabezado compacto para páginas internas del sitio público.
 * Mantiene la identidad de la portada sin consumir media pantalla.
 */
export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-night">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-[-7rem] h-56 w-56 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="container-page relative py-10 sm:py-14">
        <div className="max-w-2xl animate-fade-in-up">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{description}</p>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
