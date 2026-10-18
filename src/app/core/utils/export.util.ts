/**
 * Standard utility to export tabular data to CSV with UTF-8 BOM encoding
 * so Excel, Google Sheets, and standard tools display currency symbols & formatting perfectly.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sanitize = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(sanitize).join(',');
  const dataRows = rows.map((row) => row.map(sanitize).join(','));
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanName = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  link.setAttribute('download', `${cleanName}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
