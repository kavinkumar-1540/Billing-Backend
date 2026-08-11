import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  DocumentSequence,
  DocumentSequenceDocument,
  DocumentType,
} from './schemas/document-sequence.schema';

const DEFAULT_PREFIXES: Record<DocumentType, string> = {
  [DocumentType.SALES_ORDER]: 'SO',
  [DocumentType.SALES_INVOICE]: 'INV',
  [DocumentType.PURCHASE_ORDER]: 'PO',
  [DocumentType.PURCHASE_BILL]: 'PUR',
  [DocumentType.CREDIT_NOTE]: 'CN',
  [DocumentType.DEBIT_NOTE]: 'DN',
  [DocumentType.PAYMENT_RECEIPT]: 'REC',
  [DocumentType.PAYMENT_PAYMENT]: 'PAY',
};

/**
 * Generates concurrency-safe, gap-free-per-writer document numbers using an
 * atomic $inc on a per-company/docType/financialYear counter document.
 * Must always be called within the same transaction/session as the document
 * it numbers, so a rolled-back document does not leave the counter advanced
 * out of sync with what actually persisted (a harmless gap, never a dupe).
 */
@Injectable()
export class DocumentSequenceService {
  constructor(
    @InjectModel(DocumentSequence.name)
    private readonly sequenceModel: Model<DocumentSequenceDocument>,
  ) {}

  /** Indian financial year label (e.g. "2026" for FY starting April 2025) keyed off month=4 default. */
  resolveFinancialYear(date: Date, financialYearStartMonth = 4): string {
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();
    return month >= financialYearStartMonth ? String(year + 1) : String(year);
  }

  async getNextNumber(
    companyId: Types.ObjectId,
    docType: DocumentType,
    financialYear: string,
    session: ClientSession,
  ): Promise<string> {
    const sequence = await this.sequenceModel.findOneAndUpdate(
      { companyId, docType, financialYear },
      {
        $inc: { currentNumber: 1 },
        $setOnInsert: { prefix: DEFAULT_PREFIXES[docType], numberLength: 5 },
      },
      { upsert: true, new: true, session },
    );

    const padded = String(sequence.currentNumber).padStart(
      sequence.numberLength,
      '0',
    );
    return `${sequence.prefix}-${financialYear}-${padded}`;
  }
}
