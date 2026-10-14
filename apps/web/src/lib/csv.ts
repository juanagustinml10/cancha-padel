// Exportación CSV segura: neutraliza fórmulas para evitar inyección al abrir en Excel/Sheets.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeValue(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const guarded = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [headers.map(escapeValue).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeValue).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
