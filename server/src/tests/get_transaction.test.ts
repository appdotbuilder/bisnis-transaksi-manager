
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type GetTransactionInput } from '../schema';
import { getTransaction } from '../handlers/get_transaction';

describe('getTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent transaction', async () => {
    const input: GetTransactionInput = { id: 999 };
    const result = await getTransaction(input);

    expect(result).toBeNull();
  });

  it('should fetch transaction with customer and items', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        institution_name: 'Test Institution',
        address: 'Test Address',
        contact_person: 'John Doe',
        phone: '123456789',
        npwp: 'TEST123'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create products
    const productResult = await db.insert(productsTable)
      .values([
        {
          product_code: 'PRD001',
          product_name: 'Product 1',
          product_type: 'BARANG',
          price: '100.00'
        },
        {
          product_code: 'PRD002',
          product_name: 'Product 2',
          product_type: 'JASA',
          price: '200.00'
        }
      ])
      .returning()
      .execute();

    const products = productResult;

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN001',
        customer_id: customer.id,
        transaction_date: new Date('2023-01-01'),
        subtotal: '300.00',
        total_discount: '10.00',
        ppn_enabled: true,
        ppn_amount: '32.10',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: true,
        pph23_amount: '15.00',
        service_value: '50.00',
        service_type: 'Consultation',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        stamp_required: true,
        stamp_amount: '10000.00',
        total_amount: '327.10',
        payment_method: 'NON_TUNAI'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transaction.id,
          product_id: products[0].id,
          quantity: '2.000',
          unit_price: '100.00',
          discount: '5.00',
          subtotal: '195.00'
        },
        {
          transaction_id: transaction.id,
          product_id: products[1].id,
          quantity: '1.000',
          unit_price: '200.00',
          discount: '5.00',
          subtotal: '195.00'
        }
      ])
      .execute();

    // Test the handler
    const input: GetTransactionInput = { id: transaction.id };
    const result = await getTransaction(input);

    // Verify transaction data
    expect(result).not.toBeNull();
    expect(result!.id).toBe(transaction.id);
    expect(result!.transaction_id).toBe('TXN001');
    expect(result!.subtotal).toBe(300.00);
    expect(typeof result!.subtotal).toBe('number');
    expect(result!.total_discount).toBe(10.00);
    expect(result!.ppn_enabled).toBe(true);
    expect(result!.ppn_amount).toBe(32.10);
    expect(result!.pph23_amount).toBe(15.00);
    expect(result!.service_value).toBe(50.00);
    expect(result!.service_type).toBe('Consultation');
    expect(result!.stamp_amount).toBe(10000.00);
    expect(result!.total_amount).toBe(327.10);
    expect(result!.payment_method).toBe('NON_TUNAI');

    // Verify customer data
    expect(result!.customer.id).toBe(customer.id);
    expect(result!.customer.institution_name).toBe('Test Institution');
    expect(result!.customer.address).toBe('Test Address');
    expect(result!.customer.contact_person).toBe('John Doe');
    expect(result!.customer.phone).toBe('123456789');
    expect(result!.customer.npwp).toBe('TEST123');

    // Verify transaction items
    expect(result!.items).toHaveLength(2);
    
    const item1 = result!.items[0];
    expect(item1.product_id).toBe(products[0].id);
    expect(item1.quantity).toBe(2.000);
    expect(typeof item1.quantity).toBe('number');
    expect(item1.unit_price).toBe(100.00);
    expect(item1.discount).toBe(5.00);
    expect(item1.subtotal).toBe(195.00);
    expect(item1.product.product_code).toBe('PRD001');
    expect(item1.product.product_name).toBe('Product 1');
    expect(item1.product.product_type).toBe('BARANG');
    expect(item1.product.price).toBe(100.00);
    expect(typeof item1.product.price).toBe('number');

    const item2 = result!.items[1];
    expect(item2.product_id).toBe(products[1].id);
    expect(item2.quantity).toBe(1.000);
    expect(item2.unit_price).toBe(200.00);
    expect(item2.discount).toBe(5.00);
    expect(item2.subtotal).toBe(195.00);
    expect(item2.product.product_code).toBe('PRD002');
    expect(item2.product.product_name).toBe('Product 2');
    expect(item2.product.product_type).toBe('JASA');
    expect(item2.product.price).toBe(200.00);
  });

  it('should fetch transaction without items', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        institution_name: 'Test Institution',
        address: 'Test Address',
        contact_person: 'John Doe',
        phone: '123456789'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create transaction without items
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN002',
        customer_id: customer.id,
        transaction_date: new Date('2023-01-02'),
        subtotal: '0.00',
        total_amount: '0.00',
        payment_method: 'TUNAI'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Test the handler
    const input: GetTransactionInput = { id: transaction.id };
    const result = await getTransaction(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(transaction.id);
    expect(result!.transaction_id).toBe('TXN002');
    expect(result!.items).toHaveLength(0);
    expect(result!.customer.institution_name).toBe('Test Institution');
  });
});
