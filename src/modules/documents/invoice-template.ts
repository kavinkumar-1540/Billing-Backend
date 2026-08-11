import { formatPaiseAsInr } from '../../common/money/money.util';
import {
  CompanyHeaderInfo,
  InvoiceConfigInfo,
  RenderableDocument,
} from './documents.types';

function escapeHtml(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function addressLines(address?: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  if (!address) return '';
  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br/>');
}

const hasIgst = (doc: RenderableDocument) => doc.taxSummary.igst > 0;

export function renderDocumentHtml(
  doc: RenderableDocument,
  company: CompanyHeaderInfo,
  invoiceConfig: InvoiceConfigInfo | undefined,
): string {
  const igst = hasIgst(doc);

  const rows = doc.items
    .map(
      (line, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(line.name)}${line.sku ? `<div class="muted">${escapeHtml(line.sku)}</div>` : ''}</td>
        <td class="c">${escapeHtml(line.hsnSac)}</td>
        <td class="c">${line.quantity}${line.unit ? ` ${escapeHtml(line.unit)}` : ''}</td>
        <td class="r">${formatPaiseAsInr(line.rate)}</td>
        <td class="c">${line.gstRatePercent}%</td>
        <td class="r">${formatPaiseAsInr(line.taxableValue)}</td>
        <td class="r">${formatPaiseAsInr(line.total)}</td>
      </tr>`,
    )
    .join('');

  const extraRows = (doc.extraFields ?? [])
    .map(
      (f) =>
        `<div class="meta-row"><span>${escapeHtml(f.label)}</span><span>${escapeHtml(f.value)}</span></div>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; margin: 0; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 16px; }
  .company-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .muted { color: #666; font-size: 10.5px; }
  .doc-title { font-size: 22px; font-weight: 700; text-align: right; text-transform: uppercase; letter-spacing: 1px; }
  .doc-number { text-align: right; font-size: 13px; margin-top: 4px; }
  .meta-row { display: flex; justify-content: space-between; gap: 16px; padding: 1px 0; }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
  .party-block { flex: 1; }
  .party-block h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; }
  th { background: #f5f5f5; text-align: left; font-weight: 600; }
  .c { text-align: center; }
  .r { text-align: right; }
  .totals { width: 320px; margin-left: auto; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #1a1a1a; padding-top: 6px; margin-top: 4px; }
  .footer { margin-top: 32px; display: flex; justify-content: space-between; gap: 24px; }
  .bank-block, .terms-block { flex: 1; font-size: 10.5px; color: #444; }
  .signature { margin-top: 48px; text-align: right; font-size: 11px; }
  .signature-line { border-top: 1px solid #1a1a1a; width: 180px; margin: 32px 0 4px auto; }
  .reason { margin-bottom: 12px; padding: 8px 12px; background: #fffbe6; border: 1px solid #f0e0a0; font-size: 11px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; background: #eee; margin-top: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${escapeHtml(company.name)}</div>
      <div class="muted">${addressLines(company.address)}</div>
      ${company.gstin ? `<div class="muted">GSTIN: ${escapeHtml(company.gstin)}</div>` : ''}
      ${company.phone || company.email ? `<div class="muted">${escapeHtml(company.phone)}${company.phone && company.email ? ' · ' : ''}${escapeHtml(company.email)}</div>` : ''}
    </div>
    <div>
      <div class="doc-title">${escapeHtml(doc.docTypeLabel)}</div>
      <div class="doc-number"># ${escapeHtml(doc.docNumber)}</div>
      <div class="status-badge">${escapeHtml(doc.status)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-block">
      <h4>${escapeHtml(doc.partyLabel)}</h4>
      <div><strong>${escapeHtml(doc.party.name)}</strong></div>
      ${doc.party.businessName ? `<div>${escapeHtml(doc.party.businessName)}</div>` : ''}
      <div>${addressLines(doc.party.address)}</div>
      ${doc.party.gstin ? `<div>GSTIN: ${escapeHtml(doc.party.gstin)}</div>` : ''}
      ${doc.party.phone ? `<div>${escapeHtml(doc.party.phone)}</div>` : ''}
    </div>
    <div class="party-block">
      <div class="meta-row"><span>Date</span><span>${formatDate(doc.date)}</span></div>
      ${doc.dueDate ? `<div class="meta-row"><span>Due Date</span><span>${formatDate(doc.dueDate)}</span></div>` : ''}
      ${doc.placeOfSupply ? `<div class="meta-row"><span>Place of Supply</span><span>${escapeHtml(doc.placeOfSupply)}</span></div>` : ''}
      ${extraRows}
    </div>
  </div>

  ${doc.reason ? `<div class="reason"><strong>Reason:</strong> ${escapeHtml(doc.reason)}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th class="c">#</th>
        <th>Item</th>
        <th class="c">HSN/SAC</th>
        <th class="c">Qty</th>
        <th class="r">Rate</th>
        <th class="c">GST</th>
        <th class="r">Taxable</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatPaiseAsInr(doc.taxSummary.subtotal)}</span></div>
    ${doc.taxSummary.totalDiscount > 0 ? `<div class="row"><span>Discount</span><span>-${formatPaiseAsInr(doc.taxSummary.totalDiscount)}</span></div>` : ''}
    <div class="row"><span>Taxable Amount</span><span>${formatPaiseAsInr(doc.taxSummary.taxableAmount)}</span></div>
    ${
      igst
        ? `<div class="row"><span>IGST</span><span>${formatPaiseAsInr(doc.taxSummary.igst)}</span></div>`
        : `<div class="row"><span>CGST</span><span>${formatPaiseAsInr(doc.taxSummary.cgst)}</span></div>
           <div class="row"><span>SGST</span><span>${formatPaiseAsInr(doc.taxSummary.sgst)}</span></div>`
    }
    ${doc.taxSummary.cess > 0 ? `<div class="row"><span>Cess</span><span>${formatPaiseAsInr(doc.taxSummary.cess)}</span></div>` : ''}
    ${doc.taxSummary.roundOff !== 0 ? `<div class="row"><span>Round Off</span><span>${formatPaiseAsInr(doc.taxSummary.roundOff)}</span></div>` : ''}
    <div class="row grand"><span>Grand Total</span><span>${formatPaiseAsInr(doc.taxSummary.grandTotal)}</span></div>
  </div>

  <div class="footer">
    <div class="bank-block">
      ${
        invoiceConfig?.bankName
          ? `<div><strong>Bank Details</strong></div>
             <div>${escapeHtml(invoiceConfig.bankName)}</div>
             ${invoiceConfig.bankAccountNumber ? `<div>A/C: ${escapeHtml(invoiceConfig.bankAccountNumber)}</div>` : ''}
             ${invoiceConfig.bankIfsc ? `<div>IFSC: ${escapeHtml(invoiceConfig.bankIfsc)}</div>` : ''}
             ${invoiceConfig.bankBranch ? `<div>${escapeHtml(invoiceConfig.bankBranch)}</div>` : ''}`
          : ''
      }
    </div>
    <div class="terms-block">
      ${invoiceConfig?.termsAndConditions ? `<div><strong>Terms &amp; Conditions</strong></div><div>${escapeHtml(invoiceConfig.termsAndConditions)}</div>` : ''}
    </div>
  </div>

  <div class="signature">
    <div>For ${escapeHtml(company.name)}</div>
    <div class="signature-line"></div>
    <div>${escapeHtml(invoiceConfig?.authorizedPersonName) || 'Authorized Signatory'}</div>
  </div>

  ${invoiceConfig?.footer ? `<div class="muted" style="margin-top:24px;text-align:center;">${escapeHtml(invoiceConfig.footer)}</div>` : ''}
</body>
</html>`;
}
