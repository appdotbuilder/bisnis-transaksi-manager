
export interface TaxCalculation {
    subtotal: number;
    totalDiscount: number;
    ppnAmount: number;
    pph22Amount: number;
    pph23Amount: number;
    regionalTaxAmount: number;
    stampAmount: number;
    totalAmount: number;
    stampRequired: boolean;
}

export interface TaxCalculationInput {
    items: Array<{
        quantity: number;
        unitPrice: number;
        discount: number;
    }>;
    totalDiscount: number;
    ppnEnabled: boolean;
    pph22Enabled: boolean;
    pph23Enabled: boolean;
    serviceValue?: number;
    regionalTaxEnabled: boolean;
}

// Tax rate constants
const TAX_RATES = {
    PPN: 0.11,      // 11%
    PPH22: 0.015,   // 1.5%
    PPH23: 0.02,    // 2%
    REGIONAL: 0.10, // 10%
} as const;

// Stamp duty threshold
const STAMP_THRESHOLD = 5_000_000;
const STAMP_AMOUNT = 10_000; // Standard stamp duty amount

export async function calculateTaxes(input: TaxCalculationInput): Promise<TaxCalculation> {
    try {
        // Calculate subtotal from items (quantity * unit_price - discount per item)
        const subtotal = input.items.reduce((sum, item) => {
            const itemTotal = (item.quantity * item.unitPrice) - item.discount;
            return sum + itemTotal;
        }, 0);

        // Base amount after item discounts and total discount
        const baseAmount = subtotal - input.totalDiscount;

        // Calculate PPN (11% on base amount)
        const ppnAmount = input.ppnEnabled ? baseAmount * TAX_RATES.PPN : 0;

        // Calculate PPh 22 (1.5% on base amount)
        const pph22Amount = input.pph22Enabled ? baseAmount * TAX_RATES.PPH22 : 0;

        // Calculate PPh 23 (2% on service value for services)
        const pph23Amount = input.pph23Enabled && input.serviceValue !== undefined
            ? input.serviceValue * TAX_RATES.PPH23
            : 0;

        // Calculate Regional Tax (10% on base amount)
        const regionalTaxAmount = input.regionalTaxEnabled ? baseAmount * TAX_RATES.REGIONAL : 0;

        // Calculate total before stamp
        const totalBeforeStamp = baseAmount + ppnAmount + regionalTaxAmount - pph22Amount - pph23Amount;

        // Determine if stamp is required and calculate stamp amount
        const stampRequired = totalBeforeStamp >= STAMP_THRESHOLD;
        const stampAmount = stampRequired ? STAMP_AMOUNT : 0;

        // Calculate final total amount
        const totalAmount = totalBeforeStamp + stampAmount;

        return {
            subtotal,
            totalDiscount: input.totalDiscount,
            ppnAmount,
            pph22Amount,
            pph23Amount,
            regionalTaxAmount,
            stampAmount,
            totalAmount,
            stampRequired
        };
    } catch (error) {
        console.error('Tax calculation failed:', error);
        throw error;
    }
}
