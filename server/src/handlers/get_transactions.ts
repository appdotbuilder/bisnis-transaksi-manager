
import { db } from '../db';
import { transactionsTable, customersTable, transactionItemsTable, productsTable, documentsTable } from '../db/schema';
import { type GetTransactionsInput, type TransactionWithItems } from '../schema';
import { eq, and, gte, lte, count, desc, inArray } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function getTransactions(input: GetTransactionsInput = {}): Promise<{ 
  transactions: TransactionWithItems[], 
  total: number,
  page: number,
  limit: number 
}> {
  try {
    const page = input.page || 1;
    const limit = input.limit || 20;
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (input.customer_id !== undefined) {
      conditions.push(eq(transactionsTable.customer_id, input.customer_id));
    }

    if (input.date_from !== undefined) {
      conditions.push(gte(transactionsTable.transaction_date, input.date_from));
    }

    if (input.date_to !== undefined) {
      conditions.push(lte(transactionsTable.transaction_date, input.date_to));
    }

    // Build query for transactions with customers
    const baseQuery = db.select()
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id));

    const finalQuery = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const transactionResults = await finalQuery
      .orderBy(desc(transactionsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Get total count for pagination
    const countBaseQuery = db.select({ count: count() }).from(transactionsTable);
    const countQuery = conditions.length > 0 
      ? countBaseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : countBaseQuery;

    const [{ count: total }] = await countQuery.execute();

    // If no transactions found, return empty result
    if (transactionResults.length === 0) {
      return {
        transactions: [],
        total,
        page,
        limit
      };
    }

    // Get transaction IDs for fetching items and documents
    const transactionIds = transactionResults.map(result => result.transactions.id);

    // Fetch transaction items with products for all transactions
    const itemsResults = await db.select()
      .from(transactionItemsTable)
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(inArray(transactionItemsTable.transaction_id, transactionIds))
      .execute();

    // Fetch documents for all transactions
    const documentsResults = await db.select()
      .from(documentsTable)
      .where(inArray(documentsTable.transaction_id, transactionIds))
      .execute();

    // Build the final result with proper type conversions
    const transactions: TransactionWithItems[] = transactionResults.map(result => {
      const transaction = result.transactions;
      const customer = result.customers;

      // Get items for this transaction
      const transactionItems = itemsResults
        .filter(item => item.transaction_items.transaction_id === transaction.id)
        .map(item => ({
          id: item.transaction_items.id,
          transaction_id: item.transaction_items.transaction_id,
          product_id: item.transaction_items.product_id,
          quantity: parseFloat(item.transaction_items.quantity),
          unit_price: parseFloat(item.transaction_items.unit_price),
          discount: parseFloat(item.transaction_items.discount),
          subtotal: parseFloat(item.transaction_items.subtotal),
          created_at: item.transaction_items.created_at,
          product: {
            id: item.products.id,
            product_code: item.products.product_code,
            product_name: item.products.product_name,
            product_type: item.products.product_type,
            price: parseFloat(item.products.price),
            created_at: item.products.created_at,
            updated_at: item.products.updated_at
          }
        }));

      // Get documents for this transaction
      const transactionDocuments = documentsResults
        .filter(doc => doc.transaction_id === transaction.id)
        .map(doc => ({
          id: doc.id,
          transaction_id: doc.transaction_id,
          document_type: doc.document_type,
          document_number: doc.document_number,
          file_path: doc.file_path,
          created_at: doc.created_at
        }));

      return {
        id: transaction.id,
        transaction_id: transaction.transaction_id,
        customer_id: transaction.customer_id,
        transaction_date: transaction.transaction_date,
        subtotal: parseFloat(transaction.subtotal),
        total_discount: parseFloat(transaction.total_discount),
        ppn_enabled: transaction.ppn_enabled,
        ppn_amount: parseFloat(transaction.ppn_amount),
        pph22_enabled: transaction.pph22_enabled,
        pph22_amount: parseFloat(transaction.pph22_amount),
        pph23_enabled: transaction.pph23_enabled,
        pph23_amount: parseFloat(transaction.pph23_amount),
        service_value: transaction.service_value ? parseFloat(transaction.service_value) : null,
        service_type: transaction.service_type,
        regional_tax_enabled: transaction.regional_tax_enabled,
        regional_tax_amount: parseFloat(transaction.regional_tax_amount),
        stamp_required: transaction.stamp_required,
        stamp_amount: parseFloat(transaction.stamp_amount),
        total_amount: parseFloat(transaction.total_amount),
        payment_method: transaction.payment_method,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        customer: {
          id: customer.id,
          institution_name: customer.institution_name,
          address: customer.address,
          contact_person: customer.contact_person,
          phone: customer.phone,
          npwp: customer.npwp,
          created_at: customer.created_at,
          updated_at: customer.updated_at
        },
        items: transactionItems,
        documents: transactionDocuments
      };
    });

    return {
      transactions,
      total,
      page,
      limit
    };
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
}
