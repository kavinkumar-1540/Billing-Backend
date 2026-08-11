import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentLineBuilderService } from './document-line-builder.service';
import { TaxCalculationService } from './tax-calculation.service';

function mockQuery<T>(result: T) {
  return {
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('DocumentLineBuilderService', () => {
  const companyId = new Types.ObjectId();
  const itemId = new Types.ObjectId();
  const taxRateId = new Types.ObjectId();

  const fakeItem = {
    _id: itemId,
    name: 'Widget',
    sku: 'WID-1',
    hsnSac: '1234',
    unit: 'pcs',
    taxRateId,
  };

  const fakeTaxRate = {
    _id: taxRateId,
    ratePercent: 18,
    cessPercent: 0,
  };

  function buildService(
    items: unknown[] = [fakeItem],
    taxRates: unknown[] = [fakeTaxRate],
  ) {
    const itemModel = { find: jest.fn().mockReturnValue(mockQuery(items)) };
    const taxRateModel = {
      find: jest.fn().mockReturnValue(mockQuery(taxRates)),
    };
    const service = new DocumentLineBuilderService(
      itemModel as never,
      taxRateModel as never,
      new TaxCalculationService(),
    );
    return { service, itemModel, taxRateModel };
  }

  it('rejects an empty line list', async () => {
    const { service } = buildService();
    await expect(
      service.build(companyId, [], '33', '33'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when an item id does not resolve to a found item', async () => {
    const { service } = buildService([]);
    await expect(
      service.build(
        companyId,
        [{ itemId: String(itemId), quantity: 1, rate: 100 }],
        '33',
        '33',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds embedded line items and a tax summary using the item and tax-rate masters, ignoring any client-submitted GST fields', async () => {
    const { service } = buildService();
    const result = await service.build(
      companyId,
      [{ itemId: String(itemId), quantity: 2, rate: 500 }],
      '33',
      '33',
    );

    expect(result.embeddedItems).toHaveLength(1);
    const line = result.embeddedItems[0];
    expect(line.name).toBe('Widget');
    expect(line.gstRatePercent).toBe(18);
    expect(line.taxableValue).toBe(100000); // 2 x ₹500 = ₹1000 in paise
    expect(line.cgst).toBe(9000);
    expect(line.sgst).toBe(9000);

    expect(result.taxSummary.taxableAmount).toBe(100000);
    expect(result.taxSummary.grandTotal).toBe(118000);
    expect(result.itemsById.size).toBe(1);
  });

  it('applies IGST instead of CGST+SGST when supplier and place-of-supply states differ', async () => {
    const { service } = buildService();
    const result = await service.build(
      companyId,
      [{ itemId: String(itemId), quantity: 1, rate: 1000 }],
      '33',
      '29',
    );

    expect(result.taxSummary.cgst).toBe(0);
    expect(result.taxSummary.sgst).toBe(0);
    expect(result.taxSummary.igst).toBe(18000);
  });

  it('rejects when the place-of-supply state code is missing', async () => {
    const { service } = buildService();
    await expect(
      service.build(
        companyId,
        [{ itemId: String(itemId), quantity: 1, rate: 100 }],
        '33',
        '',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
