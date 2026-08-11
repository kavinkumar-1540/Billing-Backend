import { TaxCalculationService } from './tax-calculation.service';

describe('TaxCalculationService', () => {
  const service = new TaxCalculationService();

  it('splits GST into CGST+SGST for intra-state transactions', () => {
    const result = service.calculateDocument(
      [{ quantity: 2, rate: 50000, gstRatePercent: 18 }], // 2 x ₹500 = ₹1000 taxable
      '33',
      '33',
    );
    expect(result.taxableAmount).toBe(100000);
    expect(result.cgst).toBe(9000); // 9%
    expect(result.sgst).toBe(9000); // 9%
    expect(result.igst).toBe(0);
    expect(result.grandTotal).toBe(118000);
  });

  it('applies full GST as IGST for inter-state transactions', () => {
    const result = service.calculateDocument(
      [{ quantity: 2, rate: 50000, gstRatePercent: 18 }],
      '33',
      '29',
    );
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(18000);
    expect(result.grandTotal).toBe(118000);
  });

  it('applies percentage and flat discounts before computing tax', () => {
    const result = service.calculateDocument(
      [
        {
          quantity: 1,
          rate: 100000, // ₹1000
          discountPercent: 10, // -₹100
          discountAmount: 5000, // -₹50
          gstRatePercent: 18,
        },
      ],
      '33',
      '33',
    );
    // taxable = 1000 - 100 - 50 = 850 => 85000 paise
    expect(result.taxableAmount).toBe(85000);
    expect(result.totalDiscount).toBe(15000);
    expect(result.cgst).toBe(7650); // 9% of 850 = 76.5 -> rounds to 77 (Math.round)
    expect(result.sgst).toBe(7650);
  });

  it('splits an odd GST amount so CGST+SGST reconstruct the total exactly', () => {
    const result = service.calculateDocument(
      [{ quantity: 1, rate: 10100, gstRatePercent: 18 }], // taxable 10100, gst = 1818
      '33',
      '33',
    );
    expect(result.cgst + result.sgst).toBe(1818);
  });

  it('handles zero-rated (0% GST) items', () => {
    const result = service.calculateDocument(
      [{ quantity: 5, rate: 20000, gstRatePercent: 0 }],
      '33',
      '33',
    );
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
    expect(result.grandTotal).toBe(100000);
  });

  it('applies cess on top of GST when configured', () => {
    const result = service.calculateDocument(
      [{ quantity: 1, rate: 100000, gstRatePercent: 28, cessRatePercent: 12 }],
      '33',
      '29',
    );
    expect(result.igst).toBe(28000);
    expect(result.cess).toBe(12000);
    expect(result.grandTotal).toBe(140000);
  });

  it('sums multiple lines and computes a single document-level round-off', () => {
    const result = service.calculateDocument(
      [
        { quantity: 3, rate: 33333, gstRatePercent: 18 },
        { quantity: 1, rate: 15000, gstRatePercent: 5 },
      ],
      '33',
      '33',
    );
    const reconstructed =
      result.taxableAmount +
      result.cgst +
      result.sgst +
      result.igst +
      result.cess;
    expect(result.grandTotal - reconstructed).toBe(result.roundOff);
  });

  it('is deterministic for identical input', () => {
    const input = [
      { quantity: 7, rate: 12345, gstRatePercent: 18, discountPercent: 3 },
    ];
    const a = service.calculateDocument(input, '33', '27');
    const b = service.calculateDocument(input, '33', '27');
    expect(a).toEqual(b);
  });
});
