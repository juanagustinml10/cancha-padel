import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  loading,
  empty,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{empty ?? null}</>;
  }

  const handleKey = (row: T) => (event: React.KeyboardEvent) => {
    if (!onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* Tabla — pantallas medianas en adelante */}
      <div className="hidden overflow-x-auto subtle-scrollbar md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-content">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={keyExtractor(row)}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-2/70 focus-visible:bg-surface-2',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? handleKey(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 align-middle text-ink', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — móvil */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => {
          const content = (
            <>
              {columns.map((column) => {
                if (!column.header) {
                  return (
                    <div key={column.key} className="flex justify-end pt-1">
                      {column.render(row)}
                    </div>
                  );
                }
                return (
                  <div key={column.key} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
                      {column.header}
                    </span>
                    <span className="text-right text-sm text-ink">{column.render(row)}</span>
                  </div>
                );
              })}
            </>
          );

          return (
            <li key={keyExtractor(row)}>
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  className="flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-surface-2/70"
                >
                  {content}
                </button>
              ) : (
                <div className="flex flex-col gap-2 px-4 py-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
