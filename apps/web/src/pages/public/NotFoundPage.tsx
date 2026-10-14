import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { buttonClasses } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div>
      <PageHero
        eyebrow="Error 404"
        title="No encontramos esta página"
        description="Puede que el enlace esté roto o que la página se haya movido."
      >
        <Link to="/" className={buttonClasses('primary', 'md')}>
          <Home className="h-4 w-4" aria-hidden />
          Volver al inicio
        </Link>
      </PageHero>
    </div>
  );
}
