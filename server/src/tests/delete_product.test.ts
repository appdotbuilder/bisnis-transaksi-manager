
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, customersTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateProductInput, type CreateCustomerInput, type CreateTransactionInput } from '../schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing product', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        product_code: 'TEST001',
        product_name: 'Test Product',
        product_type: 'BARANG',
        price: '100.00'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the product
    const result = await deleteProduct(productId);

    expect(result).toBe(true);

    // Verify product is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should return false for non-existent product', async () => {
    const result = await deleteProduct(999);

    expect(result).toBe(false);
  });

  it('should throw error when product is referenced in transactions', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        institution_name: 'Test Customer',
        address: 'Test Address',
        contact_person: 'Test Person',
        phone: '123456789',
        npwp: 'TEST123'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        product_code: 'TEST001',
        product_name: 'Test Product',
        product_type: 'BARANG',
        price: '100.00'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create a transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN001',
        customer_id: customerId,
        transaction_date: new Date(),
        subtotal: '100.00',
        total_discount: '0.00',
        ppn_enabled: false,
        ppn_amount: '0.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        stamp_required: false,
        stamp_amount: '0.00',
        total_amount: '100.00',
        payment_method: 'TUNAI'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create transaction item that references the product
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        product_id: productId,
        quantity: '1.000',
        unit_price: '100.00',
        discount: '0.00',
        subtotal: '100.00'
      })
      .execute();

    // Try to delete the product - should throw error
    expect(deleteProduct(productId)).rejects.toThrow(/cannot delete product that is referenced in transactions/i);

    // Verify product still exists
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
  });

  it('should successfully delete product with no transaction references', async () => {
    // Create two products
    const product1Result = await db.insert(productsTable)
      .values({
        product_code: 'TEST001',
        product_name: 'Test Product 1',
        product_type: 'BARANG',
        price: '100.00'
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        product_code: 'TEST002',
        product_name: 'Test Product 2',
        product_type: 'JASA',
        price: '200.00'
      })
      .returning()
      .execute();

    const product1Id = product1Result[0].id;
    const product2Id = product2Result[0].id;

    // Create customer and transaction using only product1
    const customerResult = await db.insert(customersTable)
      .values({
        institution_name: 'Test Customer',
        address: 'Test Address',
        contact_person: 'Test Person',
        phone: '123456789'
      })
      .returning()
      .execute();

    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN001',
        customer_id: customerResult[0].id,
        transaction_date: new Date(),
        subtotal: '100.00',
        total_discount: '0.00',
        ppn_enabled: false,
        ppn_amount: '0.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        stamp_required: false,
        stamp_amount: '0.00',
        total_amount: '100.00',
        payment_method: 'TUNAI'
      })
      .returning()
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        product_id: product1Id, // Only product1 is referenced
        quantity: '1.000',
        unit_price: '100.00',
        discount: '0.00',
        subtotal: '100.00'
      })
      .execute();

    // Should be able to delete product2 since it's not referenced
    const result = await deleteProduct(product2Id);

    expect(result).toBe(true);

    // Verify product2 is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product2Id))
      .execute();

    expect(products).toHaveLength(0);

    // Verify product1 still exists
    const product1Check = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product1Id))
      .execute();

    expect(product1Check).toHaveLength(1);
  });
});
