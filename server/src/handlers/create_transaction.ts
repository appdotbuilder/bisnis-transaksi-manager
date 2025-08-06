
import { db } from '../db';
import { transactionsTable, transactionItemsTable, customersTable, productsTable } from '../db/schema';
import { type CreateTransactionInput, type TransactionWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<TransactionWithItems> {
  try {
    return await db.transaction(async (tx) => {
      // Verify customer exists
      const customer = await tx.select()
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();
      
      if (customer.length === 0) {
        throw new Error(`Customer with ID ${input.customer_id} not found`);
      }

      // Verify all products exist and get their details
      const productIds = input.items.map(item => item.product_id);
      const products = await tx.select()
        .from(productsTable)
        .where(eq(productsTable.id, productIds[0])) // Start with first product
        .execute();

      // Check all products exist (simple approach for clarity)
      for (const item of input.items) {
        const product = await tx.select()
          .from(productsTable)
          .where(eq(productsTable.id, item.product_id))
          .execute();
        
        if (product.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }
      }

      // Generate unique transaction ID
      const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate subtotal from items
      let subtotal = 0;
      for (const item of input.items) {
        const itemSubtotal = item.quantity * item.unit_price - item.discount;
        subtotal += itemSubtotal;
      }

      // Calculate tax amounts based on enabled flags
      const taxableAmount = subtotal - input.total_discount;
      
      // PPN (11% of taxable amount if enabled)
      const ppnAmount = input.ppn_enabled ? taxableAmount * 0.11 : 0;
      
      // PPh22 (1.5% of taxable amount if enabled)
      const pph22Amount = input.pph22_enabled ? taxableAmount * 0.015 : 0;
      
      // PPh23 (2% of service value if enabled and service_value exists)
      const pph23Amount = input.pph23_enabled && input.service_value 
        ? input.service_value * 0.02 
        : 0;
      
      // Regional tax (10% of taxable amount if enabled)
      const regionalTaxAmount = input.regional_tax_enabled ? taxableAmount * 0.10 : 0;
      
      // Stamp required for transactions >= 5,000,000
      const stampRequired = taxableAmount >= 5000000;
      const stampAmount = stampRequired ? 10000 : 0;

      // Calculate total amount
      const totalAmount = taxableAmount + ppnAmount + regionalTaxAmount + stampAmount - pph22Amount - pph23Amount;

      // Insert transaction
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          transaction_id: transactionId,
          customer_id: input.customer_id,
          transaction_date: input.transaction_date,
          subtotal: subtotal.toString(),
          total_discount: input.total_discount.toString(),
          ppn_enabled: input.ppn_enabled,
          ppn_amount: ppnAmount.toString(),
          pph22_enabled: input.pph22_enabled,
          pph22_amount: pph22Amount.toString(),
          pph23_enabled: input.pph23_enabled,
          pph23_amount: pph23Amount.toString(),
          service_value: input.service_value ? input.service_value.toString() : null,
          service_type: input.service_type || null,
          regional_tax_enabled: input.regional_tax_enabled,
          regional_tax_amount: regionalTaxAmount.toString(),
          stamp_required: stampRequired,
          stamp_amount: stampAmount.toString(),
          total_amount: totalAmount.toString(),
          payment_method: input.payment_method
        })
        .returning()
        .execute();

      const transaction = transactionResult[0];

      // Insert transaction items
      const itemResults = [];
      for (const item of input.items) {
        const itemSubtotal = item.quantity * item.unit_price - item.discount;
        
        const itemResult = await tx.insert(transactionItemsTable)
          .values({
            transaction_id: transaction.id,
            product_id: item.product_id,
            quantity: item.quantity.toString(),
            unit_price: item.unit_price.toString(),
            discount: item.discount.toString(),
            subtotal: itemSubtotal.toString()
          })
          .returning()
          .execute();

        itemResults.push(itemResult[0]);
      }

      // Get product details for items
      const itemsWithProducts = [];
      for (let i = 0; i < itemResults.length; i++) {
        const item = itemResults[i];
        const product = await tx.select()
          .from(productsTable)
          .where(eq(productsTable.id, item.product_id))
          .execute();

        itemsWithProducts.push({
          ...item,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount),
          subtotal: parseFloat(item.subtotal),
          product: {
            ...product[0],
            price: parseFloat(product[0].price)
          }
        });
      }

      // Return complete transaction with relations
      return {
        ...transaction,
        subtotal: parseFloat(transaction.subtotal),
        total_discount: parseFloat(transaction.total_discount),
        ppn_amount: parseFloat(transaction.ppn_amount),
        pph22_amount: parseFloat(transaction.pph22_amount),
        pph23_amount: parseFloat(transaction.pph23_amount),
        service_value: transaction.service_value ? parseFloat(transaction.service_value) : null,
        regional_tax_amount: parseFloat(transaction.regional_tax_amount),
        stamp_amount: parseFloat(transaction.stamp_amount),
        total_amount: parseFloat(transaction.total_amount),
        customer: customer[0],
        items: itemsWithProducts
      };
    });
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}
