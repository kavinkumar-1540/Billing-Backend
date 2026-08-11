import { Injectable } from '@nestjs/common';
import { rupeesToPaise } from '../../common/money/money.util';

export interface TaxLineInput {
  quantity: number;
  rate: number; // paise, per unit
  discountPercent?: number;
  discountAmount?: number; // paise, flat, applied in addition to discountPercent
  gstRatePercent: number;
  cessRatePercent?: number;
}

export interface TaxLineResult {
  taxableValue: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

export interface TaxDocumentResult {
  lines: TaxLineResult[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  grandTotal: number;
}

/**
 * Single source of truth for all GST math in the system. Sales/purchase
 * documents call this both for live preview and — authoritatively — at
 * issue/confirm time, discarding whatever totals the client submitted.
 * All amounts are integer paise; never floating-point rupees.
 */
@Injectable()
export class TaxCalculationService {
  /**
   * @param supplierStateCode  the company's registered state code
   * @param placeOfSupplyStateCode  the buyer/place-of-supply state code
   */
  calculateDocument(
    lines: TaxLineInput[],
    supplierStateCode: string,
    placeOfSupplyStateCode: string,
  ): TaxDocumentResult {
    const isIntraState = supplierStateCode === placeOfSupplyStateCode;

    const lineResults = lines.map((line) =>
      this.calculateLine(line, isIntraState),
    );

    const subtotal = lines.reduce(
      (sum, l) => sum + Math.round(l.quantity * l.rate),
      0,
    );
    const totalDiscount = lineResults.reduce(
      (sum, l) => sum + l.discountAmount,
      0,
    );
    const taxableAmount = lineResults.reduce(
      (sum, l) => sum + l.taxableValue,
      0,
    );
    const cgst = lineResults.reduce((sum, l) => sum + l.cgst, 0);
    const sgst = lineResults.reduce((sum, l) => sum + l.sgst, 0);
    const igst = lineResults.reduce((sum, l) => sum + l.igst, 0);
    const cess = lineResults.reduce((sum, l) => sum + l.cess, 0);

    const preRoundTotal = taxableAmount + cgst + sgst + igst + cess;
    const grandTotal = Math.round(preRoundTotal);
    const roundOff = grandTotal - preRoundTotal;

    return {
      lines: lineResults,
      subtotal,
      totalDiscount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      cess,
      roundOff,
      grandTotal,
    };
  }

  private calculateLine(
    line: TaxLineInput,
    isIntraState: boolean,
  ): TaxLineResult {
    const gross = Math.round(line.quantity * line.rate);
    const percentDiscount = line.discountPercent
      ? Math.round((gross * line.discountPercent) / 100)
      : 0;
    const flatDiscount = line.discountAmount ?? 0;
    const discountAmount = percentDiscount + flatDiscount;
    const taxableValue = Math.max(0, gross - discountAmount);

    const gstAmount = Math.round((taxableValue * line.gstRatePercent) / 100);
    const cess = line.cessRatePercent
      ? Math.round((taxableValue * line.cessRatePercent) / 100)
      : 0;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isIntraState) {
      cgst = Math.round(gstAmount / 2);
      sgst = gstAmount - cgst;
    } else {
      igst = gstAmount;
    }

    const total = taxableValue + cgst + sgst + igst + cess;

    return { taxableValue, discountAmount, cgst, sgst, igst, cess, total };
  }

  /** Convenience for callers building line inputs from rupee-denominated DTOs. */
  toPaiseRate(rupees: number): number {
    return rupeesToPaise(rupees);
  }
}
