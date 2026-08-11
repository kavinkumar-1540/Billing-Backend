import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import { TaxRate, TaxRateDocument } from './schemas/tax-rate.schema';
import {
  TaxCalculationService,
  TaxDocumentResult,
} from './tax-calculation.service';
import { rupeesToPaise } from '../../common/money/money.util';
import { LineItemInputDto } from '../../common/dto/line-item-input.dto';

export interface BuiltDocumentLines {
  embeddedItems: Record<string, unknown>[];
  taxSummary: Omit<TaxDocumentResult, 'lines'>;
  itemsById: Map<string, ItemDocument>;
}

/**
 * Resolves client-submitted { itemId, quantity, rate, discount } lines into
 * fully-priced, tax-calculated embedded line items + a document tax summary.
 * Always re-reads item/tax-rate masters and recalculates — never trusts
 * amounts the client may have echoed back.
 */
@Injectable()
export class DocumentLineBuilderService {
  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @InjectModel(TaxRate.name)
    private readonly taxRateModel: Model<TaxRateDocument>,
    private readonly taxCalculationService: TaxCalculationService,
  ) {}

  async build(
    companyId: Types.ObjectId,
    lines: LineItemInputDto[],
    supplierStateCode: string,
    placeOfSupplyStateCode: string,
    session?: ClientSession,
  ): Promise<BuiltDocumentLines> {
    if (lines.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    const itemIds = lines.map((l) => new Types.ObjectId(l.itemId));
    const items = await this.itemModel
      .find({ _id: { $in: itemIds }, companyId })
      .session(session ?? null)
      .exec();

    const itemsById = new Map(items.map((i) => [String(i._id), i]));
    if (itemsById.size !== new Set(lines.map((l) => l.itemId)).size) {
      throw new BadRequestException('One or more items were not found');
    }

    const taxRateIds = items
      .map((i) => i.taxRateId)
      .filter(Boolean) as Types.ObjectId[];
    const taxRates = await this.taxRateModel
      .find({ _id: { $in: taxRateIds } })
      .session(session ?? null)
      .exec();
    const taxRatesById = new Map(taxRates.map((t) => [String(t._id), t]));

    const taxLineInputs = lines.map((line) => {
      const item = itemsById.get(line.itemId)!;
      const taxRate = item.taxRateId
        ? taxRatesById.get(String(item.taxRateId))
        : undefined;
      return {
        quantity: line.quantity,
        rate: rupeesToPaise(line.rate),
        discountPercent: line.discountPercent,
        discountAmount:
          line.discountAmount != null
            ? rupeesToPaise(line.discountAmount)
            : undefined,
        gstRatePercent: taxRate?.ratePercent ?? 0,
        cessRatePercent: taxRate?.cessPercent ?? 0,
      };
    });

    const result = this.taxCalculationService.calculateDocument(
      taxLineInputs,
      supplierStateCode,
      requireStateCode(placeOfSupplyStateCode),
    );

    const embeddedItems = lines.map((line, idx) => {
      const item = itemsById.get(line.itemId)!;
      const computed = result.lines[idx];
      const taxRate = item.taxRateId
        ? taxRatesById.get(String(item.taxRateId))
        : undefined;
      return {
        itemId: item._id,
        name: item.name,
        sku: item.sku,
        hsnSac: item.hsnSac,
        unit: item.unit,
        quantity: line.quantity,
        rate: rupeesToPaise(line.rate),
        discountPercent: line.discountPercent ?? 0,
        discountAmount: computed.discountAmount,
        gstRatePercent: taxRate?.ratePercent ?? 0,
        cessRatePercent: taxRate?.cessPercent ?? 0,
        taxableValue: computed.taxableValue,
        cgst: computed.cgst,
        sgst: computed.sgst,
        igst: computed.igst,
        cess: computed.cess,
        total: computed.total,
      };
    });

    const taxSummary = {
      subtotal: result.subtotal,
      totalDiscount: result.totalDiscount,
      taxableAmount: result.taxableAmount,
      cgst: result.cgst,
      sgst: result.sgst,
      igst: result.igst,
      cess: result.cess,
      roundOff: result.roundOff,
      grandTotal: result.grandTotal,
    };
    return { embeddedItems, taxSummary, itemsById };
  }
}

function requireStateCode(stateCode: string | undefined): string {
  if (!stateCode) {
    throw new BadRequestException('placeOfSupply state code is required');
  }
  return stateCode;
}
