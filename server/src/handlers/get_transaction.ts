
import { db } from '../db';
import { transactionsTable, customersTable, transactionItemsTable, productsTable } from '../db/schema';
import { type GetTransactionInput, type TransactionWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransaction(input: GetTransactionInput): Promise<TransactionWithItems | null> {
  try {
    // Query transaction with all related data using joins
    const results = await db.select()
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .leftJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .leftJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Extract transaction and customer data from first result
    const firstResult = results[0];
    const transactionData = firstResult.transactions;
    const customerData = firstResult.customers;

    // Build transaction items array from results
    const items = results
      .filter(result => result.transaction_items && result.products)
      .map(result => ({
        id: result.transaction_items!.id,
        transaction_id: result.transaction_items!.transaction_id,
        product_id: result.transaction_items!.product_id,
        quantity: parseFloat(result.transaction_items!.quantity),
        unit_price: parseFloat(result.transaction_items!.unit_price),
        discount: parseFloat(result.transaction_items!.discount),
        subtotal: parseFloat(result.transaction_items!.subtotal),
        created_at: result.transaction_items!.created_at,
        product: {
          id: result.products!.id,
          product_code: result.products!.product_code,
          product_name: result.products!.product_name,
          product_type: result.products!.product_type,
          price: parseFloat(result.products!.price),
          created_at: result.products!.created_at,
          updated_at: result.products!.updated_at
        }
      }));

    // Convert numeric fields and build final response
    return {
      id: transactionData.id,
      transaction_id: transactionData.transaction_id,
      customer_id: transactionData.customer_id,
      transaction_date: transactionData.transaction_date,
      subtotal: parseFloat(transactionData.subtotal),
      total_discount: parseFloat(transactionData.total_discount),
      ppn_enabled: transactionData.ppn_enabled,
      ppn_amount: parseFloat(transactionData.ppn_amount),
      pph22_enabled: transactionData.pph22_enabled,
      pph22_amount: parseFloat(transactionData.pph22_amount),
      pph23_enabled: transactionData.pph23_enabled,
      pph23_amount: parseFloat(transactionData.pph23_amount),
      service_value: transactionData.service_value ? parseFloat(transactionData.service_value) : null,
      service_type: transactionData.service_type,
      regional_tax_enabled: transactionData.regional_tax_enabled,
      regional_tax_amount: parseFloat(transactionData.regional_tax_amount),
      stamp_required: transactionData.stamp_required,
      stamp_amount: parseFloat(transactionData.stamp_amount),
      total_amount: parseFloat(transactionData.total_amount),
      payment_method: transactionData.payment_method,
      created_at: transactionData.created_at,
      updated_at: transactionData.updated_at,
      customer: {
        id: customerData.id,
        institution_name: customerData.institution_name,
        address: customerData.address,
        contact_person: customerData.contact_person,
        phone: customerData.phone,
        npwp: customerData.npwp,
        created_at: customerData.created_at,
        updated_at: customerData.updated_at
      },
      items
    };
  } catch (error) {
    console.error('Get transaction failed:', error);
    throw error;
  }
}
