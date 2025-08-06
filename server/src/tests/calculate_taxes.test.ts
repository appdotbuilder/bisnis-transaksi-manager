
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { calculateTaxes, type TaxCalculationInput } from '../handlers/calculate_taxes';

// Test data
const basicItems = [
    { quantity: 2, unitPrice: 100000, discount: 10000 }, // 190,000 after discount
    { quantity: 1, unitPrice: 200000, discount: 0 }      // 200,000
];
// Subtotal: 390,000

const testInput: TaxCalculationInput = {
    items: basicItems,
    totalDiscount: 0,
    ppnEnabled: false,
    pph22Enabled: false,
    pph23Enabled: false,
    regionalTaxEnabled: false
};

describe('calculateTaxes', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should calculate basic subtotal without taxes', async () => {
        const result = await calculateTaxes(testInput);

        expect(result.subtotal).toEqual(390000);
        expect(result.totalDiscount).toEqual(0);
        expect(result.ppnAmount).toEqual(0);
        expect(result.pph22Amount).toEqual(0);
        expect(result.pph23Amount).toEqual(0);
        expect(result.regionalTaxAmount).toEqual(0);
        expect(result.stampAmount).toEqual(0);
        expect(result.totalAmount).toEqual(390000);
        expect(result.stampRequired).toBe(false);
    });

    it('should calculate PPN correctly (11%)', async () => {
        const input: TaxCalculationInput = {
            ...testInput,
            ppnEnabled: true
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(390000);
        expect(result.ppnAmount).toEqual(42900); // 390,000 * 0.11
        expect(result.totalAmount).toEqual(432900); // 390,000 + 42,900
    });

    it('should calculate PPh 22 correctly (1.5%)', async () => {
        const input: TaxCalculationInput = {
            ...testInput,
            pph22Enabled: true
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(390000);
        expect(result.pph22Amount).toEqual(5850); // 390,000 * 0.015
        expect(result.totalAmount).toEqual(384150); // 390,000 - 5,850
    });

    it('should calculate PPh 23 correctly (2% on service value)', async () => {
        const input: TaxCalculationInput = {
            ...testInput,
            pph23Enabled: true,
            serviceValue: 300000
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(390000);
        expect(result.pph23Amount).toEqual(6000); // 300,000 * 0.02
        expect(result.totalAmount).toEqual(384000); // 390,000 - 6,000
    });

    it('should not calculate PPh 23 when enabled but no service value', async () => {
        const input: TaxCalculationInput = {
            ...testInput,
            pph23Enabled: true
            // No serviceValue provided
        };

        const result = await calculateTaxes(input);

        expect(result.pph23Amount).toEqual(0);
        expect(result.totalAmount).toEqual(390000);
    });

    it('should calculate regional tax correctly (10%)', async () => {
        const input: TaxCalculationInput = {
            ...testInput,
            regionalTaxEnabled: true
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(390000);
        expect(result.regionalTaxAmount).toEqual(39000); // 390,000 * 0.10
        expect(result.totalAmount).toEqual(429000); // 390,000 + 39,000
    });

    it('should apply total discount correctly', async () => {
        const input: TaxCalculationInput = {
            ...testInput,
            totalDiscount: 50000,
            ppnEnabled: true
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(390000);
        expect(result.totalDiscount).toEqual(50000);
        
        // PPN calculated on (390,000 - 50,000) = 340,000
        expect(result.ppnAmount).toEqual(37400); // 340,000 * 0.11
        expect(result.totalAmount).toEqual(377400); // 340,000 + 37,400
    });

    it('should require stamp for transactions >= 5,000,000', async () => {
        const largeItems = [
            { quantity: 1, unitPrice: 5000000, discount: 0 }
        ];

        const input: TaxCalculationInput = {
            ...testInput,
            items: largeItems
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(5000000);
        expect(result.stampRequired).toBe(true);
        expect(result.stampAmount).toEqual(10000);
        expect(result.totalAmount).toEqual(5010000); // 5,000,000 + 10,000
    });

    it('should not require stamp for transactions < 5,000,000', async () => {
        const smallItems = [
            { quantity: 1, unitPrice: 4999999, discount: 0 }
        ];

        const input: TaxCalculationInput = {
            ...testInput,
            items: smallItems
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(4999999);
        expect(result.stampRequired).toBe(false);
        expect(result.stampAmount).toEqual(0);
        expect(result.totalAmount).toEqual(4999999);
    });

    it('should calculate all taxes together correctly', async () => {
        const input: TaxCalculationInput = {
            items: basicItems, // Subtotal: 390,000
            totalDiscount: 40000, // Base: 350,000
            ppnEnabled: true,      // +38,500 (350,000 * 0.11)
            pph22Enabled: true,    // -5,250 (350,000 * 0.015)
            pph23Enabled: true,    // -4,000 (200,000 * 0.02)
            serviceValue: 200000,
            regionalTaxEnabled: true // +35,000 (350,000 * 0.10)
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(390000);
        expect(result.totalDiscount).toEqual(40000);
        expect(result.ppnAmount).toEqual(38500);
        expect(result.pph22Amount).toEqual(5250);
        expect(result.pph23Amount).toEqual(4000);
        expect(result.regionalTaxAmount).toEqual(35000);
        expect(result.stampAmount).toEqual(0);
        
        // 350,000 + 38,500 + 35,000 - 5,250 - 4,000 = 414,250
        expect(result.totalAmount).toEqual(414250);
    });

    it('should handle complex calculation with stamp requirement', async () => {
        const largeItems = [
            { quantity: 10, unitPrice: 500000, discount: 100000 } // 4,900,000
        ];

        const input: TaxCalculationInput = {
            items: largeItems,
            totalDiscount: 0,
            ppnEnabled: true,
            pph22Enabled: true,
            pph23Enabled: false,
            regionalTaxEnabled: true
        };

        const result = await calculateTaxes(input);

        expect(result.subtotal).toEqual(4900000);
        expect(result.ppnAmount).toEqual(539000); // 4,900,000 * 0.11
        expect(result.pph22Amount).toEqual(73500); // 4,900,000 * 0.015
        expect(result.regionalTaxAmount).toEqual(490000); // 4,900,000 * 0.10
        
        // Total before stamp: 4,900,000 + 539,000 + 490,000 - 73,500 = 5,855,500
        // Since >= 5,000,000, stamp required
        expect(result.stampRequired).toBe(true);
        expect(result.stampAmount).toEqual(10000);
        expect(result.totalAmount).toEqual(5865500); // 5,855,500 + 10,000
    });
});
