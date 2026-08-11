import {
  DocumentLineItem,
  PartySnapshot,
  TaxSummary,
} from '../../common/schemas/shared.schemas';

export type PdfDocumentType =
  | 'sales-order'
  | 'sales-invoice'
  | 'purchase-order'
  | 'purchase-bill'
  | 'credit-note'
  | 'debit-note';

export interface CompanyHeaderInfo {
  name: string;
  legalName?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
}

export interface InvoiceConfigInfo {
  logoUrl?: string;
  header?: string;
  footer?: string;
  termsAndConditions?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  authorizedPersonName?: string;
  signatureUrl?: string;
}

/** Normalized shape every document type is projected into before rendering. */
export interface RenderableDocument {
  docTypeLabel: string;
  docNumber: string;
  date: Date;
  dueDate?: Date;
  reason?: string;
  placeOfSupply?: string;
  party: PartySnapshot;
  partyLabel: string;
  items: DocumentLineItem[];
  taxSummary: TaxSummary;
  status: string;
  extraFields?: { label: string; value: string }[];
}
