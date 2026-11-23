/**
 * Prints the rendered thermal receipt DOM node inside an isolated hidden iframe
 * configured for 80mm thermal paper, avoiding modal overflow/scroll clipping.
 */
export function printThermalReceiptElement(
  containerOrReceipt: HTMLElement | null,
  documentTitle = 'Hoa-don-ban-le-OCS',
): boolean {
  if (typeof document === 'undefined' || !containerOrReceipt) {
    window.print();
    return false;
  }

  const receiptNode = containerOrReceipt.matches('[data-testid="pos-thermal-receipt"]')
    ? containerOrReceipt
    : containerOrReceipt.querySelector<HTMLElement>('[data-testid="pos-thermal-receipt"]');

  if (!receiptNode) {
    window.print();
    return false;
  }

  const cloned = receiptNode.cloneNode(true) as HTMLElement;
  cloned.classList.remove('pos-paper-feeding', 'pos-paper-tearing', 'is-torn-bottom');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) {
    iframe.remove();
    window.print();
    return false;
  }

  const printStyles = `
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 76mm;
      margin: 0 auto;
      padding: 2mm 1mm;
      background: #ffffff;
      color: #111827;
      font-family: "Be Vietnam Pro", system-ui, -apple-system, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print { display: none !important; }
    .pos-thermal-paper {
      position: relative;
      width: 100%;
      background: #ffffff;
      color: #111827;
      font-family: "Space Mono", "Courier New", Courier, monospace;
    }
    .pos-thermal-paper [data-receipt-header] {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2px;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 1px dashed #6b7280;
      font-size: 11px;
      color: #374151;
    }
    .pos-thermal-paper [data-receipt-header] h3 {
      font-family: "Be Vietnam Pro", system-ui, sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 2px;
    }
    .grid { display: grid; }
    .grid-cols-\\[28px_1fr_auto\\] { grid-template-columns: 28px 1fr auto; }
    .gap-1\\.5 { gap: 6px; }
    .pos-receipt-items-scroll {
      max-height: none !important;
      overflow: visible !important;
      padding-right: 0 !important;
    }
    .pos-thermal-paper [data-receipt-line] {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr) auto;
      column-gap: 6px;
      align-items: baseline;
      width: 100%;
      padding: 4px 0;
      border-bottom: 1px dotted #d1d5db;
    }
    .pos-thermal-paper [data-receipt-line]:last-child { border-bottom: none; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .min-w-0 { min-width: 0; }
    .flex { display: flex; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: "Space Mono", "Courier New", Courier, monospace; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-extrabold { font-weight: 800; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .pos-thermal-paper [data-receipt-summary] {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #6b7280;
    }
    .pos-thermal-paper [data-receipt-row] {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 11.5px;
    }
    .pos-thermal-paper [data-receipt-total] {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 5px 0;
      padding: 5px 0;
      border-top: 1.5px solid #111827;
      border-bottom: 1.5px solid #111827;
      font-family: "Be Vietnam Pro", system-ui, sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #111827;
    }
    .pos-barcode-graphic {
      display: block;
      height: 28px;
      margin: 10px 10px 4px;
      background: repeating-linear-gradient(90deg,
        #111827 0 2px, transparent 2px 4px,
        #111827 4px 5px, transparent 5px 8px,
        #111827 8px 11px, transparent 11px 13px,
        #111827 13px 16px, transparent 16px 17px,
        #111827 17px 20px, transparent 20px 23px);
    }
    footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #6b7280;
      text-align: center;
      font-size: 9.5px;
      line-height: 1.35;
      color: #374151;
    }
    .pos-paid-stamp {
      position: absolute;
      left: 50%;
      top: 58%;
      margin-left: -70px;
      margin-top: -20px;
      padding: 4px 12px;
      border: 3px solid #dc2626;
      border-radius: 6px;
      color: #dc2626;
      background: rgba(254, 242, 242, 0.9);
      font-family: "Be Vietnam Pro", system-ui, sans-serif;
      font-size: 16px;
      font-weight: 900;
      transform: rotate(-11deg);
    }
  `;

  frameDoc.open();
  frameDoc.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle.replace(/[<>&"]/g, '')}</title>
  <style>${printStyles}</style>
</head>
<body></body>
</html>`);
  frameDoc.close();

  frameDoc.body.appendChild(cloned);

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 500);
  };

  frameWin.onafterprint = cleanup;
  window.setTimeout(() => {
    try {
      frameWin.focus();
      frameWin.print();
    } catch {
      window.print();
    } finally {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 60_000);
    }
  }, 60);

  return true;
}
