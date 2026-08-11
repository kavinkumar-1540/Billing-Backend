import { formatPaiseAsInr, paiseToRupees, rupeesToPaise } from './money.util';

describe('money.util', () => {
  describe('rupeesToPaise', () => {
    it('converts whole rupees to paise', () => {
      expect(rupeesToPaise(100)).toBe(10000);
    });

    it('converts fractional rupees to paise', () => {
      expect(rupeesToPaise(99.99)).toBe(9999);
    });

    it('rounds to the nearest paise to avoid floating-point drift', () => {
      expect(rupeesToPaise(10.005)).toBe(1001);
      expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    });

    it('handles zero', () => {
      expect(rupeesToPaise(0)).toBe(0);
    });
  });

  describe('paiseToRupees', () => {
    it('converts paise back to rupees', () => {
      expect(paiseToRupees(10000)).toBe(100);
      expect(paiseToRupees(9999)).toBe(99.99);
    });

    it('is the inverse of rupeesToPaise for exact paise amounts', () => {
      expect(paiseToRupees(rupeesToPaise(1234.56))).toBe(1234.56);
    });
  });

  describe('formatPaiseAsInr', () => {
    it('formats paise as an INR currency string', () => {
      expect(formatPaiseAsInr(150000)).toBe('₹1,500.00');
    });

    it('formats zero correctly', () => {
      expect(formatPaiseAsInr(0)).toBe('₹0.00');
    });
  });
});
