import JsBarcode from 'jsbarcode';

// Twelve modules of white space on each side, including for short identifiers.
export const barcodeOptions = { format: 'CODE128', width: 2, height: 48, margin: 0, marginLeft: 24, marginRight: 24, displayValue: false } as const;
export const canEncodeBarcode = (value: string) => Boolean(value && /^[\x20-\x7e]{1,100}$/.test(value));

// Approximate narrow-bar width at 100% print scale. Labels use 1 mm padding
// and a 0.2 mm border on each side; the SVG fills the remaining width.
export function barcodeModuleWidthMm(value: string, labelWidthMm: number): number {
  if (!canEncodeBarcode(value)) return 0;
  const encoded: { encodings?: { data: string }[] } = {};
  JsBarcode(encoded, value, barcodeOptions);
  const modules = encoded.encodings?.reduce((count, item) => count + item.data.length, 0) ?? 0;
  return modules ? Math.max(0, labelWidthMm - 2.4) / (modules + 24) : 0;
}
