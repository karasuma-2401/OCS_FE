import JsBarcode from 'jsbarcode';

// Twelve modules of white space on each side, including for short identifiers.
export const barcodeOptions = { format: 'CODE128', width: 2, height: 48, margin: 0, marginLeft: 24, marginRight: 24, displayValue: false } as const;
export const canEncodeBarcode = (value: string) => Boolean(value && /^[\x20-\x7e]{1,100}$/.test(value));

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_PRINT_MARGIN_MM = 8;
export const BARCODE_GRID_GAP_MM = 3;
export const MAX_BARCODE_COPIES = 50;

export function clampBarcodeCopies(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(MAX_BARCODE_COPIES, Math.trunc(value));
}

export interface A4BarcodeLayoutEstimate {
  rowsPerPage: number;
  labelsPerPage: number;
  estimatedPages: number;
}

export function estimateA4BarcodeLayout(
  totalLabels: number,
  template: { heightMm: number; columns: number },
): A4BarcodeLayoutEstimate {
  const printableHeightMm = A4_HEIGHT_MM - A4_PRINT_MARGIN_MM * 2;
  const labelHeightMm = Math.max(1, Number(template.heightMm) || 35);
  const columns = Math.max(1, Math.trunc(Number(template.columns) || 3));
  const rowsPerPage = Math.max(
    1,
    Math.floor((printableHeightMm + BARCODE_GRID_GAP_MM) / (labelHeightMm + BARCODE_GRID_GAP_MM)),
  );
  const labelsPerPage = columns * rowsPerPage;
  const estimatedPages = totalLabels > 0 ? Math.ceil(totalLabels / labelsPerPage) : 0;
  return { rowsPerPage, labelsPerPage, estimatedPages };
}

export function expandBarcodeItems<T extends { id: string; copies?: number }>(
  items: T[],
  copiesMap?: Record<string, number>,
): T[] {
  const expanded: T[] = [];
  for (const item of items) {
    const count = clampBarcodeCopies(copiesMap?.[item.id] ?? item.copies ?? 1);
    for (let i = 0; i < count; i += 1) {
      expanded.push(item);
    }
  }
  return expanded;
}

export function chunkBarcodePages<T>(items: T[], labelsPerPage: number): T[][] {
  const perPage = Math.max(1, Math.trunc(labelsPerPage) || 1);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}

// Approximate narrow-bar width at 100% print scale. Labels use 1 mm padding
// and a 0.2 mm border on each side; the SVG fills the remaining width.
export function barcodeModuleWidthMm(value: string, labelWidthMm: number): number {
  if (!canEncodeBarcode(value)) return 0;
  const encoded: { encodings?: { data: string }[] } = {};
  JsBarcode(encoded, value, barcodeOptions);
  const modules = encoded.encodings?.reduce((count, item) => count + item.data.length, 0) ?? 0;
  return modules ? Math.max(0, labelWidthMm - 2.4) / (modules + 24) : 0;
}
